import Order from '../order/model'
import responseHelper from '../../helpers/responseHelper'
import { getWarehouse } from '../../helpers/warehouseHelper.js'
import { getCurrentOrg } from '../../helpers/orgHelper.js'
import mongoose from 'mongoose'

export const getKitchenOrders = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)
    const warehouseId = await getWarehouse(req)

    // Lấy tất cả order còn món chưa hoàn thành
    const orders = await Order.find({
      warehouse: warehouseId,
      'items.status': { $in: ['pending', 'cooking'] }
    })
      .sort({ createdAt: 1 }) // cũ nhất lên trên -> làm trước
      .populate('items.foodId', 'name')
      .populate('items.comboId', 'name items')
      .lean()

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
    const warehouseId = await getWarehouse(req)

    const { orderId } = req.params
    if (!mongoose.Types.ObjectId.isValid(orderId))
      return responseHelper.error(res, 'Mã đơn hàng không hợp lệ', 400)

    const order = await Order.findOne({
      _id: orderId,
      warehouse: warehouseId
    })
      .populate('items.foodId', 'name')
      .populate('items.comboId', 'name items')
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
    const warehouseId = await getWarehouse(req)

    if (!['pending', 'cooking', 'done'].includes(status)) {
      return responseHelper.error(res, 'Trạng thái món không hợp lệ', 400)
    }

    const order = await Order.findOne({
      _id: orderId,
      warehouse: warehouseId
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
