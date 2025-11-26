import { Shift } from './model.js'
import responseHelper from '../../helpers/responseHelper.js'
import { getCurrentOrg } from '../../helpers/orgHelper.js'
import { logActivity } from '../activity-logs/service.js'
import { buildChangeLog } from '../../helpers/changeLog.js'

export const getShiftOptions = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    const shifts = await Shift.find({ organization: organizationId }, { _id: 1, name: 1 })

    responseHelper.success(res, shifts)
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const getShifts = async (req, res) => {
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

    const filter = { organization: organizationId }
    if (searchValue) {
      const patterns = [searchValue]

      const timeMatch = searchValue.match(/^(\d{1,2}):(\d{1,2})$/)
      if (timeMatch) {
        const [, hourStr, minute] = timeMatch
        const hour = parseInt(hourStr)

        patterns.push(`${hour}:${minute}`)
        patterns.push(`${hourStr.padStart(2, '0')}:${minute}`)

        if (hour >= 1 && hour <= 12) {
          const pmHour = hour === 12 ? 12 : hour + 12
          patterns.push(`${pmHour}:${minute}`)
        }

        if (hour >= 13 && hour <= 23) {
          const amHour = hour - 12
          patterns.push(`${amHour}:${minute}`)
          patterns.push(`${amHour.toString().padStart(2, '0')}:${minute}`)
        }
      } else if (/^0?([1-9]|1[0-2])$/.test(searchValue)) {
        const hour = parseInt(searchValue)
        patterns.push(hour.toString())
        patterns.push(hour.toString().padStart(2, '0'))

        const pmHour = hour === 12 ? 12 : hour + 12
        patterns.push(pmHour.toString())
      }

      const uniquePatterns = [...new Set(patterns)]
      const combinedPattern = uniquePatterns.join('|')

      filter.$or = [
        { name: { $regex: searchValue, $options: 'i' } },
        { note: { $regex: searchValue, $options: 'i' } },
        { type: { $regex: searchValue, $options: 'i' } },
        { startTime: { $regex: combinedPattern, $options: 'i' } },
        { endTime: { $regex: combinedPattern, $options: 'i' } }
      ]
    }

    const recordsTotal = await Shift.countDocuments({
      organization: organizationId
    })

    const recordsFiltered = await Shift.countDocuments(filter)

    const sortObj = {}
    sortObj[sortField] = sortDir

    const data = await Shift.find(filter).sort(sortObj).skip(start).limit(length).lean()

    return res.json({
      draw,
      recordsTotal,
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

export const createShift = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    const data = {
      ...req.body,
      organization: organizationId
    }

    const shift = new Shift(data)
    await shift.save()

    logActivity(
      organizationId,
      req.user._id,
      req.user.username || 'Unknown',
      'CREATE',
      'SHIFT',
      `Thêm mới ca làm việc`
    )

    responseHelper.success(res, shift, 'Thêm ca thành công')
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const updateShift = async (req, res) => {
  try {
    const { id } = req.params
    const { name, type, startTime, endTime, note } = req.body

    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    const shift = await Shift.findOne({
      _id: id,
      organization: organizationId
    })
    if (!shift) {
      return responseHelper.error(res, 'Ca không tồn tại', 404)
    }

    if (type !== undefined && type !== '' && !['day', 'night'].includes(type)) {
      return responseHelper.error(res, 'Loại ca là ngày hoặc đêm', 400)
    }

    if (name !== undefined && name !== shift.name) {
      const existing = await Shift.findOne({
        name,
        _id: { $ne: id },
        organization: organizationId
      })
      if (existing) {
        return responseHelper.error(res, `Ca ${name} đã tồn tại`, 400)
      }
    }

    const dataUpdate = {}
    if (name !== undefined) dataUpdate.name = name
    if (type !== undefined) dataUpdate.type = type === '' ? null : type
    if (startTime !== undefined) dataUpdate.startTime = startTime
    if (endTime !== undefined) dataUpdate.endTime = endTime
    if (note !== undefined) dataUpdate.note = note

    if (Object.keys(dataUpdate).length === 0) return

    const updated = await Shift.findOneAndUpdate(
      { _id: id, organization: organizationId },
      dataUpdate,
      { new: true }
    )

    const changeDetailsShift = buildChangeLog(
      shift,
      updated,
      [
        { field: 'name', label: 'Tên ca' },
        {
          field: 'type',
          label: 'Loại ca',
          formatValue: (val) => {
            const types = {
              day: 'Ngày',
              night: 'Đêm'
            }

            return types[val] || ''
          }
        },
        { field: 'startTime', label: 'Giờ vào' },
        { field: 'endTime', label: 'Giờ kết thúc' },
        { field: 'note', label: 'Ghi chú' }
      ],
      shift.name,
      'ca làm việc'
    )

    logActivity(
      organizationId,
      req.user._id,
      req.user.username,
      'UPDATE',
      'SHIFT',
      changeDetailsShift,
      updated.name
    )

    responseHelper.success(res, updated, 'Cập nhật thành công')
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const deleteShift = async (req, res) => {
  try {
    const { ids } = req.body
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    if (!Array.isArray(ids) || ids.length === 0) {
      return responseHelper.error(res, 'Không có ca nào được chọn để xóa', 400)
    }

    const result = await Shift.deleteMany({
      _id: { $in: ids },
      organization: organizationId
    })

    logActivity(
      organizationId,
      req.user._id,
      req.user.username,
      'DELETE',
      'SHIFT',
      `Đã xóa ${result.deletedCount} ca làm việc`
    )

    responseHelper.success(res, result.deletedCount, 'Xóa thành công')
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}
