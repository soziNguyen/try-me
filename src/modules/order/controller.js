import Order from './model.js'
import Table from '../table/model.js'
import { MenuItem } from '../menu/menu-item/model.js'
import { Combo } from '../menu/combo/model.js'
import Customer from '../customer/model.js'
import PaymentMethod from '../payment/model.js'
import responseHelper from '../../helpers/responseHelper.js'
import { getCurrentOrg } from '../../helpers/orgHelper.js'
import withTransaction from '../../helpers/withTransaction.js'
import { lookupRef } from '../../helpers/lookupHelper.js'
import { has } from '../../helpers/common.js'
import InvoiceOption from '../invoice/model.js'
import ReceivingAccount from '../receiving-account/model.js'
import BusinessError from '../error/BusinessError.js'
import { constants } from '../../configs/constants.js'
import { formatPhone } from '../../helpers/common.js'
import QRCode from 'qrcode'

const { POINT_VALUE, POINTS_EARN_RATE } = constants

export const createOrder = async (req, res) => {
  try {
    const result = await withTransaction(async (session) => {
      const organizationId = getCurrentOrg(req)
      if (!organizationId) {
        throw new Error('Thiếu thông tin tổ chức')
      }

      const { tableId, isTakeaway, customerName, customerPhone } = req.body
      let prefix = 'INV'

      const invoiceOptions = await InvoiceOption.findOne({ organizationId }).lean()
      if (invoiceOptions?.prefix?.trim()) {
        prefix = invoiceOptions.prefix.trim()
      }

      // 1. Xử lý khách hàng theo organization + phone
      let customer = null
      if (customerPhone) {
        const nameToUpdate = customerName?.trim()
        const query = { organization: organizationId, phone: customerPhone }

        // Tìm customer trước (chỉ thêm session nếu có)
        customer = await Customer.findOne(query)[session ? 'session' : 'exec'](session || undefined)

        if (customer) {
          // Customer đã tồn tại - chỉ update name nếu cần
          if (nameToUpdate && nameToUpdate !== customer.name) {
            const updateOptions = { new: true }
            if (session) updateOptions.session = session

            customer = await Customer.findOneAndUpdate(
              query,
              {
                $set: {
                  name: nameToUpdate,
                  updatedAt: new Date()
                }
              },
              updateOptions
            )
          }
        } else {
          // Customer chưa tồn tại - tạo mới
          if (session) {
            const [newCustomer] = await Customer.create(
              [
                {
                  organization: organizationId,
                  phone: customerPhone,
                  name: nameToUpdate || 'Khách lẻ'
                }
              ],
              { session }
            )
            customer = newCustomer
          } else {
            customer = await Customer.create({
              organization: organizationId,
              phone: customerPhone,
              name: nameToUpdate || 'Khách lẻ'
            })
          }
        }
      }

      // Generate order code
      const orderCode = await generateInvoiceCode(Order, prefix)

      // 2. Đơn mang đi
      if (isTakeaway) {
        const existingOrder = await Order.findOne({
          isTakeaway: true,
          status: 'open',
          organization: organizationId
        })[session ? 'session' : 'exec'](session || undefined)

        if (existingOrder) {
          return {
            orderId: existingOrder._id,
            orderCode: existingOrder.code,
            tableId: null,
            isNewOrder: false
          }
        }

        let newOrder
        if (session) {
          const [createdOrder] = await Order.create(
            [
              {
                tableId: null,
                isTakeaway: true,
                status: 'open',
                organization: organizationId,
                customerId: customer?._id || null,
                code: orderCode
              }
            ],
            { session }
          )
          newOrder = createdOrder
        } else {
          newOrder = await Order.create({
            tableId: null,
            isTakeaway: true,
            status: 'open',
            organization: organizationId,
            customerId: customer?._id || null,
            code: orderCode
          })
        }

        return {
          orderId: newOrder._id,
          orderCode: newOrder.code,
          tableId: null,
          isNewOrder: true
        }
      }

      // 3. Đơn tại bàn
      if (!tableId) {
        throw new Error('Thiếu thông tin bàn')
      }

      const table = await Table.findById(tableId)[session ? 'session' : 'exec'](
        session || undefined
      )
      if (!table) throw new Error('Bàn không tồn tại')
      if (table.status === 'occupied') throw new Error('Bàn đã có khách')

      // Tạo order mới
      let newOrder
      if (session) {
        const [createdOrder] = await Order.create(
          [
            {
              tableId,
              isTakeaway: false,
              status: 'open',
              organization: organizationId,
              customerId: customer?._id || null,
              code: orderCode
            }
          ],
          { session }
        )
        newOrder = createdOrder
      } else {
        newOrder = await Order.create({
          tableId,
          isTakeaway: false,
          status: 'open',
          organization: organizationId,
          customerId: customer?._id || null,
          code: orderCode
        })
      }

      // Cập nhật trạng thái bàn
      const updateOptions = {}
      if (session) updateOptions.session = session

      await Table.findByIdAndUpdate(
        tableId,
        {
          $set: {
            status: 'occupied',
            checkInTime: new Date(),
            currentOrderId: newOrder._id,
            customerName: customerName?.trim() || 'Khách lẻ',
            orderCode: orderCode
          }
        },
        updateOptions
      )

      return {
        orderId: newOrder._id,
        orderCode: newOrder.code,
        tableId: table._id
      }
    })

    responseHelper.success(res, result)
  } catch (error) {
    console.error('Create order error:', error)

    // Handle specific error messages
    if (error.message === 'Thiếu thông tin tổ chức') {
      return responseHelper.error(res, error.message, 400)
    }
    if (error.message === 'Thiếu thông tin bàn') {
      return responseHelper.error(res, error.message, 400)
    }
    if (error.message === 'Bàn không tồn tại') {
      return responseHelper.error(res, error.message, 404)
    }
    if (error.message === 'Bàn đã có khách') {
      return responseHelper.error(res, error.message, 400)
    }

    responseHelper.error(res, error.message)
  }
}

export const getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params
    const order = await Order.findById(orderId)
      .populate('tableId', 'name area')
      .populate('items.foodId', 'name price')
      .populate('items.comboId', 'name price')
      .populate('customerId', 'name phone')
      .populate('organization', 'name phone province commune street logo')
      .populate({
        path: 'paymentMethodId',
        populate: {
          path: 'receivingAccountId',
          model: 'ReceivingAccount',
          select: 'name type accountNumber bankName isActive'
        }
      })
      .lean()

    if (!order) return res.status(404).json({ message: 'Order không tồn tại' })

    res.json(order)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

function calcOrderTotal(items = []) {
  if (!Array.isArray(items)) return 0
  return items.reduce((sum, it) => {
    const price = Number(it.price || 0)
    const qty = Number(it.quantity || 0)
    return sum + price * qty
  }, 0)
}

export const addItemToOrder = async (req, res) => {
  try {
    const { orderId } = req.params
    const { foodId, comboId, quantity } = req.body

    if ((!foodId && !comboId) || !quantity || quantity <= 0) {
      return responseHelper.error(res, 'Thông tin món/combo không hợp lệ', 400)
    }

    const order = await Order.findById(orderId)
    if (!order) return responseHelper.error(res, 'Order không tồn tại', 404)
    if (order.status !== 'open') return responseHelper.error(res, 'Order đã đóng', 400)

    // Nếu là combo
    if (comboId) {
      const combo = await Combo.findById(comboId)
      if (!combo) return responseHelper.error(res, 'Combo không tồn tại', 404)

      const existingCombo = order.items.find((item) => item.comboId?.toString() === comboId)
      if (existingCombo) {
        existingCombo.quantity += quantity
      } else {
        order.items.push({
          comboId,
          quantity,
          price: combo.price
        })
      }
    }

    // Nếu là món ăn
    if (foodId) {
      const menuItem = await MenuItem.findById(foodId)
      if (!menuItem) return responseHelper.error(res, 'Món ăn không tồn tại', 404)

      const existingItem = order.items.find((item) => item.foodId?.toString() === foodId)
      if (existingItem) {
        existingItem.quantity += quantity
      } else {
        order.items.push({
          foodId,
          quantity,
          price: menuItem.price
        })
      }
    }

    // tính tổng và lưu luôn vào order.totalAmount (cache)
    order.totalAmount = calcOrderTotal(order.items)
    await order.save()

    // nếu order gắn bàn thì cập nhật total trong bảng Table
    if (order.tableId) {
      try {
        await Table.findByIdAndUpdate(order.tableId, {
          totalAmount: order.totalAmount
        })
      } catch (e) {
        // không block flow nếu cập nhật table lỗi
        console.warn('Warning: không cập nhật được table.totalAmount', e)
      }
    }

    const populatedOrder = await Order.findById(orderId)
      .populate('items.foodId', 'name price')
      .populate('items.comboId', 'name price')
      .lean()

    responseHelper.success(res, populatedOrder)
  } catch (error) {
    console.error('Lỗi khi thêm món/combo:', error)
    responseHelper.error(res, 'Lỗi server nội bộ', 500)
  }
}

export const updateItemQuantity = async (req, res) => {
  try {
    const { orderId } = req.params
    const { itemId, quantity, type } = req.body

    if (!itemId || !quantity || quantity <= 0) {
      return responseHelper.error(res, 'Thông tin không hợp lệ', 400)
    }

    if (!['food', 'combo'].includes(type)) {
      return responseHelper.error(res, 'Loại item không hợp lệ', 400)
    }

    const order = await Order.findById(orderId)
    if (!order) return responseHelper.error(res, 'Order không tồn tại', 404)
    if (order.status !== 'open') return responseHelper.error(res, 'Order đã đóng', 400)

    const item = order.items.find((item) => {
      if (type === 'food') return item.foodId?.toString() === itemId
      if (type === 'combo') return item.comboId?.toString() === itemId
    })

    if (!item)
      return responseHelper.error(
        res,
        `${type === 'food' ? 'Món ăn' : 'Combo'} không có trong order`,
        404
      )

    item.quantity = quantity

    // cập nhật total và save
    order.totalAmount = calcOrderTotal(order.items)
    await order.save()

    if (order.tableId) {
      try {
        await Table.findByIdAndUpdate(order.tableId, {
          totalAmount: order.totalAmount
        })
      } catch (e) {
        console.warn('Warning: không cập nhật được table.totalAmount', e)
      }
    }

    const populatedOrder = await Order.findById(orderId)
      .populate('items.foodId', 'name price')
      .populate('items.comboId', 'name price')
      .lean()

    responseHelper.success(res, populatedOrder)
  } catch (error) {
    console.error('Lỗi khi cập nhật số lượng:', error)
    responseHelper.error(res, 'Lỗi server nội bộ', 500)
  }
}

export const removeItemFromOrder = async (req, res) => {
  try {
    const { orderId, itemId } = req.params
    const { type } = req.query

    if (!['food', 'combo'].includes(type)) {
      return responseHelper.error(res, 'Loại item không hợp lệ', 400)
    }

    const order = await Order.findById(orderId)
    if (!order) return responseHelper.error(res, 'Order không tồn tại', 404)
    if (order.status !== 'open') return responseHelper.error(res, 'Order đã đóng', 400)

    // Tìm item cần xoá
    const itemIndex = order.items.findIndex((item) => {
      if (type === 'food') return item.foodId?.toString() === itemId
      if (type === 'combo') return item.comboId?.toString() === itemId
    })

    if (itemIndex === -1) {
      return responseHelper.error(res, 'Món/combo không tồn tại trong order', 404)
    }

    order.items.splice(itemIndex, 1)

    // cập nhật total và lưu
    order.totalAmount = calcOrderTotal(order.items)
    await order.save()

    if (order.tableId) {
      try {
        await Table.findByIdAndUpdate(order.tableId, {
          totalAmount: order.totalAmount
        })
      } catch (e) {
        console.warn('Warning: không cập nhật được table.totalAmount', e)
      }
    }

    const populatedOrder = await Order.findById(orderId)
      .populate('items.foodId', 'name price')
      .populate('items.comboId', 'name price')
      .lean()

    responseHelper.success(res, populatedOrder)
  } catch (error) {
    console.error('Lỗi khi xóa item:', error)
    responseHelper.error(res, 'Lỗi server nội bộ', 500)
  }
}

export const checkoutOrder = async (req, res) => {
  try {
    const { orderId } = req.params
    const {
      discount = 0,
      pointsUsed = 0,
      serviceCharge = 0,
      vatRate = 0,
      paymentMethodId,
      customerPaid
    } = req.body

    if (!orderId) return responseHelper.error(res, 'Thiếu orderId', 400)
    if (!paymentMethodId)
      return responseHelper.error(res, 'Phương thức thanh toán không hợp lệ', 400)

    const parsedDiscount = Number(discount) || 0
    const parsedPointsUsed = Number(pointsUsed) || 0
    const parsedServiceCharge = Number(serviceCharge) || 0
    const parsedVatRate = Number(vatRate) || 0
    const parsedCustomerPaid = Number(customerPaid) || 0

    if (parsedDiscount < 0 || parsedPointsUsed < 0 || parsedServiceCharge < 0 || parsedVatRate < 0)
      return responseHelper.error(res, 'Các giá trị không được âm', 400)

    if (parsedCustomerPaid <= 0)
      return responseHelper.error(res, 'Số tiền khách trả không hợp lệ', 400)

    if (parsedPointsUsed > 0) {
      const orderCheck = await Order.findById(orderId).select('customerId').lean()
      if (!orderCheck) {
        return responseHelper.error(res, 'Đơn hàng không tồn tại', 404)
      }
      if (!orderCheck.customerId) {
        return responseHelper.error(res, 'Khách lẻ không thể sử dụng điểm giảm giá', 400)
      }
    }

    // === TRANSACTION ===
    const result = await withTransaction(async (session) => {
      // 1. Fetch and validate order
      const order = await Order.findById(orderId).session(session)
      if (!order) throw new BusinessError('Order không tồn tại', 404)
      if (order.status !== 'open')
        throw new BusinessError('Order đã được thanh toán hoặc đã đóng', 400)

      // 2. Validate payment method and get receiving account
      const paymentMethod = await PaymentMethod.findById(paymentMethodId)
        .populate('receivingAccountId')
        .session(session)
      if (!paymentMethod) throw new BusinessError('Phương thức thanh toán không hợp lệ', 400)

      const { type: paymentType } = paymentMethod
      let { receivingAccountId } = paymentMethod

      // Auto-find receiving account if not linked (fallback)
      if (['bank', 'e-wallet'].includes(paymentType) && !receivingAccountId) {
        receivingAccountId = await ReceivingAccount.findOne({
          organization: order.organization,
          type: paymentType,
          isActive: true
        }).session(session)
      }

      // 3. Calculate amounts first (before any updates)
      const totalAmount = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
      if (parsedDiscount > totalAmount)
        throw new BusinessError('Giảm giá không được vượt quá tổng tiền', 400)

      const calculatedPointsDiscount = parsedPointsUsed * POINT_VALUE
      const totalPayable =
        totalAmount - parsedDiscount - calculatedPointsDiscount + parsedServiceCharge
      const total = Math.round(totalPayable + (totalPayable * parsedVatRate) / 100)

      if (parsedCustomerPaid < total)
        throw new BusinessError(
          `Số tiền khách trả chưa đủ. Cần: ${total.toLocaleString()}, có: ${parsedCustomerPaid.toLocaleString()}`,
          400
        )

      // 4. Handle customer points and updates
      let customer = null
      let pointsEarned = 0

      if (order.customerId) {
        customer = await Customer.findById(order.customerId).session(session)
        if (!customer) throw new BusinessError('Khách hàng không tồn tại', 404)

        // Points validation (if using points)
        if (parsedPointsUsed > 0) {
          if (customer.totalPoints < parsedPointsUsed) {
            throw new BusinessError(
              `Không đủ điểm tích lũy. Hiện có: ${customer.totalPoints}, cần: ${parsedPointsUsed}`,
              400
            )
          }
        }

        // Calculate points earned
        pointsEarned = Math.floor(total / POINTS_EARN_RATE)

        // Atomic customer update
        const customerUpdateResult = await Customer.findOneAndUpdate(
          {
            _id: order.customerId,
            totalPoints: { $gte: parsedPointsUsed }
          },
          {
            $inc: {
              totalOrders: 1,
              totalSpent: total,
              totalPoints: pointsEarned - parsedPointsUsed
            },
            $set: {
              lastOrderDate: new Date(),
              updatedAt: new Date()
            }
          },
          { new: true, session, runValidators: true }
        )

        if (!customerUpdateResult) {
          throw new BusinessError('Điểm khách hàng đã thay đổi, vui lòng thử lại', 409)
        }
      } else if (parsedPointsUsed > 0) {
        // Double check (though early validation should catch this)
        throw new BusinessError('Khách lẻ không thể sử dụng điểm', 400)
      }

      // 5. Generate VietQR URL
      let qrCodeUrl = null
      if (['bank', 'e-wallet'].includes(paymentType) && receivingAccountId) {
        const receivingAccount = receivingAccountId

        const bankCode = receivingAccount.bankCode || 'MB' // Default to MB
        const accountNumber = receivingAccount.accountNumber

        if (accountNumber && bankCode) {
          // Use order code directly as description
          const description = order.code

          // Generate VietQR URL with hardcoded "VIETQR.CO"
          const baseUrl = 'https://vietqr.co/api/generate'
          const params = new URLSearchParams({
            style: '2',
            logo: '1',
            isMask: '0',
            bg: '7'
          })

          qrCodeUrl = `${baseUrl}/${bankCode}/${accountNumber}/VIETQR.CO/${total}/${description}?${params.toString()}`
        }
      }

      // 6. UPDATE ORDER
      order.discount = parsedDiscount
      order.pointsUsed = parsedPointsUsed
      order.pointsDiscount = calculatedPointsDiscount
      order.serviceCharge = parsedServiceCharge
      order.vatRate = parsedVatRate
      order.totalAmount = totalAmount
      order.totalPayable = totalPayable
      order.total = total
      order.paymentMethodId = paymentMethodId
      order.customerPaid = parsedCustomerPaid
      order.changeAmount = parsedCustomerPaid - total
      order.status = 'completed'
      order.updatedAt = new Date()
      if (qrCodeUrl) order.qrCode = qrCodeUrl

      await order.save({ session })

      // 7. RELEASE TABLE
      if (order.tableId) {
        await Table.findByIdAndUpdate(
          order.tableId,
          { status: 'available', currentOrderId: null, updatedAt: new Date() },
          { session }
        )
      }

      return {
        totalAmount,
        discount: parsedDiscount,
        pointsUsed: parsedPointsUsed,
        pointsDiscount: calculatedPointsDiscount,
        pointsEarned,
        serviceCharge: parsedServiceCharge,
        vatRate: parsedVatRate,
        totalPayable,
        total,
        changeAmount: parsedCustomerPaid - total,
        qrCodeUrl
      }
    })

    return responseHelper.success(res, result, 'Thanh toán thành công')
  } catch (error) {
    // Clean error handling with BusinessError
    if (error instanceof BusinessError) {
      // Expected business errors - no logging to reduce terminal noise
      return responseHelper.error(res, error.message, error.statusCode)
    } else {
      // Unexpected system errors - log with full details
      console.error('Lỗi hệ thống thanh toán:', error)
      return responseHelper.error(res, 'Lỗi server nội bộ', 500)
    }
  }
}

export const updateOrderDraft = async (req, res) => {
  try {
    const { orderId } = req.params
    const {
      discount = 0,
      pointsUsed = 0,
      serviceCharge = 0,
      vatRate = 0,
      paymentMethodId = null,
      customerPaid = 0
    } = req.body

    if (!orderId) return responseHelper.error(res, 'Thiếu orderId', 400)

    const parsedDiscount = Number(discount) || 0
    const parsedPointsUsed = Number(pointsUsed) || 0
    const parsedServiceCharge = Number(serviceCharge) || 0
    const parsedVatRate = Number(vatRate) || 0
    const parsedCustomerPaid = Number(customerPaid) || 0

    if (
      parsedDiscount < 0 ||
      parsedPointsUsed < 0 ||
      parsedServiceCharge < 0 ||
      parsedVatRate < 0 ||
      parsedCustomerPaid < 0
    )
      return responseHelper.error(res, 'Các giá trị không được âm', 400)

    // Early validation for points usage
    if (parsedPointsUsed > 0) {
      const orderCheck = await Order.findById(orderId).select('customerId').lean()
      if (!orderCheck) {
        return responseHelper.error(res, 'Đơn hàng không tồn tại', 404)
      }
      if (!orderCheck.customerId) {
        return responseHelper.error(res, 'Khách lẻ không thể sử dụng điểm giảm giá', 400)
      }
    }

    const result = await withTransaction(async (session) => {
      const order = await Order.findById(orderId).session(session)
      if (!order) throw new BusinessError('Order không tồn tại', 404)

      const totalAmount = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
      if (parsedDiscount > totalAmount)
        throw new BusinessError('Giảm giá không được vượt quá tổng tiền', 400)

      // Handle customer points validation
      if (order.customerId && parsedPointsUsed > 0) {
        const customer = await Customer.findById(order.customerId).session(session)
        if (!customer) throw new BusinessError('Khách hàng không tồn tại', 404)

        if (customer.totalPoints < parsedPointsUsed) {
          throw new BusinessError(
            `Không đủ điểm tích lũy. Hiện có: ${customer.totalPoints}, cần: ${parsedPointsUsed}`,
            400
          )
        }
      } else if (parsedPointsUsed > 0) {
        // Double check for guest orders
        throw new BusinessError('Khách lẻ không thể sử dụng điểm', 400)
      }

      const pointsDiscount = parsedPointsUsed * POINT_VALUE

      const totalPayable = totalAmount - parsedDiscount - pointsDiscount + parsedServiceCharge
      const total = Math.round(totalPayable + (totalPayable * parsedVatRate) / 100)

      if (parsedCustomerPaid < 0) throw new BusinessError('Số tiền khách trả không hợp lệ', 400)

      const changeAmount = parsedCustomerPaid - total

      // Update order
      order.discount = parsedDiscount
      order.pointsUsed = parsedPointsUsed
      order.pointsDiscount = pointsDiscount
      order.serviceCharge = parsedServiceCharge
      order.vatRate = parsedVatRate
      order.totalAmount = totalAmount
      order.totalPayable = totalPayable
      order.total = total
      if (paymentMethodId) order.paymentMethodId = paymentMethodId
      order.customerPaid = parsedCustomerPaid
      order.changeAmount = changeAmount
      order.updatedAt = new Date()

      await order.save({ session })

      return {
        discount: parsedDiscount,
        pointsUsed: parsedPointsUsed,
        pointsDiscount,
        serviceCharge: parsedServiceCharge,
        vatRate: parsedVatRate,
        totalAmount,
        totalPayable,
        total,
        paymentMethodId: order.paymentMethodId,
        customerPaid: parsedCustomerPaid,
        changeAmount
      }
    })

    return responseHelper.success(res, result, 'Cập nhật đơn hàng thành công')
  } catch (error) {
    // Clean error handling with BusinessError
    if (error instanceof BusinessError) {
      // Expected business errors - no logging to reduce terminal noise
      return responseHelper.error(res, error.message, error.statusCode)
    } else {
      // Unexpected system errors - log with full details
      console.error('Lỗi hệ thống cập nhật đơn hàng:', error)
      return responseHelper.error(res, 'Lỗi server nội bộ', 500)
    }
  }
}

export const printInvoice = async (req, res) => {
  try {
    const { orderId } = req.params

    const order = await Order.findById(orderId)
      .populate('items.foodId', 'name price')
      .populate('tableId', 'name')
      .populate('organization', 'logo name phone province commune street')
      .populate({
        path: 'paymentMethodId',
        populate: {
          path: 'receivingAccountId',
          model: 'ReceivingAccount'
        }
      })

    if (!order) return res.status(404).send('Không tìm thấy đơn hàng')

    // Lấy invoiceOptions
    const orgId = order.organization ? order.organization._id : null
    let invoiceOptions = null
    if (orgId) {
      invoiceOptions = await InvoiceOption.findOne({ organizationId: orgId }).lean()
    }

    // Ưu tiên invoiceOptions -> organization -> default
    const logoStore = has(invoiceOptions?.logo) ? invoiceOptions.logo : ''

    const invoiceHeader = has(invoiceOptions?.header) ? invoiceOptions.header : ''
    const invoiceFooter = has(invoiceOptions?.footer)
      ? invoiceOptions.footer
      : `<p class="text-center">Xin cảm ơn, hẹn gặp lại quý khách<br>       
     Chúng tôi luôn trân trọng mọi ý kiến đóng góp về chất lượng món ăn và dịch vụ.</p>`

    const invoiceTitle = has(invoiceOptions?.invoiceTitle)
      ? invoiceOptions.invoiceTitle
      : 'HÓA ĐƠN BÁN HÀNG'

    const prefix = has(invoiceOptions?.prefix) ? invoiceOptions.prefix : 'HD'
    const orderDate = order.createdAt ? order.createdAt.toISOString() : ''

    let paymentAccountInfo = null
    if (order.paymentMethodId && order.paymentMethodId.receivingAccountId) {
      const acc = order.paymentMethodId.receivingAccountId
      paymentAccountInfo = {
        accountName: acc.name || '',
        accountNumber: acc.accountNumber || '',
        bankName: acc.bankName || acc.bankCode || ''
      }
    }

    res.render('staff/printbill', {
      title: 'Hóa đơn thanh toán',
      order,
      orderId: order._id,
      currentUserId: req.user ? req.user._id : null,
      user: req.user || { username: 'Admin' },
      invoiceOptions,
      logoStore,
      prefix,
      invoiceTitle,
      invoiceHeader,
      invoiceFooter,
      paymentAccountInfo,
      orderDate
    })
  } catch (error) {
    console.error('Lỗi khi in hóa đơn:', error)
    responseHelper.error(res, error.message)
  }
}

export const getOrders = async (req, res) => {
  try {
    const draw = +req.query.draw || 0
    const start = +req.query.start || 0
    const length = +req.query.length || 10
    const searchValue = (req.query['search[value]'] || '').trim()
    const colIdx = req.query['order[0][column]']
    const sortField = req.query[`columns[${colIdx}][data]`] || 'createdAt'
    const sortDir = req.query['order[0][dir]'] === 'asc' ? 1 : -1

    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    // Base pipeline
    const pipeline = [
      { $match: { organization: organizationId } },
      ...lookupRef('customerId', 'Customers', { as: 'customer' }),
      ...lookupRef('tableId', 'Tables', { as: 'table' }),
      { $unwind: { path: '$items', preserveNullAndEmptyArrays: true } },
      ...lookupRef('items.foodId', 'MenuItems', { as: 'food' }),
      ...lookupRef('items.comboId', 'Combos', { as: 'combo' }),
      {
        $addFields: {
          'items.foodName': '$food.name',
          'items.comboName': '$combo.name'
        }
      },
      {
        $group: {
          _id: '$_id',
          customer: { $first: '$customer' },
          table: { $first: '$table' },
          total: { $first: '$total' },
          items: {
            $push: {
              quantity: '$items.quantity',
              price: '$items.price',
              foodName: '$items.foodName',
              comboName: '$items.comboName'
            }
          },
          updatedAt: { $first: '$updatedAt' }
        }
      }
    ]

    // Search conditions
    if (searchValue) {
      const maybeNum = Number(searchValue)
      const orConditions = [
        { 'customer.name': { $regex: searchValue, $options: 'i' } },
        { 'table.name': { $regex: searchValue, $options: 'i' } },
        { 'items.foodName': { $regex: searchValue, $options: 'i' } },
        { 'items.comboName': { $regex: searchValue, $options: 'i' } },
        {
          $expr: {
            $regexMatch: {
              input: {
                $dateToString: {
                  format: '%d/%m/%Y %H:%M:%S',
                  date: '$updatedAt',
                  timezone: '+07:00'
                }
              },
              regex: searchValue,
              options: 'i'
            }
          }
        }
      ]
      if (!isNaN(maybeNum)) {
        orConditions.push({ total: maybeNum })
      }
      pipeline.push({ $match: { $or: orConditions } })
    }

    // Tổng số records
    const recordsTotal = await Order.countDocuments({ organization: organizationId })

    // Tổng sau filter
    const countPipeline = [...pipeline, { $count: 'count' }]
    const countResult = await Order.aggregate(countPipeline)
    const recordsFiltered = countResult.length > 0 ? countResult[0].count : 0

    // Sort + limit
    const sortObj = {}
    if (['table', 'table.name'].includes(sortField)) {
      sortObj['table.name'] = sortDir
    } else if (['customer', 'customer.name'].includes(sortField)) {
      sortObj['customer.name'] = sortDir
    } else if (sortField === 'total') {
      sortObj.total = sortDir
    } else {
      sortObj[sortField] = sortDir
    }

    pipeline.push(
      { $sort: sortObj },
      { $skip: start },
      { $limit: length },
      {
        $project: {
          _id: 1,
          total: 1,
          customer: { _id: 1, name: 1 },
          table: { _id: 1, name: 1 },
          items: 1,
          updatedAt: 1
        }
      }
    )

    const data = await Order.aggregate(pipeline)

    return res.json({
      draw,
      recordsTotal,
      recordsFiltered,
      data
    })
  } catch (error) {
    return res.status(500).json({
      draw: +req.query.draw || 0,
      recordsTotal: 0,
      recordsFiltered: 0,
      data: [],
      error: error.message
    })
  }
}

export const generateInvoiceCode = async (Model, prefix = 'INV') => {
  // Tìm document mới nhất với prefix, sort theo code
  const lastDoc = await Model.findOne({ code: new RegExp(`^${prefix}\\d+$`) })
    .sort({ code: -1 }) // code lớn nhất trước
    .lean()

  let lastNumber = 0
  if (lastDoc?.code) {
    const match = lastDoc.code.match(new RegExp(`^${prefix}(\\d+)$`))
    if (match) {
      lastNumber = parseInt(match[1], 10)
    }
  }

  const nextNumber = lastNumber + 1
  const numberPart = String(nextNumber).padStart(12, '0')
  return `${prefix}${numberPart}`
}
