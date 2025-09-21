import ReceivingAccount from './model.js'
import { getCurrentOrg } from '../../helpers/orgHelper.js'
import responseHelper from '../../helpers/responseHelper.js'

// Lấy các tài khoản đang hoạt động
export const getActiveAccounts = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    const accounts = await ReceivingAccount.find({
      isActive: true,
      organization: organizationId
    })
      .select('_id name type accountNumber bankName')
      .sort({ name: 1 })

    responseHelper.success(res, accounts)
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

// Tạo tài khoản mới
export const createAccount = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu tổ chức', 400)

    const query = { ...req.body, organization: organizationId }
    const newAccount = await ReceivingAccount.create(query)
    responseHelper.success(res, newAccount, 'Tạo thành công')
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

// Lấy danh sách tài khoản theo DataTables
export const getAccounts = async (req, res) => {
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

    const query = { organization: organizationId }
    if (searchValue) {
      query.$or = [
        { name: new RegExp(searchValue, 'i') },
        { type: new RegExp(searchValue, 'i') },
        { accountNumber: new RegExp(searchValue, 'i') },
        { bankName: new RegExp(searchValue, 'i') }
      ]
    }

    const recordsTotal = await ReceivingAccount.countDocuments({ organization: organizationId })
    const recordsFiltered = await ReceivingAccount.countDocuments(query)

    const accounts = await ReceivingAccount.find(query)
      .sort({ [sortField]: sortDir })
      .skip(start)
      .limit(length)
      .select('name type accountNumber bankName bankCode isActive createdAt')

    return res.json({
      draw,
      recordsTotal,
      recordsFiltered,
      data: accounts
    })
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

// Cập nhật tài khoản
export const updateAccount = async (req, res) => {
  try {
    const { id } = req.params
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu tổ chức', 400)

    const { name, type, accountNumber, bankName, bankCode, isActive } = req.body

    const account = await ReceivingAccount.findOne({ _id: id, organization: organizationId })
    if (!account) return responseHelper.error(res, 'Tài khoản không tồn tại', 404)

    const dataUpdate = {}
    if (name !== undefined) dataUpdate.name = name
    if (type !== undefined) dataUpdate.type = type
    if (accountNumber !== undefined) dataUpdate.accountNumber = accountNumber
    if (bankName !== undefined) dataUpdate.bankName = bankName
    if (bankCode !== undefined) dataUpdate.bankCode = bankCode
    if (isActive !== undefined) dataUpdate.isActive = isActive

    const updated = await ReceivingAccount.findOneAndUpdate(
      { _id: id, organization: organizationId },
      { $set: dataUpdate },
      { new: true }
    )
    responseHelper.success(res, updated, 'Cập nhật thành công')
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

// Xóa tài khoản
export const deleteAccount = async (req, res) => {
  try {
    const { ids } = req.body
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return responseHelper.error(res, 'Không có bản ghi nào để xóa', 400)
    }

    const result = await ReceivingAccount.deleteMany({
      _id: { $in: ids },
      organization: organizationId
    })

    responseHelper.success(
      res,
      { deletedCount: result.deletedCount },
      'Đã xóa vĩnh viễn các bản ghi thành công'
    )
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}
