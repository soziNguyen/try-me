import mongoose from 'mongoose'
import { Receipt } from './model.js'
// import Organization from '../organization/model.js'
import BusinessError from '../error/BusinessError.js'
import responseHelper from '../../helpers/responseHelper.js'
import { getCurrentOrg } from '../../helpers/orgHelper.js'
import { generateDocumentCode } from '../../helpers/common.js'
import withTransaction from '../../helpers/withTransaction.js'
import { lookupRef, lookupUser } from '../../helpers/lookupHelper.js'
import { getWarehouse } from '../../helpers/warehouseHelper.js'

export const createReceipt = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req)
    if (!organizationId) {
      return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)
    }

    const { reason, note, receiptAmount, submitTer } = req.body

    const receipt = await withTransaction(async (session) => {
      // Sinh mã phiếu tự động, ví dụ: RC0001
      const code = await generateDocumentCode(Receipt, 'RC')
      const date = new Date()
      const warehouse = req.body.warehouse || (await getWarehouse(req, organizationId))

      const docData = {
        code,
        date,
        createdBy: req.user._id,
        organization: organizationId,
        warehouse,
        reason,
        note,
        receiptAmount,
        submitTer: submitTer || null
      }

      const doc = new Receipt(docData)
      await doc.save({ session })
      return doc
    })

    responseHelper.success(res, { id: receipt._id, code: receipt.code })
  } catch (error) {
    console.error('Lỗi khi tạo phiếu thu:', error)
    responseHelper.error(res, error.message)
  }
}

// Lấy phiếu thu theo ID
export const getReceiptById = async (req, res) => {
  try {
    const { id } = req.params
    const organizationId = getCurrentOrg(req)
    if (!organizationId) {
      return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)
    }

    if (!mongoose.isValidObjectId(id)) {
      return responseHelper.error(res, 'ID không hợp lệ', 400)
    }

    const matchCondition = { _id: id, organization: organizationId }

    // Nếu bạn có filter theo kho (kho được phép xem)
    if (req.warehouseFilter) {
      matchCondition.warehouse = req.warehouseFilter
    }

    const receipt = await Receipt.findOne(matchCondition)
      .populate('warehouse', 'name location')
      .populate('createdBy', 'username fullName')
      .populate('updatedBy', 'username fullName')
      .populate('lockedBy', 'username fullName')
      .populate('submitTer', 'username fullName') // Người nộp tiền

    if (!receipt) {
      return responseHelper.error(res, 'Không tìm thấy phiếu thu', 404)
    }

    // Trả về dữ liệu
    responseHelper.success(res, { receipt })
  } catch (error) {
    console.error('Lỗi khi lấy phiếu thu:', error)
    responseHelper.error(res, error.message)
  }
}

// Lấy danh sách phiếu thu
export const getReceipts = async (req, res) => {
  try {
    const draw = +req.query.draw || 0
    const start = +req.query.start || 0
    const length = +req.query.length || 10
    const searchValue = (req.query['search[value]'] || '').trim()
    const colIdx = req.query['order[0][column]']
    const sortField = req.query[`columns[${colIdx}][data]`] || 'createdAt'
    const sortDir = req.query['order[0][dir]'] === 'asc' ? 1 : -1

    const organizationId = getCurrentOrg(req)
    if (!organizationId) {
      return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)
    }

    const matchCondition = { organization: organizationId }

    const warehouse = req.query.warehouse
    if (warehouse && warehouse !== 'all') {
      matchCondition.warehouse = new mongoose.Types.ObjectId(String(warehouse))
    }

    // ====== PIPELINE XỬ LÝ DỮ LIỆU ======
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

    // Gom nhóm các trường cần hiển thị
    basePipeline.push({
      $group: {
        _id: '$_id',
        code: { $first: '$code' },
        date: { $first: '$date' },
        warehouse: { $first: '$warehouse' },
        reason: { $first: '$reason' },
        note: { $first: '$note' },
        receiptAmount: { $first: '$receiptAmount' },
        createdBy: { $first: '$createdBy.username' }
      }
    })

    // Sắp xếp
    basePipeline.push({ $sort: { [sortField]: sortDir } })

    // ====== ĐẾM TỔNG SỐ BẢN GHI ======
    const countPipeline = [...basePipeline, { $count: 'totalCount' }]
    const totalData = await Receipt.aggregate(countPipeline)
    const recordsTotal = totalData.length > 0 ? totalData[0].totalCount : 0
    basePipeline.push({ $skip: start }, { $limit: length })

    const data = await Receipt.aggregate(basePipeline)

    return res.json({
      draw,
      recordsTotal,
      recordsFiltered: recordsTotal,
      data
    })
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

//Cập nhật phiếu thu
export const updateReceipt = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req)
    if (!organizationId) {
      return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)
    }

    const updatedDoc = await withTransaction(async (session) => {
      const { id } = req.params
      if (!mongoose.isValidObjectId(id)) throw new BusinessError('ID không hợp lệ', 400)

      const findCondition = { _id: id, organization: organizationId }
      if (req.warehouseFilter) findCondition.warehouse = req.warehouseFilter

      const oldReceipt = await Receipt.findOne(findCondition).session(session)
      if (!oldReceipt) throw new BusinessError('Phiếu thu không tồn tại', 404)
      if (oldReceipt.isLocked)
        throw new BusinessError('Phiếu thu đã bị khóa, không thể chỉnh sửa', 400)

      const { receiptAmount, reason, note, submitTer } = req.body

      const updateData = {
        receiptAmount,
        reason,
        note,
        submitTer: submitTer || oldReceipt.submitTer,
        updatedBy: req.user._id
      }

      const updatedReceipt = await Receipt.findOneAndUpdate(
        { _id: id, organization: organizationId },
        updateData,
        { new: true, session }
      )

      if (!updatedReceipt) throw new BusinessError('Cập nhật phiếu thu thất bại', 400)

      await updatedReceipt.populate([
        { path: 'warehouse', select: 'name location' },
        { path: 'createdBy updatedBy lockedBy submitTer', select: 'username' }
      ])

      return updatedReceipt
    })

    responseHelper.success(res, updatedDoc, 'Cập nhật phiếu thu thành công')
  } catch (error) {
    if (error instanceof BusinessError)
      return responseHelper.error(res, error.message, error.statusCode || 400)

    console.error('Lỗi khi cập nhật phiếu thu:', error)
    responseHelper.error(res, error.message)
  }
}
//Xóa phiếu thu
export const deleteReceipts = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    await withTransaction(async (session) => {
      const { ids } = req.body
      if (!Array.isArray(ids) || ids.length === 0)
        throw new BusinessError('Không có phiếu nào được chọn để xóa')

      const findCondition = { _id: { $in: ids }, organization: organizationId }
      if (req.warehouseFilter) findCondition.warehouse = req.warehouseFilter

      const receipts = await Receipt.find(findCondition).session(session)
      if (!receipts.length) throw new BusinessError('Không tìm thấy phiếu thu', 404)

      const lockedReceipts = receipts.filter((r) => r.isLocked)
      if (lockedReceipts.length > 0)
        throw new BusinessError('Không thể xóa phiếu thu đã bị khóa', 400)

      await Receipt.deleteMany(findCondition).session(session)
    })

    responseHelper.success(res, null, 'Xóa phiếu thu thành công')
  } catch (error) {
    if (error instanceof BusinessError)
      return responseHelper.error(res, error.message, error.statusCode || 400)
    responseHelper.error(res, error.message)
  }
}
