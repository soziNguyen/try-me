import Order from './model.js'
import Table from '../table/model.js'
import { MenuItem } from '../menu/menu-item/model.js'
import { Combo } from '../menu/combo/model.js'
import Customer from '../customer/model.js'
import responseHelper from '../../helpers/responseHelper.js'
import { getCurrentOrg } from '../../helpers/orgHelper.js'
import withTransaction from '../../helpers/withTransaction.js'

export const createOrder = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req)
    if (!organizationId) {
      return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)
    }

    const { tableId, isTakeaway, customerName, customerPhone } = req.body

    // 1. Xử lý khách hàng theo organization + phone
    let customer = null
    if (customerPhone) {
      customer = await Customer.findOneAndUpdate(
        { organization: organizationId, phone: customerPhone },
        {
          $setOnInsert: {
            organization: organizationId,
            name: customerName?.trim() || 'Khách lẻ',
            phone: customerPhone,
            totalOrders: 0,
            lastOrderDate: null
          }
        },
        { upsert: true, new: true }
      )
    }

    // 2. Đơn mang đi
    if (isTakeaway) {
      const existingOrder = await Order.findOne({
        isTakeaway: true,
        status: 'open',
        organization: organizationId
      })

      if (existingOrder) {
        return responseHelper.success(res, {
          orderId: existingOrder._id,
          tableId: null,
          isNewOrder: false
        })
      }

      const newOrder = await Order.create({
        tableId: null,
        isTakeaway: true,
        status: 'open',
        organization: organizationId,
        customerId: customer?._id || null
      })

      if (customer) {
        await Customer.findByIdAndUpdate(customer._id, {
          $inc: { totalOrders: 1 },
          lastOrderDate: new Date()
        })
      }

      return responseHelper.success(res, {
        orderId: newOrder._id,
        tableId: null,
        isNewOrder: true
      })
    }

    // 3. Đơn tại bàn
    if (!tableId) {
      return responseHelper.error(res, 'Thiếu thông tin bàn', 400)
    }

    const table = await Table.findById(tableId)
    if (!table) return responseHelper.error(res, 'Bàn không tồn tại', 404)
    if (table.status === 'occupied')
      return responseHelper.error(res, 'Bàn đã có khách', 400)

    const newOrder = await Order.create({
      tableId,
      isTakeaway: false,
      status: 'open',
      organization: organizationId,
      customerId: customer?._id || null
    })

    // Cập nhật trạng thái bàn
    table.status = 'occupied'
    table.checkInTime = new Date()
    table.currentOrderId = newOrder._id
    table.customerName = customerName?.trim() || 'Khách lẻ'
    await table.save()

    // Cập nhật lịch sử mua hàng của khách
    if (customer) {
      await Customer.findByIdAndUpdate(customer._id, {
        $inc: { totalOrders: 1 },
        lastOrderDate: new Date()
      })
    }

    responseHelper.success(res, { orderId: newOrder._id, tableId: table._id })
  } catch (error) {
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
    if (order.status !== 'open')
      return responseHelper.error(res, 'Order đã đóng', 400)

    // Nếu là combo
    if (comboId) {
      const combo = await Combo.findById(comboId)
      if (!combo) return responseHelper.error(res, 'Combo không tồn tại', 404)

      const existingCombo = order.items.find(
        (item) => item.comboId?.toString() === comboId
      )
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
      if (!menuItem)
        return responseHelper.error(res, 'Món ăn không tồn tại', 404)

      const existingItem = order.items.find(
        (item) => item.foodId?.toString() === foodId
      )
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
    if (order.status !== 'open')
      return responseHelper.error(res, 'Order đã đóng', 400)

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
    if (order.status !== 'open')
      return responseHelper.error(res, 'Order đã đóng', 400)

    // Tìm item cần xoá
    const itemIndex = order.items.findIndex((item) => {
      if (type === 'food') return item.foodId?.toString() === itemId
      if (type === 'combo') return item.comboId?.toString() === itemId
    })

    if (itemIndex === -1) {
      return responseHelper.error(
        res,
        'Món/combo không tồn tại trong order',
        404
      )
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

    console.log(paymentMethodId)

    // === VALIDATION ===
    if (!orderId) return responseHelper.error(res, 'Thiếu orderId', 400)
    if (!paymentMethodId)
      return responseHelper.error(
        res,
        'Phương thức thanh toán không hợp lệ',
        400
      )

    const parsedDiscount = Number(discount) || 0
    const parsedPointsUsed = Number(pointsUsed) || 0
    const parsedServiceCharge = Number(serviceCharge) || 0
    const parsedVatRate = Number(vatRate) || 0
    const parsedCustomerPaid = Number(customerPaid) || 0

    // Validate số âm
    if (
      parsedDiscount < 0 ||
      parsedPointsUsed < 0 ||
      parsedServiceCharge < 0 ||
      parsedVatRate < 0
    ) {
      return responseHelper.error(res, 'Các giá trị không được âm', 400)
    }

    if (parsedCustomerPaid <= 0) {
      return responseHelper.error(res, 'Số tiền khách trả không hợp lệ', 400)
    }

    // === TRANSACTION LOGIC ===
    const result = await withTransaction(async (session) => {
      // === GET ORDER ===
      const order = await Order.findById(orderId).session(session)
      if (!order) {
        throw new Error('Order không tồn tại')
      }

      if (order.status !== 'open') {
        throw new Error('Order đã được thanh toán hoặc đã đóng')
      }

      // === CUSTOMER POINTS VALIDATION ===
      let customer = null
      if (order.customerId && parsedPointsUsed > 0) {
        customer = await Customer.findById(order.customerId).session(session)
        if (!customer) {
          throw new Error('Khách hàng không tồn tại')
        }

        if (customer.totalPoints < parsedPointsUsed) {
          throw new Error(
            `Không đủ điểm tích lũy. Hiện có: ${customer.totalPoints}, cần: ${parsedPointsUsed}`
          )
        }
      }

      // === CALCULATE AMOUNTS ===
      const POINT_VALUE = 500

      // Tính tổng tiền gốc
      const totalAmount = order.items.reduce((sum, item) => {
        return sum + item.price * item.quantity
      }, 0)

      // Validate discount không vượt quá totalAmount
      if (parsedDiscount > totalAmount) {
        throw new Error('Giảm giá không được vượt quá tổng tiền')
      }

      // Tính điểm giảm giá (chỉ tính ở backend để đảm bảo chính xác)
      const calculatedPointsDiscount = parsedPointsUsed * POINT_VALUE

      // Tổng sau giảm giá & phụ phí
      const totalPayable =
        totalAmount -
        parsedDiscount -
        calculatedPointsDiscount +
        parsedServiceCharge

      // Tổng cuối cùng sau VAT
      const total = Math.round(
        totalPayable + (totalPayable * parsedVatRate) / 100
      )

      if (parsedCustomerPaid < total) {
        throw new Error(
          `Số tiền khách trả chưa đủ. Cần: ${total.toLocaleString()}, có: ${parsedCustomerPaid.toLocaleString()}`
        )
      }

      // === UPDATE DATABASE ===
      // 1. Cập nhật Order
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

      await order.save({ session })

      // 2. Giải phóng bàn
      if (order.tableId) {
        await Table.findByIdAndUpdate(
          order.tableId,
          {
            status: 'available',
            currentOrderId: null,
            updatedAt: new Date()
          },
          { session }
        )
      }

      // 3. Cập nhật thông tin khách hàng
      if (order.customerId) {
        if (!customer) {
          customer = await Customer.findById(order.customerId).session(session)
        }

        if (customer) {
          // Tính điểm tích lũy mới (1 điểm cho mỗi 10,000 VNĐ)
          const pointsEarned = Math.floor(total / 10000)

          // Cập nhật customer
          await Customer.findByIdAndUpdate(
            order.customerId,
            {
              $inc: {
                totalOrders: 1,
                totalSpent: total
              },
              $set: {
                totalPoints:
                  customer.totalPoints - parsedPointsUsed + pointsEarned,
                lastOrderDate: new Date(),
                updatedAt: new Date()
              }
            },
            { session }
          )
        }
      }

      // Trả về dữ liệu cho response
      return {
        totalAmount,
        discount: parsedDiscount,
        pointsUsed: parsedPointsUsed,
        pointsDiscount: calculatedPointsDiscount,
        serviceCharge: parsedServiceCharge,
        vatRate: parsedVatRate,
        totalPayable,
        total,
        changeAmount: parsedCustomerPaid - total
      }
    })

    return responseHelper.success(res, result, 'Thanh toán thành công')
  } catch (error) {
    console.error('Lỗi thanh toán:', error)

    // Xử lý các lỗi business logic
    if (
      error.message.includes('không tồn tại') ||
      error.message.includes('đã được thanh toán') ||
      error.message.includes('Không đủ điểm') ||
      error.message.includes('không được vượt quá') ||
      error.message.includes('chưa đủ')
    ) {
      return responseHelper.error(res, error.message, 400)
    }

    return responseHelper.error(res, 'Lỗi server nội bộ', 500)
  }
}

export const printInvoice = async (req, res) => {
  try {
    const { orderId } = req.params

    const order = await Order.findById(orderId)
      .populate('items.foodId', 'name price')
      .populate('tableId', 'name')

    if (!order) return res.status(404).send('Không tìm thấy đơn hàng')

    res.render('staff/printbill', {
      title: 'Hóa đơn thanh toán',
      order,
      orderId: order._id,
      currentUserId: req.user ? req.user._id : null,
      user: req.user || { username: 'Admin' }
    })
  } catch (error) {
    console.error('Lỗi khi in hóa đơn:', error)
    res.status(500).send('Lỗi máy chủ')
  }
}
