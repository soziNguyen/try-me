import Table from './model.js'
import responseHelper from '../../helpers/responseHelper.js'
import { getCurrentOrg } from '../../helpers/orgHelper.js'

export const tablePage = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req)
    if (!organizationId)
      return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    const tables = await Table.find({
      organization: organizationId
    })
    responseHelper.success(res, tables)
  } catch (err) {
    console.error(err)
    responseHelper.error(res, err.message)
  }
}

// [CREATE] / table
export const createTable = async (req, res) => {
  try {
    const { name, status, capacity, area } = req.body
    const organizationId = getCurrentOrg(req)
    if (!organizationId)
      return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)
    const exist = await Table.findOne({
      name,
      organization: organizationId
    })

    if (exist) {
      return responseHelper.error(res, 'Tên bàn đã tồn tại.', 400)
    }
    const newTable = await Table.create({
      name,
      status,
      capacity: capacity || undefined,
      area: area || undefined,
      organization: organizationId
    })

    responseHelper.success(res, newTable)
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

// [GET] /api/tables
export const getTables = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req)
    if (!organizationId) {
      return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)
    }

    // Lấy các query filter
    const { status, area } = req.query

    // Tạo bộ lọc
    const filter = {
      organization: organizationId
    }
    if (status) {
      filter.status = status
    }
    if (area) {
      filter.area = new RegExp(`^${area}$`, 'i') // không phân biệt hoa thường
    }

    // Lấy toàn bộ danh sách bàn theo filter (không phân trang)
    const tables = await Table.find(filter).lean()

    responseHelper.success(res, {
      tables
    })
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const getTableById = async (req, res) => {
  try {
    const { id } = req.params
    const organizationId = getCurrentOrg(req)
    if (!organizationId)
      return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    const table = await Table.findOne({
      _id: id,
      organization: organizationId
    })
    if (!table) {
      return responseHelper.error(res, 'Table Not Found', 404)
    }
    responseHelper.success(res, table)
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

// UPDATE
export const updateTable = async (req, res) => {
  try {
    const { name, status, capacity, area, checkInTime } = req.body
    const { id } = req.params
    const organizationId = getCurrentOrg(req)
    if (!organizationId)
      return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    // Kiểm tra bàn có tồn tại & thuộc tổ chức không
    const tableExist = await Table.findOne({
      _id: id,
      organization: organizationId
    })
    if (!tableExist) {
      return responseHelper.error(res, 'Không tìm thấy bàn.', 404)
    }

    // Kiểm tra trùng tên bàn (trừ chính bản thân nó) trong cùng tổ chức
    const duplicated = await Table.findOne({
      name,
      organization: organizationId,
      _id: { $ne: id }
    })

    if (duplicated) {
      return responseHelper.error(res, 'Tên bàn đã tồn tại.', 400)
    }

    // Tạo đối tượng dữ liệu mới cần update
    const updatedFields = {
      name,
      status,
      capacity,
      area
    }
    if (checkInTime) {
      updatedFields.checkInTime = checkInTime
    }

    const updatedTable = await Table.findOneAndUpdate(
      { _id: id, organization: organizationId },
      updatedFields,
      { new: true }
    )

    if (!updatedTable) {
      return responseHelper.error(res, 'Cập nhật thất bại.', 400)
    }

    responseHelper.success(res, updatedTable)
  } catch (error) {
    console.error('Lỗi khi cập nhật bàn:', error)
    responseHelper.error(res, error.message || 'Lỗi máy chủ.')
  }
}

// DELETE TABLE
export const deleteTables = async (req, res) => {
  try {
    const { tableIds } = req.body
    const organizationId = getCurrentOrg(req)
    if (!organizationId)
      return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    if (!tableIds || tableIds.length === 0) {
      return responseHelper.error(res, 'Không có bàn nào được chọn.', 400)
    }

    const result = await Table.deleteMany({
      _id: { $in: tableIds },
      organization: organizationId
    })

    if (result.deletedCount === 0) {
      return responseHelper.error(res, 'Không tìm thấy bàn nào để xóa.', 404)
    }

    responseHelper.success(res, 'Xóa bàn thành công')
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}
