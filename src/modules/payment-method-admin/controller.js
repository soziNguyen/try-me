import PaymentMethod from './model.js'
import responseHelper from '../../helpers/responseHelper.js'
import { mongoose } from 'mongoose'

export const getActivePaymentMethods = async (req, res) => {
  try {
    const methods = await PaymentMethod.find({ isActive: true }).sort({ sortOrder: 1 })
    responseHelper.success(res, methods)
  } catch (err) {
    responseHelper.error(res, err.message)
  }
}

export const getPaymentMethods = async (req, res) => {
  try {
    const draw = +req.query.draw || 0
    const start = +req.query.start || 0
    const length = +req.query.length || 10
    const searchValue = (req.query['search[value]'] || '').trim()
    const colIdx = req.query['order[0][column]']
    const sortField = req.query[`columns[${colIdx}][data]`] || 'sortOrder'
    const sortDir = req.query['order[0][dir]'] === 'asc' ? 1 : -1

    const query = {}
    if (searchValue) {
      query.$or = [
        { name: new RegExp(searchValue, 'i') },
        { code: new RegExp(searchValue, 'i') },
        { description: new RegExp(searchValue, 'i') }
      ]
    }

    // Đếm tổng & sau khi lọc
    const recordsTotal = await PaymentMethod.countDocuments()
    const recordsFiltered = await PaymentMethod.countDocuments(query)

    // Lấy dữ liệu
    const paymentMethods = await PaymentMethod.find(query)
      .sort({ [sortField]: sortDir })
      .skip(start)
      .limit(length)

    const data = paymentMethods.map((pm) => ({
      ...pm.toObject(),
      bankInfo: pm.bankInfo || {
        bankName: '',
        accountNumber: '',
        accountName: '',
        branchName: ''
      }
    }))

    console.log(data)

    return res.json({
      draw,
      recordsTotal,
      recordsFiltered,
      data
    })
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const getPaymentMethodById = async (req, res) => {
  try {
    const { id } = req.params
    if (!mongoose.isValidObjectId(id)) {
      return responseHelper.error(res, 'Id không hợp lệ', 400)
    }

    const data = await PaymentMethod.findById(id)
    responseHelper.success(res, data)
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const createPaymentMethod = async (req, res) => {
  try {
    const { name, code, description, icon, isActive, sortOrder, config, bankInfo } = req.body

    if (!name || !code) {
      return responseHelper.error(res, 'Thiếu tên hoặc mã phương thức thanh toán')
    }

    const existing = await PaymentMethod.findOne({ code })
    if (existing) {
      return responseHelper.error(res, 'Mã phương thức này đã tồn tại')
    }

    const newMethod = await PaymentMethod.create({
      name,
      icon,
      code,
      description: description || '',
      isActive: isActive ?? true,
      sortOrder: sortOrder ?? 0,
      config: config || {},
      bankInfo: bankInfo || null // default null nếu không có
    })

    return responseHelper.success(res, newMethod, 'Tạo phương thức thanh toán thành công')
  } catch (error) {
    return responseHelper.error(res, error.message)
  }
}

export const updatePaymentMethod = async (req, res) => {
  try {
    const { id } = req.params
    const { name, code, description, icon, isActive, sortOrder, bankInfo, config } = req.body

    if (!id) {
      return responseHelper.error(res, 'Thiếu ID phương thức thanh toán')
    }

    const existing = await PaymentMethod.findById(id)
    if (!existing) {
      return responseHelper.error(res, 'Không tìm thấy phương thức thanh toán')
    }

    if (code && code !== existing.code) {
      const codeExists = await PaymentMethod.findOne({ code, _id: { $ne: id } })
      if (codeExists) {
        return responseHelper.error(res, 'Mã phương thức thanh toán đã tồn tại')
      }
      existing.code = code
    }

    if (name !== undefined) existing.name = name
    if (code !== undefined) existing.code = code
    if (description !== undefined) existing.description = description
    if (icon !== undefined) existing.icon = icon
    if (isActive !== undefined) existing.isActive = isActive
    if (sortOrder !== undefined) existing.sortOrder = sortOrder
    if (bankInfo !== undefined) existing.bankInfo = bankInfo
    if (config !== undefined) existing.config = { ...existing.config, ...config }

    await existing.save()

    return responseHelper.success(res, existing, 'Cập nhật phương thức thành công')
  } catch (err) {
    return responseHelper.error(res, err.message)
  }
}

export const deletePaymentMethods = async (req, res) => {
  try {
    const { ids } = req.body
    if (!Array.isArray(ids) || ids.length == 0)
      return responseHelper.error(res, 'Vui lòng chọn 1 bản ghi để xóa', 400)

    const result = await PaymentMethod.deleteMany({
      _id: { $in: ids }
    })
    responseHelper.success(res, 1, `Đã xóa ${result.deletedCount} bản ghi`)
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}
