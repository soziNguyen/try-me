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
    if (req.warehouseFilter) matchCondition.warehouse = req.warehouseFilter
    else {
      const org = await Organization.findById(organizationId).select('defaultWarehouse')
      if (org?.defaultWarehouse) matchCondition.warehouse = org.defaultWarehouse
    }

    const orders = await Order.find({
      ...matchCondition,
      status: 'open'
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

    const orderCards = []

    orders.forEach((order) => {
      const batches = {}

      // Gom items theo batch
      order.items.forEach((item) => {
        if (item.batch !== null) {
          const batch = item.batch
          if (!batches[batch]) batches[batch] = []
          batches[batch].push(item)
        }
      })

      Object.keys(batches).forEach((batchKey) => {
        const batchItems = batches[batchKey]
        const allDone = batchItems.every((item) => item.status === 'done')

        if (!allDone) {
          // Nếu còn món chưa done -> push cả batch (bao gồm món done + chưa done)
          orderCards.push({
            ...order,
            items: batchItems,
            batch: Number(batchKey)
          })
        }
      })
    })

    // sort theo thời gian tạo + batch
    orderCards.sort((a, b) => {
      // Lấy thời gian sent sớm nhất trong batch
      const aSent = Math.min(...a.items.map((i) => new Date(i.sentAt || a.createdAt)))
      const bSent = Math.min(...b.items.map((i) => new Date(i.sentAt || b.createdAt)))
      const timeDiff = aSent - bSent
      if (timeDiff !== 0) return timeDiff
      return (a.batch || 1) - (b.batch || 1)
    })

    responseHelper.success(res, orderCards)
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

    const order = await Order.findOne({ _id: orderId, warehouse: warehouseId })
      .populate('items.foodId', 'name')
      .populate('items.comboId', 'name items')
      .lean()

    if (!order) return responseHelper.error(res, 'Đơn hàng không tồn tại', 404)

    // sort items theo batch + sentAt
    order.items = order.items.sort((a, b) => {
      if ((a.batch || 1) !== (b.batch || 1)) return (a.batch || 1) - (b.batch || 1)
      return new Date(a.sentAt || order.createdAt) - new Date(b.sentAt || order.createdAt)
    })

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
      status: 'open'
    })
      .populate('items.foodId items.comboId')
      .populate('tableId')

    if (!order) return responseHelper.error(res, 'Đơn hàng không tồn tại', 404)

    const item = order.items.id(itemId)
    if (!item) return responseHelper.error(res, 'Món trong đơn không tồn tại', 404)

    item.status = status

    if (status === 'done') {
      item.doneAt = new Date()
      item.doneBy = req.user._id
    } else {
      item.doneAt = null
      item.doneBy = null
    }
    order.updatedBy = req.user._id

    await order.save()

    const io = req.app.get('io')

    // Lấy tên món từ foodId hoặc comboId
    let itemName = 'Không rõ tên món'
    if (item.foodId) {
      itemName = item.foodId.name || itemName
    } else if (item.comboId) {
      itemName = item.comboId.name || itemName
    }

    const payload = {
      type: 'kitchen_item_update',
      orderId,
      itemId,
      itemName,
      status,
      time: new Date(),
      isTakeaway: order.isTakeaway || false
    }

    if (order.isTakeaway) {
      payload.tableId = null
      payload.tableName = 'Mang về'
    } else {
      payload.tableId = order.tableId?._id || null
      payload.tableName = order.tableId?.name || 'Không rõ bàn'
    }

    io.to('staff_room').emit('staff_notification', payload)

    responseHelper.success(res, item, 'Cập nhật trạng thái món thành công')
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}
