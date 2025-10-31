import { Ingredient } from '../../inventory/ingredient/model.js'
import { StockEntry } from '../../stock-transaction/stock-entry/model.js'
import { StockIssue } from '../../stock-transaction/stock-issue/model.js'
import StockTransfer from '../../stock-transaction/stock-transfer/model.js'
import Organization from '../../organization/model.js'
import { getCurrentOrg } from '../../../helpers/orgHelper.js'
import responseHelper from '../../../helpers/responseHelper.js'

export const getStockReport = async (req, res) => {
  try {
    const { from, to } = req.query
    const startDate = new Date(from)
    const endDate = new Date(to)

    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    const org = await Organization.findById(organizationId).select('defaultWarehouse')
    const warehouseId = org?.defaultWarehouse || null

    const ingredients = await Ingredient.find({
      organization: organizationId,
      warehouse: warehouseId
    }).populate('warehouse category')

    // --- Build report for each ingredient ---
    const reportData = await Promise.all(
      ingredients.map(async (ing) => {
        const id = ing._id

        // ===== Beginning Balance =====
        const entriesBefore = await StockEntry.aggregate([
          {
            $match: {
              organization: organizationId,
              date: { $lt: startDate },
              warehouse: warehouseId
            }
          },
          { $unwind: '$items' },
          { $match: { 'items.ingredient': id } },
          { $group: { _id: null, qty: { $sum: '$items.quantity' } } }
        ])

        const issuesBefore = await StockIssue.aggregate([
          {
            $match: {
              organization: organizationId,
              date: { $lt: startDate },
              warehouse: warehouseId
            }
          },
          { $unwind: '$items' },
          { $match: { 'items.ingredient': id } },
          { $group: { _id: null, qty: { $sum: '$items.quantity' } } }
        ])

        const transfersOutBefore = await StockTransfer.aggregate([
          {
            $match: {
              organization: organizationId,
              date: { $lt: startDate },
              fromWarehouse: warehouseId
            }
          },
          { $unwind: '$items' },
          { $match: { 'items.ingredient': id } },
          { $group: { _id: null, qty: { $sum: '$items.quantity' } } }
        ])

        const transfersInBefore = await StockTransfer.aggregate([
          {
            $match: {
              organization: organizationId,
              date: { $lt: startDate },
              toWarehouse: warehouseId
            }
          },
          { $unwind: '$items' },
          { $match: { 'items.ingredient': id } },
          { $group: { _id: null, qty: { $sum: '$items.quantity' } } }
        ])

        const beginningQty =
          (entriesBefore[0]?.qty || 0) -
          (issuesBefore[0]?.qty || 0) -
          (transfersOutBefore[0]?.qty || 0) +
          (transfersInBefore[0]?.qty || 0)

        // ===== Movements During Period =====
        const entriesIn = await StockEntry.aggregate([
          {
            $match: {
              organization: organizationId,
              date: { $gte: startDate, $lte: endDate },
              warehouse: warehouseId
            }
          },
          { $unwind: '$items' },
          { $match: { 'items.ingredient': id } },
          { $group: { _id: null, qty: { $sum: '$items.quantity' } } }
        ])

        const issuesOut = await StockIssue.aggregate([
          {
            $match: {
              organization: organizationId,
              date: { $gte: startDate, $lte: endDate },
              warehouse: warehouseId
            }
          },
          { $unwind: '$items' },
          { $match: { 'items.ingredient': id } },
          { $group: { _id: null, qty: { $sum: '$items.quantity' } } }
        ])

        const transfersOut = await StockTransfer.aggregate([
          {
            $match: {
              organization: organizationId,
              date: { $gte: startDate, $lte: endDate },
              fromWarehouse: warehouseId
            }
          },
          { $unwind: '$items' },
          { $match: { 'items.ingredient': id } },
          { $group: { _id: null, qty: { $sum: '$items.quantity' } } }
        ])

        const transfersIn = await StockTransfer.aggregate([
          {
            $match: {
              organization: organizationId,
              date: { $gte: startDate, $lte: endDate },
              toWarehouse: warehouseId
            }
          },
          { $unwind: '$items' },
          { $match: { 'items.ingredient': id } },
          { $group: { _id: null, qty: { $sum: '$items.quantity' } } }
        ])

        // ===== Ending Balance =====
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
      warehouse: warehouseId,
      data: reportData
    })
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}
