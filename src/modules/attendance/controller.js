import Attendance from './model.js'
import responseHelper from '../../helpers/responseHelper.js'
import { getCurrentOrg } from '../../helpers/orgHelper.js'
import { lookupUser, lookupRef } from '../../helpers/lookupHelper.js'
import { escapeRegex } from '../../helpers/common.js'

export const getAttendances = async (req, res) => {
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

    const basePipeline = [
      { $match: { organization: organizationId } },
      ...lookupUser('user'),
      { $unwind: { path: '$sessions', preserveNullAndEmptyArrays: true } },
      ...lookupRef('sessions.shift', 'Shifts', { as: 'sessionShift' }),
      {
        $addFields: {
          'sessions.shift': {
            _id: '$sessionShift._id',
            name: '$sessionShift.name'
          }
        }
      },
      // add formattedDate as dd/MM/YYYY (adjust timezone if needed)
      {
        $addFields: {
          formattedDate: {
            $cond: [
              { $ifNull: ['$date', false] },
              {
                $dateToString: { format: '%d/%m/%Y', date: '$date', timezone: 'Asia/Ho_Chi_Minh' }
              },
              null
            ]
          }
        }
      }
    ]

    if (searchValue) {
      const escaped = escapeRegex(searchValue)

      const orConditions = [
        { 'user.username': { $regex: escaped, $options: 'i' } },
        { status: { $regex: escaped, $options: 'i' } },
        { note: { $regex: escaped, $options: 'i' } },
        { 'sessions.shift.name': { $regex: escaped, $options: 'i' } },
        // match on formattedDate so "20", "20/11", "20/11/2025" all match "20/11/2025"
        { formattedDate: { $regex: escaped, $options: 'i' } }
      ]

      const numericValue = Number(searchValue)
      if (!isNaN(numericValue)) {
        orConditions.push({ totalDuration: numericValue })
        orConditions.push({ totalRegular: numericValue })
        orConditions.push({ totalOvertime: numericValue })
        orConditions.push({ totalHoliday: numericValue })
      }

      basePipeline.push({ $match: { $or: orConditions } })
    }

    // Rebuild attendance docs grouping back sessions into array
    basePipeline.push(
      {
        $group: {
          _id: '$_id',
          organization: { $first: '$organization' },
          user: { $first: '$user' },
          date: { $first: '$date' },
          formattedDate: { $first: '$formattedDate' },
          status: { $first: '$status' },
          sessions: { $push: '$sessions' },
          totalRegular: { $first: '$totalRegular' },
          totalOvertime: { $first: '$totalOvertime' },
          totalHoliday: { $first: '$totalHoliday' },
          totalDuration: { $first: '$totalDuration' },
          note: { $first: '$note' },
          approved: { $first: '$approved' },
          createdAt: { $first: '$createdAt' },
          updatedAt: { $first: '$updatedAt' }
        }
      },
      // filter out potential nulls in sessions array (if attendance had no sessions)
      {
        $addFields: {
          sessions: {
            $cond: [
              { $isArray: '$sessions' },
              {
                $filter: {
                  input: '$sessions',
                  as: 's',
                  cond: { $ne: ['$$s', null] }
                }
              },
              []
            ]
          }
        }
      }
    )

    // Count filtered
    const countPipeline = [...basePipeline, { $count: 'count' }]
    const countResult = await Attendance.aggregate(countPipeline)
    const recordsFiltered = countResult[0]?.count || 0

    // Sort mapping (map human-friendly column names to pipeline fields)
    const sortObj = {}
    switch (sortField) {
      case 'user.username':
      case 'user':
        sortObj['user.username'] = sortDir
        break
      case 'date':
        sortObj['date'] = sortDir
        break
      case 'status':
        sortObj['status'] = sortDir
        break
      case 'totalDuration':
        sortObj['totalDuration'] = sortDir
        break
      default:
        sortObj[sortField] = sortDir
    }

    const dataPipeline = [
      ...basePipeline,
      { $sort: sortObj },
      { $skip: start },
      { $limit: length },
      {
        $project: {
          _id: 1,
          organization: 1,
          user: {
            _id: '$user._id',
            username: '$user.username',
            email: '$user.email'
          },
          date: 1,
          formattedDate: 1,
          status: 1,
          sessions: 1, // each session has .shift { _id, name }
          totalRegular: 1,
          totalOvertime: 1,
          totalHoliday: 1,
          totalDuration: 1,
          note: 1,
          approved: 1,
          createdAt: 1,
          updatedAt: 1
        }
      }
    ]

    const data = await Attendance.aggregate(dataPipeline)
    const recordsTotal = await Attendance.countDocuments({
      organization: organizationId
    })

    return res.json({
      draw,
      recordsTotal,
      recordsFiltered,
      data
    })
  } catch (err) {
    return responseHelper.error(res, err.message)
  }
}

export const getAttendanceById = async (req, res) => {
  try {
    const { id } = req.params

    const attendance = await Attendance.findById(id)
      .populate('user', 'username email')
      .populate('sessions.shift', 'name startTime endTime')
      .lean()

    if (!attendance) return responseHelper.error(res, 'Không tìm thấy chấm công')

    responseHelper.success(res, attendance)
  } catch (err) {
    responseHelper.error(err.message)
  }
}
