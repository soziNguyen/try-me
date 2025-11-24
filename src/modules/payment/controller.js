import PaymentMethod from '../payment/model.js'
import ReceivingAccount from '../receiving-account/model.js'
import { getCurrentOrg } from '../../helpers/orgHelper.js'
import responseHelper from '../../helpers/responseHelper.js'
import { logActivity } from '../activity-logs/service.js'
import { buildChangeLog } from '../../helpers/changeLog.js'

export const getActivePaymentMethods = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    const coupons = await PaymentMethod.find({
      isActive: true,
      organization: organizationId
    })
      .select('_id name type')
      .sort({ name: 1 })
    responseHelper.success(res, coupons)
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const createPaymentMethod = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu tổ chức', 400)
    const query = { ...req.body, organization: organizationId }
    const newPaymentMethod = await PaymentMethod.create(query)

    logActivity(
      organizationId,
      req.user._id,
      req.user.username || 'Unknown',
      'CREATE',
      'PAYMENT_METHOD',
      `Thêm mới phương thức thanh toán`,
      newPaymentMethod.name
    )

    responseHelper.success(res, newPaymentMethod, 'Tạo thành công')
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const getPaymentMethods = async (req, res) => {
  try {
    const draw = +req.query.draw || 0
    const start = +req.query.start || 0
    const length = +req.query.length || 10
    const searchValue = (req.query['search[value]'] || '').trim()
    const colIdx = req.query['order[0][column]']
    const sortField = req.query[`columns[${colIdx}][data]`] || 'createdAt'
    const sortDir = req.query['order[0][dir]'] === 'asc' ? 1 : -1

    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu tổ chức', 400)

    // Lọc dữ liệu
    const query = { organization: organizationId }
    if (searchValue) {
      query.$or = [
        { name: new RegExp(searchValue, 'i') },
        { type: new RegExp(searchValue, 'i') },
        { description: new RegExp(searchValue, 'i') }
      ]
    }

    // Đếm tổng & sau lọc
    const recordsTotal = await PaymentMethod.countDocuments({
      organization: organizationId
    })
    const recordsFiltered = await PaymentMethod.countDocuments(query)

    // Query chính với populate receivingAccountId
    const paymentMethods = await PaymentMethod.find(query)
      .populate('receivingAccountId', 'name accountNumber bankName bankCode')
      .sort({ [sortField]: sortDir })
      .skip(start)
      .limit(length)
      .select('name type description isActive receivingAccountId createdAt')

    // Trả về DataTables format
    return res.json({
      draw,
      recordsTotal,
      recordsFiltered,
      data: paymentMethods
    })
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const updatePaymentMethod = async (req, res) => {
  try {
    const { id } = req.params
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu tổ chức', 400)

    const { name, type, description, isActive, receivingAccountId } = req.body

    const paymentMethod = await PaymentMethod.findOne({
      _id: id,
      organization: organizationId
    })
    if (!paymentMethod)
      return responseHelper.error(res, 'Phương thức thanh toán không tồn tại', 404)

    // Validate receivingAccountId if provided
    if (receivingAccountId && receivingAccountId !== '') {
      const receivingAccount = await ReceivingAccount.findOne({
        _id: receivingAccountId,
        organization: organizationId,
        isActive: true
      })
      if (!receivingAccount) {
        return responseHelper.error(res, 'Tài khoản nhận không hợp lệ', 400)
      }
    }

    // Check trùng tên (chỉ khi có name)
    if (name) {
      const existing = await PaymentMethod.findOne({
        _id: { $ne: id },
        organization: organizationId,
        name
      })
      if (existing) return responseHelper.error(res, 'Tên phương thức đã tồn tại', 400)
    }

    const dataUpdate = {}
    if (name !== undefined) dataUpdate.name = name
    if (type !== undefined) dataUpdate.type = type
    if (description !== undefined) dataUpdate.description = description
    if (isActive !== undefined) dataUpdate.isActive = isActive
    if (receivingAccountId !== undefined) {
      dataUpdate.receivingAccountId = receivingAccountId || null // Allow clearing
    }

    const updated = await PaymentMethod.findOneAndUpdate(
      { _id: id, organization: organizationId },
      { $set: dataUpdate },
      { new: true }
    ).populate('receivingAccountId', 'name accountNumber bankName bankCode')

    const changeDetailsPay = buildChangeLog(
      paymentMethod,
      updated,
      [
        { field: 'name', label: 'Tên phương thức' },
        { field: 'type', label: 'Loại' },
        { field: 'description', label: 'Mô tả' },
        { field: 'isActive', label: 'Trạng thái' }
        // { field: 'receivingAccountId', label: 'Tài khoản nhận' }
      ],
      paymentMethod.name,
      'phương thức thanh toán'
    )

    logActivity(
      organizationId,
      req.user._id,
      req.user.username,
      'UPDATE',
      'PAYMENT_METHOD',
      changeDetailsPay,
      updated.name
    )

    responseHelper.success(res, updated, 'Cập nhật thành công')
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const deletePaymentMethod = async (req, res) => {
  try {
    const { ids } = req.body
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return responseHelper.error(res, 'Không có bản ghi nào để xóa', 400)
    }

    const result = await PaymentMethod.deleteMany({
      _id: { $in: ids },
      organization: organizationId
    })

    logActivity(
      organizationId,
      req.user._id,
      req.user.username,
      'DELETE',
      'PAYMENT_METHOD',
      `Đã xóa ${result.deletedCount} phương thức thanh toán`
    )

    responseHelper.success(
      res,
      { deletedCount: result.deletedCount },
      'Đã xóa vĩnh viễn các bản ghi thành công'
    )
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}
