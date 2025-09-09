import User from '../user/model.js'
import Organization from './model.js'
import withTransaction from '../../helpers/withTransaction.js'
import responseHelper from '../../helpers/responseHelper.js'
import validator from 'validator'
import {
  formatPhoneNumber,
  validatePhoneNumber,
  displayPhoneNumber,
  getPhoneType
} from '../../helpers/validator.js'
import { getPageData } from '../../helpers/pageDataHelper.js'

export const createOrganization = async (req, res) => {
  try {
    const {
      orgName,
      orgEmail,
      orgPhone,
      orgProvince,
      orgCommune,
      orgStreet,
      adminUsername,
      adminEmail,
      adminPassword
    } = req.body

    const cleanOrgEmail = orgEmail.trim().toLowerCase()
    const cleanAdminEmail = adminEmail.trim().toLowerCase()
    const cleanAdminUsername = adminUsername.trim()
    const cleanOrgName = orgName.trim()

    const result = await withTransaction(async (session) => {
      // Kiểm tra tổ chức trùng email hoặc phone
      const existingOrg = await Organization.findOne({
        $or: [{ email: cleanOrgEmail }, { phone: orgPhone }]
      }).session(session)

      if (existingOrg)
        throw new Error('Tổ chức với email hoặc số điện thoại này đã tồn tại.')

      const existingUserEmail = await User.findOne({
        email: cleanAdminEmail
      }).session(session)

      if (existingUserEmail)
        throw new Error('Email quản trị viên đã tồn tại trong hệ thống.')

      // Tạo organization
      const organization = new Organization({
        name: cleanOrgName,
        email: cleanOrgEmail,
        phone: orgPhone,
        province: orgProvince,
        commune: orgCommune,
        street: orgStreet
      })
      await organization.save({ session })

      // Lần đầu tạo user quản trị
      const adminUser = new User({
        username: cleanAdminUsername,
        email: cleanAdminEmail,
        password: adminPassword,
        role: 'Org',
        organization: organization._id
      })
      await adminUser.save({ session })

      return { organization, admin: adminUser }
    })

    const responseData = {
      organization: result.organization,
      admin: {
        id: result.admin._id,
        username: result.admin.username,
        email: result.admin.email,
        role: result.admin.role
      }
    }

    responseHelper.success(
      res,
      responseData,
      'Tổ chức và quản trị viên đã được tạo thành công'
    )
  } catch (error) {
    if (error.code === 11000) {
      if (error.keyPattern?.email) {
        return responseHelper.error(res, 'Email đã tồn tại', 400)
      }
      if (error.keyPattern?.username) {
        return responseHelper.error(
          res,
          'Tên đăng nhập đã tồn tại trong tổ chức',
          400
        )
      }
    }
    responseHelper.error(res, error.message)
  }
}

export const getActiveOrganizations = async (req, res) => {
  try {
    const organizations = await Organization.find({ isActive: true }).sort({
      createdAt: -1
    })

    responseHelper.success(
      res,
      organizations,
      'Lấy danh sách tổ chức thành công'
    )
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const getAllOrganizations = async (req, res) => {
  try {
    const draw = +req.query.draw || 0
    const start = +req.query.start || 0
    const length = +req.query.length || 10
    const searchValue = (req.query['search[value]'] || '').trim()
    const colIdx = req.query['order[0][column]']
    const sortField = req.query[`columns[${colIdx}][data]`] || 'createdAt'
    const sortDir = req.query['order[0][dir]'] === 'asc' ? 1 : -1

    // Build search filter
    const filter = {}
    if (searchValue) {
      filter.$or = [
        { name: { $regex: searchValue, $options: 'i' } },
        { email: { $regex: searchValue, $options: 'i' } },
        { phone: { $regex: searchValue, $options: 'i' } },
        { province: { $regex: searchValue, $options: 'i' } },
        { commune: { $regex: searchValue, $options: 'i' } },
        { street: { $regex: searchValue, $options: 'i' } }
      ]
    }

    // Tổng số bản ghi
    const recordsTotal = await Organization.countDocuments()

    // Tổng số bản ghi lọc
    const recordsFiltered = await Organization.countDocuments(filter)

    // Sort object
    const sortObj = {}
    sortObj[sortField] = sortDir

    // Lấy dữ liệu với paginate + sort
    const data = await Organization.find(filter)
      .sort(sortObj)
      .skip(start)
      .limit(length)
      .lean()

    const cleanData = data.map((row) => ({
      name: row.name || '',
      email: row.email || '',
      phone: row.phone || '',
      province: row.province || '',
      commune: row.commune || '',
      street: row.street || '',
      isActive: row.isActive ?? false,
      _id: row._id || null
    }))

    return res.json({
      draw,
      recordsTotal,
      recordsFiltered,
      data: cleanData
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

export const createOrg = async (req, res) => {
  try {
    const newOrg = new Organization(req.body)
    await newOrg.save()
    responseHelper.success(res, newOrg, 'Tạo tổ chức thành công')
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const updateOrg = async (req, res) => {
  try {
    const { id } = req.params
    const { name, email, phone, province, commune, street, isActive } = req.body

    if (!id) return responseHelper.error(res, 'Id không hợp lệ', 400)

    const organization = await Organization.findById(id)
    if (!organization)
      return responseHelper.error(res, 'Tổ chức không tồn tại', 404)

    // VALIDATE PHONE
    let processedPhone = phone
    if (phone !== undefined) {
      const phoneError = validatePhoneNumber(phone)
      if (phoneError) {
        return responseHelper.error(res, phoneError, 400)
      }
      // Format phone để lưu DB
      processedPhone = formatPhoneNumber(phone)
    }

    // Validate email
    if (email && !validator.isEmail(email)) {
      return responseHelper.error(res, 'Email không hợp lệ', 400)
    }

    const existing = await Organization.findOne({
      $or: [{ email }, { phone: processedPhone }],
      _id: { $ne: id }
    })

    if (existing)
      return responseHelper.error(
        res,
        'Tổ chức với email hoặc số điện thoại đã tồn tại',
        400
      )

    const data = {}
    if (name !== undefined) data.name = name
    if (email !== undefined) data.email = email
    if (phone !== undefined) data.phone = processedPhone
    if (province !== undefined) data.province = province
    if (commune !== undefined) data.commune = commune
    if (street !== undefined) data.street = street
    if (isActive !== undefined) data.isActive = isActive

    const updated = await Organization.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true
    })

    const responseData = {
      ...updated.toObject(),
      phoneDisplay: {
        local: updated.phone ? displayPhoneNumber(updated.phone, false) : null, // 0987 654 321
        international: updated.phone
          ? displayPhoneNumber(updated.phone, true)
          : null, // +84 987 654 321
        raw: `+${updated.phone}`, // 84987654321
        type: updated.phone ? getPhoneType(updated.phone) : null // mobile/landline
      }
    }
    responseHelper.success(res, responseData, 'Cập nhật tổ chức thành công')
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const deleteOrgs = async (req, res) => {
  try {
    const { ids } = req.body
    if (!Array.isArray(ids) || ids.length === 0) {
      return responseHelper.error('Không có tổ chức nào được chọn để xóa')
    }

    const result = await Organization.deleteMany({
      _id: { $in: ids }
    })

    responseHelper.success(res, result.deletedCount, 'Xóa tổ chức thành công')
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const getOrgDashboard = async (req, res) => {
  try {
    const { orgId } = req.params

    const organization = await Organization.findById(orgId)
    if (!organization) {
      responseHelper.error(res, 'Tổ chức không tồn tại', 404)
    }

    if (
      req.user.role === 'Admin' ||
      (req.user.role === 'Org' &&
        String(req.user.organization) === String(orgId))
    ) {
      return res.render(
        'users/org_dashboard',
        getPageData(req, `Dashboard - ${organization.name}`, 'Dashboard', {
          headerClass: 'admin__header',
          currentOrg: organization
        })
      )
    }

    return res.status(403).render('errors/permission', {
      message: 'Bạn không có quyền truy cập tổ chức này'
    })
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}
