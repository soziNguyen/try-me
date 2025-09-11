import User from '../user/model.js'
import bcrypt from 'bcryptjs'
import validator from 'validator'
import responseHelper from '../../helpers/responseHelper.js'
import {
  isValidUsername,
  isValidPassword,
  isPasswordMatch
} from '../../helpers/validator.js'
import { lookupRef } from '../../helpers/lookupHelper.js'
import ActivityLog from '../activity-logs/model.js'
import dayjs from 'dayjs'

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
    const pipeline = [...lookupRef('organization', 'Organizations')]

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
    const recordsTotal = await User.countDocuments()

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
    const { username, email, organization, password, confirmPassword } =
      req.body

    if (!username || !email || !password || !organization) {
      return responseHelper.error(res, 'Vui lòng điền đầy đủ thông tin', 400)
    }

    if (!validator.isEmail(email))
      return responseHelper.error(res, 'Email không hợp lệ', 400)

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
      return responseHelper.error(
        res,
        'Tên đăng nhập hoặc email đã tồn tại',
        400
      )
    }

    const newUser = new User({ username, email, password, organization })
    await newUser.save()
    responseHelper.success(res, newUser, 'Tạo người dùng thành công')
  } catch (error) {
    if (error.code === 11000) {
      return responseHelper.error(res, 'Username hoặc email đã tồn tại', 400)
    }
    responseHelper.error(res, error.message)
  }
}

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params
    const { username, email, organization, role, password, confirmPassword } =
      req.body

    if (!id) return responseHelper.error(res, 'Id người dùng không hợp lệ', 400)
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

    if (existingUser)
      return responseHelper.error(
        res,
        'Tên hoặc email người dùng đã tồn tại',
        400
      )

    const dataUpdates = {
      username,
      email,
      organization,
      role
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

    responseHelper.success(res, updated, 'Cập nhật người dùng thành công')
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const deleteUsers = async (req, res) => {
  try {
    const { ids } = req.body
    if (!Array.isArray(ids) || ids.length === 0) {
      return responseHelper.error(
        res,
        'Không có người dùng nào được chọn để xóa'
      )
    }
    const result = await User.deleteMany({ _id: { $in: ids } })
    if (result.deletedCount === 0) {
      return responseHelper.error(res, 'Không tìm thấy người dùng để xóa')
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

    const pipeline = [
      ...lookupRef('userId', 'Users', { as: 'user' }),
      ...lookupRef('organization', 'Organizations', { as: 'organizationInfo' })
    ]

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

    const recordsTotal = await ActivityLog.countDocuments()

    const countPipeline = [...pipeline, { $count: 'count' }]
    const countResult = await ActivityLog.aggregate(countPipeline)
    const recordsFiltered = countResult[0]?.count || 0

    const allowedSort = [
      'userName',
      'description',
      'createdAt',
      'organizationName'
    ]
    const sortObj = {}

    if (sortField === 'organizationName') {
      sortObj['organizationInfo.name'] = sortDir
    } else {
      sortObj[allowedSort.includes(sortField) ? sortField : 'createdAt'] =
        sortDir
    }

    // Sort, phân trang, projection
    pipeline.push(
      { $sort: sortObj },
      { $skip: start },
      { $limit: length },
      {
        $project: {
          _id: 0,
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
