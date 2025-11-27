import Table from './model.js'
import responseHelper from '../../helpers/responseHelper.js'
import Order from '../order/model.js'
import Customer from '../customer/model.js'
import { getCurrentOrg } from '../../helpers/orgHelper.js'
import { getWarehouse } from '../../helpers/warehouseHelper.js'
import Organization from '../organization/model.js'
import QRCode from 'qrcode'
import { createOrderForTable } from '../order/service.js'
import { logActivity } from '../activity-logs/service.js'
import { buildChangeLog } from '../../helpers/changeLog.js'

// [CREATE] / table
export const createTable = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    const warehouse = await getWarehouse(req, organizationId)

    const data = {
      ...req.body,
      organization: organizationId,
      warehouse
    }

    const newTable = new Table(data)
    const domainName = process.env.DOMAIN || 'http://localhost:6001'

    const url = `${domainName}/api/scan/${newTable._id.toString()}`
    // Generate QR
    const qrImage = await QRCode.toDataURL(url, {
      width: 200,
      margin: 1,
      errorCorrectionLevel: 'M'
    })

    newTable.qrCode = qrImage
    await newTable.save()

    logActivity(
      organizationId,
      req.user._id || null,
      req.user.username || null,
      'CREATE',
      'TABLE',
      'Thêm bàn mới',
      '',
      'SUCCESS',
      warehouse
    )

    responseHelper.success(res, newTable, 'Tạo thành công')
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

// [GET] /api/scan/:id
export const scanQRCode = async (req, res) => {
  const tableId = req.params.id
  try {
    const result = await createOrderForTable({ tableId, req })
    return res.redirect(`/cart?tableId=${result.tableId}&orderId=${result.orderId}`)
  } catch (err) {
    responseHelper.error(res, err.message)
  }
}

// [GET] /api/tables
export const getTables = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req)
    if (!organizationId) {
      return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)
    }

    const warehouse = await getWarehouse(req, organizationId)
    const { status, area } = req.query

    const filter = { organization: organizationId, warehouse }
    if (status) filter.status = status
    if (area) filter.area = new RegExp(`^${area}$`, 'i')

    const tables = await Table.find(filter)
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

    const openOrders = await Order.find({
      tableId: { $in: tables.map((t) => t._id) },
      status: 'open',
      organization: organizationId
    })
      .select('tableId totalAmount')
      .lean()

    // Gắn tổng tiền vào từng bàn
    const tablesWithTotal = tables.map((t) => {
      const order = openOrders.find((o) => o.tableId.toString() === t._id.toString())
      return {
        ...t,
        totalAmount: order?.totalAmount || 0
      }
    })

    const result = tablesWithTotal.map((t) => ({
      ...t,
      _id: t._id.toString(),
      currentOrderId: t.currentOrderId?._id?.toString()
        ? { ...t.currentOrderId, _id: t.currentOrderId._id.toString() }
        : t.currentOrderId
    }))

    responseHelper.success(res, { tables: result })
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

    const baseMatch = { organization: organizationId }

    if (req.warehouseFilter) {
      // Staff user - chỉ thấy kho được gán
      baseMatch.warehouse = req.warehouseFilter
    } else {
      // Admin/Org - sử dụng defaultWarehouse
      const org = await Organization.findById(organizationId).select('defaultWarehouse')
      if (org?.defaultWarehouse) {
        baseMatch.warehouse = org.defaultWarehouse
      }
    }

    const pipeline = [
      { $match: baseMatch },
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
    const recordsTotal = await Table.countDocuments(baseMatch)

    pipeline.push(
      { $sort: { [sortField]: sortDir } },
      { $skip: start },
      { $limit: length },
      {
        $project: {
          _id: 1,
          name: 1,
          status: 1, // Trả về status gốc
          capacity: 1,
          qrCode: 1,
          area: 1,
          createdAt: 1
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

    const warehouse = await getWarehouse(req, organizationId)

    const matchConditions = {
      _id: id,
      organization: organizationId,
      warehouse
    }

    const table = await Table.findOne(matchConditions)
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
    const { name, status, capacity, area, checkInTime, customerName } = req.body
    const { id } = req.params
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    const warehouse = await getWarehouse(req, organizationId)

    const matchCondition = {
      _id: id,
      organization: organizationId,
      warehouse
    }

    // Kiểm tra bàn có tồn tại & thuộc tổ chức không
    const tableExist = await Table.findOne(matchCondition).populate({
      path: 'currentOrderId',
      populate: { path: 'customerId' }
    })
    if (!tableExist) {
      return responseHelper.error(res, 'Không tìm thấy bàn.', 404)
    }

    // Kiểm tra trùng tên bàn (trừ chính bản thân nó) trong cùng tổ chức
    const duplicated = await Table.findOne({
      name,
      warehouse,
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
      area: area ? area.toUpperCase() : undefined
    }
    if (checkInTime) {
      updatedFields.checkInTime = checkInTime
    }

    if (status === 'available') {
      updatedFields.currentOrderId = null
      updatedFields.checkInTime = null
    }

    const updatedTable = await Table.findOneAndUpdate(matchCondition, updatedFields, { new: true })

    if (customerName && tableExist.currentOrderId && tableExist.currentOrderId.customerId) {
      const customerId = tableExist.currentOrderId.customerId
      const customer = await Customer.findById(customerId)
      if (customer) {
        customer.name = customerName
        await customer.save()
      }
    }

    const changeDetails = buildChangeLog(
      tableExist,
      updatedTable,
      [
        { field: 'name', label: 'Tên bàn' },
        {
          field: 'status',
          label: 'Trạng thái',
          formatValue: (val) => {
            const types = {
              available: 'Có khách',
              occupied: 'Trống'
            }
            return types[val] || val
          }
        },
        { field: 'capacity', label: 'Sức chứa' },
        { field: 'area', label: 'Khu vực' }
      ],
      updatedTable.name,
      'bàn'
    )

    logActivity(
      organizationId,
      req.user?._id || null,
      req.user?.username || null,
      'UPDATE',
      'TABLE',
      changeDetails,
      updatedTable.name,
      'SUCCESS',
      warehouse
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

    const warehouse = await getWarehouse(req, organizationId)

    const result = await Table.deleteMany({
      _id: { $in: ids },
      organization: organizationId,
      warehouse
    })

    if (result.deletedCount === 0) {
      return responseHelper.error(res, 'Không tìm thấy bàn nào để xóa.', 404)
    }

    logActivity(
      organizationId,
      req.user._id || null,
      req.user.username || null,
      'DELETE',
      'TABLE',
      `Đã xóa ${result.deletedCount} bàn`,
      '',
      'SUCCESS',
      warehouse
    )

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

    const warehouse = await getWarehouse(req, organizationId)

    const matchCondition = {
      organization: organizationId,
      warehouse
    }

    const tables = await Table.find(matchCondition)
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
