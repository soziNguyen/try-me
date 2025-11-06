import { Ingredient } from '../../inventory/ingredient/model.js'
import { StockEntry } from '../../stock-transaction/stock-entry/model.js'
import { StockIssue } from '../../stock-transaction/stock-issue/model.js'
import StockTransfer from '../../stock-transaction/stock-transfer/model.js'
import { getCurrentOrg } from '../../../helpers/orgHelper.js'
import responseHelper from '../../../helpers/responseHelper.js'
import mongoose from 'mongoose'

export const getStockReport = async (req, res) => {
  try {
    const { from, to } = req.query
    const warehouse = req.query.warehouse?.trim() || 'all'

    const startDate = new Date(from)
    startDate.setHours(0, 0, 0, 0)

    const endDate = new Date(to)
    endDate.setHours(23, 59, 59, 999)

    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    const ingredients = await Ingredient.find({
      organization: organizationId
    }).populate('category')

    // Nếu warehouse hợp lệ (không phải all)
    const warehouseFilter =
      warehouse !== 'all' && mongoose.Types.ObjectId.isValid(warehouse)
        ? new mongoose.Types.ObjectId(String(warehouse))
        : null

    const reportData = await Promise.all(
      ingredients.map(async (ing) => {
        const id = ing._id

        // ====== Các điều kiện dùng chung ======
        const matchCommon = {
          organization: organizationId,
          'items.ingredient': id
        }

        // ---- Entry & Issue (phiếu nhập / xuất) ----
        const matchBefore = {
          ...matchCommon,
          date: { $lt: startDate },
          ...(warehouseFilter && { warehouse: warehouseFilter })
        }

        const matchEntry = {
          ...matchCommon,
          date: { $gte: startDate, $lte: endDate },
          ...(warehouseFilter && { warehouse: warehouseFilter })
        }

        // ====== Tồn đầu kỳ ======
        const entriesBefore = await StockEntry.aggregate([
          { $match: matchBefore },
          { $unwind: '$items' },
          { $match: { 'items.ingredient': id } },
          { $group: { _id: null, qty: { $sum: '$items.quantity' } } }
        ])

        const issuesBefore = await StockIssue.aggregate([
          { $match: matchBefore },
          { $unwind: '$items' },
          { $match: { 'items.ingredient': id } },
          { $group: { _id: null, qty: { $sum: '$items.quantity' } } }
        ])

        // ✅ FIX: Transfers OUT - fromWarehouse ở document level
        const transfersOutBefore = await StockTransfer.aggregate([
          {
            $match: {
              organization: organizationId,
              date: { $lt: startDate },
              ...(warehouseFilter && { fromWarehouse: warehouseFilter })
            }
          },
          { $unwind: '$items' },
          { $match: { 'items.ingredient': id } },
          { $group: { _id: null, qty: { $sum: '$items.quantity' } } }
        ])

        // ✅ FIX: Transfers IN - toWarehouse ở item level, filter sau $unwind
        const transfersInBefore = await StockTransfer.aggregate([
          {
            $match: {
              organization: organizationId,
              date: { $lt: startDate }
            }
          },
          { $unwind: '$items' },
          {
            $match: {
              'items.ingredient': id,
              ...(warehouseFilter && { 'items.toWarehouse': warehouseFilter })
            }
          },
          { $group: { _id: null, qty: { $sum: '$items.quantity' } } }
        ])

        const beginningQty =
          (entriesBefore[0]?.qty || 0) -
          (issuesBefore[0]?.qty || 0) -
          (transfersOutBefore[0]?.qty || 0) +
          (transfersInBefore[0]?.qty || 0)

        // ====== Trong kỳ ======
        const entriesIn = await StockEntry.aggregate([
          { $match: matchEntry },
          { $unwind: '$items' },
          { $match: { 'items.ingredient': id } },
          { $group: { _id: null, qty: { $sum: '$items.quantity' } } }
        ])

        const issuesOut = await StockIssue.aggregate([
          { $match: matchEntry },
          { $unwind: '$items' },
          { $match: { 'items.ingredient': id } },
          { $group: { _id: null, qty: { $sum: '$items.quantity' } } }
        ])

        // ✅ FIX: Transfers OUT - fromWarehouse ở document level
        const transfersOut = await StockTransfer.aggregate([
          {
            $match: {
              organization: organizationId,
              date: { $gte: startDate, $lte: endDate },
              ...(warehouseFilter && { fromWarehouse: warehouseFilter })
            }
          },
          { $unwind: '$items' },
          { $match: { 'items.ingredient': id } },
          { $group: { _id: null, qty: { $sum: '$items.quantity' } } }
        ])

        // ✅ FIX: Transfers IN - toWarehouse ở item level, filter sau $unwind
        const transfersIn = await StockTransfer.aggregate([
          {
            $match: {
              organization: organizationId,
              date: { $gte: startDate, $lte: endDate }
            }
          },
          { $unwind: '$items' },
          {
            $match: {
              'items.ingredient': id,
              ...(warehouseFilter && { 'items.toWarehouse': warehouseFilter })
            }
          },
          { $group: { _id: null, qty: { $sum: '$items.quantity' } } }
        ])

        const endingQty =
          beginningQty +
          (entriesIn[0]?.qty || 0) -
          (issuesOut[0]?.qty || 0) -
          (transfersOut[0]?.qty || 0) +
          (transfersIn[0]?.qty || 0)

        return {
          ingredient: ing.name,
          category: ing.category?.name || '',
          unit: ing.unit,
          beginningQty,
          receivedQty: entriesIn[0]?.qty || 0,
          issuedQty: issuesOut[0]?.qty || 0,
          transferredOutQty: transfersOut[0]?.qty || 0,
          transferredInQty: transfersIn[0]?.qty || 0,
          endingQty
        }
      })
    )

    res.json({
      from,
      to,
      warehouse,
      data: reportData
    })
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}
