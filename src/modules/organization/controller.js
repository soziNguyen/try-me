import mongoose from 'mongoose'
import User from '../user/model.js'
import Organization from './model.js'
import Plan from '../plan/model.js'
import { deleteFile } from '../upload/helper.js'
import withTransaction from '../../helpers/withTransaction.js'
import responseHelper from '../../helpers/responseHelper.js'
import BusinessError from '../../modules/error/BusinessError.js'
import { getCurrentOrg } from '../../helpers/orgHelper.js'
import validator from 'validator'
import {
  isValidUsername,
  isValidPassword,
  formatPhoneNumber,
  validatePhoneNumber,
  displayPhoneNumber,
  getPhoneType,
  validateTaxCode
} from '../../helpers/validator.js'
import { getPageData } from '../../helpers/pageDataHelper.js'
import { logActivity } from '../activity-logs/service.js'
import { buildChangeLog } from '../../helpers/changeLog.js'
import { getProvinceName, getCommuneName } from '../../helpers/address.js'

export const createOrganization = async (req, res) => {
  try {
    const {
      taxCode,
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
    const accountType = (req.body.accountType || '').toLowerCase()

    if (
      !orgName ||
      !orgEmail ||
      !orgPhone ||
      !adminUsername ||
      !adminEmail ||
      !adminPassword ||
      !accountType
    ) {
      return responseHelper.error(res, 'Vui lòng điền đầy đủ thông tin bắt buộc', 400)
    }

    // Validate admin username
    const usernameError = isValidUsername(adminUsername)
    if (usernameError) {
      return responseHelper.error(res, `${usernameError}`, 400)
    }

    // Validate admin password
    const passwordError = isValidPassword(adminPassword)
    if (passwordError) {
      return responseHelper.error(res, `${passwordError}`, 400)
    }

    // Validate emails
    if (!validator.isEmail(orgEmail)) {
      return responseHelper.error(res, 'Email tổ chức không hợp lệ', 400)
    }
    if (!validator.isEmail(adminEmail)) {
      return responseHelper.error(res, 'Email quản trị viên không hợp lệ', 400)
    }

    // Validate phone number
    const phoneError = validatePhoneNumber(orgPhone)
    if (phoneError) {
      return responseHelper.error(res, phoneError, 400)
    }

    // Validate tax code if provided
    if (taxCode && !validateTaxCode(taxCode)) {
      return responseHelper.error(res, 'Mã số thuế không hợp lệ (10-13 chữ số)', 400)
    }

    if (!['shop', 'food', 'drink'].includes(accountType)) {
      return responseHelper.error(res, 'Loại hình kinh doanh không hợp lệ', 400)
    }

    // Process data
    const cleanOrgEmail = orgEmail.trim().toLowerCase()
    const cleanAdminEmail = adminEmail.trim().toLowerCase()
    const cleanAdminUsername = adminUsername.trim()
    const cleanOrgName = orgName.trim()
    const cleanTaxCode = taxCode?.trim()
    const processedPhone = formatPhoneNumber(orgPhone)

    const result = await withTransaction(async (session) => {
      // Build duplicate check conditions
      const duplicateConditions = [{ email: cleanOrgEmail }, { phone: processedPhone }]
      if (cleanTaxCode) {
        duplicateConditions.push({ taxCode: cleanTaxCode })
      }

      // Check for existing organization
      const existingOrg = await Organization.findOne({
        $or: duplicateConditions
      }).session(session)

      if (existingOrg) {
        if (existingOrg.email === cleanOrgEmail) {
          throw new BusinessError('Email tổ chức đã tồn tại', 400)
        }
        if (existingOrg.phone === processedPhone) {
          throw new BusinessError('Số điện thoại đã tồn tại', 400)
        }
        if (existingOrg.taxCode === cleanTaxCode) {
          throw new BusinessError('Mã số thuế đã tồn tại', 400)
        }
      }

      // Check admin email
      const existingUserEmail = await User.findOne({
        email: cleanAdminEmail
      }).session(session)

      if (existingUserEmail) {
        throw new BusinessError('Email quản trị viên đã tồn tại trong hệ thống', 400)
      }

      // Check admin username (globally unique)
      const existingUsername = await User.findOne({
        username: cleanAdminUsername
      }).session(session)

      if (existingUsername) {
        throw new BusinessError('Tên đăng nhập quản trị viên đã tồn tại', 400)
      }

      const freePlan = await Plan.findOne({ code: 'FREE' }).session(session)

      // Create organization
      const orgData = {
        name: cleanOrgName,
        email: cleanOrgEmail,
        phone: processedPhone, // Always 84xxxxxxxx format
        province: orgProvince,
        commune: orgCommune,
        street: orgStreet,
        businessType: accountType,
        plan: freePlan ? freePlan._id : null
      }
      if (cleanTaxCode) {
        orgData.taxCode = cleanTaxCode
      }

      const organization = new Organization(orgData)
      await organization.save({ session })

      // Create admin user
      const adminUser = new User({
        username: cleanAdminUsername,
        email: cleanAdminEmail,
        password: adminPassword, // Will be hashed by pre-save hook
        role: 'Org',
        organization: organization._id
      })
      await adminUser.save({ session })

      return { organization, admin: adminUser }
    })

    const responseData = {
      organization: {
        ...result.organization.toObject(),
        phoneDisplay: {
          local: displayPhoneNumber(result.organization.phone, false),
          international: displayPhoneNumber(result.organization.phone, true),
          raw: `+${result.organization.phone}`,
          type: getPhoneType(result.organization.phone)
        }
      },
      admin: {
        id: result.admin._id,
        username: result.admin.username,
        email: result.admin.email,
        role: result.admin.role
      }
    }

    responseHelper.success(res, responseData, 'Tổ chức và quản trị viên đã được tạo thành công')
  } catch (error) {
    console.error('Create organization error:', error)

    if (error.code === 11000) {
      if (error.keyPattern?.email) {
        return responseHelper.error(res, 'Email đã tồn tại', 400)
      }
      if (error.keyPattern?.username) {
        return responseHelper.error(res, 'Tên đăng nhập đã tồn tại', 400)
      }
      if (error.keyPattern?.phone) {
        return responseHelper.error(res, 'Số điện thoại đã tồn tại', 400)
      }
      if (error.keyPattern?.taxCode) {
        return responseHelper.error(res, 'Mã số thuế đã tồn tại', 400)
      }
    }

    responseHelper.error(res, error.message, 400)
  }
}

export const getActiveOrganizations = async (req, res) => {
  try {
    const organizations = await Organization.find({ isActive: true }).sort({
      createdAt: -1
    })

    responseHelper.success(res, organizations, 'Lấy danh sách tổ chức thành công')
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const getCurrentOrganization = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    const org = await Organization.findById(organizationId)
      .populate('plan', 'code name') // chỉ lấy code, name của Plan
      .lean()

    responseHelper.success(res, org, 'Success')
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const getOrgById = async (req, res) => {
  try {
    const { id } = req.params
    if (!id) return responseHelper.error(res, 'Id tổ chức không hợp lệ', 400)

    const org = await Organization.findById(id)
      .populate('defaultWarehouse', '_id name location')
      .populate('plan', '_id code name')
    if (!org) return responseHelper.error(res, 'Tổ chức không tồn tại', 404)

    const responseData = {
      ...org.toObject(),
      phoneDisplay: {
        local: org.phone ? displayPhoneNumber(org.phone, false) : null,
        international: org.phone ? displayPhoneNumber(org.phone, true) : null,
        raw: org.phone ? `+${org.phone}` : null,
        type: org.phone ? getPhoneType(org.phone) : null
      }
    }

    responseHelper.success(res, responseData, 'Lấy thông tin tổ chức thành công')
  } catch (err) {
    responseHelper.error(res, err.message)
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
      .populate('plan', '_id code name')

    const cleanData = data.map((row) => ({
      _id: row._id || null,
      name: row.name || '',
      email: row.email || '',
      plan: row.plan?.name || '',
      phone: row.phone || '',
      province: row.province || '',
      commune: row.commune || '',
      street: row.street || '',
      isActive: row.isActive ?? false
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

    logActivity(
      null,
      req.user?._id || null,
      req.user?.username || null,
      'CREATE',
      'ORGANIZATION',
      'Thêm mới tổ chức'
    )

    responseHelper.success(res, newOrg, 'Tạo tổ chức thành công')
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const updateOrg = async (req, res) => {
  try {
    const { id } = req.params
    const {
      logo,
      name,
      email,
      phone,
      plan,
      province,
      commune,
      defaultWarehouse,
      street,
      isActive,
      taxCode
    } = req.body

    if (!id) return responseHelper.error(res, 'Id không hợp lệ', 400)

    const organization = await Organization.findById(id).populate('plan', 'name')
    if (!organization) return responseHelper.error(res, 'Tổ chức không tồn tại', 404)

    const oldOrg = organization.toObject()

    // VALIDATE PHONE ...
    let processedPhone = phone
    if (phone !== undefined && phone.trim()) {
      const phoneError = validatePhoneNumber(phone)
      if (phoneError) return responseHelper.error(res, phoneError, 400)
      processedPhone = formatPhoneNumber(phone)
    }

    // Validate email
    if (email !== undefined && email.trim() && !validator.isEmail(email.trim())) {
      return responseHelper.error(res, 'Email không hợp lệ', 400)
    }

    // Validate tax code
    if (taxCode !== undefined && taxCode.trim() && !validateTaxCode(taxCode.trim())) {
      return responseHelper.error(res, 'Mã số thuế không hợp lệ (10-13 chữ số)', 400)
    }

    // Check trùng email/phone/taxCode...
    const conditions = []
    if (email !== undefined && email.trim()) {
      conditions.push({ email: email.trim().toLowerCase() })
    }
    if (processedPhone) {
      conditions.push({ phone: processedPhone })
    }
    if (taxCode !== undefined && taxCode.trim()) {
      conditions.push({ taxCode: taxCode.trim() })
    }

    if (conditions.length > 0) {
      const existing = await Organization.findOne({
        $or: conditions,
        _id: { $ne: id }
      })

      if (existing) {
        if (existing.email === email?.trim().toLowerCase()) {
          return responseHelper.error(res, 'Email đã tồn tại trong tổ chức khác', 400)
        }
        if (existing.phone === processedPhone) {
          return responseHelper.error(res, 'Số điện thoại đã tồn tại trong tổ chức khác', 400)
        }
        if (existing.taxCode === taxCode?.trim()) {
          return responseHelper.error(res, 'Mã số thuế đã tồn tại trong tổ chức khác', 400)
        }
      }
    }

    // CHUẨN BỊ DATA UPDATE
    const data = {}
    if (logo !== undefined) data.logo = logo
    if (name !== undefined && name.trim()) data.name = name.trim()
    if (email !== undefined && email.trim()) data.email = email.trim().toLowerCase()
    if (phone !== undefined) data.phone = processedPhone
    if (plan !== undefined) {
      if (!plan) {
        data.plan = null
      } else if (!mongoose.isValidObjectId(plan)) {
        return responseHelper.error(res, 'Gói dịch vụ không hợp lệ', 400)
      } else {
        const planExists = await Plan.findById(plan)
        if (!planExists)
          return responseHelper.error(res, 'Gói dịch vụ không tồn tại trên hệ thống', 404)
        data.plan = plan
      }
    }

    if (province !== undefined) data.province = province
    if (commune !== undefined) data.commune = commune
    if (street !== undefined) data.street = street
    if (defaultWarehouse !== undefined)
      data.defaultWarehouse = defaultWarehouse === '' ? null : defaultWarehouse
    if (isActive !== undefined) data.isActive = isActive
    if (taxCode !== undefined) data.taxCode = taxCode?.trim() || null

    const oldLogo = organization.logo

    const updated = await Organization.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true
    }).populate('plan', 'name')

    if (!updated) {
      return responseHelper.error(res, 'Không thể cập nhật tổ chức', 400)
    }

    // XÓA FILE LOGO CŨ
    if (logo && oldLogo && oldLogo !== logo) {
      try {
        await deleteFile(oldLogo)
      } catch (err) {
        console.error('Không xóa được logo cũ:', err)
      }
    }

    // BUILD CHANGE LOG
    const changeLog = buildChangeLog(
      oldOrg,
      updated.toObject(),
      [
        {
          field: 'province',
          label: 'Tỉnh/Thành',
          formatValue: (id) => getProvinceName(id)
        },
        {
          field: 'commune',
          label: 'Phường/Xã',
          formatValue: (id, obj) => getCommuneName(obj.province, id)
        },
        { field: 'name', label: 'Tên' },
        { field: 'email', label: 'Email' },
        { field: 'phone', label: 'Số điện thoại' },
        {
          field: 'plan',
          label: 'Gói dịch vụ',
          formatValue: (plan) => {
            if (!plan) return ''
            return plan.name || ''
          }
        },
        { field: 'street', label: 'Địa chỉ' },
        { field: 'isActive', label: 'Trạng thái' },
        { field: 'taxCode', label: 'Mã số thuế' },
        { field: 'logo', label: 'Logo' }
      ],
      updated.name,
      'Tổ chức'
    )

    if (changeLog) {
      logActivity(
        updated._id,
        req.user?._id,
        req.user?.username,
        'UPDATE',
        'ORGANIZATION',
        changeLog,
        updated.name
      )
    }

    // RESPONSE
    const responseData = {
      ...updated.toObject(),
      phoneDisplay: updated.phone
        ? {
            local: displayPhoneNumber(updated.phone, false),
            international: displayPhoneNumber(updated.phone, true),
            raw: `+${updated.phone}`,
            type: getPhoneType(updated.phone)
          }
        : null
    }

    responseHelper.success(res, responseData, 'Cập nhật thành công')
  } catch (error) {
    console.error('Update organization error:', error)

    if (error.code === 11000) {
      if (error.keyPattern?.email) {
        return responseHelper.error(res, 'Email đã tồn tại', 400)
      }
      if (error.keyPattern?.phone) {
        return responseHelper.error(res, 'Số điện thoại đã tồn tại', 400)
      }
      if (error.keyPattern?.taxCode) {
        return responseHelper.error(res, 'Mã số thuế đã tồn tại', 400)
      }
    }

    responseHelper.error(res, error.message, 400)
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

    logActivity(
      null,
      req.user?._id || null,
      req.user?.username || null,
      'DELETE',
      'ORGANIZATION',
      `Đã xóa ${result.deletedCount} tổ chức`
    )

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
      (req.user.role === 'Org' && String(req.user.organization) === String(orgId))
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
