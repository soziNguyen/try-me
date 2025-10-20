import Payroll from './model.js'
import { getCurrentOrg } from '../../helpers/orgHelper.js'
import responseHelper from '../../helpers/responseHelper.js'
import { lookupRef } from '../../helpers/lookupHelper.js'
import { generatePayroll } from './service.js'

export const getPayrolls = async (req, res) => {
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

    const filterYear = req.query.year ? +req.query.year : null
    const filterMonth = req.query.month ? +req.query.month : null

    const pipeline = [{ $match: { organization: organizationId } }]

    if (filterYear) pipeline.push({ $match: { year: filterYear } })
    if (filterMonth) pipeline.push({ $match: { month: filterMonth } })

    // Lookup user
    pipeline.push(...lookupRef('user', 'Users'))

    // Search/filter
    if (searchValue) {
      const or = [
        { 'user.username': { $regex: searchValue, $options: 'i' } },
        { notes: { $regex: searchValue, $options: 'i' } }
      ]
      if (!isNaN(+searchValue)) {
        const n = +searchValue
        or.push({ year: n }, { month: n }, { totalSalary: n })
      }
      pipeline.push({ $match: { $or: or } })
    }

    // Count filtered records
    const totalRecords = await Payroll.countDocuments({
      organization: organizationId
    })
    const countPipeline = [...pipeline, { $count: 'count' }]
    const countResult = await Payroll.aggregate(countPipeline)
    const recordsFiltered = countResult[0]?.count || 0

    // Sort
    const sortFieldMapping = {
      user: 'user.username',
      year: 'year',
      month: 'month',
      totalWorkingMinutes: 'totalWorkingMinutes',
      totalSalary: 'totalSalary',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt'
    }
    const actualSortField = sortFieldMapping[sortField] || sortField
    pipeline.push({ $sort: { [actualSortField]: sortDir } })

    // Pagination
    pipeline.push({ $skip: start }, { $limit: length })

    pipeline.push({
      $project: {
        _id: 1,
        organization: 1,
        user: {
          _id: '$user._id',
          username: '$user.username'
        },
        year: 1,
        month: 1,
        totalWorkingMinutes: 1,
        totalSalary: 1,
        createdAt: 1,
        updatedAt: 1
      }
    })

    const data = await Payroll.aggregate(pipeline)

    return res.json({
      draw,
      recordsTotal: totalRecords,
      recordsFiltered,
      data
    })
  } catch (error) {
    console.error('getPayrolls error:', error)
    return res.status(500).json({
      draw: +req.query.draw || 0,
      recordsTotal: 0,
      recordsFiltered: 0,
      data: [],
      error: error.message
    })
  }
}

export const getPayrollDetail = async (req, res) => {
  try {
    const { id } = req.params
    const organizationId = getCurrentOrg(req)

    if (!organizationId) {
      return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)
    }

    const payroll = await Payroll.findOne({
      _id: id,
      organization: organizationId
    })
      .populate('user', 'username')
      .populate('details.attendance')

    if (!payroll) {
      return responseHelper.error(res, 'Không tìm thấy bảng lương', 404)
    }

    return responseHelper.success(res, payroll)
  } catch (error) {
    console.error('getPayrollDetail error:', error)
    return responseHelper.error(res, error.message, 500)
  }
}

export const createPayroll = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req)
    if (!organizationId) {
      return res.status(400).json({ message: 'Thiếu thông tin tổ chức' })
    }

    const {
      user = null,
      year = new Date().getFullYear(),
      month = new Date().getMonth() + 1,
      hourlyRate = 50000
    } = req.body || {}

    const payroll = await generatePayroll(organizationId, user, year, month, hourlyRate)
    if (!payroll || (Array.isArray(payroll) && payroll.length === 0)) {
      return res.status(404).json({ message: 'Không tìm thấy Attendance trong tháng' })
    }

    return res.json({ message: 'Chốt lương thành công', data: payroll })
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi khi tạo Payroll', error: error.message })
  }
}
