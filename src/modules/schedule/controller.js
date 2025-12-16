import mongoose from 'mongoose'
import { Schedule } from './model.js'
import User from '../user/model.js'
import { Shift } from '../shift/model.js'
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

    const { user, shift, isRecurring, recurringPattern, date, status, recurringEndDate, note } =
      req.body

    // Validation user
    if (user) {
      if (!mongoose.isValidObjectId(user)) {
        return responseHelper.error(res, 'ID nhân viên không hợp lệ', 400)
      }
      const userExists = await User.findOne({ _id: user, organization: organizationId })
      if (!userExists) {
        return responseHelper.error(res, 'Nhân viên không tồn tại trong tổ chức', 404)
      }
    }

    // Validation shift
    if (shift) {
      if (!mongoose.isValidObjectId(shift)) {
        return responseHelper.error(res, 'ID ca làm không hợp lệ', 400)
      }
      const shiftExists = await Shift.findOne({ _id: shift, organization: organizationId })
      if (!shiftExists) {
        return responseHelper.error(res, 'Ca làm không tồn tại', 404)
      }
    }

    // Validation date
    if (!date) return responseHelper.error(res, 'Thiếu thông tin ngày làm việc', 400)

    const scheduleDate = new Date(date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (scheduleDate < today) {
      return responseHelper.error(res, 'Không thể tạo lịch trước ngày hiện tại', 400)
    }

    if (isRecurring === true) {
      if (!recurringPattern || !['daily', 'weekly', 'monthly'].includes(recurringPattern)) {
        return responseHelper.error(res, 'Kiểu lặp lại không hợp lệ', 400)
      }

      if (!recurringEndDate) {
        return responseHelper.error(res, 'Thiếu ngày kết thúc cho lịch lặp lại', 400)
      }

      const endDate = new Date(recurringEndDate)
      if (isNaN(endDate.getTime())) {
        return responseHelper.error(res, 'Ngày kết thúc không hợp lệ', 400)
      }

      if (endDate <= scheduleDate) {
        return responseHelper.error(res, 'Ngày kết thúc phải sau ngày bắt đầu', 400)
      }

      const maxDays = 90
      const daysDiff = Math.ceil((endDate - scheduleDate) / (1000 * 60 * 60 * 24))
      if (daysDiff > maxDays) {
        return responseHelper.error(res, `Không thể tạo lịch lặp quá ${maxDays} ngày`, 400)
      }
    }

    // Check conflict
    if (!isRecurring && user && shift) {
      const conflict = await Schedule.findOne({
        organization: organizationId,
        user: user,
        shift: shift,
        date: scheduleDate,
        status: { $ne: 'cancelled' }
      })

      if (conflict) {
        return responseHelper.error(res, 'Nhân viên đã có lịch làm việc vào ca này trong ngày', 409)
      }
    }

    // Nếu là lịch lặp lại
    if (isRecurring === true && recurringPattern && recurringEndDate) {
      const endDate = new Date(recurringEndDate)
      const schedules = []
      const conflicts = []
      let currentDate = new Date(scheduleDate)
      let iterationCount = 0
      const maxIterations = 365 // Safety limit

      while (currentDate <= endDate && iterationCount < maxIterations) {
        // Check conflict cho từng ngày
        let hasConflict = false

        if (user && shift) {
          const dayConflict = await Schedule.findOne({
            organization: organizationId,
            user: user,
            shift: shift,
            date: new Date(currentDate),
            status: { $ne: 'cancelled' }
          })

          if (dayConflict) {
            hasConflict = true
            conflicts.push(new Date(currentDate).toISOString().split('T')[0])
          }
        }

        if (!hasConflict) {
          schedules.push({
            organization: organizationId,
            user: user || null,
            shift: shift || null,
            date: new Date(currentDate),
            isRecurring: true,
            recurringPattern,
            recurringEndDate: endDate,
            note: note || '',
            status: status || 'scheduled',
            createdBy: req.user._id
          })
        }

        // Tăng ngày theo pattern
        switch (recurringPattern) {
          case 'daily':
            currentDate.setDate(currentDate.getDate() + 1)
            break
          case 'weekly':
            currentDate.setDate(currentDate.getDate() + 7)
            break
          case 'monthly':
            currentDate.setMonth(currentDate.getMonth() + 1)
            break
          default:
            // Safety: break loop if invalid pattern
            currentDate = new Date(endDate.getTime() + 1)
        }

        iterationCount++
      }

      if (schedules.length === 0) {
        return responseHelper.error(
          res,
          `Không thể tạo lịch lặp. Tất cả ${conflicts.length} ngày đều bị xung đột.`,
          409
        )
      }

      const createdSchedules = await Schedule.insertMany(schedules)

      const message =
        conflicts.length > 0
          ? `Đã tạo ${createdSchedules.length} lịch thành công, bỏ qua ${conflicts.length} ngày bị xung đột`
          : `Đã tạo ${createdSchedules.length} lịch làm việc lặp lại`

      logActivity(
        organizationId,
        req.user._id,
        req.user.username || 'Unknown',
        'CREATE',
        'SCHEDULE',
        `Tạo ${createdSchedules.length} lịch lặp lại (${recurringPattern})${conflicts.length > 0 ? `, ${conflicts.length} xung đột` : ''}`,
        ''
      )

      return responseHelper.success(
        res,
        {
          schedules: createdSchedules,
          created: createdSchedules.length,
          conflicts: conflicts.length,
          conflictDates: conflicts
        },
        message
      )
    }

    // Tạo lịch đơn lẻ
    const schedule = new Schedule({
      organization: organizationId,
      user: user || null,
      shift: shift || null,
      date: scheduleDate,
      isRecurring: false,
      recurringPattern: null,
      recurringEndDate: null,
      note: note || '',
      status: status || 'scheduled',
      createdBy: req.user._id
    })

    await schedule.save()

    const populated = await Schedule.findById(schedule._id)
      .populate('user', 'username')
      .populate('shift', 'name')

    logActivity(
      organizationId,
      req.user._id,
      req.user.username || 'Unknown',
      'CREATE',
      'SCHEDULE',
      `Thêm mới lịch làm việc`,
      populated.user?.username || 'Chưa phân công'
    )

    responseHelper.success(res, populated, 'Tạo lịch mới thành công')
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

    // Tìm schedule hiện tại
    const schedule = await Schedule.findOne({
      _id: id,
      organization: organizationId
    })
      .populate('user', 'username')
      .populate('shift', 'name')

    if (!schedule) return responseHelper.error(res, 'Lịch không tồn tại', 404)

    const dataUpdate = {}

    // Validate và update user
    if (user !== undefined) {
      if (user === null || user === '' || user.trim() === '') {
        dataUpdate.user = null
      } else if (!mongoose.isValidObjectId(user)) {
        return responseHelper.error(res, 'ID nhân viên không hợp lệ', 400)
      } else {
        const userExists = await User.findOne({ _id: user, organization: organizationId })
        if (!userExists) {
          return responseHelper.error(res, 'Nhân viên không tồn tại trong tổ chức', 404)
        }
        dataUpdate.user = user
      }
    }

    // Validate và update shift
    if (shift !== undefined) {
      if (shift === null || shift === '' || shift.trim() === '') {
        dataUpdate.shift = null
      } else if (!mongoose.isValidObjectId(shift)) {
        return responseHelper.error(res, 'ID ca làm không hợp lệ', 400)
      } else {
        const shiftExists = await Shift.findOne({ _id: shift, organization: organizationId })
        if (!shiftExists) {
          return responseHelper.error(res, 'Ca làm không tồn tại', 404)
        }
        dataUpdate.shift = shift
      }
    }

    // Validate và update date
    if (date !== undefined) {
      if (!date || date.trim() === '') {
        return responseHelper.error(res, 'Ngày làm việc không hợp lệ', 400)
      }

      const scheduleDate = new Date(date)
      if (isNaN(scheduleDate.getTime())) {
        return responseHelper.error(res, 'Định dạng ngày không hợp lệ', 400)
      }

      // Chỉ check quá khứ nếu đang ở trạng thái scheduled
      if (schedule.status === 'scheduled') {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        if (scheduleDate < today) {
          return responseHelper.error(res, 'Không thể đặt ngày trong quá khứ', 400)
        }
      }

      dataUpdate.date = scheduleDate
    }

    // Validate và update status
    if (status !== undefined) {
      if (!['scheduled', 'confirmed', 'cancelled'].includes(status)) {
        return responseHelper.error(res, 'Trạng thái không hợp lệ', 400)
      }
      dataUpdate.status = status

      // Nếu confirmed thì tự động set approvedBy và approvedAt
      if (status === 'confirmed' && schedule.status !== 'confirmed') {
        dataUpdate.approvedBy = req.user._id
        dataUpdate.approvedAt = new Date()
      }

      // Nếu chuyển từ confirmed về scheduled thì xóa approvedBy
      if (status === 'scheduled' && schedule.status === 'confirmed') {
        dataUpdate.approvedBy = null
        dataUpdate.approvedAt = null
      }
    }

    // Update note
    if (note !== undefined) {
      dataUpdate.note = note ? note.trim() : ''
    }

    // Kiểm tra có dữ liệu để update không
    if (Object.keys(dataUpdate).length === 0) {
      return responseHelper.error(res, 'Không có dữ liệu để cập nhật', 400)
    }

    // Check conflict nếu thay đổi user/shift/date
    if (
      dataUpdate.user !== undefined ||
      dataUpdate.shift !== undefined ||
      dataUpdate.date !== undefined
    ) {
      const checkUser = dataUpdate.user !== undefined ? dataUpdate.user : schedule.user?._id
      const checkShift = dataUpdate.shift !== undefined ? dataUpdate.shift : schedule.shift?._id
      const checkDate = dataUpdate.date !== undefined ? dataUpdate.date : schedule.date

      // Chỉ check conflict nếu có đủ user, shift và date
      if (checkUser && checkShift && checkDate) {
        const conflict = await Schedule.findOne({
          organization: organizationId,
          user: checkUser,
          shift: checkShift,
          date: new Date(checkDate),
          status: { $ne: 'cancelled' },
          _id: { $ne: id } // Loại trừ chính nó
        })

        if (conflict) {
          return responseHelper.error(
            res,
            'Nhân viên đã có lịch làm việc vào ca này trong ngày',
            409
          )
        }
      }
    }

    // Thực hiện update
    const updated = await Schedule.findOneAndUpdate(
      { _id: id, organization: organizationId },
      dataUpdate,
      { new: true }
    )
      .populate('user', 'username')
      .populate('shift', 'name')
      .populate('approvedBy', 'username')

    if (!updated) {
      return responseHelper.error(res, 'Không thể cập nhật lịch', 500)
    }

    // Build change log
    const changeDetailsSchedule = buildChangeLog(
      schedule,
      updated,
      [
        {
          field: 'user',
          label: 'Nhân viên',
          formatValue: (val) => {
            if (!val) return 'Chưa chỉ định'
            return val.username || 'Không rõ'
          }
        },
        {
          field: 'shift',
          label: 'Ca làm',
          formatValue: (val) => {
            if (!val) return 'Chưa chỉ định'
            if (val.name) return val.name
            return val.toString()
          }
        },
        {
          field: 'date',
          label: 'Ngày làm việc',
          formatValue: (val) => (val ? new Date(val).toLocaleDateString('vi-VN') : 'Chưa có')
        },
        {
          field: 'status',
          label: 'Trạng thái',
          formatValue: (val) => {
            const statusMap = {
              scheduled: 'Chờ xác nhận',
              confirmed: 'Đã xác nhận',
              cancelled: 'Đã hủy'
            }
            return statusMap[val] || val
          }
        },
        {
          field: 'approvedBy',
          label: 'Người duyệt',
          formatValue: (val) => {
            if (!val) return ''
            return val.username || 'Không rõ'
          }
        },
        {
          field: 'note',
          label: 'Ghi chú',
          formatValue: (val) => val || '(Trống)'
        }
      ],
      schedule.user?.username || 'Lịch làm việc',
      'lịch làm việc'
    )

    logActivity(
      organizationId,
      req.user._id,
      req.user.username,
      'UPDATE',
      'SCHEDULE',
      changeDetailsSchedule,
      updated.user?.username || 'Lịch làm việc'
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

export const getSchedulesByRange = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req)
    if (!organizationId) {
      return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)
    }

    const { startDate, endDate } = req.query

    if (!startDate || !endDate) {
      return responseHelper.error(res, 'Thiếu khoảng thời gian', 400)
    }

    const start = new Date(startDate)
    start.setHours(0, 0, 0, 0)
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)

    const schedules = await Schedule.find({
      organization: organizationId,
      date: {
        $gte: start,
        $lte: end
      }
    })
      .populate('user', 'username')
      .populate('shift', 'name startTime endTime')
      .sort({ date: 1 })

    console.log(schedules)

    responseHelper.success(res, schedules)
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}
