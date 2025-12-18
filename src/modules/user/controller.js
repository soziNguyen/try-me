import mailer from '../../helpers/mailer.js'
import SMTP from '../../configs/smtp.js'
import User from './model.js'
import Order from '../order/model.js'
import Attendance from '../attendance/model.js'
import { Schedule } from '../schedule/model.js'
import Organization from '../organization/model.js'
import bcrypt from 'bcryptjs'
import passport from 'passport'
import responseHelper from '../../helpers/responseHelper.js'
import { isValidPassword, generateSalt } from '../../helpers/common.js'
import { parseShiftStart } from '../../helpers/dateHelper.js'
import { getCurrentOrg } from '../../helpers/orgHelper.js'
import { logActivity } from '../activity-logs/service.js'
import { buildChangeLog } from '../../helpers/changeLog.js'
import paginationHelper from '../../helpers/paginationHelper.js'
import mongoose from 'mongoose'

// [CREATE] / User
export const createUser = async (req, res) => {
  try {
    const { username, email, warehouse, password } = req.body
    const organizationId = getCurrentOrg(req)

    if (!organizationId) {
      return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)
    }

    if (!warehouse || !mongoose.isValidObjectId(warehouse)) {
      return responseHelper.error(res, 'Vui lòng chọn kho làm việc hợp lệ cho nhân viên', 400)
    }

    // Lấy thông tin tổ chức + gói dịch vụ
    const org = await Organization.findById(organizationId).populate('plan')
    if (!org) {
      return responseHelper.error(res, 'Không tìm thấy tổ chức', 404)
    }

    const plan = org.plan

    // Đếm số nhân viên hiện có (trừ tài khoản quản trị Org)
    const currentStaffCount = await User.countDocuments({
      organization: organizationId,
      role: { $ne: 'Org' }
    })

    // Kiểm tra giới hạn gói
    if (plan?.staffLimit !== null && currentStaffCount >= plan.staffLimit) {
      return responseHelper.error(
        res,
        `Gói ${plan.name} chỉ cho phép tối đa ${plan.staffLimit} nhân viên. Nâng cấp gói để mở khóa thêm tính năng.`,
        400
      )
    }

    // Kiểm tra trùng username/email trong tổ chức
    const exist = await User.findOne({
      organization: organizationId,
      $or: [{ username }, { email }]
    })

    if (exist) {
      return responseHelper.error(res, 'Tên đăng nhập hoặc email đã tồn tại.', 400)
    }

    //  Tạo nhân viên mới
    const newUser = await User.create({
      username,
      email,
      warehouse,
      password,
      organization: organizationId
    })

    logActivity(
      organizationId,
      req.user._id,
      req.user.username || 'Unknown',
      'CREATE',
      'USER',
      `Thêm mới nhân viên`,
      newUser.username,
      'SUCCESS',
      warehouse
    )

    responseHelper.success(res, newUser, 'Tạo nhân viên thành công')
  } catch (error) {
    if (error.code === 11000) {
      return responseHelper.error(res, 'Username hoặc email đã tồn tại', 400)
    }
    responseHelper.error(res, error.message)
  }
}

/*
 *  [GET] / Users
 */

export const getUsers = async (req, res) => {
  try {
    const { s, page, limit } = req.query
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    const { currentPage, perPage, skip } = paginationHelper(page, limit)

    const filter = { organization: organizationId }
    if (s) {
      filter['$or'] = [
        { username: { $regex: s, $options: 'i' } },
        { email: { $regex: s, $options: 'i' } }
      ]
    }

    const [users, totalUsers] = await Promise.all([
      User.find(filter)
        .populate('organization', 'name')
        .populate('warehouse', '_id name location')
        .skip(skip)
        .limit(perPage)
        .sort({ createdAt: -1 }),
      User.countDocuments(filter)
    ])

    responseHelper.success(res, {
      data: users,
      pagination: {
        total: totalUsers,
        currentPage,
        perPage,
        totalPages: Math.ceil(totalUsers / perPage)
      }
    })
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

/*
 * [GET] / User/:id
 */

export const getUserById = async (req, res) => {
  const { id } = req.params
  const organizationId = getCurrentOrg(req)

  try {
    const query = { _id: id }

    if (req.user.role !== 'Admin') {
      if (!organizationId) {
        return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)
      }
      query.organization = organizationId
    }

    const user = await User.findOne(query)
      .populate('organization', 'name businessType')
      .populate('warehouse', '_id name location')

    if (!user) {
      return responseHelper.error(res, 'Không tìm thấy người dùng', 404)
    }

    responseHelper.success(res, user, 'Lấy thông tin người dùng thành công')
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

/*
 * [UPDATE] / User/:id
 */

export const updateUser = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)
    const { username, email, warehouse, password, confirmPassword, role } = req.body
    const { id } = req.params

    const userExist = await User.findOne({
      _id: id,
      organization: organizationId
    }).populate('warehouse', 'name')

    if (!userExist) {
      return responseHelper.error(res, 'Không tìm thấy người dùng', 404)
    }

    // Chặn sửa quyền của Admin
    if (userExist.role === 'Admin' && role !== 'Admin') {
      return responseHelper.error(res, 'Không thể thay đổi quyền của Admin', 403)
    }

    // Chặn nâng quyền lên Admin nếu không phải Admin thật (thay value của option ngoài FE)
    if ((role === 'Admin' || role === 'SubAdmin') && userExist.role !== 'Admin') {
      return responseHelper.error(res, 'Bạn không có thẩm quyền để thực hiện thao tác này', 403)
    }

    const existUser = await User.findOne({
      organization: organizationId,
      $or: [{ username }, { email }],
      _id: { $ne: id }
    })

    if (existUser) {
      return responseHelper.error(res, 'Username hoặc Email đã tồn tại', 400)
    }

    const organization = await Organization.findById(organizationId).select('businessType')
    if (!organization) {
      return responseHelper.error(res, 'Không tìm thấy tổ chức', 404)
    }

    const nonKitchenTypes = ['shop']
    if (nonKitchenTypes.includes(organization.businessType) && role === 'Kitchen') {
      return responseHelper.error(res, 'Vai trò Bếp không khả dụng cho loại hình này', 400)
    }

    if (['Staff', 'Kitchen'].includes(role)) {
      if (!warehouse || !mongoose.isValidObjectId(warehouse)) {
        return responseHelper.error(res, 'Vui lòng chọn kho hợp lệ', 400)
      }
    }

    const updatedFields = { username, email, role }
    if (warehouse) updatedFields.warehouse = warehouse
    if (password) {
      if (password !== confirmPassword) {
        return responseHelper.error(res, 'Mật khẩu không khớp', 400)
      }
      const passwordValidation = isValidPassword(password)
      if (passwordValidation) {
        return responseHelper.error(res, passwordValidation, 400)
      }
      const hashedPassword = await bcrypt.hash(password, 10)
      updatedFields.password = hashedPassword
    }
    const updateUser = await User.findOneAndUpdate(
      { _id: id, organization: organizationId },
      updatedFields,
      { new: true }
    ).populate('warehouse', 'name')

    if (!updateUser) {
      return responseHelper.error(res, 'Cập nhật thất bại', 400)
    }

    const changeDetailsUser = buildChangeLog(
      userExist,
      updateUser,
      [
        { field: 'username', label: 'Tên đăng nhập' },
        { field: 'email', label: 'Email' },
        {
          field: 'warehouse',
          label: 'Kho',
          formatValue: (val) => {
            if (!val) return
            return val.name || val
          }
        },
        { field: 'role', label: 'Vai trò' }
      ],
      userExist.username,
      'nhân viên'
    )

    logActivity(
      organizationId,
      req.user._id,
      req.user.username,
      'UPDATE',
      'USER',
      changeDetailsUser,
      updateUser.username,
      'SUCCESS',
      warehouse || null
    )

    responseHelper.success(res, updateUser)
  } catch (error) {
    if (error.code === 11000) {
      return responseHelper.error(res, 'Username hoặc email đã tồn tại', 400)
    }
    responseHelper.error(res, error.message)
  }
}

/*
 * [DEL] / Users
 */

export const deleteUsers = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    const { userIds } = req.body
    if (!userIds || userIds.length === 0) {
      return responseHelper.error(res, 'Không có người dùng nào được chọn để xóa', 400)
    }

    if (userIds.includes(req.user._id.toString())) {
      return responseHelper.error(res, 'Bạn không thể xóa tài khoản của chính mình', 400)
    }

    const result = await User.deleteMany({
      _id: { $in: userIds },
      organization: organizationId
    })

    if (result.deletedCount === 0) {
      return responseHelper.error(res, 'Không có người dùng nào được chọn để xóa ', 404)
    }

    logActivity(
      organizationId,
      req.user._id,
      req.user.username,
      'DELETE',
      'USER',
      `Đã xóa ${result.deletedCount} nhân viên`
    )

    responseHelper.success(res, 'Xóa thành công')
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

/*
 * [LOGIN] / User
 */

const GRACE_MINUTES = 5 // thay đổi theo policy

export const logIn = async (req, res, next) => {
  passport.authenticate('local', async (err, user, info) => {
    if (err) return next(err)

    if (!user) {
      // Log failed login attempt
      if (req.body?.username) {
        logActivity(
          null,
          null,
          req.body.username, // <-- truyền username trực tiếp
          'LOGIN',
          'AUTH',
          'Đăng nhập thất bại',
          req.body.username,
          'FAILED'
        )
      }
      return responseHelper.error(
        res,
        info?.message || 'Tài khoản hoặc mật khẩu không chính xác',
        400
      )
    }

    req.logIn(user, async (err) => {
      if (err) return next(err)

      // Remember me
      req.session.cookie.maxAge = req.body?.remember ? 30 * 24 * 60 * 60 * 1000 : false

      try {
        if ((user.role || '').toLowerCase() === 'staff') {
          const now = new Date()
          const today = new Date(now)
          today.setHours(0, 0, 0, 0)
          const tomorrow = new Date(today)
          tomorrow.setDate(today.getDate() + 1)

          const schedule = await Schedule.findOne({
            organization: user.organization,
            user: user._id,
            date: { $gte: today, $lt: tomorrow },
            status: { $ne: 'cancelled' }
          }).populate('shift')

          let statusForDay = 'present'
          if (schedule?.shift?.startTime) {
            const shiftStart = parseShiftStart(today, schedule.shift.startTime)
            const diffMin = Math.round((now - shiftStart) / 60000)
            if (diffMin > GRACE_MINUTES) statusForDay = 'late'
          }

          const sessionObj = {
            shift: schedule?.shift?._id || null,
            checkIn: now,
            type: 'regular',
            note: 'Auto check-in on login'
          }

          // Upsert attendance
          const attendance = await Attendance.findOneAndUpdate(
            {
              organization: user.organization,
              user: user._id,
              date: today
            },
            {
              $setOnInsert: {
                organization: user.organization,
                user: user._id,
                date: today,
                status: statusForDay,
                sessions: [sessionObj]
              }
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          )

          const hasOpen = attendance.sessions.some((s) => !s.checkOut)
          if (!hasOpen) {
            await Attendance.findByIdAndUpdate(attendance._id, {
              $push: { sessions: sessionObj },
              $set: {
                status:
                  attendance.status === 'absent'
                    ? statusForDay
                    : statusForDay === 'late' && attendance.status !== 'leave'
                      ? 'late'
                      : attendance.status
              }
            })
          } else {
            // Update status nếu đang absent/late
            if (attendance.status !== statusForDay && attendance.status !== 'leave') {
              attendance.status = statusForDay
              await attendance.save()
            }
          }
        }
      } catch (e) {
        console.error('Auto check-in failed:', e)
      }

      // Log successful login
      logActivity(
        user.organization,
        user._id,
        user.username || user.email,
        'LOGIN',
        'AUTH',
        'Đăng nhập',
        user.username || user.email
      )

      const userData = {
        id: user._id,
        username: user.username
      }

      return responseHelper.success(res, userData, 'Đăng nhập thành công')
    })
  })(req, res, next)
}

// [LOGOUT]
export const logOut = async (req, res) => {
  try {
    const user = req.user
    if (!user) {
      return req.logout(() => responseHelper.success(res, 'Logged out'))
    }

    if ((user.role || '').toLowerCase() === 'staff') {
      const now = new Date()

      const todayStart = new Date(now)
      todayStart.setHours(0, 0, 0, 0, 0)
      const tomorrowStart = new Date(todayStart)
      tomorrowStart.setDate(todayStart.getDate() + 1)

      const [attendance, schedule] = await Promise.all([
        Attendance.findOne({
          organization: user.organization,
          user: user._id,
          date: { $gte: todayStart, $lt: tomorrowStart }
        }),
        Schedule.findOne({
          organization: user.organization,
          user: user._id,
          date: { $gte: todayStart, $lt: tomorrowStart },
          status: { $ne: 'cancelled' }
        }).populate('shift')
      ])

      if (attendance) {
        const openSession = attendance.sessions.find((s) => !s.checkOut)
        if (openSession) {
          // tránh overlap: nếu có session kế tiếp và now > next.checkIn thì cắt ngắn
          const idx = attendance.sessions.findIndex((s) => s === openSession)
          const next = attendance.sessions[idx + 1]
          if (next && next.checkIn && now > new Date(next.checkIn)) {
            openSession.checkOut = next.checkIn
          } else {
            openSession.checkOut = now
          }

          if (!openSession.shift && schedule?.shift) {
            openSession.shift = schedule.shift._id
          }

          try {
            await attendance.save() // trigger pre-save hook (tính duration/totals)
          } catch (saveErr) {
            // log lỗi nhưng không block logout
            console.error('Auto check-out save failed:', saveErr)
          }
        }
      }
    }
    logActivity(
      user.organization,
      user._id,
      user.username || user.email,
      'LOGOUT',
      'AUTH',
      'Đăng xuất',
      user.username || user.email
    )
  } catch (err) {
    console.error('Auto check-out failed:', err)

    // Log logout failure nếu có user info
    if (req.user) {
      logActivity(
        req.user.organization,
        req.user._id,
        req.user.username || req.user.email,
        'LOGOUT',
        'AUTH',
        `Logout process failed`,
        req.user.username || req.user.email,
        'FAILED'
      )
    }
  }

  req.logout((err) => {
    if (err) return responseHelper.error(res, 'Logout failed', 500)

    req.session.destroy((err) => {
      if (err) return responseHelper.error(res, 'Session destroy failed', 500)

      res.clearCookie('connect.sid')
      return responseHelper.success(res, 'Logged out')
    })
  })
}

// [FORGOT] / Password
export const forgotPassword = async (req, res) => {
  const { email } = req.body
  try {
    const user = await User.findOne({ email })
    if (!user) {
      return responseHelper.error(res, `${email} Not Found.`, 404)
    }

    const resetToken = generateSalt(32)
    const tokenExpires = Date.now() + 60 * 60 * 1000

    user.resetToken = resetToken
    user.resetTokenExpires = tokenExpires
    await user.save()

    const domain =
      process.env.NODE_ENV === 'production' ? process.env.DOMAIN : 'http://localhost:3000'
    const resetLink = `${domain}/reset-password/${resetToken}`
    await mailer.sendMail({
      from: SMTP.username,
      to: user.email,
      subject: 'Password Reset Request',
      html: `
              <h3>Reset Your Password</h3>
              <p>Click the link below to reset your password. This link will expire in 1 hour:</p>
              <p>Click <a href="${resetLink}"><i>here</i></a> to reset your password</p>
            `
    })
    responseHelper.success(res, '1', 'A password reset link has been sent to your email.')
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

// [RESET] / Password
export const resetPassword = async (req, res) => {
  const { token } = req.params
  const { newPassword, confirmPassword } = req.body

  if (newPassword !== confirmPassword) {
    return responseHelper.error(res, 'Passwords do not correct.', 400)
  }
  try {
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpires: { $gt: Date.now() }
    })
    if (!user) {
      return responseHelper.error(res, 'Invalid or expired token.', 404)
    }

    user.password = newPassword
    user.resetToken = undefined
    user.resetTokenExpires = undefined
    await user.save()
    responseHelper.success(res, user)
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

/**
 * [CHANGE] / Password
 */
export const updatePassword = async (req, res) => {
  try {
    const id = req.user._id
    const { currentPassword, newPassword, confirmPassword } = req.body

    const user = await User.findById(id).select('+password')
    if (!user) {
      return responseHelper.error(res, 'Người dùng không tồn tại', 404)
    }

    // Kiểm tra mật khẩu hiện tại
    const isMatch = await bcrypt.compare(currentPassword, user.password)
    if (!isMatch) {
      return responseHelper.error(res, 'Mật khẩu hiện tại không đúng', 400)
    }

    // Kiểm tra mật khẩu mới và confirm
    if (newPassword !== confirmPassword) {
      return responseHelper.error(res, 'Mật khẩu không khớp', 400)
    }

    // Validate password
    const passwordValidation = isValidPassword(newPassword)
    if (passwordValidation) {
      return responseHelper.error(res, passwordValidation, 400)
    }

    user.password = newPassword
    await user.save()

    responseHelper.success(res, 'Đổi mật khẩu thành công')
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const getStaffSummary = async (req, res) => {
  try {
    const { from, to } = req.query
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu tổ chức', 400)

    const fromDate = from
      ? new Date(`${from}T00:00:00+07:00`)
      : new Date(new Date().setHours(0, 0, 0, 0))

    const toDate = to
      ? new Date(`${to}T23:59:59.999+07:00`)
      : new Date(new Date().setHours(23, 59, 59, 999))

    const match = {
      organization: organizationId,
      status: { $in: ['completed'] },
      createdAt: { $gte: fromDate, $lte: toDate }
    }

    const data = await Order.aggregate([
      { $match: match },
      { $match: { updatedBy: { $ne: null } } },
      {
        $addFields: {
          updatedBy: {
            $cond: [
              { $eq: [{ $type: '$updatedBy' }, 'objectId'] },
              '$updatedBy',
              { $convert: { input: '$updatedBy', to: 'objectId', onError: null, onNull: null } }
            ]
          }
        }
      },
      {
        $group: {
          _id: '$updatedBy',
          totalOrders: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          totalDiscount: { $sum: '$discount' },
          totalExtraDiscount: { $sum: '$extraDiscount' },
          totalPointsDiscount: { $sum: { $ifNull: ['$pointsDiscount', 0] } },
          totalServiceCharge: { $sum: '$serviceCharge' },
          totalVat: { $sum: { $multiply: ['$totalPayable', { $divide: ['$vatRate', 100] }] } },
          totalRevenue: { $sum: '$total' },
          avgOrderValue: { $avg: '$total' },
          totalCustomers: { $addToSet: '$customerId' }
        }
      },
      { $match: { _id: { $ne: null } } },
      {
        $lookup: {
          from: 'Users',
          let: { staffId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$staffId'] } } },
            { $project: { username: 1, role: 1 } }
          ],
          as: 'staff'
        }
      },
      { $unwind: { path: '$staff', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          name: '$staff.username',
          role: '$staff.role',
          totalOrders: 1,
          totalAmount: 1,
          totalDiscount: 1,
          totalExtraDiscount: 1,
          totalServiceCharge: 1,
          totalVat: 1,
          netRevenue: {
            $subtract: [
              { $add: ['$totalAmount', '$totalServiceCharge'] },
              {
                $add: [
                  '$totalDiscount',
                  '$totalExtraDiscount',
                  { $ifNull: ['$totalPointsDiscount', 0] }
                ]
              }
            ]
          },
          totalDiscountAll: {
            $add: [
              '$totalDiscount',
              '$totalExtraDiscount',
              { $ifNull: ['$totalPointsDiscount', 0] }
            ]
          },
          totalRevenue: 1,
          avgOrderValue: { $round: ['$avgOrderValue', 0] },
          totalCustomers: {
            $size: {
              $filter: {
                input: '$totalCustomers',
                as: 'cust',
                cond: { $ne: ['$$cust', null] }
              }
            }
          }
        }
      },
      { $sort: { totalRevenue: -1 } }
    ])

    // Tổng hợp toàn hệ thống
    const totalSummary = data.reduce(
      (acc, s) => {
        acc.totalOrders += s.totalOrders
        acc.totalRevenue += s.totalRevenue
        acc.totalAmount += s.totalAmount
        return acc
      },
      { totalOrders: 0, totalRevenue: 0, totalAmount: 0 }
    )

    return responseHelper.success(res, {
      fromDate,
      toDate,
      totals: totalSummary,
      staffs: data
    })
  } catch (error) {
    console.error('Lỗi dashboard:', error)
    responseHelper.error(res, error.message)
  }
}
