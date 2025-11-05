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
import { getWarehouse } from '../../helpers/warehouseHelper.js'
import Organization from '../organization/model.js'
import ProductStock from '../product/stock/model.js'
import { generateInvoiceCode } from '../../helpers/generateInvoiceCode.js'
import { formatPhoneNumber, validatePhoneNumber } from '../../helpers/validator.js'

const { POINT_VALUE, POINTS_EARN_RATE } = constants

export const createOrder = async (req, res) => {
  try {
    const result = await withTransaction(async (session) => {
      const organizationId = getCurrentOrg(req)
      if (!organizationId) {
        throw new BusinessError('Thiếu thông tin tổ chức', 400)
      }

      // Lấy warehouse dựa trên role
      const warehouse = await getWarehouse(req, organizationId)

      let { tableId, isTakeaway, customerName, customerPhone } = req.body
      let prefix = 'INV'

      const invoiceOptions = await InvoiceOption.findOne({ organizationId }).lean()
      if (invoiceOptions?.prefix?.trim()) {
        prefix = invoiceOptions.prefix.trim()
      }

      // Chuẩn hóa số điện thoại
      if (customerPhone) {
        const phoneError = validatePhoneNumber(customerPhone)
        if (phoneError) throw new BusinessError(phoneError, 400)
        customerPhone = formatPhoneNumber(customerPhone)
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

      // Base order data
      const baseOrderData = {
        status: 'open',
        organization: organizationId,
        warehouse,
        customerId: customer?._id || null,
        code: orderCode
      }

      // 2. Đơn mang đi
      if (isTakeaway) {
        const existingOrder = await Order.findOne({
          isTakeaway: true,
          status: 'open',
          organization: organizationId,
          warehouse
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
                ...baseOrderData,
                tableId: null,
                isTakeaway: true
              }
            ],
            { session }
          )
          newOrder = createdOrder
        } else {
          newOrder = await Order.create({
            ...baseOrderData,
            tableId: null,
            isTakeaway: true
          })
        }

        return {
          orderId: newOrder._id,
          orderCode: newOrder.code,
          tableId: null,
          isNewOrder: true
        }
      }

      // 3. Đơn tại bàn - không có tableId
      if (!tableId) {
        let newOrder
        if (session) {
          const [createdOrder] = await Order.create(
            [
              {
                ...baseOrderData,
                tableId: null,
                isTakeaway: false
              }
            ],
            { session }
          )
          newOrder = createdOrder
        } else {
          newOrder = await Order.create({
            ...baseOrderData,
            tableId: null,
            isTakeaway: false
          })
        }

        return {
          orderId: newOrder._id,
          orderCode: newOrder.code,
          tableId: null
        }
      }

      // 4. Đơn tại bàn - có tableId
      const table = await Table.findById(tableId)[session ? 'session' : 'exec'](
        session || undefined
      )
      if (!table) throw new BusinessError('Bàn không tồn tại', 404)
      if (table.status === 'occupied') throw new BusinessError('Bàn đã có khách', 409)

      let newOrder
      if (session) {
        const [createdOrder] = await Order.create(
          [
            {
              ...baseOrderData,
              tableId,
              isTakeaway: false
            }
          ],
          { session }
        )
        newOrder = createdOrder
      } else {
        newOrder = await Order.create({
          ...baseOrderData,
          tableId,
          isTakeaway: false
        })
      }

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
    if (error instanceof BusinessError) {
      return responseHelper.error(res, error.message, error.statusCode)
    }
    responseHelper.error(res, error.message)
  }
}

export const getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params

    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    // Build match condition với warehouse filter
    const matchCondition = {
      _id: orderId,
      organization: organizationId
    }

    if (req.warehouseFilter) {
      // Staff user - chỉ thấy kho được gán
      matchCondition.warehouse = req.warehouseFilter
    } else {
      // Admin/Org - sử dụng defaultWarehouse
      const org = await Organization.findById(organizationId).select('defaultWarehouse')
      if (org?.defaultWarehouse) {
        matchCondition.warehouse = org.defaultWarehouse
      }
    }

    const order = await Order.findOne(matchCondition)
      .populate('tableId', 'name area')
      .populate('items.foodId', 'name price')
      .populate('items.comboId', 'name price')
      .populate('customerId', 'name phone totalPoints')
      .populate('organization', 'name phone province commune street logo')
      .populate('warehouse', 'name location')
      .populate({
        path: 'paymentMethodId',
        populate: {
          path: 'receivingAccountId',
          model: 'ReceivingAccount',
          select: 'name type accountNumber bankName isActive'
        }
      })
      .lean()

    if (!order) {
      return responseHelper.error(res, 'Order không tồn tại hoặc không có quyền truy cập', 404)
    }

    responseHelper.success(res, order)
  } catch (error) {
    responseHelper.error(res, error.message)
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

    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    const warehouse = await getWarehouse(req, organizationId)

    const matchCondition = {
      _id: orderId,
      organization: organizationId,
      warehouse
    }

    const order = await Order.findOne(matchCondition)
    if (!order) {
      return responseHelper.error(res, 'Order không tồn tại hoặc không có quyền truy cập', 404)
    }
    if (order.status !== 'open') {
      return responseHelper.error(res, 'Order đã đóng', 400)
    }

    // Nếu là combo
    if (comboId) {
      // 1. Check combo tồn tại và active
      const combo = await Combo.findOne({
        _id: comboId,
        organization: organizationId,
        isActive: true
      })
      if (!combo) {
        return responseHelper.error(res, 'Combo không tồn tại hoặc đã bị vô hiệu hóa', 404)
      }

      // 2. Check tồn kho
      const comboStock = await ProductStock.findOne({
        combo: comboId,
        warehouse,
        organization: organizationId
      })

      // Nếu không có record hoặc quantity = 0
      if (!comboStock || comboStock.quantity <= 0) {
        return responseHelper.error(res, `Combo "${combo.name}" hiện đã hết hàng`, 400)
      }

      // 3. Check số lượng yêu cầu
      const existingCombo = order.items.find((item) => item.comboId?.toString() === comboId)
      const currentOrderQuantity = existingCombo ? existingCombo.quantity : 0
      const totalQuantity = currentOrderQuantity + quantity

      if (comboStock.quantity < totalQuantity) {
        return responseHelper.error(
          res,
          `Combo "${combo.name}" không đủ số lượng. Còn lại: ${comboStock.quantity}${currentOrderQuantity > 0 ? `, đang có trong order: ${currentOrderQuantity}` : ''}`,
          400
        )
      }

      // 4. Add to order
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
      // 1. Check món ăn tồn tại và active
      const menuItem = await MenuItem.findOne({
        _id: foodId,
        organization: organizationId,
        isActive: true
      })
      if (!menuItem) {
        return responseHelper.error(res, 'Món ăn không tồn tại hoặc đã bị vô hiệu hóa', 404)
      }

      // 2. Check tồn kho
      const productStock = await ProductStock.findOne({
        product: foodId,
        warehouse,
        organization: organizationId
      })

      // Nếu không có record hoặc quantity = 0
      if (!productStock || productStock.quantity <= 0) {
        return responseHelper.error(res, `Món ăn "${menuItem.name}" hiện đã hết hàng`, 400)
      }

      // 3. Check số lượng yêu cầu
      const existingItem = order.items.find((item) => item.foodId?.toString() === foodId)
      const currentOrderQuantity = existingItem ? existingItem.quantity : 0
      const totalQuantity = currentOrderQuantity + quantity

      if (productStock.quantity < totalQuantity) {
        return responseHelper.error(
          res,
          `Món ăn "${menuItem.name}" không đủ số lượng. Còn lại: ${productStock.quantity}${currentOrderQuantity > 0 ? `, đang có trong order: ${currentOrderQuantity}` : ''}`,
          400
        )
      }

      // 4. Add to order
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
      } catch {}
    }

    const populatedOrder = await Order.findById(orderId)
      .populate('items.foodId', 'name price')
      .populate('items.comboId', 'name price')
      .lean()

    responseHelper.success(res, populatedOrder)
  } catch (error) {
    if (error instanceof BusinessError) {
      return responseHelper.error(res, error.message, error.statusCode)
    }
    responseHelper.error(res, error.message)
  }
}

export const updateItemQuantity = async (req, res) => {
  try {
    const { orderId } = req.params
    const { itemId, quantity, type } = req.body

    if (!itemId || typeof quantity !== 'number' || quantity <= 0) {
      return responseHelper.error(res, 'Thông tin không hợp lệ', 400)
    }

    if (!['food', 'combo'].includes(type)) {
      return responseHelper.error(res, 'Loại item không hợp lệ', 400)
    }

    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    const warehouse = await getWarehouse(req, organizationId)

    // Build match condition với warehouse filter
    const matchCondition = {
      _id: orderId,
      organization: organizationId,
      warehouse
    }

    const order = await Order.findOne(matchCondition)
    if (!order) {
      return responseHelper.error(res, 'Order không tồn tại hoặc không có quyền truy cập', 404)
    }
    if (order.status !== 'open') {
      return responseHelper.error(res, 'Order đã đóng', 400)
    }

    // Tìm item trong order
    const item = order.items.find((item) => {
      if (type === 'food') return item.foodId?.toString() === itemId
      if (type === 'combo') return item.comboId?.toString() === itemId
    })

    if (!item) {
      return responseHelper.error(
        res,
        `${type === 'food' ? 'Món ăn' : 'Combo'} không có trong order`,
        404
      )
    }

    // Check ProductStock trước khi update
    if (type === 'combo') {
      const combo = await Combo.findOne({
        _id: itemId,
        organization: organizationId,
        isActive: true
      })
      if (!combo) {
        return responseHelper.error(res, 'Combo không tồn tại hoặc đã bị vô hiệu hóa', 404)
      }

      const comboStock = await ProductStock.findOne({
        combo: itemId,
        warehouse,
        organization: organizationId
      })

      if (!comboStock || comboStock.quantity <= 0) {
        return responseHelper.error(res, `Combo "${combo.name}" hiện đã hết hàng tại kho này`, 400)
      }

      if (comboStock.quantity < quantity) {
        return responseHelper.error(
          res,
          `Combo "${combo.name}" không đủ số lượng. Còn lại: ${comboStock.quantity}`,
          400
        )
      }
    }

    if (type === 'food') {
      const menuItem = await MenuItem.findOne({
        _id: itemId,
        organization: organizationId,
        isActive: true
      })
      if (!menuItem) {
        return responseHelper.error(res, 'Món ăn không tồn tại hoặc đã bị vô hiệu hóa', 404)
      }

      const productStock = await ProductStock.findOne({
        product: itemId,
        warehouse,
        organization: organizationId
      })

      if (!productStock || productStock.quantity <= 0) {
        return responseHelper.error(
          res,
          `Món ăn "${menuItem.name}" hiện đã hết hàng tại kho này`,
          400
        )
      }

      if (productStock.quantity < quantity) {
        return responseHelper.error(
          res,
          `Món ăn "${menuItem.name}" không đủ số lượng. Còn lại: ${productStock.quantity}`,
          400
        )
      }
    }

    item.quantity = quantity

    // cập nhật total và save
    order.totalAmount = calcOrderTotal(order.items)
    await order.save()

    if (order.tableId) {
      await Table.findByIdAndUpdate(order.tableId, {
        totalAmount: order.totalAmount
      }).catch(() => {})
    }

    const populatedOrder = await Order.findById(orderId)
      .populate('items.foodId', 'name price')
      .populate('items.comboId', 'name price')
      .lean()

    responseHelper.success(res, populatedOrder)
  } catch (error) {
    if (error instanceof BusinessError) {
      return responseHelper.error(res, error.message, error.statusCode)
    }
    responseHelper.error(res, error.message)
  }
}

export const removeItemFromOrder = async (req, res) => {
  try {
    const { orderId, itemId } = req.params
    const { type } = req.query

    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    const warehouse = await getWarehouse(req, organizationId)

    // Build match condition với warehouse filter
    const matchCondition = {
      _id: orderId,
      organization: organizationId,
      warehouse
    }

    if (!['food', 'combo'].includes(type)) {
      return responseHelper.error(res, 'Loại item không hợp lệ', 400)
    }

    const order = await Order.findOne(matchCondition)
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
      } catch {}
    }

    const populatedOrder = await Order.findById(orderId)
      .populate('items.foodId', 'name price')
      .populate('items.comboId', 'name price')
      .lean()

    responseHelper.success(res, populatedOrder)
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const checkoutOrder = async (req, res) => {
  try {
    const { orderId } = req.params
    const {
      discount = 0,
      pointsUsed = 0,
      serviceCharge = 0,
      extraDiscount = 0,
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
    const parsedextraDiscount = Number(extraDiscount) || 0
    const parsedVatRate = Number(vatRate) || 0
    const parsedCustomerPaid = Number(customerPaid) || 0

    if (
      parsedDiscount < 0 ||
      parsedPointsUsed < 0 ||
      parsedServiceCharge < 0 ||
      parsedVatRate < 0 ||
      parsedextraDiscount < 0
    )
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

      if (!Array.isArray(order.items) || order.items.length == 0) {
        throw new BusinessError('Đơn hàng phải có ít nhất 1 sản phẩm ', 400)
      }

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
        totalAmount -
        parsedDiscount -
        calculatedPointsDiscount -
        parsedextraDiscount +
        parsedServiceCharge
      const total = Math.round(totalPayable + (totalPayable * parsedVatRate) / 100)

      if (parsedCustomerPaid < total)
        throw new BusinessError(
          `Số tiền khách trả chưa đủ. Cần: ${total.toLocaleString()}, có: ${parsedCustomerPaid.toLocaleString()}`,
          400
        )

      // 4. VALIDATE & DEDUCT PRODUCT STOCK (BEFORE completing order)
      for (const item of order.items) {
        if (item.foodId) {
          // Validate MenuItem stock
          const productStock = await ProductStock.findOne({
            product: item.foodId,
            warehouse: order.warehouse,
            organization: order.organization
          }).session(session)

          if (!productStock || productStock.quantity < item.quantity) {
            const menuItem = await MenuItem.findById(item.foodId)
            throw new BusinessError(
              `Món ăn "${menuItem?.name || 'Unknown'}" không đủ số lượng trong kho. Còn lại: ${productStock?.quantity || 0}, cần: ${item.quantity}`,
              400
            )
          }

          // Deduct stock atomically
          const stockUpdateResult = await ProductStock.findOneAndUpdate(
            {
              product: item.foodId,
              warehouse: order.warehouse,
              organization: order.organization,
              quantity: { $gte: item.quantity } // Ensure quantity is still enough
            },
            {
              $inc: { quantity: -item.quantity },
              $set: { updatedAt: new Date() }
            },
            { session, new: true }
          )

          if (!stockUpdateResult) {
            const menuItem = await MenuItem.findById(item.foodId)
            throw new BusinessError(
              `Tồn kho của "${menuItem?.name || 'Unknown'}" đã thay đổi, vui lòng thử lại`,
              409
            )
          }
        }

        if (item.comboId) {
          // Validate Combo stock
          const comboStock = await ProductStock.findOne({
            combo: item.comboId,
            warehouse: order.warehouse,
            organization: order.organization
          }).session(session)

          if (!comboStock || comboStock.quantity < item.quantity) {
            const combo = await Combo.findById(item.comboId)
            throw new BusinessError(
              `Combo "${combo?.name || 'Unknown'}" không đủ số lượng trong kho. Còn lại: ${comboStock?.quantity || 0}, cần: ${item.quantity}`,
              400
            )
          }

          // Deduct stock atomically
          const stockUpdateResult = await ProductStock.findOneAndUpdate(
            {
              combo: item.comboId,
              warehouse: order.warehouse,
              organization: order.organization,
              quantity: { $gte: item.quantity }
            },
            {
              $inc: { quantity: -item.quantity },
              $set: { updatedAt: new Date() }
            },
            { session, new: true }
          )

          if (!stockUpdateResult) {
            const combo = await Combo.findById(item.comboId)
            throw new BusinessError(
              `Tồn kho của "${combo?.name || 'Unknown'}" đã thay đổi, vui lòng thử lại`,
              409
            )
          }
        }
      }

      // 5. Handle customer points and updates
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
        throw new BusinessError('Khách lẻ không thể sử dụng điểm', 400)
      }

      // 6. Generate VietQR URL
      let qrCodeUrl = null
      if (['bank', 'e-wallet'].includes(paymentType) && receivingAccountId) {
        const receivingAccount = receivingAccountId

        const bankCode = receivingAccount.bankCode || 'MB'
        const accountNumber = receivingAccount.accountNumber

        if (accountNumber && bankCode) {
          const description = order.code

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

      // 7. UPDATE ORDER
      order.discount = parsedDiscount
      order.pointsUsed = parsedPointsUsed
      order.pointsDiscount = calculatedPointsDiscount
      order.serviceCharge = parsedServiceCharge
      order.extraDiscount = parsedextraDiscount
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

      // 8. RELEASE TABLE
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
        extraDiscount: parsedextraDiscount,
        vatRate: parsedVatRate,
        totalPayable,
        total,
        changeAmount: parsedCustomerPaid - total,
        qrCodeUrl
      }
    })

    return responseHelper.success(res, result, 'Thanh toán thành công')
  } catch (error) {
    if (error instanceof BusinessError) {
      return responseHelper.error(res, error.message, error.statusCode)
    } else {
      return responseHelper.error(res, error.message)
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
      extraDiscount = 0,
      vatRate = 0,
      customerPaid = 0
    } = req.body

    if (!orderId) return responseHelper.error(res, 'Thiếu orderId', 400)

    const parsedDiscount = Number(discount) || 0
    const parsedPointsUsed = Number(pointsUsed) || 0
    const parsedServiceCharge = Number(serviceCharge) || 0
    const parsedExtraDiscount = Number(extraDiscount) || 0
    const parsedVatRate = Number(vatRate) || 0
    const parsedCustomerPaid = Number(customerPaid) || 0

    // Validation: không cho phép giá trị âm
    if (
      parsedDiscount < 0 ||
      parsedPointsUsed < 0 ||
      parsedServiceCharge < 0 ||
      parsedExtraDiscount < 0 ||
      parsedVatRate < 0 ||
      parsedCustomerPaid < 0
    ) {
      return responseHelper.error(res, 'Các giá trị không được âm', 400)
    }

    // Early validation: kiểm tra nếu dùng điểm thì phải có khách hàng
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
      // 1. Lấy và validate order
      const order = await Order.findById(orderId).session(session)
      if (!order) throw new BusinessError('Order không tồn tại', 404)

      // Kiểm tra order phải có items
      if (!Array.isArray(order.items) || order.items.length === 0) {
        throw new BusinessError('Đơn hàng phải có ít nhất 1 sản phẩm', 400)
      }

      // 2. Tính tổng tiền hàng
      const totalAmount = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0)

      // Validation: giảm giá không được vượt quá tổng tiền
      if (parsedDiscount > totalAmount) {
        throw new BusinessError('Giảm giá không được vượt quá tổng tiền', 400)
      }

      // 3. Xử lý điểm tích lũy
      let availablePoints = 0
      if (order.customerId) {
        const customer = await Customer.findById(order.customerId).session(session)
        if (!customer) throw new BusinessError('Khách hàng không tồn tại', 404)

        availablePoints = customer.totalPoints

        // Validation: kiểm tra đủ điểm
        if (parsedPointsUsed > 0 && customer.totalPoints < parsedPointsUsed) {
          throw new BusinessError(
            `Không đủ điểm tích lũy. Hiện có: ${customer.totalPoints}, cần: ${parsedPointsUsed}`,
            400
          )
        }
      } else if (parsedPointsUsed > 0) {
        throw new BusinessError('Khách lẻ không thể sử dụng điểm', 400)
      }

      // 4. Tính toán các khoản tiền
      const pointsDiscount = parsedPointsUsed * POINT_VALUE
      const totalPayable =
        totalAmount - parsedDiscount - pointsDiscount - parsedExtraDiscount + parsedServiceCharge

      const vatAmount = Math.round((totalPayable * parsedVatRate) / 100)
      const total = Math.round(totalPayable + vatAmount)
      const changeAmount = parsedCustomerPaid - total

      // 5. Tìm/Gán payment method mặc định là Bank và Generate VietQR
      let qrCodeUrl = null
      let receivingAccountId = null
      let paymentMethodId = order.paymentMethodId

      // Nếu order chưa có paymentMethodId, tìm payment method Bank mặc định
      if (!paymentMethodId) {
        const defaultBankPayment = await PaymentMethod.findOne({
          organization: order.organization,
          type: 'bank',
          isActive: true
        })
          .session(session)
          .sort({ createdAt: 1 })

        if (defaultBankPayment) {
          paymentMethodId = defaultBankPayment._id
        }
      }

      // Lấy thông tin payment method và receiving account
      if (paymentMethodId) {
        const paymentMethod = await PaymentMethod.findById(paymentMethodId)
          .populate('receivingAccountId')
          .session(session)

        if (paymentMethod && paymentMethod.type === 'bank') {
          receivingAccountId = paymentMethod.receivingAccountId
        }
      }

      // Nếu không có receiving account, tìm bank account mặc định
      if (!receivingAccountId) {
        receivingAccountId = await ReceivingAccount.findOne({
          organization: order.organization,
          type: 'bank',
          isActive: true
        })
          .session(session)
          .sort({ createdAt: -1 })
      }

      // Generate QR code cho bank transfer
      if (receivingAccountId) {
        const bankCode = receivingAccountId.bankCode || 'MB'
        const accountNumber = receivingAccountId.accountNumber

        if (accountNumber && bankCode) {
          const description = order.code || `DRAFT_${order._id}`
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

      // 6. Cập nhật order
      order.discount = parsedDiscount
      order.pointsUsed = parsedPointsUsed
      order.pointsDiscount = pointsDiscount
      order.serviceCharge = parsedServiceCharge
      order.extraDiscount = parsedExtraDiscount
      order.vatRate = parsedVatRate
      order.totalAmount = totalAmount
      order.totalPayable = totalPayable
      order.total = total
      order.customerPaid = parsedCustomerPaid
      order.changeAmount = changeAmount

      if (paymentMethodId) {
        order.paymentMethodId = paymentMethodId
      }

      if (qrCodeUrl) {
        order.qrCode = qrCodeUrl
      }

      order.updatedAt = new Date()

      await order.save({ session })

      // 7. Trả về kết quả chi tiết
      return {
        orderId: order._id,
        orderCode: order.code,
        totalAmount,
        discount: parsedDiscount,
        pointsUsed: parsedPointsUsed,
        pointsDiscount,
        availablePoints,
        serviceCharge: parsedServiceCharge,
        extraDiscount: parsedExtraDiscount,
        vatRate: parsedVatRate,
        vatAmount,
        totalPayable,
        total,
        customerPaid: parsedCustomerPaid,
        changeAmount,
        paymentMethodId: order.paymentMethodId,
        qrCodeUrl
      }
    })

    return responseHelper.success(res, result, 'Cập nhật phiếu tạm tính thành công')
  } catch (error) {
    if (error instanceof BusinessError) {
      return responseHelper.error(res, error.message, error.statusCode)
    } else {
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

    const orgId = order.organization ? order.organization._id : null
    if (!orgId) return res.status(400).send('Đơn hàng không có thông tin tổ chức')

    // Lấy warehouse theo role
    const warehouseId = await getWarehouse(req, orgId)

    // Query invoice options cho warehouse cụ thể
    const invoiceOptions = await InvoiceOption.findOne({
      organizationId: orgId,
      warehouseId
    }).lean()

    // Dùng giá trị từ invoiceOptions hoặc default
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
    if (error instanceof BusinessError) {
      return res.status(error.statusCode).send(error.message)
    }
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
    const empty = req.query.empty === 'true'
    const statusFilter = req.query.status
    const startDate = req.query.startDate
    const endDate = req.query.endDate
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    // Base match object
    const match = { organization: organizationId }

    if (req.warehouseFilter) {
      // Staff user - chỉ thấy kho được gán
      match.warehouse = req.warehouseFilter
    } else {
      // Admin/Org - sử dụng defaultWarehouse
      const org = await Organization.findById(organizationId).select('defaultWarehouse')
      if (org?.defaultWarehouse) {
        match.warehouse = org.defaultWarehouse
      }
    }

    if (empty) {
      match.tableId = null
      match.status = 'open'
    } else if (statusFilter) {
      match.status = statusFilter
    }

    // Thêm điều kiện lọc ngày
    if (startDate || endDate) {
      match.updatedAt = {}
      if (startDate) {
        match.updatedAt.$gte = new Date(startDate)
      }
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        match.updatedAt.$lte = end
      }
    }
    // Base pipeline
    const pipeline = [
      { $match: match },
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
          code: { $first: '$code' },
          customer: { $first: '$customer' },
          table: { $first: '$table' },
          total: { $first: '$total' },
          totalPayable: { $first: '$totalPayable' },
          vatRate: { $first: '$vatRate' },
          items: {
            $push: {
              quantity: '$items.quantity',
              price: '$items.price',
              foodName: '$items.foodName',
              comboName: '$items.comboName'
            }
          },
          createdAt: { $first: '$createdAt' },
          updatedAt: { $first: '$updatedAt' }
        }
      }
    ]

    // Search conditions
    if (searchValue) {
      const maybeNum = Number(searchValue)
      const orConditions = [
        { code: { $regex: searchValue, $options: 'i' } },
        { 'customer.name': { $regex: searchValue, $options: 'i' } },
        {
          $or: [
            { 'table.name': { $regex: searchValue, $options: 'i' } },
            {
              $and: [
                { table: { $eq: null } },
                { $expr: { $regexMatch: { input: 'Mang về', regex: searchValue, options: 'i' } } }
              ]
            }
          ]
        },
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

    // Tính thống kê đơn hàng (số lượng đơn, tổng tiền, trung bình, tổng món, tổng combo)
    const summaryPipeline = [
      { $match: match },
      {
        $addFields: {
          // Tổng số món (bao gồm food + combo)
          orderTotalItems: {
            $sum: {
              $map: {
                input: '$items',
                as: 'item',
                in: { $ifNull: ['$$item.quantity', 0] }
              }
            }
          },
          // Tổng combo đã bán
          orderTotalCombos: {
            $sum: {
              $map: {
                input: '$items',
                as: 'item',
                in: {
                  $cond: [
                    { $ifNull: ['$$item.comboId', false] }, // nếu có comboId
                    { $ifNull: ['$$item.quantity', 0] },
                    0
                  ]
                }
              }
            }
          }
        }
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalAmount: { $sum: '$total' },
          avgAmount: { $avg: '$total' },
          totalItems: { $sum: '$orderTotalItems' },
          totalCombos: { $sum: '$orderTotalCombos' }
        }
      }
    ]

    const summaryResult = await Order.aggregate(summaryPipeline)
    const summary =
      summaryResult.length > 0 ? summaryResult[0] : { totalOrders: 0, totalAmount: 0, avgAmount: 0 }

    const sortFieldMap = {
      table: 'table.name',
      'table.name': 'table.name',
      customer: 'customer.name',
      'customer.name': 'customer.name'
    }

    const actualSortField = sortFieldMap[sortField] || sortField
    const sortObj = {
      [actualSortField]: sortDir,
      _id: 1
    }

    pipeline.push(
      { $sort: sortObj },
      { $skip: start },
      { $limit: length },
      {
        $project: {
          _id: 1,
          code: 1,
          total: 1,
          totalPayable: 1,
          vatRate: 1,
          customer: { _id: 1, name: 1 },
          table: { _id: 1, name: 1, area: 1 },
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
      data,
      summary: {
        totalOrders: summary.totalOrders,
        totalAmount: summary.totalAmount,
        avgAmount: summary.avgAmount,
        totalItems: summary.totalItems,
        totalCombos: summary.totalCombos || 0
      }
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

export const getTopItems = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req)
    if (!organizationId) {
      return res.status(400).json({ error: 'Thiếu thông tin tổ chức' })
    }

    const startDate = req.query.startDate ? new Date(req.query.startDate) : null
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null

    if (startDate) startDate.setHours(0, 0, 0, 0)
    if (endDate) endDate.setHours(23, 59, 59, 999)

    // ===== Base match =====
    const match = { organization: organizationId }

    // ✅ Thêm điều kiện warehouse (giống getOrders)
    if (req.warehouseFilter) {
      // Nếu user là staff → chỉ thấy kho được gán
      match.warehouse = req.warehouseFilter
    } else {
      // Nếu admin hoặc org → dùng default warehouse
      const org = await Organization.findById(organizationId).select('defaultWarehouse')
      if (org?.defaultWarehouse) {
        match.warehouse = org.defaultWarehouse
      }
    }

    // ===== Thêm điều kiện thời gian =====
    if (startDate || endDate) {
      match.updatedAt = {}
      if (startDate) match.updatedAt.$gte = startDate
      if (endDate) match.updatedAt.$lte = endDate
    }

    // ===== Pipeline =====
    const pipeline = [
      { $match: match },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'MenuItems',
          localField: 'items.foodId',
          foreignField: '_id',
          as: 'food'
        }
      },
      {
        $lookup: {
          from: 'Combos',
          localField: 'items.comboId',
          foreignField: '_id',
          as: 'combo'
        }
      },
      {
        $addFields: {
          'items.name': {
            $ifNull: [{ $arrayElemAt: ['$food.name', 0] }, { $arrayElemAt: ['$combo.name', 0] }]
          }
        }
      },
      {
        $group: {
          _id: {
            foodId: '$items.foodId',
            comboId: '$items.comboId'
          },
          name: { $first: '$items.name' },
          quantity: { $sum: { $ifNull: ['$items.quantity', 0] } },
          total: {
            $sum: {
              $multiply: [{ $ifNull: ['$items.quantity', 0] }, { $ifNull: ['$items.price', 0] }]
            }
          }
        }
      },
      {
        $match: {
          $or: [{ '_id.foodId': { $ne: null } }, { '_id.comboId': { $ne: null } }]
        }
      }
    ]

    const items = await Order.aggregate(pipeline)

    // ===== Chia món ăn / combo =====
    const { foodItems, comboItems } = items.reduce(
      (acc, item) => {
        if (item._id.foodId) acc.foodItems.push(item)
        if (item._id.comboId) acc.comboItems.push(item)
        return acc
      },
      { foodItems: [], comboItems: [] }
    )

    // ===== Xử lý top / slow =====
    const getTopAndSlow = (list, limit = 3) => {
      if (!list.length) return { top: [], slow: [] }
      const sorted = [...list].sort((a, b) => b.quantity - a.quantity)
      return {
        top: sorted.slice(0, limit),
        slow: sorted.slice(-limit).reverse()
      }
    }

    const { top: topSellingFoods, slow: slowSellingFoods } = getTopAndSlow(foodItems)
    const { top: topSellingCombos, slow: slowSellingCombos } = getTopAndSlow(comboItems)

    return res.json({
      topSellingFoods,
      slowSellingFoods,
      topSellingCombos,
      slowSellingCombos
    })
  } catch (err) {
    console.error('getTopItems error:', err.stack)
    return res.status(500).json({ error: err.message })
  }
}

export const assignCustomerToOrder = async (req, res) => {
  try {
    const { orderId } = req.params
    const { customerId } = req.body
    const organizationId = getCurrentOrg(req)

    if (!orderId || !customerId) {
      return responseHelper.error(res, 'Thiếu thông tin đơn hàng hoặc khách hàng', 400)
    }

    const [order, customer] = await Promise.all([
      Order.findOne({ _id: orderId, organization: organizationId }),
      Customer.findOne({ _id: customerId, organization: organizationId })
    ])

    if (!order) return responseHelper.error(res, 'Đơn hàng không tồn tại', 404)
    if (!customer) return responseHelper.error(res, 'Khách hàng không tồn tại', 404)
    if (order.customerId) return responseHelper.error(res, 'Đơn hàng đã có khách hàng', 400)

    order.customerId = customer._id
    await order.save()

    const { _id, name, phone, totalPoints = 0 } = customer

    return responseHelper.success(res, {
      message: 'Gán khách hàng thành công',
      customer: { _id, name, phone, totalPoints }
    })
  } catch (error) {
    console.error('assignCustomerToOrder error:', error)
    return responseHelper.error(res, 'Có lỗi xảy ra khi gán khách hàng')
  }
}

export const assignTableToOrder = async (req, res) => {
  try {
    const result = await withTransaction(async (session) => {
      const organizationId = getCurrentOrg(req)
      if (!organizationId) throw new BusinessError('Thiếu thông tin tổ chức', 400)

      const { orderId } = req.params
      const { tableId } = req.body
      if (!orderId || !tableId) throw new BusinessError('Thiếu orderId hoặc tableId', 400)

      // Tìm order trống
      const order = await Order.findOne({
        _id: orderId,
        organization: organizationId,
        status: 'open'
      }).session(session)
      if (!order) throw new BusinessError('Order không tồn tại hoặc không hợp lệ', 404)

      // Kiểm tra bàn
      const table = await Table.findById(tableId).session(session)
      if (!table) throw new BusinessError('Bàn không tồn tại')
      if (table.status === 'occupied') throw new BusinessError('Bàn đã có khách', 409)

      await Promise.all([
        Order.updateOne({ _id: orderId }, { tableId, isTakeaway: false }, { session }),
        Table.updateOne(
          { _id: tableId },
          {
            status: 'occupied',
            checkInTime: new Date(),
            currentOrderId: order._id,
            orderCode: order.code
          },
          { session }
        )
      ])

      return { orderId: order._id, tableId }
    })

    responseHelper.success(res, result)
  } catch (error) {
    console.error('Assign table to order error:', error)
    responseHelper.error(res, error.message)
  }
}
