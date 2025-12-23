import PlanTransaction from './model.js'
import responseHelper from '../../helpers/responseHelper.js'

export const getPlanTransactions = async (req, res) => {
  try {
    const draw = +req.query.draw || 0
    const start = +req.query.start || 0
    const length = +req.query.length || 10
    const searchValue = (req.query['search[value]'] || '').trim()
    const colIdx = req.query['order[0][column]']
    const sortField = req.query[`columns[${colIdx}][data]`] || 'createdAt'
    const sortDir = req.query['order[0][dir]'] === 'asc' ? 1 : -1

    // Tạo bộ lọc
    const query = {}
    if (searchValue) {
      query.$or = [
        { couponCode: new RegExp(searchValue, 'i') },
        { note: new RegExp(searchValue, 'i') },
        { 'plan.name': new RegExp(searchValue, 'i') },
        { 'organization.name': new RegExp(searchValue, 'i') }
      ]
    }

    // Đếm tổng & sau lọc
    const recordsTotal = await PlanTransaction.countDocuments()
    const recordsFiltered = await PlanTransaction.countDocuments(query)

    // Query chính
    const transactions = await PlanTransaction.find(query)
      .populate('organization', 'name')
      .populate('plan', 'name code priceMonth priceYear')
      .sort({ [sortField]: sortDir })
      .skip(start)
      .limit(length)

    console.log(transactions)

    // Trả về
    return res.json({
      draw,
      recordsTotal,
      recordsFiltered,
      data: transactions
    })
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const getPlanTransactionById = async (req, res) => {
  try {
    const { id } = req.params
    if (!id) return responseHelper.error(res, 'ID giao dịch không hợp lệ', 400)

    const transaction = await PlanTransaction.findById(id)
      .populate('organization', 'taxCode name phone plan province commune street')
      .populate('plan', 'name priceMonth priceYear originPrice')

    responseHelper.success(res, transaction)
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const deletePlanTransactions = async (req, res) => {
  try {
    const { ids } = req.body
    if (!Array.isArray(ids) || ids.length === 0) {
      return responseHelper.error(res, 'Vui lòng chọn ít nhất 1 bản ghi để xóa', 400)
    }

    const result = await PlanTransaction.deleteMany({
      _id: { $in: ids }
    })
    responseHelper.success(res, '1', `Đã xóa ${result.deletedCount} bản ghi`)
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}
