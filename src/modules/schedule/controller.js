import { Schedule } from './model.js'
import { lookupUser, lookupRef } from '../../helpers/lookupHelper.js'
import responseHelper from '../../helpers/responseHelper.js'
import { getCurrentOrg } from '../../helpers/orgHelper.js'
import { logActivity } from '../activity-logs/service.js'
import { buildChangeLog } from '../../helpers/changeLog.js'

export const getSchedules = async (req, res) => {
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

    // Base pipeline
    const pipeline = [
      { $match: { organization: organizationId } },
      ...lookupRef('user', 'Users'),
      ...lookupRef('shift', 'Shifts'),
      ...lookupUser('createdBy')
    ]

    // Search filter
    if (searchValue) {
      pipeline.push({
        $match: {
          $or: [
            { 'user.username': { $regex: searchValue, $options: 'i' } },
            { 'shift.name': { $regex: searchValue, $options: 'i' } },
            { note: { $regex: searchValue, $options: 'i' } },
            { status: { $regex: searchValue, $options: 'i' } }
          ]
        }
      })
    }

    // Total records
    const totalRecords = await Schedule.countDocuments({
      organization: organizationId
    })

    // Total filtered
    const countPipeline = [...pipeline, { $count: 'count' }]
    const countResult = await Schedule.aggregate(countPipeline)
    const recordsFiltered = countResult[0]?.count || 0

    // Mapping sort fields để tránh lỗi khi sort
    const sortFieldMapping = {
      user: 'user.username',
      shift: 'shift.name',
      createdBy: 'createdBy.username',
      date: 'date',
      status: 'status',
      note: 'note',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt'
    }

    const actualSortField = sortFieldMapping[sortField] || sortField

    // Sort + Pagination
    const sortStage = { $sort: { [actualSortField]: sortDir } }
    pipeline.push(sortStage, { $skip: start }, { $limit: length })

    pipeline.push({
      $project: {
        _id: 1,
        organization: 1,
        user: {
          _id: '$user._id',
          username: '$user.username'
        },
        shift: {
          _id: '$shift._id',
          name: '$shift.name'
        },
        date: 1,
        status: 1,
        note: 1,
        createdBy: {
          _id: '$createdBy._id',
          username: '$createdBy.username'
        },
        createdAt: 1,
        updatedAt: 1
      }
    })

    // Execute aggregation
    const data = await Schedule.aggregate(pipeline)

    return res.json({
      draw,
      recordsTotal: totalRecords,
      recordsFiltered,
      data
    })
  } catch (error) {
    return res.status(500).json({
      draw: +req.query.draw || 0,
      recordsTotal: 0,
      recordsFiltered: 0,
      data: [],
      error: error.message
    })
  }
}

export const createSchedule = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    const data = {
      organization: organizationId,
      createdBy: req.user._id
    }

    const schedule = new Schedule(data)
    await schedule.save()

    logActivity(
      organizationId,
      req.user._id,
      req.user.username || 'Unknown',
      'CREATE',
      'SCHEDULE',
      `Thêm mới lịch làm việc`,
      schedule.name
    )

    responseHelper.success(res, schedule, 'Tạo lịch mới thành công')
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const updateSchedule = async (req, res) => {
  try {
    const { id } = req.params
    const { user, shift, date, status, note } = req.body

    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    const schedule = await Schedule.findOne({
      _id: id,
      organization: organizationId
    })
    if (!schedule) return responseHelper.error(res, 'Lịch không tồn tại', 404)

    const dataUpdate = {}

    if (user !== undefined) dataUpdate.user = user || null
    if (shift !== undefined) dataUpdate.shift = shift || null
    if (date !== undefined) dataUpdate.date = date ? new Date(date) : null
    if (status !== undefined && ['scheduled', 'confirmed', 'cancelled'].includes(status))
      dataUpdate.status = status
    if (note !== undefined) dataUpdate.note = note

    if (Object.keys(dataUpdate).length === 0)
      return responseHelper.error(res, 'Không có dữ liệu để cập nhật', 400)

    const updated = await Schedule.findOneAndUpdate(
      { _id: id, organization: organizationId },
      dataUpdate,
      { new: true }
    )

    const changeDetailsSchedule = buildChangeLog(
      schedule,
      updated,
      [
        { field: 'user', label: 'Nhân viên' },
        { field: 'shift', label: 'Ca làm' },
        { field: 'date', label: 'Ngày làm việc' },
        { field: 'status', label: 'Trạng thái' },
        { field: 'note', label: 'Ghi chú' }
      ],
      schedule.user.username,
      'ca làm việc'
    )

    logActivity(
      organizationId,
      req.user._id,
      req.user.username,
      'UPDATE',
      'SCHEDULE',
      changeDetailsSchedule,
      updated.name
    )

    responseHelper.success(res, updated, 'Cập nhật lịch thành công')
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const deleteSchedule = async (req, res) => {
  try {
    const { ids } = req.body
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    if (!Array.isArray(ids) || ids.length === 0) {
      return responseHelper.error(res, 'Không có lịch nào được chọn để xóa', 400)
    }

    const result = await Schedule.deleteMany({
      _id: { $in: ids },
      organization: organizationId
    })

    logActivity(
      organizationId,
      req.user._id,
      req.user.username,
      'DELETE',
      'SCHEDULE',
      `Đã xóa ${result.deletedCount} bản ghi lịch làm việc`
    )

    responseHelper.success(res, result.deletedCount, 'Xóa thành công')
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const getMySchedules = async (req, res) => {
  try {
    const draw = +req.query.draw || 0
    const start = +req.query.start || 0
    const length = +req.query.length || 10
    const searchValue = (req.query['search[value]'] || '').trim()
    const colIdx = req.query['order[0][column]']
    const sortField = req.query[`columns[${colIdx}][data]`] || 'date'
    const sortDir = req.query['order[0][dir]'] === 'asc' ? 1 : -1

    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)
    if (!req.user || !req.user._id)
      return responseHelper.error(res, 'Thiếu thông tin người dùng', 401)

    const pipeline = [
      { $match: { organization: organizationId, user: req.user._id } },
      ...lookupRef('shift', 'Shifts')
    ]

    if (searchValue) {
      pipeline.push({
        $match: {
          $or: [
            { 'shift.name': { $regex: searchValue, $options: 'i' } },
            { status: { $regex: searchValue, $options: 'i' } },
            { note: { $regex: searchValue, $options: 'i' } }
          ]
        }
      })
    }

    const totalRecords = await Schedule.countDocuments({
      organization: organizationId,
      user: req.user._id
    })

    // Total filtered
    const countPipeline = [...pipeline, { $count: 'count' }]
    const countResult = await Schedule.aggregate(countPipeline)
    const recordsFiltered = countResult[0]?.count || 0

    // Mapping sort fields để tránh lỗi khi sort
    const sortFieldMapping = {
      shift: 'shift.name',
      date: 'date',
      status: 'status',
      note: 'note',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt'
    }
    const actualSortField = sortFieldMapping[sortField] || sortField

    // Sort + Pagination
    pipeline.push({ $sort: { [actualSortField]: sortDir } }, { $skip: start }, { $limit: length })

    // Projection
    pipeline.push({
      $project: {
        _id: 1,
        date: 1,
        status: 1,
        note: 1,
        createdAt: 1,
        updatedAt: 1,
        shift: {
          _id: '$shift._id',
          name: '$shift.name',
          type: '$shift.type',
          startTime: '$shift.startTime',
          endTime: '$shift.endTime'
        }
      }
    })

    const data = await Schedule.aggregate(pipeline)

    return res.json({
      draw,
      recordsTotal: totalRecords,
      recordsFiltered,
      data
    })
  } catch (error) {
    return res.status(500).json({
      draw: +req.query.draw || 0,
      recordsTotal: 0,
      recordsFiltered: 0,
      data: [],
      error: error.message
    })
  }
}
