import Supplier from './model.js'
import responseHelper from '../../../helpers/responseHelper.js'
import { lookupUser } from '../../../helpers/lookupHelper.js'
import { getCurrentOrg } from '../../../helpers/orgHelper.js'
import { logActivity } from '../../activity-logs/service.js'
import { buildChangeLog } from '../../../helpers/changeLog.js'

export const getAllSuppliers = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    const suppliers = await Supplier.find({
      isActive: true,
      organization: organizationId
    })
      .select('_id name')
      .sort({ name: 1 })
    responseHelper.success(res, suppliers)
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const getSuppliers = async (req, res) => {
  try {
    const draw = +req.query.draw || 0
    const start = +req.query.start || 0
    const length = +req.query.length || 10
    const searchValue = (req.query['search[value]'] || '').trim()
    const colIdx = req.query['order[0][column]']
    const sortField = req.query[`columns[${colIdx}][data]`] || 'createdAt'
    const sortDir = req.query['order[0][dir]'] === 'asc' ? 1 : -1

    const fieldToSearch = ['code', 'name', 'phone', 'email', 'country', 'address', 'taxId', 'note']

    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    const pipeline = [
      { $match: { organization: organizationId } },
      ...lookupUser('createdBy'),
      ...lookupUser('updatedBy')
    ]

    if (searchValue) {
      const orConditions = fieldToSearch.map((field) => ({
        [field]: { $regex: searchValue, $options: 'i' }
      }))
      pipeline.push({ $match: { $or: orConditions } })
    }

    const countPipeline = [...pipeline, { $count: 'count' }]
    const countResult = await Supplier.aggregate(countPipeline)
    const recordsFiltered = countResult[0]?.count || 0

    const recordsTotal = await Supplier.countDocuments({
      organization: organizationId
    })

    pipeline.push(
      { $sort: { [sortField]: sortDir } },
      { $skip: start },
      { $limit: length },
      {
        $project: {
          _id: 1,
          code: 1,
          name: 1,
          phone: 1,
          email: 1,
          country: 1,
          address: 1,
          taxId: 1,
          note: 1,
          isActive: 1,
          createdAt: 1,
          createdBy: '$createdBy.username',
          updatedBy: '$updatedBy.username'
        }
      }
    )

    const suppliers = await Supplier.aggregate(pipeline)

    return res.json({
      draw,
      recordsTotal,
      recordsFiltered,
      data: suppliers
    })
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const createSupplier = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    const data = {
      ...req.body,
      createdBy: req.user._id,
      organization: organizationId
    }
    const newSupplier = new Supplier(data)
    await newSupplier.save()

    logActivity(
      organizationId,
      req.user._id,
      req.user.username,
      'CREATE',
      'SUPPLIER',
      `Thêm mới nhà cung cấp`,
      newSupplier.name,
      'SUCCESS'
    )

    responseHelper.success(res, null, 'Tạo thành công')
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const updateSupplier = async (req, res) => {
  try {
    const { id } = req.params
    const { code, name, phone, email, country, address, taxId, isActive, note } = req.body

    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    const supplier = await Supplier.findOne({
      _id: id,
      organization: organizationId
    })
    if (!supplier) {
      return responseHelper.error(res, 'Khách hàng không tồn tại', 404)
    }

    const conditions = []
    if (code !== undefined) conditions.push({ code })
    if (name !== undefined) conditions.push({ name })

    if (conditions.length > 0) {
      const existing = await Supplier.findOne({
        _id: { $ne: id },
        organization: organizationId,
        $or: conditions
      })

      if (existing) {
        return responseHelper.error(res, 'Mã hoặc tên khách hàng đã tồn tại', 400)
      }
    }

    const dataUpdate = {}
    if (code !== undefined) dataUpdate.code = code
    if (name !== undefined) dataUpdate.name = name
    if (phone !== undefined) dataUpdate.phone = phone
    if (email !== undefined) dataUpdate.email = email
    if (country !== undefined) dataUpdate.country = country
    if (address !== undefined) dataUpdate.address = address
    if (taxId !== undefined) dataUpdate.taxId = taxId
    if (isActive !== undefined) dataUpdate.isActive = isActive
    if (note !== undefined) dataUpdate.note = note

    dataUpdate.updatedBy = req.user._id

    const updated = await Supplier.findOneAndUpdate(
      { _id: id, organization: organizationId },
      dataUpdate,
      { new: true }
    ).populate('updatedBy', 'username')

    const changeDetailsWh = buildChangeLog(
      supplier,
      updated,
      [
        { field: 'code', label: 'Mã NCC' },
        { field: 'name', label: 'Tên NCC' },
        { field: 'phone', label: 'SĐT' },
        { field: 'email', label: 'Email' },
        { field: 'country', label: 'Quốc gia' },
        { field: 'address', label: 'Địa chỉ' },
        { field: 'taxId', label: 'MST' },
        { field: 'isActive', label: 'Trạng thái' },
        { field: 'note', label: 'Ghi chú' }
      ],
      supplier.name,
      'nhà cung cấp'
    )

    logActivity(
      organizationId,
      req.user._id,
      req.user.username,
      'Cập nhật nhà kho',
      'WAREHOUSE',
      changeDetailsWh || 'Không có thay đổi',
      updated.name
    )

    responseHelper.success(res, updated, 'Cập nhật thành công')
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const deleteSuppliers = async (req, res) => {
  try {
    const { ids } = req.body

    if (!Array.isArray(ids) || ids.length === 0) {
      return responseHelper.error(res, 'Không có nhà cung cấp nào được chọn để xóa', 400)
    }

    const result = await Supplier.updateMany({ _id: { $in: ids } }, { $set: { isActive: false } })

    responseHelper.success(res, result.modifiedCount, 'Xóa thành công')
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const restoreSuppliers = async (req, res) => {
  try {
    const { ids } = req.body
    await Supplier.updateMany({ _id: { $in: ids } }, { $set: { isActive: true } })
    responseHelper.success(res, 'Khôi phục thành công')
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const forceDeleteSuppliers = async (req, res) => {
  try {
    const { ids } = req.body
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    if (!Array.isArray(ids) || ids.length === 0) {
      return responseHelper.error(res, 'Không có nhà cung cấp nào được chọn để xóa', 400)
    }

    const result = await Supplier.deleteMany({
      _id: { $in: ids },
      organization: organizationId
    })

    logActivity(
      organizationId,
      req.user._id,
      req.user.username,
      'DELETE',
      'SUPPLIER',
      `Xóa ${result.deletedCount} nhà cung cấp`,
      '',
      'SUCCESS'
    )

    responseHelper.success(res, result.deletedCount, 'Đã xóa vĩnh viễn các nhà cung cấp thành công')
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}
