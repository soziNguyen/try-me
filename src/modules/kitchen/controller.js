import Order from '../order/model.js'
import responseHelper from '../../helpers/responseHelper.js'
import { getWarehouse } from '../../helpers/warehouseHelper.js'
import { getCurrentOrg } from '../../helpers/orgHelper.js'
import Organization from '../organization/model.js'
import mongoose from 'mongoose'

export const getKitchenOrders = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    const matchCondition = {}

    if (req.warehouseFilter) {
      matchCondition.warehouse = req.warehouseFilter
    } else {
      const org = await Organization.findById(organizationId).select('defaultWarehouse')
      if (org?.defaultWarehouse) matchCondition.warehouse = org.defaultWarehouse
    }

    // Lấy các order còn món chưa hoàn thành
    const orders = await Order.find({
      ...matchCondition,
      'items.status': { $in: ['pending', 'cooking'] },
      status: 'open' // chỉ open order
    })
      .sort({ createdAt: 1 })
      .populate('items.foodId', 'name')
      .populate('tableId', 'name area')
      .populate({
        path: 'items.comboId',
        select: 'name items',
        populate: {
          path: 'items.menuItem',
          select: 'name'
        }
      })
      .lean()

    const now = new Date()
    orders.forEach((order) => {
      const itemStatuses = order.items.map((i) => i.status)

      if (itemStatuses.every((s) => s === 'done')) {
        order.status = 'done'
      } else if (itemStatuses.some((s) => s === 'cooking')) {
        order.status = 'cooking'
      } else {
        order.status = 'pending'
      }

      order.timeElapsed = Math.floor((now - new Date(order.createdAt)) / 60000)
      order.isDelayed = order.timeElapsed > 10
    })

    responseHelper.success(res, orders)
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

// [GET] Lấy chi tiết đơn hàng trong bếp
export const getKitchenOrderDetail = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)
    const warehouseId = await getWarehouse(req, organizationId)

    const { orderId } = req.params

    if (!mongoose.Types.ObjectId.isValid(orderId))
      return responseHelper.error(res, 'Mã đơn hàng không hợp lệ', 400)

    const order = await Order.findOne({
      _id: orderId,
      warehouse: warehouseId
    })
      .populate('items.foodId', 'name')
      .populate('items.comboId', 'name items  ')
      .lean()

    if (!order) return responseHelper.error(res, 'Đơn hàng không tồn tại', 404)

    responseHelper.success(res, order)
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

// Cập nhật trạng thái món
export const updateKitchenItemStatus = async (req, res) => {
  try {
    const { orderId, itemId } = req.params
    const { status } = req.body // pending | cooking | done

    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)
    const warehouseId = await getWarehouse(req, organizationId)

    if (!['pending', 'cooking', 'done'].includes(status)) {
      return responseHelper.error(res, 'Trạng thái món không hợp lệ', 400)
    }

    const order = await Order.findOne({
      _id: orderId,
      warehouse: warehouseId,
      status: 'open' // chỉ cập nhật order đang mở
    })

    if (!order) return responseHelper.error(res, 'Đơn hàng không tồn tại', 404)

    const item = order.items.id(itemId)
    if (!item) return responseHelper.error(res, 'Món trong đơn không tồn tại', 404)

    item.status = status
    order.updatedBy = req.user._id

    await order.save()

    responseHelper.success(res, item, 'Cập nhật trạng thái món thành công')
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}
