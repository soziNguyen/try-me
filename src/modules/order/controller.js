import mongoose from 'mongoose'
import Order from './model.js'
import Table from '../table/model.js'
import { MenuItem } from '../menu/menu-item/model.js'
import { Combo } from '../menu/combo/model.js'
import Customer from '../customer/model.js'
import Coupon from '../coupon/model.js'
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
import { loadPointSetting } from '../../helpers/org-point.js'
import { logActivity } from '../activity-logs/service.js'
import { createPointHistory } from '../point-history/service.js'

export const createOrder = async (req, res) => {
  try {
    const result = await withTransaction(async (session) => {
      const organizationId = getCurrentOrg(req)
      if (!organizationId) {
        throw new BusinessError('Thiếu thông tin tổ chức', 400)
      }

      // Lấy warehouse dựa trên role
      const warehouse = await getWarehouse(req, organizationId)

      const { tableId, isTakeaway, customerName } = req.body
      let customerPhone = req.body.customerPhone
      let prefix = 'HD'

      const matchCondition = {
        organizationId,
        warehouseId: warehouse
      }

      const invoiceOptions = await InvoiceOption.findOne(matchCondition).session(session).lean()

      if (invoiceOptions?.prefix?.trim()) {
        prefix = invoiceOptions.prefix.trim()
      }

      // Chuẩn hóa số điện thoại - nếu có
      if (customerPhone) {
        const phoneError = validatePhoneNumber(customerPhone)
        if (phoneError) throw new BusinessError(phoneError, 400)
        customerPhone = formatPhoneNumber(customerPhone)
      }

      // 1. Xử lý khách hàng
      let customer = null
      const nameToUpdate = customerName?.trim()

      // Trường hợp có số điện thoại
      if (customerPhone) {
        const query = { organization: organizationId, phone: customerPhone }
        customer = await Customer.findOne(query).session(session)

        if (customer) {
          // Customer đã tồn tại - chỉ update name - nếu cần
          if (nameToUpdate && nameToUpdate !== customer.name) {
            customer = await Customer.findOneAndUpdate(
              query,
              {
                $set: {
                  name: nameToUpdate,
                  updatedAt: new Date()
                }
              },
              { new: true, session }
            )
          }
        } else {
          // Customer chưa tồn tại - tạo mới
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
        }
      }
      // Trường hợp không có SĐT nhưng có tên - tạo khách hàng không SĐT
      else if (nameToUpdate) {
        const [newCustomer] = await Customer.create(
          [
            {
              organization: organizationId,
              phone: null,
              name: nameToUpdate
            }
          ],
          { session }
        )
        customer = newCustomer
      }

      // Generate order code
      const orderCode = await generateInvoiceCode(Order, prefix)

      // Base order data
      const baseOrderData = {
        status: 'open',
        organization: organizationId,
        warehouse,
        customerId: customer?._id || null,
        code: orderCode,
        createdBy: req.user?._id || null
      }

      // 2. Đơn mang đi
      if (isTakeaway) {
        const [newOrder] = await Order.create(
          [
            {
              ...baseOrderData,
              tableId: null,
              isTakeaway: true,
              createdAt: new Date()
            }
          ],
          { session }
        )

        return {
          orderId: newOrder._id,
          orderCode: newOrder.code,
          tableId: null,
          isNewOrder: true
        }
      }

      // 3. Đơn tại bàn - không có tableId
      if (!tableId) {
        const [newOrder] = await Order.create(
          [
            {
              ...baseOrderData,
              tableId: null,
              isTakeaway: false
            }
          ],
          { session }
        )

        return {
          orderId: newOrder._id,
          orderCode: newOrder.code,
          tableId: null,
          isNewOrder: true
        }
      }

      // 4. Đơn tại bàn - có tableId
      // Kiểm tra bàn tồn tại trước
      const tableCheck = await Table.findById(tableId).session(session)

      if (!tableCheck) throw new BusinessError('Bàn không tồn tại', 404)

      // Tạo order trước
      const [newOrder] = await Order.create(
        [
          {
            ...baseOrderData,
            tableId,
            isTakeaway: false
          }
        ],
        { session }
      )

      // Update table với điều kiện atomic để tránh race condition
      const updatedTable = await Table.findOneAndUpdate(
        {
          _id: tableId,
          status: { $ne: 'occupied' } // Chỉ update nếu bàn chưa bị chiếm
        },
        {
          $set: {
            status: 'occupied',
            checkInTime: new Date(),
            currentOrderId: newOrder._id,
            customerName: customerName?.trim() || 'Khách lẻ',
            orderCode: orderCode
          }
        },
        { new: true, session }
      )

      // Nếu không update được = bàn đã bị chiếm
      if (!updatedTable) {
        throw new BusinessError('Bàn đã có khách', 409)
      }

      return {
        orderId: newOrder._id,
        orderCode: newOrder.code,
        tableId: updatedTable._id,
        isNewOrder: true
      }
    })

    responseHelper.success(res, result)
  } catch (error) {
    if (error instanceof BusinessError) {
      return responseHelper.error(res, error.message, error.statusCode)
    }
    responseHelper.error(res, error.message)
  }
}

export const getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params

    if (!orderId) {
      return responseHelper.error(res, 'ID không tồn tại', 404)
    }

    if (!mongoose.isValidObjectId(orderId)) {
      return responseHelper.error(res, 'Mã đơn hàng không hợp lệ', 400)
    }

    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    // Build match condition với warehouse filter
    const matchCondition = {
      _id: orderId,
      organization: organizationId
    }

    const selectedWarehouse = req.query.warehouse

    if (req.warehouseFilter) {
      // Staff user - chỉ thấy kho được gán
      matchCondition.warehouse = req.warehouseFilter
    } else {
      // ADMIN / ORG USER
      if (selectedWarehouse && selectedWarehouse !== 'all') {
        // Nếu FE chọn 1 kho cụ thể
        matchCondition.warehouse = selectedWarehouse
      }
    }

    const order = await Order.findOne(matchCondition)
      .populate('tableId', 'name area')
      .populate('items.foodId', 'name price')
      .populate('items.comboId', 'name price')
      .populate('customerId', 'name phone totalPoints')
      .populate('organization', 'name phone province commune street logo')
      .populate('warehouse', 'name location')
      .populate('couponId', 'code')
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

export const getOrderByIdPublic = async (req, res) => {
  try {
    const { orderId } = req.params

    if (!orderId) {
      return responseHelper.error(res, 'ID không tồn tại', 404)
    }

    if (!mongoose.isValidObjectId(orderId)) {
      return responseHelper.error(res, 'Mã đơn hàng không hợp lệ', 400)
    }

    const order = await Order.findById(orderId)
      .populate('tableId', 'name area')
      .populate('items.foodId', 'name price image')
      .populate('items.comboId', 'name price image')
      .select('_id code tableId items totalAmount status createdAt')
      .lean()

    if (!order) {
      return responseHelper.error(res, 'Đơn hàng không tồn tại', 404)
    }

    // Format items
    const rawItems = order.items
      .map((item) => {
        if (item.foodId) {
          return {
            _id: item.foodId._id.toString(),
            name: item.foodId.name,
            price: item.price || item.foodId.price,
            quantity: item.quantity,
            image: item.foodId.image || '/assets/images/default.png',
            isCombo: false
          }
        } else if (item.comboId) {
          return {
            _id: item.comboId._id.toString(),
            name: item.comboId.name,
            price: item.price || item.comboId.price,
            quantity: item.quantity,
            image: item.comboId.image || '/assets/images/default.png',
            isCombo: true
          }
        }
        return null
      })
      .filter(Boolean)

    // Group by _id và tính tổng số lượng
    const formattedItems = Object.values(
      rawItems.reduce((acc, item) => {
        const key = item._id

        if (acc[key]) {
          acc[key].quantity += item.quantity
        } else {
          acc[key] = { ...item }
        }

        return acc
      }, {})
    )

    const recalculatedTotal = calcOrderTotal(formattedItems)

    // Response
    const response = {
      _id: order._id,
      code: order.code,
      table: order.tableId
        ? {
            name: order.tableId.name,
            area: order.tableId.area
          }
        : null,
      items: formattedItems,
      totalAmount: recalculatedTotal,
      status: order.status,
      createdAt: order.createdAt
    }

    responseHelper.success(res, response)
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

async function recalculateOrder(order) {
  const { pointValue } = await loadPointSetting(order.organization)
  // Tổng tiền hàng
  order.totalAmount = calcOrderTotal(order.items)

  const parsedDiscount = Number(order.discount || 0)
  const parsedPointsUsed = Number(order.pointsUsed || 0)
  const parsedServiceCharge = Number(order.serviceCharge || 0)
  const parsedExtraDiscount = Number(order.extraDiscount || 0)
  const parsedVatRate = Number(order.vatRate || 0)
  const parsedCustomerPaid = Number(order.customerPaid || 0)

  const pointsDiscount = parsedPointsUsed * pointValue
  const totalPayable =
    order.totalAmount - parsedDiscount - pointsDiscount - parsedExtraDiscount + parsedServiceCharge

  if (totalPayable < 0) {
    throw new BusinessError(`Tổng giảm giá vượt quá tổng tiền. Vui lòng điều chỉnh lại.`, 400)
  }

  const vatAmount = Math.round((totalPayable * parsedVatRate) / 100)
  const total = Math.round(totalPayable + vatAmount)
  const changeAmount = parsedCustomerPaid - total

  order.pointsDiscount = pointsDiscount
  order.totalPayable = totalPayable
  order.vatAmount = vatAmount
  order.total = total
  order.changeAmount = changeAmount
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
      const totalInOrder = order.items
        .filter((i) => i.comboId?.toString() === comboId)
        .reduce((sum, i) => sum + i.quantity, 0)

      if (comboStock.quantity < totalInOrder + quantity) {
        return responseHelper.error(
          res,
          `Combo "${combo.name}" không đủ số lượng. Còn lại: ${comboStock.quantity}, đang có trong order: ${totalInOrder}`,
          400
        )
      }

      // 4. Add to order, gom những combo batch=null cùng loại
      const existingNullBatch = order.items.find(
        (i) => i.comboId?.toString() === comboId && i.batch === null
      )

      if (existingNullBatch) {
        existingNullBatch.quantity += quantity
      } else {
        order.items.push({
          comboId,
          quantity,
          price: combo.price,
          batch: null,
          sentAt: new Date()
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
      const totalInOrder = order.items
        .filter((i) => i.foodId?.toString() === foodId) // hoặc comboId tương ứng
        .reduce((sum, i) => sum + i.quantity, 0)

      if (productStock.quantity < totalInOrder + quantity) {
        return responseHelper.error(
          res,
          `Món ăn "${menuItem.name}" không đủ số lượng. Còn lại: ${productStock.quantity}, đang có trong order: ${totalInOrder}`,
          400
        )
      }

      // Gom những item batch=null cùng loại lại
      const existingNullBatch = order.items.find(
        (i) => i.foodId?.toString() === foodId && i.batch === null
      )

      if (existingNullBatch) {
        // Nếu đã có món batch=null trước đó → cộng vào
        existingNullBatch.quantity += quantity
      } else {
        // Tạo mới batch=null
        order.items.push({
          foodId,
          quantity,
          price: menuItem.price,
          batch: null,
          sentAt: new Date()
        })
      }
    }

    // Tính tổng tiền đơn hàng
    await recalculateOrder(order)

    // Cập nhật updatedBy
    if (req.user && req.user._id) {
      order.updatedBy = req.user._id
    }

    await order.save()

    // Nếu order gắn bàn thì cập nhật total trong bảng Table
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
    const { itemId, quantity, type, batch } = req.body

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
    const item = order.items.find((i) => {
      const matchesTypeId =
        type === 'food' ? i.foodId?.toString() === itemId : i.comboId?.toString() === itemId

      // Chuẩn hóa batch
      const itemBatch = i.batch == null ? null : Number(i.batch)
      const reqBatch = batch == null || batch === 'null' ? null : Number(batch)
      const matchesBatch = itemBatch === reqBatch

      return matchesTypeId && matchesBatch
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

    // Cập nhật quantity
    item.quantity = quantity

    // Cập nhật total
    await recalculateOrder(order)

    // Cập nhật updatedBy
    if (req.user && req.user._id) {
      order.updatedBy = req.user._id
    }

    await order.save()

    // Cập nhật bàn nếu có
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
    const { type, batch } = req.query

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
    const reqBatch = batch == null || batch === 'null' ? null : Number(batch)
    const itemIndex = order.items.findIndex((item) => {
      const matchesTypeId =
        type === 'food' ? item.foodId?.toString() === itemId : item.comboId?.toString() === itemId
      const itemBatch = item.batch == null ? null : Number(item.batch)
      const matchesBatch = itemBatch === reqBatch
      return matchesTypeId && matchesBatch
    })

    if (itemIndex === -1) {
      return responseHelper.error(res, 'Món/combo không tồn tại trong order', 404)
    }

    // Xóa item
    order.items.splice(itemIndex, 1)

    // Cập nhật total
    await recalculateOrder(order)

    // Cập nhật updatedBy
    if (req.user && req.user._id) {
      order.updatedBy = req.user._id
    }

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
      customerPaid,
      couponId
    } = req.body

    if (!orderId) return responseHelper.error(res, 'Thiếu orderId', 400)
    if (!paymentMethodId)
      return responseHelper.error(res, 'Phương thức thanh toán không hợp lệ', 400)

    const parsedDiscount = Number(discount) || 0
    const parsedPointsUsed = Number(pointsUsed) || 0
    const parsedServiceCharge = Number(serviceCharge) || 0
    const parsedExtraDiscount = Number(extraDiscount) || 0
    const parsedVatRate = Number(vatRate) || 0
    const parsedCustomerPaid = Number(customerPaid) || 0

    if (
      parsedDiscount < 0 ||
      parsedPointsUsed < 0 ||
      parsedServiceCharge < 0 ||
      parsedVatRate < 0 ||
      parsedExtraDiscount < 0
    )
      return responseHelper.error(res, 'Các giá trị không được âm', 400)

    if (parsedCustomerPaid < 0)
      return responseHelper.error(res, 'Số tiền khách trả không hợp lệ', 400)

    // Validate points usage - chỉ cho phép KH có SĐT
    if (parsedPointsUsed > 0) {
      const orderCheck = await Order.findById(orderId)
        .select('customerId')
        .populate('customerId', 'phone')
        .lean()

      if (!orderCheck) {
        return responseHelper.error(res, 'Đơn hàng không tồn tại', 404)
      }
      if (!orderCheck.customerId) {
        return responseHelper.error(res, 'Khách lẻ không thể sử dụng điểm giảm giá', 400)
      }
      if (!orderCheck.customerId.phone) {
        return responseHelper.error(
          res,
          'Khách hàng chưa có số điện thoại, không thể sử dụng điểm',
          400
        )
      }
    }

    // === TRANSACTION ===
    const result = await withTransaction(async (session) => {
      // 1. Fetch and validate order
      const order = await Order.findById(orderId).session(session)
      if (!order) throw new BusinessError('Order không tồn tại', 404)
      if (order.status !== 'open')
        throw new BusinessError('Order đã được thanh toán hoặc đã đóng', 400)

      if (!Array.isArray(order.items) || order.items.length === 0) {
        throw new BusinessError('Đơn hàng phải có ít nhất 1 sản phẩm ', 400)
      }

      // 2. VALIDATE COUPON (CHƯA INCREMENT)
      let couponToConfirm = null
      if (couponId && parsedDiscount > 0) {
        const now = new Date()

        // VALIDATE
        const coupon = await Coupon.findOne({
          _id: couponId,
          isActive: true,
          startDate: { $lte: now },
          endDate: { $gte: now },
          organization: order.organization,
          $expr: {
            $or: [{ $eq: ['$usageLimit', null] }, { $lt: ['$usedCount', '$usageLimit'] }]
          }
        }).session(session)

        if (!coupon) {
          logActivity(
            order.organization,
            req.user?._id || null,
            req.user?.username || 'Guest',
            'CHECKOUT',
            'COUPON',
            `Áp dụng mã giảm giá không hợp lệ cho đơn ${order.code}`,
            couponId,
            'FAILED'
          )

          throw new BusinessError('Mã giảm giá không hợp lệ hoặc đã hết lượt sử dụng', 400)
        }

        // LƯU LẠI ĐỂ INCREMENT
        couponToConfirm = coupon
      }

      // 3. Validate payment method
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

      // 4. Calculate amounts
      const totalAmount = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0)

      const { pointValue, pointsEarnRate } = await loadPointSetting(order.organization)

      const calculatedPointsDiscount = parsedPointsUsed * pointValue

      const totalPayable =
        totalAmount -
        parsedDiscount -
        calculatedPointsDiscount -
        parsedExtraDiscount +
        parsedServiceCharge

      if (totalPayable < 0) {
        throw new BusinessError(`Tổng giảm giá vượt quá tổng tiền. Vui lòng điều chỉnh lại.`, 400)
      }

      const total = Math.round(totalPayable + (totalPayable * parsedVatRate) / 100)
      if (parsedCustomerPaid < total)
        throw new BusinessError(
          `Số tiền khách trả chưa đủ. Cần: ${total.toLocaleString()}, có: ${parsedCustomerPaid.toLocaleString()}`,
          400
        )

      // 5. VALIDATE & DEDUCT PRODUCT STOCK
      for (const item of order.items) {
        if (item.foodId) {
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

          const stockUpdateResult = await ProductStock.findOneAndUpdate(
            {
              product: item.foodId,
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
            const menuItem = await MenuItem.findById(item.foodId)
            throw new BusinessError(
              `Tồn kho của "${menuItem?.name || 'Unknown'}" đã thay đổi, vui lòng thử lại`,
              409
            )
          }
        }

        if (item.comboId) {
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

      // 6. Handle customer points - CHỈ CHO KHÁCH HÀNG CÓ SĐT
      let customer = null
      let pointsEarned = 0

      if (order.customerId) {
        customer = await Customer.findById(order.customerId).session(session)

        if (!customer) throw new BusinessError('Khách hàng không tồn tại', 404)

        // Kiểm tra khách hàng có số điện thoại không -> mới được tích điểm
        const hasPhone = !!customer.phone
        const balanceBefore = customer.totalPoints

        // Points validation (if using points)
        if (parsedPointsUsed > 0) {
          if (!hasPhone) {
            throw new BusinessError('Khách hàng chưa có số điện thoại, không thể sử dụng điểm', 400)
          }
          if (customer.totalPoints < parsedPointsUsed) {
            throw new BusinessError(
              `Không đủ điểm tích lũy. Hiện có: ${customer.totalPoints}, cần: ${parsedPointsUsed}`,
              400
            )
          }
        }

        // Calculate points earned - CHỈ TÍNH NẾU CÓ SĐT
        if (hasPhone) {
          pointsEarned = Math.floor(totalPayable / pointsEarnRate)
        }

        // Atomic customer update
        const updateData = {
          $inc: {
            totalOrders: 1,
            totalSpent: total
          },
          $set: {
            lastOrderDate: new Date(),
            updatedAt: new Date()
          }
        }

        let pointsChange = 0
        if (pointsEarned > 0) {
          pointsChange += pointsEarned
        }
        if (parsedPointsUsed > 0) {
          pointsChange -= parsedPointsUsed
        }

        if (pointsChange !== 0) {
          updateData.$inc.totalPoints = pointsChange
        }

        const updateQuery = {
          _id: order.customerId
        }

        if (parsedPointsUsed > 0) {
          updateQuery.totalPoints = { $gte: parsedPointsUsed }
        }

        const customerUpdateResult = await Customer.findOneAndUpdate(updateQuery, updateData, {
          new: true,
          session,
          runValidators: true
        })

        if (!customerUpdateResult) {
          throw new BusinessError('Cập nhật thông tin khách hàng thất bại, vui lòng thử lại', 409)
        }

        const balanceAfter = customerUpdateResult.totalPoints

        // Ghi lịch sử dùng điểm
        if (parsedPointsUsed > 0) {
          await createPointHistory({
            customerId: order.customerId,
            orderId: order._id,
            type: 'redeem',
            points: -parsedPointsUsed,
            balanceBefore: balanceBefore,
            balanceAfter: balanceBefore - parsedPointsUsed,
            description: `Sử dụng ${parsedPointsUsed} điểm cho đơn hàng ${order.code}`,
            organization: order.organization,
            createdBy: req.user?._id,
            session
          })
        }

        // Ghi lịch sử tích điểm
        if (pointsEarned > 0) {
          await createPointHistory({
            customerId: order.customerId,
            orderId: order._id,
            type: 'earn',
            points: pointsEarned,
            balanceBefore: parsedPointsUsed > 0 ? balanceBefore - parsedPointsUsed : balanceBefore,
            balanceAfter: balanceAfter,
            description: `Tích ${pointsEarned} điểm từ đơn hàng ${order.code}`,
            organization: order.organization,
            createdBy: req.user?._id,
            session
          })
        }
      } else if (parsedPointsUsed > 0) {
        throw new BusinessError('Khách lẻ không thể sử dụng điểm', 400)
      }

      // 7. Generate VietQR
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

      // 8. UPDATE ORDER
      order.discount = parsedDiscount
      order.pointsUsed = parsedPointsUsed
      order.pointsDiscount = calculatedPointsDiscount
      order.serviceCharge = parsedServiceCharge
      order.extraDiscount = parsedExtraDiscount
      order.vatRate = parsedVatRate
      order.totalAmount = totalAmount
      order.totalPayable = totalPayable
      order.total = total
      order.paymentMethodId = paymentMethodId
      order.customerPaid = parsedCustomerPaid
      order.changeAmount = parsedCustomerPaid - total
      order.status = 'completed'

      if (couponToConfirm) {
        order.couponId = couponToConfirm._id
      }

      if (req.user && req.user._id) {
        order.updatedBy = req.user._id
      }

      order.updatedAt = new Date()
      if (qrCodeUrl) order.qrCode = qrCodeUrl

      for (const item of order.items) {
        if (item.status !== 'done') {
          item.status = 'done'
          item.doneAt = new Date()
          if (req.user && req.user._id) {
            item.doneBy = req.user._id
          }
        }
      }

      await order.save({ session })

      // 9. RELEASE TABLE
      if (order.tableId) {
        await Table.findByIdAndUpdate(
          order.tableId,
          { status: 'available', currentOrderId: null, updatedAt: new Date() },
          { session }
        )
      }

      // 10. INCREMENT COUPON

      let message = `Hoàn tất thanh toán đơn ${order.code}. Tổng thanh toán: ${total}đ.`

      if (couponToConfirm) {
        const confirmedCoupon = await Coupon.findOneAndUpdate(
          {
            _id: couponToConfirm._id,
            isActive: true,
            $expr: {
              $or: [{ $eq: ['$usageLimit', null] }, { $lt: ['$usedCount', '$usageLimit'] }]
            }
          },
          {
            $inc: { usedCount: 1 },
            $set: { updatedAt: new Date() }
          },
          { new: true, session }
        )

        if (!confirmedCoupon) {
          throw new BusinessError('Mã giảm giá đã hết lượt sử dụng trong khi xử lý giao dịch', 409)
        }

        if (confirmedCoupon) {
          message += ` Xác nhận sử dụng mã giảm giá - ${confirmedCoupon.code}, giảm ${confirmedCoupon.discountValue}đ.`
        }
      }

      logActivity(
        order.organization,
        req.user?._id || null,
        req.user?.username || null,
        'CHECKOUT',
        'ORDER',
        message,
        order.code,
        'SUCCESS',
        order.warehouse
      )

      return {
        totalAmount,
        discount: parsedDiscount,
        pointsUsed: parsedPointsUsed,
        pointsDiscount: calculatedPointsDiscount,
        pointsEarned, // Sẽ = 0 nếu khách hàng không có SĐT
        serviceCharge: parsedServiceCharge,
        extraDiscount: parsedExtraDiscount,
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
      discount,
      pointsUsed,
      serviceCharge,
      extraDiscount,
      vatRate,
      customerPaid,
      paymentMethodId: newPaymentMethodId,
      couponId
    } = req.body

    if (!orderId) return responseHelper.error(res, 'Thiếu orderId', 400)

    const result = await withTransaction(async (session) => {
      // 1. Lấy order
      const order = await Order.findById(orderId).populate('customerId', 'phone').session(session)

      if (!order) throw new BusinessError('Order không tồn tại', 404)

      if (order.status !== 'open') {
        throw new BusinessError('Order đã được thanh toán hoặc đã đóng', 400)
      }

      if (!Array.isArray(order.items) || order.items.length === 0) {
        throw new BusinessError('Đơn hàng phải có ít nhất 1 sản phẩm', 400)
      }

      // 2. CHỈ CẬP NHẬT NẾU CÓ GỬI LÊN
      if (discount !== undefined) {
        const parsedDiscount = Number(discount) || 0
        if (parsedDiscount < 0) {
          throw new BusinessError('Giảm giá không được âm', 400)
        }

        // NẾU CÓ DISCOUNT NHƯNG KHÔNG CÓ COUPON ID
        if (parsedDiscount > 0 && !couponId) {
          order.discount = parsedDiscount
          order.couponId = null
        }
        // NẾU CÓ CẢ DISCOUNT VÀ COUPON ID
        else if (parsedDiscount > 0 && couponId) {
          // Validate coupon vẫn còn valid (không tăng usedCount)
          const coupon = await Coupon.findOne({
            _id: couponId,
            isActive: true,
            organization: order.organization
          }).session(session)

          if (!coupon) {
            throw new BusinessError('Mã giảm giá không hợp lệ', 400)
          }

          order.discount = parsedDiscount
          order.couponId = couponId // LƯU VÀO ORDER
        }
        // XÓA DISCOUNT
        else {
          order.discount = 0
          order.couponId = null
        }
      }
      if (pointsUsed !== undefined) {
        const parsedPointsUsed = Number(pointsUsed) || 0
        if (parsedPointsUsed < 0) {
          throw new BusinessError('Điểm sử dụng không được âm', 400)
        }

        // Validate nếu dùng điểm
        if (parsedPointsUsed > 0) {
          if (!order.customerId) {
            throw new BusinessError('Khách lẻ không thể sử dụng điểm', 400)
          }
          const customer = await Customer.findById(order.customerId).session(session)

          if (!customer) throw new BusinessError('Khách hàng không tồn tại', 404)

          if (!customer.phone) {
            throw new BusinessError('Khách hàng chưa có số điện thoại, không thể sử dụng điểm', 400)
          }

          if (customer.totalPoints < parsedPointsUsed) {
            throw new BusinessError(
              `Không đủ điểm tích lũy. Hiện có: ${customer.totalPoints}, cần: ${parsedPointsUsed}`,
              400
            )
          }
        }

        order.pointsUsed = parsedPointsUsed
      }

      if (serviceCharge !== undefined) {
        const parsedServiceCharge = Number(serviceCharge) || 0
        if (parsedServiceCharge < 0) {
          throw new BusinessError('Phí dịch vụ không được âm', 400)
        }
        order.serviceCharge = parsedServiceCharge
      }

      if (extraDiscount !== undefined) {
        const parsedExtraDiscount = Number(extraDiscount) || 0
        if (parsedExtraDiscount < 0) {
          throw new BusinessError('Chiết khấu không được âm', 400)
        }
        order.extraDiscount = parsedExtraDiscount
      }

      if (vatRate !== undefined) {
        const parsedVatRate = Number(vatRate) || 0
        if (parsedVatRate < 0) {
          throw new BusinessError('VAT không được âm', 400)
        }
        order.vatRate = parsedVatRate
      }

      if (customerPaid !== undefined) {
        const parsedCustomerPaid = Number(customerPaid) || 0
        if (parsedCustomerPaid < 0) {
          throw new BusinessError('Tiền khách trả không được âm', 400)
        }
        order.customerPaid = parsedCustomerPaid
      }

      // 3. Tính tổng tiền hàng
      const totalAmount = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
      order.totalAmount = totalAmount

      // 4. Tính toán lại
      const { pointValue } = await loadPointSetting(order.organization)
      const pointsDiscount = order.pointsUsed * pointValue

      const totalPayable =
        totalAmount - order.discount - pointsDiscount - order.extraDiscount + order.serviceCharge

      if (totalPayable < 0) {
        throw new BusinessError(`Tổng giảm giá vượt quá tổng tiền. Vui lòng điều chỉnh lại.`, 400)
      }

      const vatAmount = Math.round((totalPayable * order.vatRate) / 100)
      const total = Math.round(totalPayable + vatAmount)
      const changeAmount = order.customerPaid - total

      order.pointsDiscount = pointsDiscount
      order.totalPayable = totalPayable
      order.vatAmount = vatAmount
      order.total = total
      order.changeAmount = changeAmount

      // 5. Xử lý Payment Method
      let qrCodeUrl = null
      let receivingAccountId = null
      let paymentMethodId = order.paymentMethodId

      // Nếu FE gửi paymentMethodId, validate và ghi đè
      if (newPaymentMethodId) {
        if (!mongoose.isValidObjectId(newPaymentMethodId)) {
          throw new BusinessError('Phương thức thanh toán không hợp lệ', 400)
        }

        const pmExists = await PaymentMethod.findOne({
          _id: newPaymentMethodId,
          organization: order.organization,
          isActive: true
        })
          .session(session)
          .lean()

        if (!pmExists) {
          throw new BusinessError('Phương thức thanh toán không tồn tại', 400)
        }

        paymentMethodId = newPaymentMethodId
        order.paymentMethodId = paymentMethodId
      }

      // Nếu order chưa có phương thức thanh toán, lấy mặc định Bank
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
          order.paymentMethodId = paymentMethodId
        }
      }

      // Lấy thông tin payment method và receiving account
      if (paymentMethodId) {
        const paymentMethod = await PaymentMethod.findById(paymentMethodId)
          .populate('receivingAccountId')
          .session(session)

        if (paymentMethod && (paymentMethod.type === 'bank' || paymentMethod.type === 'e-wallet')) {
          receivingAccountId = paymentMethod.receivingAccountId
        }
      }

      // Nếu chưa có receiving account -> lấy mặc định bank
      if (!receivingAccountId) {
        receivingAccountId = await ReceivingAccount.findOne({
          organization: order.organization,
          type: 'bank',
          isActive: true
        })
          .session(session)
          .sort({ createdAt: -1 })
      }

      // Generate VietQR
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

      if (qrCodeUrl) {
        order.qrCode = qrCodeUrl
      }

      // 6. Cập nhật updatedBy
      if (req.user && req.user._id) {
        order.updatedBy = req.user._id
      }

      order.updatedAt = new Date()
      await order.save({ session })

      // 7. Trả về kết quả
      return {
        orderId: order._id,
        orderCode: order.code,
        totalAmount: order.totalAmount,
        discount: order.discount,
        pointsUsed: order.pointsUsed,
        pointsDiscount: order.pointsDiscount,
        serviceCharge: order.serviceCharge,
        extraDiscount: order.extraDiscount,
        vatRate: order.vatRate,
        vatAmount,
        totalPayable,
        total,
        customerPaid: order.customerPaid,
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
      return responseHelper.error(res, error.message)
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
    const match = { organization: organizationId, status: 'completed' }

    const warehouse = req.query.warehouse

    if (req.warehouseFilter) {
      // Staff user - chỉ thấy kho được gán
      match.warehouse = req.warehouseFilter
    } else {
      if (warehouse && warehouse !== 'all') {
        match.warehouse = new mongoose.Types.ObjectId(String(warehouse))
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
      ...lookupRef('warehouse', 'Warehouses', { as: 'warehouse' }),
      { $unwind: { path: '$warehouse', preserveNullAndEmptyArrays: true } },
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
          warehouse: { $first: '$warehouse' },
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
                { $expr: { $regexMatch: { input: 'Mang đi', regex: searchValue, options: 'i' } } }
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
    const recordsTotal = await Order.countDocuments(match)

    // Tổng sau filter
    const countPipeline = [...pipeline, { $count: 'count' }]
    const countResult = await Order.aggregate(countPipeline)
    const recordsFiltered = countResult.length > 0 ? countResult[0].count : 0

    const summaryPipeline = [
      { $match: match },
      { $unwind: { path: '$items', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$_id',
          total: { $first: '$total' },
          totalPayable: { $first: '$totalPayable' },
          orderTotalItems: {
            $sum: {
              $cond: [
                { $ifNull: ['$items.comboId', false] },
                0,
                { $ifNull: ['$items.quantity', 0] }
              ]
            }
          },
          orderTotalCombos: {
            $sum: {
              $cond: [
                { $ifNull: ['$items.comboId', false] },
                { $ifNull: ['$items.quantity', 0] },
                0
              ]
            }
          }
        }
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalBeforeTax: { $sum: '$totalPayable' },
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
        totalBeforeTax: summary.totalBeforeTax || 0,
        totalAmount: summary.totalAmount,
        avgAmount: summary.avgAmount,
        totalItems: summary.totalItems || 0, // Tổng món thực tế
        totalCombos: summary.totalCombos || 0 // Tổng combo
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

    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    // ===== Base match =====
    const match = { organization: organizationId }

    // ===== Filter warehouse =====
    const warehouse = req.query.warehouse

    if (warehouse === 'all') {
    } else if (warehouse) {
      match.warehouse = new mongoose.Types.ObjectId(String(warehouse))
    } else if (req.warehouseFilter) {
      // Nếu user là staff → chỉ thấy kho được gán
      match.warehouse = req.warehouseFilter
    } else {
      // Nếu admin hoặc org → dùng default warehouse
      const org = await Organization.findById(organizationId).select('defaultWarehouse')
      if (org?.defaultWarehouse) {
        match.warehouse = org.defaultWarehouse
      }
    }

    // ===== Filter thời gian =====
    const startDate = req.query.startDate ? new Date(req.query.startDate) : null
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null
    if (startDate) {
      startDate.setHours(0, 0, 0, 0)
    }
    if (endDate) {
      endDate.setHours(23, 59, 59, 999)
    }
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

    if (req.query.returnAll === 'true') {
      const data = items.map((item) => ({
        product: {
          _id: item._id.foodId || item._id.comboId,
          name: item.name
        },
        quantitySold: item.quantity,
        totalRevenue: item.total
      }))

      return res.json({
        data,
        totalSold: items.reduce((sum, i) => sum + i.quantity, 0),
        totalRevenue: items.reduce((sum, i) => sum + i.total, 0)
      })
    }

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
      const top = sorted.slice(0, Math.min(limit, sorted.length))

      // Ngưỡng: món bán chậm phải <= 50% món top thứ 3
      const thresholdQty = top.length > 0 ? top[top.length - 1].quantity * 0.5 : 0

      // Chỉ lấy món có quantity <= ngưỡng
      const candidatesForSlow = sorted.filter((item) => item.quantity <= thresholdQty)

      const slow =
        candidatesForSlow.length > 0
          ? candidatesForSlow.slice(-Math.min(limit, candidatesForSlow.length)).reverse()
          : []

      return { top, slow }
    }

    const { top: topSellingFoods, slow: slowSellingFoods } = getTopAndSlow(foodItems)
    const { top: topSellingCombos, slow: slowSellingCombos } = getTopAndSlow(comboItems)

    return res.json({
      topSellingFoods,
      slowSellingFoods,
      topSellingCombos,
      slowSellingCombos
    })
  } catch (error) {
    responseHelper.error(res, error.message)
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

    // Chỉ chặn nếu gán trùng khách hàng cũ
    if (order.customerId && order.customerId.toString() === customerId) {
      return responseHelper.error(res, 'Đơn hàng đã được gán cho khách hàng này', 400)
    }

    const isUpdating = !!order.customerId

    order.customerId = customer._id
    await order.save()

    const { _id, name, phone, totalPoints = 0 } = customer

    return responseHelper.success(res, {
      message: isUpdating ? 'Cập nhật khách hàng thành công' : 'Gán khách hàng thành công',
      customer: { _id, name, phone, totalPoints }
    })
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const assignTableToOrder = async (req, res) => {
  try {
    const result = await withTransaction(async (session) => {
      const organizationId = getCurrentOrg(req)
      if (!organizationId) throw new BusinessError('Thiếu thông tin tổ chức', 400)

      const { orderId } = req.params
      const { tableId } = req.body

      if (!orderId) throw new BusinessError('Thiếu orderId', 400)

      // Tìm order đang mở
      const order = await Order.findOne({
        _id: orderId,
        organization: organizationId,
        status: 'open'
      }).session(session)
      if (!order) throw new BusinessError('Order không tồn tại hoặc không hợp lệ', 404)

      // Nếu order đang có bàn cũ, giải phóng bàn cũ
      if (order.tableId) {
        await Table.updateOne(
          { _id: order.tableId },
          {
            status: 'available',
            checkInTime: null,
            currentOrderId: null,
            orderCode: null
          },
          { session }
        )
      }

      if (tableId == 'empty') {
        await Order.updateOne({ _id: orderId }, { tableId: null, isTakeaway: true }, { session })
        return { orderId: order._id, tableId: null, message: 'Đã bỏ gán bàn' }
      }

      // Kiểm tra bàn mới
      const newTable = await Table.findById(tableId).session(session)
      if (!newTable) throw new BusinessError('Bàn không tồn tại')
      if (newTable.status === 'occupied') throw new BusinessError('Bàn đã có khách', 409)

      // Gán bàn mới
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
    responseHelper.error(res, error.message)
  }
}

export const submitOrderFromCustomer = async (req, res) => {
  try {
    const { orderId } = req.params
    const { items } = req.body

    if (!items || !items.length) return responseHelper.error(res, 'Giỏ hàng trống', 400)
    if (!mongoose.Types.ObjectId.isValid(orderId))
      return responseHelper.error(res, 'Mã đơn hàng không hợp lệ', 400)

    const order = await Order.findById(orderId).populate('tableId', '_id name')
    if (!order) return responseHelper.error(res, 'Không tìm thấy đơn hàng', 404)
    if (order.status !== 'open')
      return responseHelper.error(res, 'Đơn hàng đã đóng hoặc bị hủy', 400)

    // Tìm batch cao nhất hiện tại
    const maxBatch = order.items.reduce((max, item) => Math.max(max, item.batch || 1), 0)
    const newBatch = maxBatch + 1

    // Push từng item với batch mới
    items.forEach((item) => {
      order.items.push({
        ...(item.isCombo ? { comboId: item._id } : { foodId: item._id }),
        quantity: item.quantity,
        price: item.price,
        status: 'pending',
        batch: newBatch,
        sentAt: new Date()
      })
    })

    // TỔNG TIỀN
    order.totalAmount = order.items.reduce((sum, item) => {
      return sum + item.price * item.quantity
    }, 0)

    await order.save()

    const io = req.app.get('io')

    // Emit đến staff room
    io.to('staff_room').emit('staff_notification', {
      type: 'new_order_items',
      orderId,
      table: order.tableId?.name || null,
      batch: newBatch,
      items,
      time: new Date()
    })

    return responseHelper.success(res, order, 'Gửi giỏ hàng thành công')
  } catch (error) {
    return responseHelper.error(res, error.message)
  }
}

export const cancelledOrder = async (req, res) => {
  try {
    const { orderId } = req.params
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    const warehouse = await getWarehouse(req, organizationId)

    if (!mongoose.isValidObjectId(orderId)) {
      return responseHelper.error(res, 'Mã đơn hàng không hợp lệ', 400)
    }

    const isExistOrder = await Order.findOne({
      _id: orderId,
      organization: organizationId,
      warehouse
    })

    if (!isExistOrder) {
      return responseHelper.error(res, 'Đơn hàng không tồn tại', 400)
    }

    const updated = await Order.updateOne(
      { _id: orderId, organization: organizationId, warehouse },
      { $set: { status: 'cancelled' } }
    )

    if (updated.modifiedCount === 0) {
      return responseHelper.error(res, 'Cập nhật thất bại', 400)
    }

    responseHelper.success(res, updated, 'Đơn hàng đã được hủy')
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const getDashboardStats = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    const warehouse = req.query.warehouse ?? 'all'
    const now = new Date()

    // HÔM NAY
    const startOfToday = new Date(now)
    startOfToday.setHours(0, 0, 0, 0)

    const endOfToday = new Date(now)
    endOfToday.setHours(23, 59, 59, 999)

    // HÔM QUA
    const startOfYesterday = new Date(startOfToday)
    startOfYesterday.setDate(startOfYesterday.getDate() - 1)

    const endOfYesterday = new Date(startOfToday)
    endOfYesterday.setMilliseconds(-1)

    // 7 NGÀY GẦN NHẤT
    const last7Days = new Date(now)
    last7Days.setDate(last7Days.getDate() - 6)
    last7Days.setHours(0, 0, 0, 0)

    // THÁNG NÀY
    const startOfMonth = new Date(now)
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const endOfMonth = new Date(startOfMonth)
    endOfMonth.setMonth(endOfMonth.getMonth() + 1)
    endOfMonth.setMilliseconds(-1)

    // THÁNG TRƯỚC
    const startOfLastMonth = new Date(startOfMonth)
    startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1)

    const endOfLastMonth = new Date(startOfMonth)
    endOfLastMonth.setMilliseconds(-1)

    // Base matches
    const todayMatch = {
      organization: organizationId,
      status: 'completed',
      updatedAt: { $gte: startOfToday, $lte: endOfToday }
    }

    const yesterdayMatch = {
      organization: organizationId,
      status: 'completed',
      updatedAt: { $gte: startOfYesterday, $lte: endOfYesterday }
    }

    const last7DaysMatch = {
      organization: organizationId,
      status: 'completed',
      updatedAt: { $gte: last7Days }
    }

    const thisMonthMatch = {
      organization: organizationId,
      status: 'completed',
      updatedAt: { $gte: startOfMonth, $lte: endOfMonth }
    }

    const lastMonthMatch = {
      organization: organizationId,
      status: 'completed',
      updatedAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
    }

    // Warehouse filter
    if (req.warehouseFilter) {
      todayMatch.warehouse = req.warehouseFilter
      yesterdayMatch.warehouse = req.warehouseFilter
      last7DaysMatch.warehouse = req.warehouseFilter
      thisMonthMatch.warehouse = req.warehouseFilter
      lastMonthMatch.warehouse = req.warehouseFilter
    } else if (warehouse && warehouse !== 'all') {
      const warehouseId = new mongoose.Types.ObjectId(String(warehouse))
      todayMatch.warehouse = warehouseId
      yesterdayMatch.warehouse = warehouseId
      last7DaysMatch.warehouse = warehouseId
      thisMonthMatch.warehouse = warehouseId
      lastMonthMatch.warehouse = warehouseId
    }

    // Overview pipeline
    const createOverviewPipeline = (match) => [
      { $match: match },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$total' }
        }
      }
    ]

    // MÓN BÁN CHẠY NHẤT HÔM NAY
    const topItemTodayPipeline = [
      { $match: todayMatch },
      { $unwind: '$items' },
      ...lookupRef('items.foodId', 'MenuItems', { as: 'food' }),
      ...lookupRef('items.comboId', 'Combos', { as: 'combo' }),
      { $unwind: { path: '$food', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$combo', preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          itemId: {
            $cond: [{ $ifNull: ['$food._id', false] }, '$food._id', '$combo._id']
          },
          itemName: {
            $cond: [{ $ifNull: ['$food.name', false] }, '$food.name', '$combo.name']
          },
          itemType: {
            $cond: [{ $ifNull: ['$food._id', false] }, 'menu', 'combo']
          },
          itemCategory: '$food.category'
        }
      },
      {
        $group: {
          _id: '$itemId',
          name: { $first: '$itemName' },
          type: { $first: '$itemType' },
          category: { $first: '$itemCategory' },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 1 }
    ]

    // MÓN BÁN CHẠY NHẤT THÁNG NÀY
    const topItemThisMonthPipeline = [
      { $match: thisMonthMatch },
      { $unwind: '$items' },
      ...lookupRef('items.foodId', 'MenuItems', { as: 'food' }),
      ...lookupRef('items.comboId', 'Combos', { as: 'combo' }),
      { $unwind: { path: '$food', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$combo', preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          itemId: {
            $cond: [{ $ifNull: ['$food._id', false] }, '$food._id', '$combo._id']
          },
          itemName: {
            $cond: [{ $ifNull: ['$food.name', false] }, '$food.name', '$combo.name']
          },
          itemType: {
            $cond: [{ $ifNull: ['$food._id', false] }, 'menu', 'combo']
          },
          itemCategory: '$food.category'
        }
      },
      {
        $group: {
          _id: '$itemId',
          name: { $first: '$itemName' },
          type: { $first: '$itemType' },
          category: { $first: '$itemCategory' },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 1 }
    ]

    // DOANH THU 7 NGÀY GẦN NHẤT
    const last7DaysRevenuePipeline = [
      { $match: last7DaysMatch },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$updatedAt',
              timezone: '+07:00'
            }
          },
          date: {
            $first: {
              $dateToString: {
                format: '%d/%m',
                date: '$updatedAt',
                timezone: '+07:00'
              }
            }
          },
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$total' }
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: 1,
          totalOrders: 1,
          totalRevenue: 1
        }
      }
    ]

    // DOANH THU THÁNG NÀY
    const thisMonthRevenuePipeline = [
      { $match: thisMonthMatch },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$updatedAt',
              timezone: '+07:00'
            }
          },
          date: {
            $first: {
              $dateToString: {
                format: '%d/%m',
                date: '$updatedAt',
                timezone: '+07:00'
              }
            }
          },
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$total' }
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: 1,
          totalOrders: 1,
          totalRevenue: 1
        }
      }
    ]

    // TOP 5 MÓN BÁN CHẠY NHẤT
    const top5ItemsPipeline = [
      { $match: last7DaysMatch },
      { $unwind: '$items' },
      ...lookupRef('items.foodId', 'MenuItems', { as: 'food' }),
      ...lookupRef('items.comboId', 'Combos', { as: 'combo' }),
      { $unwind: { path: '$food', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$combo', preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          itemId: {
            $cond: [{ $ifNull: ['$food._id', false] }, '$food._id', '$combo._id']
          },
          itemName: {
            $cond: [{ $ifNull: ['$food.name', false] }, '$food.name', '$combo.name']
          },
          itemType: {
            $cond: [{ $ifNull: ['$food._id', false] }, 'menu', 'combo']
          },
          itemCategory: '$food.category'
        }
      },
      {
        $group: {
          _id: '$itemId',
          name: { $first: '$itemName' },
          type: { $first: '$itemType' },
          category: { $first: '$itemCategory' },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 5 }
    ]

    // TRẠNG THÁI ĐƠN HÀNG HÔM NAY
    const todayOrderStatusPipeline = [
      {
        $match: {
          ...todayMatch,
          status: { $exists: true }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]

    // THỐNG KÊ NHANH
    const todayStatsPipeline = [
      { $match: todayMatch },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$total' },
          totalItems: {
            $sum: {
              $size: { $ifNull: ['$items', []] }
            }
          }
        }
      },
      {
        $project: {
          avgOrderValue: {
            $cond: [{ $eq: ['$totalOrders', 0] }, 0, { $divide: ['$totalRevenue', '$totalOrders'] }]
          },
          avgItemsPerOrder: {
            $cond: [{ $eq: ['$totalOrders', 0] }, 0, { $divide: ['$totalItems', '$totalOrders'] }]
          }
        }
      }
    ]

    // KHÁCH HÀNG MỚI HÔM NAY
    const newCustomersTodayPipeline = [
      {
        $match: {
          organization: organizationId,
          createdAt: { $gte: startOfToday, $lte: endOfToday }
        }
      },
      {
        $count: 'total'
      }
    ]

    // KHÁCH HÀNG MỚI THÁNG NÀY
    const newCustomersThisMonthPipeline = [
      {
        $match: {
          organization: organizationId,
          createdAt: { $gte: startOfMonth, $lte: endOfMonth }
        }
      },
      {
        $count: 'total'
      }
    ]

    // ĐƠN HÀNG GẦN ĐÂY (10 đơn)
    const recentOrdersPipeline = [
      {
        $match: {
          ...todayMatch,
          status: { $exists: true }
        }
      },
      {
        $lookup: {
          from: 'Tables',
          localField: 'tableId',
          foreignField: '_id',
          as: 'table'
        }
      },
      { $unwind: { path: '$table', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          code: 1,
          tableName: { $ifNull: ['$table.name', 'Mang về'] },
          isTakeaway: 1,
          createdAt: 1,
          itemCount: { $size: '$items' },
          total: 1,
          status: 1
        }
      },
      { $sort: { createdAt: -1 } },
      { $limit: 10 }
    ]

    // Execute all pipelines
    const [
      todayOverview,
      yesterdayOverview,
      topItemToday,
      topItemThisMonth,
      last7DaysRevenue,
      thisMonthRevenue,
      thisMonthOverview,
      lastMonthOverview,
      top5Items,
      todayOrdersByStatus,
      todayStats,
      newCustomersToday,
      newCustomersThisMonth,
      recentOrders
    ] = await Promise.all([
      Order.aggregate(createOverviewPipeline(todayMatch)),
      Order.aggregate(createOverviewPipeline(yesterdayMatch)),
      Order.aggregate(topItemTodayPipeline),
      Order.aggregate(topItemThisMonthPipeline),
      Order.aggregate(last7DaysRevenuePipeline),
      Order.aggregate(thisMonthRevenuePipeline),
      Order.aggregate(createOverviewPipeline(thisMonthMatch)),
      Order.aggregate(createOverviewPipeline(lastMonthMatch)),
      Order.aggregate(top5ItemsPipeline),
      Order.aggregate(todayOrderStatusPipeline),
      Order.aggregate(todayStatsPipeline),
      Customer.aggregate(newCustomersTodayPipeline),
      Customer.aggregate(newCustomersThisMonthPipeline),
      Order.aggregate(recentOrdersPipeline)
    ])

    // Helper function để tính % thay đổi
    const calculateChange = (current, previous) => {
      if (!previous || previous === 0) return 0
      return (((current - previous) / previous) * 100).toFixed(1)
    }

    // Func đếm trạng thái đơn hàng
    const getStatusCount = (statusArray, status) => {
      const found = statusArray.find((s) => s._id === status)
      return found ? found.count : 0
    }

    const todayRevenue = todayOverview[0]?.totalRevenue || 0
    const yesterdayRevenue = yesterdayOverview[0]?.totalRevenue || 0
    const todayOrders = todayOverview[0]?.totalOrders || 0
    const yesterdayOrders = yesterdayOverview[0]?.totalOrders || 0

    const thisMonthTotalRevenue = thisMonthOverview[0]?.totalRevenue || 0
    const lastMonthTotalRevenue = lastMonthOverview[0]?.totalRevenue || 0
    const thisMonthTotalOrders = thisMonthOverview[0]?.totalOrders || 0

    responseHelper.success(res, {
      // HÔM NAY (so với hôm qua)
      todayRevenue,
      todayRevenueChange: calculateChange(todayRevenue, yesterdayRevenue),
      todayOrders,
      todayOrdersChange: calculateChange(todayOrders, yesterdayOrders),
      topItemToday: topItemToday[0] || null,

      // 7 NGÀY
      last7DaysRevenue,

      // THÁNG NÀY (so với tháng trước)
      thisMonthRevenue,
      thisMonthTotalRevenue,
      thisMonthRevenueChange: calculateChange(thisMonthTotalRevenue, lastMonthTotalRevenue),
      thisMonthTotalOrders,

      // TOP
      top5Items,

      // ORDER STATUS
      todayOrderStatus: {
        completed: getStatusCount(todayOrdersByStatus, 'completed'),
        pending: getStatusCount(todayOrdersByStatus, 'open'),
        cancelled: getStatusCount(todayOrdersByStatus, 'cancelled')
      },

      // THỐNG KÊ NHANH
      todayStats: {
        avgOrderValue: todayStats[0]?.avgOrderValue || 0,
        avgItemsPerOrder: todayStats[0]?.avgItemsPerOrder || 0,
        newCustomers: newCustomersToday[0]?.total || 0
      },

      // TỔNG KẾT THÁNG NÀY
      thisMonthStats: {
        totalOrders: thisMonthTotalOrders,
        newCustomers: newCustomersThisMonth[0]?.total || 0,
        topItem: topItemThisMonth[0] || null
      },

      recentOrders
    })
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}
