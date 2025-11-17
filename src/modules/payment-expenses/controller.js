import mongoose from 'mongoose'
import { ProductExpense, units } from './model.js'
// import Organization from '../organization/model.js'
import BusinessError from '../error/BusinessError.js'

import responseHelper from '../../helpers/responseHelper.js'
import { getCurrentOrg } from '../../helpers/orgHelper.js'
import { generateDocumentCode } from '../../helpers/common.js'
import withTransaction from '../../helpers/withTransaction.js'
import { lookupRef, lookupUser } from '../../helpers/lookupHelper.js'
import { getWarehouse } from '../../helpers/warehouseHelper.js'

// Tạo phiếu chi
export const createPaymentExpense = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    const { reason, receiver, expenseAmount, note, reviewer } = req.body

    const expense = await withTransaction(async (session) => {
      const code = await generateDocumentCode(ProductExpense, 'PE')
      const date = new Date()

      let warehouse = req.body.warehouse
      if (warehouse === 'all' || !warehouse) {
        warehouse = await getWarehouse(req, organizationId)
      }

      const docData = {
        code,
        date,
        createdBy: req.user._id,
        organization: organizationId,
        warehouse,
        reason,
        receiver,
        expenseAmount,
        note,
        reviewer
      }

      const doc = new ProductExpense(docData)
      await doc.save({ session })
      return doc
    })

    responseHelper.success(res, { id: expense._id, code: expense.code })
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

// Lấy phiếu chi theo ID
export const getPaymentExpensesById = async (req, res) => {
  try {
    const { id } = req.params
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    if (!mongoose.isValidObjectId(id)) return responseHelper.error(res, 'ID không hợp lệ', 400)

    const matchCondition = { _id: id, organization: organizationId }

    if (req.warehouseFilter) {
      matchCondition.warehouse = req.warehouseFilter
    }

    const productExpense = await ProductExpense.findOne(matchCondition)
      .populate('warehouse', 'name location')
      .populate('createdBy', 'username')
      .populate('updatedBy', 'username')
      .populate('lockedBy', 'username')

    if (!productExpense) return responseHelper.error(res, 'Không tìm thấy phiếu chi', 404)

    responseHelper.success(res, { productExpense, units })
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

// Lấy danh sách phiếu chi
export const getPaymentExpenses = async (req, res) => {
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

    const matchCondition = { organization: organizationId }

    const warehouse = req.query.warehouse

    if (warehouse && warehouse !== 'all') {
      matchCondition.warehouse = new mongoose.Types.ObjectId(String(warehouse))
    }

    // ====== THÊM FILTER THEO NGÀY ======
    const startDate = req.query.startDate
    const endDate = req.query.endDate

    if (startDate || endDate) {
      matchCondition.date = {}
      if (startDate) {
        matchCondition.date.$gte = new Date(startDate)
      }
      if (endDate) {
        const end = new Date(endDate)
        end.setDate(end.getDate() + 1)
        matchCondition.date.$lt = end
      }
    }

    const basePipeline = [
      { $match: matchCondition },
      ...lookupRef('warehouse', 'Warehouses'),
      ...lookupUser('createdBy')
    ]

    if (searchValue) {
      basePipeline.push({
        $match: {
          $or: [
            { code: { $regex: searchValue, $options: 'i' } },
            { 'warehouse.name': { $regex: searchValue, $options: 'i' } },
            { reason: { $regex: searchValue, $options: 'i' } },
            {
              $expr: {
                $regexMatch: {
                  input: { $dateToString: { format: '%d/%m/%Y', date: '$date' } },
                  regex: searchValue,
                  options: 'i'
                }
              }
            }
          ]
        }
      })
    }

    basePipeline.push({
      $group: {
        _id: '$_id',
        code: { $first: '$code' },
        date: { $first: '$date' },
        warehouse: { $first: '$warehouse' },
        reason: { $first: '$reason' },
        receiver: { $first: '$receiver' },
        note: { $first: '$note' },
        expenseAmount: { $first: '$expenseAmount' },
        createdBy: { $first: '$createdBy.username' }
      }
    })

    // Pipeline để tính tổng tiền
    const totalAmountPipeline = [
      ...basePipeline,
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$expenseAmount' }
        }
      }
    ]

    const countPipeline = [...basePipeline, { $count: 'totalCount' }]

    const [totalAmountResult, totalData] = await Promise.all([
      ProductExpense.aggregate(totalAmountPipeline),
      ProductExpense.aggregate(countPipeline)
    ])

    const totalAmount = totalAmountResult.length > 0 ? totalAmountResult[0].totalAmount : 0
    const recordsTotal = totalData.length > 0 ? totalData[0].totalCount : 0

    basePipeline.push({ $sort: { [sortField]: sortDir } }, { $skip: start }, { $limit: length })

    const data = await ProductExpense.aggregate(basePipeline)

    return res.json({
      draw,
      recordsTotal,
      recordsFiltered: recordsTotal,
      summary: {
        totalExpenses: recordsTotal, // Tổng số phiếu
        totalAmount: totalAmount // Tổng tiền
      },
      data
    })
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

// Cập nhật phiếu chi
export const updatePaymentExpenses = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    const updatedDoc = await withTransaction(async (session) => {
      const { id } = req.params
      if (!mongoose.isValidObjectId(id)) throw new BusinessError('ID không hợp lệ', 400)

      const findCondition = { _id: id, organization: organizationId }
      if (req.warehouseFilter) findCondition.warehouse = req.warehouseFilter

      const oldExpense = await ProductExpense.findOne(findCondition).session(session)
      if (!oldExpense) throw new BusinessError('Phiếu chi không tồn tại', 404)
      if (oldExpense.isLocked)
        throw new BusinessError('Phiếu chi đã bị khóa, không thể chỉnh sửa', 400)

      const { expenseAmount, reason, note, receiver, reviewer } = req.body
      const updateData = {
        reason,
        note,
        receiver,
        expenseAmount,
        reviewer,
        updatedBy: req.user._id
      }

      const updatedExpense = await ProductExpense.findOneAndUpdate(
        { _id: id, organization: organizationId },
        updateData,
        { new: true, session }
      )

      if (!updatedExpense) throw new BusinessError('Cập nhật thất bại', 400)

      await updatedExpense.populate([
        { path: 'warehouse', select: 'name location' },
        { path: 'createdBy updatedBy lockedBy receiver', select: 'username' }
      ])

      return updatedExpense
    })

    responseHelper.success(res, updatedDoc, 'Cập nhật phiếu chi thành công')
  } catch (error) {
    if (error instanceof BusinessError)
      return responseHelper.error(res, error.message, error.statusCode || 400)
    console.error('Error updating payment expense:', error)
    responseHelper.error(res, error.message)
  }
}

// Xóa phiếu chi
export const deletePaymentExpenses = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    await withTransaction(async (session) => {
      const { ids } = req.body
      if (!Array.isArray(ids) || ids.length === 0)
        throw new BusinessError('Không có phiếu nào được chọn để xóa')

      const findCondition = { _id: { $in: ids }, organization: organizationId }
      if (req.warehouseFilter) findCondition.warehouse = req.warehouseFilter

      const expenses = await ProductExpense.find(findCondition).session(session)
      if (!expenses.length) throw new BusinessError('Không tìm thấy phiếu chi', 404)

      const lockedExpenses = expenses.filter((e) => e.isLocked)
      if (lockedExpenses.length > 0)
        throw new BusinessError('Không thể xóa phiếu chi đã bị khóa', 400)

      await ProductExpense.deleteMany(findCondition).session(session)
    })

    responseHelper.success(res, null, 'Xóa phiếu chi thành công')
  } catch (error) {
    if (error instanceof BusinessError)
      return responseHelper.error(res, error.message, error.statusCode || 400)
    responseHelper.error(res, error.message)
  }
}
