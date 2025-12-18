import User from '../user/model.js'
import Organization from '../organization/model.js'
import bcrypt from 'bcryptjs'
import validator from 'validator'
import responseHelper from '../../helpers/responseHelper.js'
import { isValidUsername, isValidPassword, isPasswordMatch } from '../../helpers/validator.js'
import { lookupRef } from '../../helpers/lookupHelper.js'
import ActivityLog from '../activity-logs/model.js'
import PlanTransaction from '../plan-transaction/model.js'
import dayjs from 'dayjs'
import mongoose from 'mongoose'
import { logActivity } from '../activity-logs/service.js'
import { buildChangeLog } from '../../helpers/changeLog.js'

export const getAllUsers = async (req, res) => {
  try {
    const draw = +req.query.draw || 0
    const start = +req.query.start || 0
    const length = +req.query.length || 10
    const searchValue = (req.query['search[value]'] || '').trim()
    const colIdx = req.query['order[0][column]']
    const sortField = req.query[`columns[${colIdx}][data]`] || 'createdAt'
    const sortDir = req.query['order[0][dir]'] === 'asc' ? 1 : -1

    // pipeline aggregation
    const pipeline = [
      ...lookupRef('organization', 'Organizations'),
      {
        $match: {
          role: { $ne: 'Admin' }
        }
      }
    ]

    // filter search
    if (searchValue) {
      pipeline.push({
        $match: {
          $or: [
            { username: { $regex: searchValue, $options: 'i' } },
            { email: { $regex: searchValue, $options: 'i' } },
            { role: { $regex: searchValue, $options: 'i' } },
            { 'organization.name': { $regex: searchValue, $options: 'i' } }
          ]
        }
      })
    }

    // count filtered
    const countPipeline = [...pipeline, { $count: 'count' }]
    const countResult = await User.aggregate(countPipeline)
    const recordsFiltered = countResult[0]?.count || 0

    // count total
    const recordsTotal = await User.countDocuments({ role: { $ne: 'Admin' } })

    // sort, skip, limit
    pipeline.push(
      { $sort: { [sortField]: sortDir } },
      { $skip: start },
      { $limit: length },
      {
        $project: {
          _id: 1,
          username: 1,
          email: 1,
          role: 1,
          organization: {
            _id: '$organization._id',
            name: { $ifNull: ['$organization.name', ''] },
            province: '$organization.province'
          },
          createdAt: {
            $dateToString: {
              date: '$createdAt',
              timezone: 'Asia/Ho_Chi_Minh',
              format: '%d-%m-%Y %H:%M:%S'
            }
          },
          updatedAt: {
            $dateToString: {
              date: '$updatedAt',
              timezone: 'Asia/Ho_Chi_Minh',
              format: '%d-%m-%Y %H:%M:%S'
            }
          }
        }
      }
    )

    const users = await User.aggregate(pipeline)

    return res.json({
      draw,
      recordsTotal,
      recordsFiltered,
      data: users
    })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}

export const getUserById = async (req, res) => {
  const { id } = req.params
  if (!id) return responseHelper.error(res, 'ID người dùng không hợp lệ', 400)

  const user = await User.findById(id).populate('organization', '_id name')
  if (!user) return responseHelper.error(res, 'Không tìm thấy người dùng', 404)

  responseHelper.success(res, user, 'Lấy thông tin người dùng thành công')
}

export const createUser = async (req, res) => {
  try {
    const { username, email, organization, password, confirmPassword } = req.body

    if (!username || !email || !password || !organization) {
      return responseHelper.error(res, 'Vui lòng điền đầy đủ thông tin', 400)
    }

    if (!validator.isEmail(email)) return responseHelper.error(res, 'Email không hợp lệ', 400)

    const usernameError = isValidUsername(username)
    if (usernameError) {
      return responseHelper.error(res, usernameError, 400)
    }

    const passwordError = isValidPassword(password)
    if (passwordError) {
      return responseHelper.error(res, passwordError, 400)
    }

    const confirmError = isPasswordMatch(password, confirmPassword)
    if (confirmError) {
      return responseHelper.error(res, confirmError, 400)
    }

    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    })

    if (existingUser) {
      return responseHelper.error(res, 'Tên đăng nhập hoặc email đã tồn tại', 400)
    }

    const newUser = new User({ username, email, password, organization })
    await newUser.save()

    logActivity(
      organization,
      req.user?._id || null,
      req.user?.username || null,
      'CREATE',
      'USER',
      `Tạo người dùng "${username}" với email "${email}"`,
      username,
      'SUCCESS'
    )

    responseHelper.success(res, newUser, 'Tạo người dùng thành công')
  } catch (error) {
    logActivity(
      req.body.organization || null,
      req.user?._id || null,
      req.user?.username || null,
      'CREATE',
      'USER',
      `Tạo người dùng thất bại`,
      req.body.username || '',
      'FAILED'
    )
    if (error.code === 11000) {
      return responseHelper.error(res, 'Username hoặc email đã tồn tại', 400)
    }
    responseHelper.error(res, error.message)
  }
}

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params
    const { username, email, organization, role, password, confirmPassword } = req.body

    if (!id) return responseHelper.error(res, 'Id người dùng không hợp lệ', 400)
    if (!validator.isEmail(email)) {
      return responseHelper.error(res, 'Email không hợp lệ', 400)
    }

    const userToUpdate = await User.findById(id).populate('organization', '_id name')
    if (!userToUpdate) {
      return responseHelper.error(res, 'Người dùng không tồn tại', 404)
    }

    const existingUser = await User.findOne({
      $or: [{ username }, { email }],
      _id: { $ne: id }
    })

    if (existingUser) return responseHelper.error(res, 'Tên hoặc email người dùng đã tồn tại', 400)

    if (String(userToUpdate._id) === String(req.user._id) && role !== userToUpdate.role) {
      return responseHelper.error(res, 'Không thể chỉnh sửa vai trò của chính mình', 400)
    }

    if (userToUpdate.role === 'SubAdmin' && role !== 'SubAdmin') {
      return responseHelper.error(res, 'Không thể thay đổi vai trò của SubAdmin', 400)
    }

    if (
      !['Admin', 'SubAdmin'].includes(userToUpdate.role) &&
      ['Admin', 'SubAdmin'].includes(role)
    ) {
      return responseHelper.error(
        res,
        'Không thể thay đổi vai trò người dùng thành Admin/SubAdmin',
        403
      )
    }

    if (!['Admin', 'SubAdmin'].includes(role)) {
      if (!organization || !mongoose.isValidObjectId(organization)) {
        return responseHelper.error(res, 'Tổ chức không hợp lệ', 400)
      }

      const orgExists = await Organization.findById(organization)
      if (!orgExists) {
        return responseHelper.error(res, 'Tổ chức không tồn tại', 404)
      }
    }

    const dataUpdates = {
      username,
      email,
      role
    }

    if (!['Admin', 'SubAdmin'].includes(role)) {
      dataUpdates.organization = organization
    }

    if (password || confirmPassword) {
      const passwordValidationError = isValidPassword(password)
      if (passwordValidationError) {
        return responseHelper.error(res, passwordValidationError, 400)
      }

      const passwordMatchError = isPasswordMatch(password, confirmPassword)
      if (passwordMatchError) {
        return responseHelper.error(res, passwordMatchError, 400)
      }

      const hashedPassword = await bcrypt.hash(password, 10)
      dataUpdates.password = hashedPassword
    }

    const updated = await User.findByIdAndUpdate(id, dataUpdates, {
      new: true,
      runValidators: true
    }).populate('organization', '_id name')

    const changeDetails = buildChangeLog(
      userToUpdate.toObject(),
      updated.toObject(),
      [
        { field: 'username', label: 'Tên đăng nhập' },
        { field: 'email', label: 'Email' },
        { field: 'role', label: 'Vai trò' },
        { field: 'organization', label: 'Tổ chức', formatValue: (val) => val?.name || '' }
      ],
      updated.username,
      'người dùng'
    )

    if (changeDetails) {
      logActivity(
        updated.organization?._id || null,
        req.user?._id || null,
        req.user?.username || null,
        'UPDATE',
        'USER',
        changeDetails,
        updated.username,
        'SUCCESS'
      )
    }

    responseHelper.success(res, updated, 'Cập nhật người dùng thành công')
  } catch (error) {
    logActivity(
      req.body.organization || null,
      req.user?._id || null,
      req.user?.username || null,
      'UPDATE',
      'USER',
      `Thất bại khi cập nhật người dùng`,
      req.body.username || '',
      'FAILED'
    )
    responseHelper.error(res, error.message)
  }
}

export const deleteUsers = async (req, res) => {
  try {
    const { ids } = req.body
    if (!Array.isArray(ids) || ids.length === 0) {
      return responseHelper.error(res, 'Không có người dùng nào được chọn để xóa')
    }

    // Lấy thông tin user trước khi xóa để log
    const usersToDelete = await User.find({ _id: { $in: ids } }).select('username organization')

    if (req.user.role === 'Admin') {
      return responseHelper.error(res, 'Không thể xóa người dùng có vai trò Admin', 403)
    }

    if (usersToDelete.length === 0) {
      return responseHelper.error(res, 'Không tìm thấy người dùng để xóa')
    }

    await User.deleteMany({ _id: { $in: ids } })

    // Log cho mỗi tổ chức liên quan
    const orgMap = {}
    usersToDelete.forEach((u) => {
      const orgId = u.organization?.toString() || null
      if (!orgMap[orgId]) orgMap[orgId] = []
      orgMap[orgId].push(u.username)
    })

    for (const [orgId, usernames] of Object.entries(orgMap)) {
      logActivity(
        orgId,
        req.user._id,
        req.user.username,
        'DELETE',
        'USER',
        `Đã xóa người dùng: ${usernames.join(', ')}`
      )
    }

    responseHelper.success(res, null, 'Xóa người dùng thành công')
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const setOrg = (req, res) => {
  const { orgId } = req.body
  if (!orgId) return responseHelper.error(res, 'Không tìm thấy tổ chức', 404)

  if (req.session) {
    req.session.currentOrg = orgId
  }

  res.json({ ok: true, currentOrg: orgId })
}

export const exitOrg = (req, res) => {
  if (req.session) {
    delete req.session.currentOrg
  }
  res.status(200).send('OK')
}

export const getAllAuditLogs = async (req, res) => {
  try {
    const draw = +req.query.draw || 0
    const start = Math.max(0, +req.query.start || 0)
    const length = Math.max(1, +req.query.length || 10)
    const searchValue = (req.query['search[value]'] || '').trim()
    const colIdx = req.query['order[0][column]']
    const sortField = req.query[`columns[${colIdx}][data]`] || 'createdAt'
    const sortDir = req.query['order[0][dir]'] === 'asc' ? 1 : -1
    const organization = req.query.organization

    const pipeline = [
      ...lookupRef('userId', 'Users', { as: 'user' }),
      ...lookupRef('organization', 'Organizations', { as: 'organizationInfo' })
    ]

    // Filter theo organization !== all
    if (organization && organization !== 'all') {
      pipeline.push({
        $match: {
          organization: { $eq: new mongoose.Types.ObjectId(String(organization)) }
        }
      })
    }

    // Multi-token search
    if (searchValue) {
      const tokens = searchValue.split(/\s+/).filter(Boolean)
      const andConditions = tokens.map((token) => {
        const regex = { $regex: token, $options: 'i' }
        return {
          $or: [
            {
              $expr: {
                $regexMatch: {
                  input: {
                    $dateToString: {
                      format: '%d/%m/%Y %H:%M:%S',
                      date: '$createdAt',
                      timezone: '+07:00'
                    }
                  },
                  regex: token,
                  options: 'i'
                }
              }
            },
            { userName: regex },
            { description: regex },
            { status: regex },
            { 'organizationInfo.name': regex }
          ]
        }
      })

      pipeline.push({ $match: { $and: andConditions } })
    }

    // Đếm total theo filter organization
    let recordsTotal
    if (organization && organization !== 'all') {
      recordsTotal = await ActivityLog.countDocuments({
        organization: new mongoose.Types.ObjectId(String(organization))
      })
    } else {
      recordsTotal = await ActivityLog.countDocuments()
    }

    const countPipeline = [...pipeline, { $count: 'count' }]
    const countResult = await ActivityLog.aggregate(countPipeline)
    const recordsFiltered = countResult[0]?.count || 0

    const allowedSort = ['userName', 'description', 'createdAt', 'organizationName', 'status']
    const sortObj = {}

    if (sortField === 'organizationName') {
      sortObj['organizationInfo.name'] = sortDir
    } else {
      sortObj[allowedSort.includes(sortField) ? sortField : 'createdAt'] = sortDir
    }

    pipeline.push(
      { $sort: sortObj },
      { $skip: start },
      { $limit: length },
      {
        $project: {
          _id: 1,
          createdAt: 1,
          userName: 1,
          description: 1,
          status: 1,
          organizationName: '$organizationInfo.name'
        }
      }
    )

    let data = await ActivityLog.aggregate(pipeline)

    data = data.map((item) => ({
      _id: item._id,
      time: dayjs(item.createdAt).format('DD/MM/YYYY HH:mm:ss'),
      userName: item.userName,
      organizationName: item.organizationName || 'N/A',
      description: item.description,
      status: item.status
    }))

    return res.json({ draw, recordsTotal, recordsFiltered, data })
  } catch (error) {
    console.error('getActivityLogs error:', error)
    return res.status(500).json({
      draw: +req.query.draw || 0,
      recordsTotal: 0,
      recordsFiltered: 0,
      data: [],
      error: error.message
    })
  }
}

export const deleteLogs = async (req, res) => {
  try {
    const { ids } = req.body
    if (!Array.isArray(ids) || ids.length === 0) {
      return responseHelper.error(res, 'Chọn ít nhất 1 bản ghi để xóa', 400)
    }

    const result = await ActivityLog.deleteMany({
      _id: { $in: ids }
    })

    responseHelper.success(res, `Xóa thành công ${result.deletedCount} bản ghi`)
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const createAdminAccount = async (req, res) => {
  try {
    const existed = await User.findOne({ role: 'Admin' })
    if (existed) {
      return responseHelper.error(res, 'Admin đã tồn tại', 409)
    }

    const admin = new User({
      username: 'admin',
      email: 'abc@gmail.com',
      role: 'Admin',
      password: '1'
    })

    await admin.save()

    responseHelper.success(res, admin, 'Tạo admin thành công')
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

/**
 * Get employees (SubAdmin users)
 */

export const getEmployees = async (req, res) => {
  try {
    const draw = +req.query.draw || 0
    const start = +req.query.start || 0
    const length = +req.query.length || 10
    const searchValue = (req.query['search[value]'] || '').trim()
    const colIdx = req.query['order[0][column]']
    const sortField = req.query[`columns[${colIdx}][data]`] || 'createdAt'
    const sortDir = req.query['order[0][dir]'] === 'asc' ? 1 : -1

    // pipeline aggregation
    const pipeline = []

    pipeline.push({
      $match: {
        role: 'SubAdmin'
      }
    })

    // filter search
    if (searchValue) {
      pipeline.push({
        $match: {
          $or: [
            { username: { $regex: searchValue, $options: 'i' } },
            { email: { $regex: searchValue, $options: 'i' } }
          ]
        }
      })
    }

    // count filtered
    const countPipeline = [...pipeline, { $count: 'count' }]
    const countResult = await User.aggregate(countPipeline)
    const recordsFiltered = countResult[0]?.count || 0

    // count total
    const recordsTotal = await User.countDocuments({ role: 'SubAdmin' })

    // sort, skip, limit
    pipeline.push(
      { $sort: { [sortField]: sortDir } },
      { $skip: start },
      { $limit: length },
      {
        $project: {
          _id: 1,
          username: 1,
          email: 1,
          role: 1,
          organization: {
            _id: '$organization._id',
            name: { $ifNull: ['$organization.name', ''] },
            province: '$organization.province'
          },
          createdAt: {
            $dateToString: {
              date: '$createdAt',
              timezone: 'Asia/Ho_Chi_Minh',
              format: '%d-%m-%Y %H:%M:%S'
            }
          },
          updatedAt: {
            $dateToString: {
              date: '$updatedAt',
              timezone: 'Asia/Ho_Chi_Minh',
              format: '%d-%m-%Y %H:%M:%S'
            }
          }
        }
      }
    )

    const users = await User.aggregate(pipeline)

    return res.json({
      draw,
      recordsTotal,
      recordsFiltered,
      data: users
    })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}

/**
 * Create employee (SubAdmin user)
 */

export const createEmployee = async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body
    if (!username || !email || !password) {
      return responseHelper.error(res, 'Vui lòng điền đầy đủ thông tin', 400)
    }

    if (!validator.isEmail(email)) return responseHelper.error(res, 'Email không hợp lệ', 400)
    const usernameError = isValidUsername(username)
    if (usernameError) {
      return responseHelper.error(res, usernameError, 400)
    }
    const passwordError = isValidPassword(password)
    if (passwordError) {
      return responseHelper.error(res, passwordError, 400)
    }
    const confirmError = isPasswordMatch(password, confirmPassword)
    if (confirmError) {
      return responseHelper.error(res, confirmError, 400)
    }
    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    })
    if (existingUser) {
      return responseHelper.error(res, 'Tên đăng nhập hoặc email đã tồn tại', 400)
    }
    const newUser = new User({ username, email, password, role: 'SubAdmin' })
    await newUser.save()
    logActivity(
      null,
      req.user?._id || null,
      req.user?.username || null,
      'CREATE',
      'USER',
      `Tạo nhân viên "${username}" với email "${email}"`,
      username,
      'SUCCESS'
    )
    responseHelper.success(res, newUser, 'Tạo nhân viên thành công')
  } catch (error) {
    logActivity(
      null,
      req.user?._id || null,
      req.user?.username || null,
      'CREATE',
      'USER',
      `Tạo nhân viên thất bại`,
      req.body.username || '',
      'FAILED'
    )
    if (error.code === 11000) {
      return responseHelper.error(res, 'Username hoặc email đã tồn tại', 400)
    }
    responseHelper.error(res, error.message)
  }
}

/**
 * Update employee (SubAdmin user)
 */
export const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params
    const { username, email, password, confirmPassword } = req.body
    if (!id) return responseHelper.error(res, 'Id nhân viên không hợp lệ', 400)
    if (!validator.isEmail(email)) {
      return responseHelper.error(res, 'Email không hợp lệ', 400)
    }
    const userToUpdate = await User.findById(id)
    if (!userToUpdate) {
      return responseHelper.error(res, 'Người dùng không tồn tại', 404)
    }

    const existingUser = await User.findOne({
      $or: [{ username }, { email }],
      _id: { $ne: id }
    })
    if (existingUser) return responseHelper.error(res, 'Tên hoặc email nhân viên đã tồn tại', 400)
    const dataUpdates = {
      username,
      email
    }
    if (password || confirmPassword) {
      const passwordValidationError = isValidPassword(password)
      if (passwordValidationError) {
        return responseHelper.error(res, passwordValidationError, 400)
      }
      const passwordMatchError = isPasswordMatch(password, confirmPassword)
      if (passwordMatchError) {
        return responseHelper.error(res, passwordMatchError, 400)
      }
      const hashedPassword = await bcrypt.hash(password, 10)
      dataUpdates.password = hashedPassword
    }
    const updated = await User.findByIdAndUpdate(id, dataUpdates, {
      new: true,
      runValidators: true
    })
    const changeDetails = buildChangeLog(
      userToUpdate.toObject(),
      updated.toObject(),
      [
        { field: 'username', label: 'Tên đăng nhập' },
        { field: 'email', label: 'Email' }
      ],
      updated.username,
      'nhân viên'
    )
    if (changeDetails) {
      logActivity(
        null,
        req.user?._id || null,
        req.user?.username || null,
        'UPDATE',
        'USER',
        changeDetails,
        updated.username,
        'SUCCESS'
      )
    }
    responseHelper.success(res, updated, 'Cập nhật nhân viên thành công')
  } catch (error) {
    logActivity(
      null,
      req.user?._id || null,
      req.user?.username || null,
      'UPDATE',
      'USER',
      `Thất bại khi cập nhật nhân viên`,
      req.body.username || '',
      'FAILED'
    )
    responseHelper.error(res, error.message)
  }
}

/**
 * Delete employees (SubAdmin users)
 */

export const deleteEmployees = async (req, res) => {
  try {
    const { ids } = req.body
    if (!Array.isArray(ids) || ids.length === 0) {
      return responseHelper.error(res, 'Không có nhân viên nào được chọn để xóa')
    }
    // Lấy thông tin user trước khi xóa để log
    const usersToDelete = await User.find({ _id: { $in: ids }, role: 'SubAdmin' }).select(
      'username'
    )
    if (usersToDelete.length === 0) {
      return responseHelper.error(res, 'Không tìm thấy nhân viên để xóa')
    }
    await User.deleteMany({ _id: { $in: ids }, role: 'SubAdmin' })
    const usernames = usersToDelete.map((u) => u.username)
    logActivity(
      null,
      req.user._id,
      req.user.username,
      'DELETE',
      'USER',
      `Đã xóa nhân viên: ${usernames.join(', ')}`
    )
    responseHelper.success(res, null, 'Xóa nhân viên thành công')
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const adminDashboardStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query
    const start = startDate
      ? new Date(`${startDate}T00:00:00.000Z`)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1)

    const end = endDate ? new Date(`${endDate}T23:59:59.999Z`) : new Date()

    const totalOrgPipeLine = [
      {
        $count: 'total'
      }
    ]

    const isActivePipeline = [
      {
        $match: { isActive: true }
      },
      {
        $count: 'total'
      }
    ]

    const recentPlanTransactionsPipeline = [
      {
        $match: {
          status: { $exists: true }
        }
      },
      {
        $lookup: {
          from: 'Organizations',
          localField: 'organization',
          foreignField: '_id',
          as: 'organization'
        }
      },
      { $unwind: { path: '$organization', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'Plans',
          localField: 'plan',
          foreignField: '_id',
          as: 'plan'
        }
      },
      { $unwind: { path: '$plan', preserveNullAndEmptyArrays: true } },

      {
        $project: {
          code: 1,
          organizationName: { $ifNull: ['$organization.name', '—'] },
          planName: { $ifNull: ['$plan.name', '—'] },
          mode: 1,
          duration: 1,
          total: 1,
          status: 1,
          paidAt: 1,
          createdAt: 1
        }
      },
      { $sort: { createdAt: -1 } },
      { $limit: 10 }
    ]

    const paidRevenuePipeline = [
      {
        $match: {
          status: 'paid'
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$total' },
          totalPaidOrders: { $sum: 1 }
        }
      }
    ]

    const revenueByPlanPipeline = [
      {
        $match: {
          status: 'paid',
          paidAt: { $gte: start, $lte: end }
        }
      },
      {
        $lookup: {
          from: 'Plans',
          localField: 'plan',
          foreignField: '_id',
          as: 'plan'
        }
      },
      { $unwind: '$plan' },
      {
        $group: {
          _id: '$plan.name',
          total: { $sum: '$total' }
        }
      },
      { $sort: { total: -1 } }
    ]

    const orderStatusPipeline = [
      {
        $match: {
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: '$status',
          total: { $sum: 1 }
        }
      }
    ]

    const [
      totalUsers,
      totalEmployees,
      totalOrganizations,
      activeOrganizations,
      recentPlanTransactions,
      paidRevenue,
      revenueChart,
      orderStatusChart
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'SubAdmin' }),
      Organization.aggregate(totalOrgPipeLine),
      Organization.aggregate(isActivePipeline),
      PlanTransaction.aggregate(recentPlanTransactionsPipeline),
      PlanTransaction.aggregate(paidRevenuePipeline),
      PlanTransaction.aggregate(revenueByPlanPipeline),
      PlanTransaction.aggregate(orderStatusPipeline)
    ])

    responseHelper.success(res, {
      totalUsers,
      totalEmployees,
      totalOrganizations: totalOrganizations[0]?.total || 0,
      activeOrganizations: activeOrganizations[0]?.total || 0,
      recentOrder: recentPlanTransactions,
      totalPaidRevenue: paidRevenue[0]?.totalRevenue || 0,
      totalPaidOrders: paidRevenue[0]?.totalPaidOrders || 0,
      revenueChart,
      orderStatusChart
    })
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}
