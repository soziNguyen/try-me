import Table from './model.js'
import responseHelper from '../../helpers/responseHelper.js'
import Order from '../order/model.js'
import { getCurrentOrg } from '../../helpers/orgHelper.js'

// [CREATE] / table
export const createTable = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    const data = {
      ...req.body,
      organization: organizationId
    }

    const newTable = new Table(data)
    await newTable.save()
    responseHelper.success(res, newTable, 'Tạo thành công')
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

    const { status, area } = req.query

    const filter = { organization: organizationId }
    if (status) filter.status = status
    if (area) filter.area = new RegExp(`^${area}$`, 'i')

    let tables = await Table.find(filter)
      .populate({
        path: 'currentOrderId',
        model: 'Order',
        populate: {
          path: 'customerId',
          model: 'Customer',
          select: 'name phone totalPoints'
        }
      })
      .lean()

    // Ép ObjectId về string + lấy tên khách
    tables = tables.map((t) => {
      if (t.currentOrderId?._id) {
        t.currentOrderId._id = t.currentOrderId._id.toString()
      }
      return t
    })

    responseHelper.success(res, { tables })
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const getDataTables = async (req, res) => {
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

    const pipeline = [
      { $match: { organization: organizationId } },
      // Tạo virtual field để search
      {
        $addFields: {
          statusSearchText: {
            $switch: {
              branches: [
                {
                  case: { $eq: ['$status', 'available'] },
                  then: 'available còn trống con trong trống free'
                },
                {
                  case: { $eq: ['$status', 'occupied'] },
                  then: 'occupied đang sử dụng dang su dung busy taken'
                }
              ],
              default: '$status'
            }
          }
        }
      }
    ]

    if (searchValue) {
      const orConditions = []
      const searchableFields = [
        'name',
        'statusSearchText', // Sử dụng virtual field thay vì 'status'
        'area'
      ]

      searchableFields.forEach((field) => {
        orConditions.push({ [field]: { $regex: searchValue, $options: 'i' } })
      })

      // Xử lý riêng cho capacity (số)
      if (!isNaN(searchValue)) {
        orConditions.push({ capacity: +searchValue })
      }

      pipeline.push({ $match: { $or: orConditions } })
    }

    const countPipeline = [...pipeline, { $count: 'count' }]
    const countResult = await Table.aggregate(countPipeline)
    const recordsFiltered = countResult[0]?.count || 0
    const recordsTotal = await Table.countDocuments({
      organization: organizationId
    })

    pipeline.push(
      { $sort: { [sortField === 'statusSearchText' ? 'status' : sortField]: sortDir } },
      { $skip: start },
      { $limit: length },
      {
        $project: {
          _id: 1,
          name: 1,
          status: 1, // Trả về status gốc
          capacity: 1,
          area: 1,
          createdAt: 1
          // Không trả về statusSearchText
        }
      }
    )

    const tables = await Table.aggregate(pipeline)

    return res.json({
      draw,
      recordsTotal,
      recordsFiltered,
      data: tables
    })
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const getTableById = async (req, res) => {
  try {
    const { id } = req.params
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

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
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

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

    if (status === 'available') {
      updatedFields.currentOrderId = null
      updatedFields.checkInTime = null
    }

    const updatedTable = await Table.findOneAndUpdate(
      { _id: id, organization: organizationId },
      updatedFields,
      { new: true }
    )

    responseHelper.success(res, updatedTable, 'Cập nhật thành công')
  } catch (error) {
    console.error('Lỗi khi cập nhật bàn:', error)
    responseHelper.error(res, error.message || 'Lỗi máy chủ.')
  }
}

// DELETE TABLE
export const deleteTables = async (req, res) => {
  try {
    const { ids } = req.body
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    if (!Array.isArray(ids) || ids.length === 0) {
      return responseHelper.error(res, 'Không có bàn nào được chọn.', 400)
    }

    const result = await Table.deleteMany({
      _id: { $in: ids },
      organization: organizationId
    })

    if (result.deletedCount === 0) {
      return responseHelper.error(res, 'Không tìm thấy bàn nào để xóa.', 404)
    }

    responseHelper.success(res, `Đã xóa ${result.deletedCount} bản ghi`, 'Xóa thành công')
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const getTablesWithTotal = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req)
    if (!organizationId) {
      return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)
    }

    const tables = await Table.find({ organization: organizationId }).populate({
      path: 'currentOrderId',
      model: 'Order',
      populate: {
        path: 'customerId',
        model: 'Customer',
        select: 'name phone totalPoints'
      }
    }).lean()


    const orders = await Order.find({
      tableId: { $in: tables.map((t) => t._id) },
      status: 'open',
      organization: organizationId
    })

      .lean()
    const tablesWithTotal = tables.map((table) => {
      const order = orders.find((o) => o.tableId.toString() === table._id.toString())
      return {
        ...table,
        totalAmount: order ? order.totalAmount || 0 : 0
      }
    })

    responseHelper.success(res, { tables: tablesWithTotal })
  } catch (error) {
    console.error(error)
    responseHelper.error(res, error.message)
  }
}
