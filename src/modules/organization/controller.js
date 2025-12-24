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
import { insertDummyDataForOrganization } from '../../data/service.js'
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
import { isValidCCCDFormat } from '../../helpers/common.js'
import Profile from '../profile/model.js'
import BillingWallet from '../billing-wallet/model.js'

export const createOrganization = async (req, res) => {
  try {
    const { accountType } = req.body

    if (!accountType || !['personal', 'enterprise'].includes(accountType)) {
      return responseHelper.error(res, 'Loại tài khoản không hợp lệ', 400)
    }

    let organizationData = {}
    let profileData = {}
    let adminData = {}

    // Lấy thông tin chung
    const { adminUsername, adminEmail, adminPassword, businessType } = req.body

    // Validate thông tin đăng nhập
    if (!adminUsername || !adminEmail || !adminPassword || !businessType) {
      return responseHelper.error(res, 'Vui lòng điền đầy đủ thông tin đăng nhập', 400)
    }

    // Validate admin username
    const usernameError = isValidUsername(adminUsername)
    if (usernameError) {
      return responseHelper.error(res, usernameError, 400)
    }

    // Validate admin password
    const passwordError = isValidPassword(adminPassword)
    if (passwordError) {
      return responseHelper.error(res, passwordError, 400)
    }

    // Validate admin email
    if (!validator.isEmail(adminEmail)) {
      return responseHelper.error(res, 'Email đăng nhập không hợp lệ', 400)
    }

    // Validate business type
    if (!['shop', 'food', 'drink'].includes(businessType.toLowerCase())) {
      return responseHelper.error(res, 'Loại hình kinh doanh không hợp lệ', 400)
    }

    if (accountType === 'personal') {
      // Personal Account
      const { name, cccd, email, phone, province, commune, street } = req.body

      // Validate required fields
      if (!name || !cccd || !email || !phone || !province || !commune) {
        return responseHelper.error(res, 'Vui lòng điền đầy đủ thông tin cá nhân', 400)
      }

      // Validate CCCD
      if (!isValidCCCDFormat(cccd)) {
        return responseHelper.error(
          res,
          'CCCD không hợp lệ (phải có 12 chữ số và mã tỉnh từ 001-096)',
          400
        )
      }

      // Validate email
      if (!validator.isEmail(email)) {
        return responseHelper.error(res, 'Email không hợp lệ', 400)
      }

      // Validate phone
      const phoneError = validatePhoneNumber(phone)
      if (phoneError) {
        return responseHelper.error(res, phoneError, 400)
      }

      // Chuẩn bị dữ liệu
      const cleanName = name.trim()
      const cleanCccd = cccd.trim()
      const cleanEmail = email.trim().toLowerCase()
      const processedPhone = formatPhoneNumber(phone)

      profileData = {
        fullName: cleanName,
        cccd: cleanCccd,
        email: cleanEmail,
        phone: processedPhone,
        province,
        commune,
        street: street?.trim() || ''
      }

      organizationData = {
        name: cleanName, // Tên tổ chức = Tên người đăng ký
        email: cleanEmail,
        phone: processedPhone,
        province,
        commune,
        street: street?.trim() || '',
        taxCode: cleanCccd, // Mã số thuế = CCCD
        businessType: businessType.toLowerCase(),
        isActive: false
      }

      adminData = {
        username: adminUsername.trim(),
        email: adminEmail.trim().toLowerCase(),
        password: adminPassword
      }
    } else if (accountType === 'enterprise') {
      // Enterprise Account
      const {
        taxCode,
        orgName,
        orgEmail,
        orgPhone,
        orgProvince,
        orgCommune,
        orgStreet,
        repName,
        repCccd,
        repEmail,
        repPhone,
        repProvince,
        repCommune,
        repStreet
      } = req.body

      // Validate required fields - Tổ chức
      if (!taxCode || !orgName || !orgEmail || !orgPhone || !orgProvince || !orgCommune) {
        return responseHelper.error(res, 'Vui lòng điền đầy đủ thông tin tổ chức', 400)
      }

      // Validate required fields - Người đại diện
      if (!repName || !repCccd || !repEmail || !repPhone || !repProvince || !repCommune) {
        return responseHelper.error(res, 'Vui lòng điền đầy đủ thông tin người đại diện', 400)
      }

      // Validate CCCD người đại diện
      if (!isValidCCCDFormat(repCccd)) {
        return responseHelper.error(
          res,
          'CCCD người đại diện không hợp lệ (phải có 12 chữ số và mã tỉnh từ 001-096)',
          400
        )
      }

      // Validate tax code if provided
      if (taxCode && !validateTaxCode(taxCode)) {
        return responseHelper.error(res, 'Mã số thuế không hợp lệ (10-13 chữ số)', 400)
      }

      // Validate emails
      if (!validator.isEmail(orgEmail)) {
        return responseHelper.error(res, 'Email tổ chức không hợp lệ', 400)
      }
      if (!validator.isEmail(repEmail)) {
        return responseHelper.error(res, 'Email người đại diện không hợp lệ', 400)
      }

      // Validate phone numbers
      const orgPhoneError = validatePhoneNumber(orgPhone)
      if (orgPhoneError) {
        return responseHelper.error(res, `Số điện thoại tổ chức: ${orgPhoneError}`, 400)
      }

      const repPhoneError = validatePhoneNumber(repPhone)
      if (repPhoneError) {
        return responseHelper.error(res, `Số điện thoại người đại diện: ${repPhoneError}`, 400)
      }

      // Chuẩn bị dữ liệu
      const cleanOrgName = orgName.trim()
      const cleanOrgEmail = orgEmail.trim().toLowerCase()
      const processedOrgPhone = formatPhoneNumber(orgPhone)
      const cleanTaxCode = taxCode?.trim()

      const cleanRepName = repName.trim()
      const cleanRepCccd = repCccd.trim()
      const cleanRepEmail = repEmail.trim().toLowerCase()
      const processedRepPhone = formatPhoneNumber(repPhone)

      profileData = {
        fullName: cleanRepName,
        cccd: cleanRepCccd,
        email: cleanRepEmail,
        phone: processedRepPhone,
        province: repProvince,
        commune: repCommune,
        street: repStreet?.trim() || ''
      }

      organizationData = {
        name: cleanOrgName,
        email: cleanOrgEmail,
        phone: processedOrgPhone,
        province: orgProvince,
        commune: orgCommune,
        street: orgStreet?.trim() || '',
        businessType: businessType.toLowerCase(),
        isActive: false
      }

      if (cleanTaxCode) {
        organizationData.taxCode = cleanTaxCode
      }

      adminData = {
        username: adminUsername.trim(),
        email: adminEmail.trim().toLowerCase(),
        password: adminPassword
      }
    }

    organizationData.accountType = accountType

    // Thực hiện transaction
    const result = await withTransaction(async (session) => {
      // Build duplicate check conditions
      const duplicateConditions = [
        { email: organizationData.email },
        { phone: organizationData.phone }
      ]
      if (organizationData.taxCode) {
        duplicateConditions.push({ taxCode: organizationData.taxCode })
      }

      // Check for existing organization
      const existingOrg = await Organization.findOne({
        $or: duplicateConditions
      }).session(session)

      if (existingOrg) {
        if (existingOrg.email === organizationData.email) {
          throw new BusinessError('Email tổ chức đã tồn tại', 400)
        }
        if (existingOrg.phone === organizationData.phone) {
          throw new BusinessError('Số điện thoại tổ chức đã tồn tại', 400)
        }
        if (organizationData.taxCode && existingOrg.taxCode === organizationData.taxCode) {
          throw new BusinessError('Mã số thuế đã tồn tại', 400)
        }
      }

      // Check admin email
      const existingUserEmail = await User.findOne({
        email: adminData.email
      }).session(session)

      if (existingUserEmail) {
        throw new BusinessError('Email đăng nhập đã tồn tại trong hệ thống', 400)
      }

      // Check admin username (globally unique)
      const existingUsername = await User.findOne({
        username: adminData.username
      }).session(session)

      if (existingUsername) {
        throw new BusinessError('Tên đăng nhập đã tồn tại', 400)
      }

      // Get free plan
      const freePlan = await Plan.findOne({ code: 'FREE' }).session(session)

      // Create profile
      const profile = new Profile(profileData)
      await profile.save({ session })

      // Create organization with profile reference
      organizationData.profile = profile._id
      organizationData.plan = freePlan ? freePlan._id : null

      const organization = new Organization(organizationData)
      await organization.save({ session })

      // Create wallet cho organization
      const wallet = new BillingWallet({
        organization: organization._id,
        balance: 0,
        currency: 'VND',
        isActive: true
      })
      await wallet.save({ session })

      // Create admin user
      const adminUser = new User({
        username: adminData.username,
        email: adminData.email,
        password: adminData.password, // Will be hashed by pre-save hook
        role: 'Org',
        organization: organization._id
      })
      await adminUser.save({ session })

      // Insert dummy data
      await insertDummyDataForOrganization(session, organization._id, organizationData.businessType)

      return { organization, profile, admin: adminUser }
    })

    const responseData = {
      accountType,
      organization: {
        ...result.organization.toObject(),
        phoneDisplay: {
          local: displayPhoneNumber(result.organization.phone, false),
          international: displayPhoneNumber(result.organization.phone, true),
          raw: `+${result.organization.phone}`,
          type: getPhoneType(result.organization.phone)
        }
      },
      profile: result.profile.toObject(),
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
      accountType === 'personal'
        ? 'Tài khoản cá nhân đã được tạo thành công'
        : 'Tài khoản doanh nghiệp đã được tạo thành công'
    )
  } catch (error) {
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
      .populate('profile')
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
      // Organization fields
      logo,
      name,
      email,
      phone,
      plan,
      businessType,
      province,
      commune,
      defaultWarehouse,
      street,
      isActive,
      taxCode,
      // Profile fields
      profile
    } = req.body

    if (!id) return responseHelper.error(res, 'Id không hợp lệ', 400)

    const organization = await Organization.findById(id)
      .populate('plan', 'name')
      .populate('profile')

    if (!organization) return responseHelper.error(res, 'Tổ chức không tồn tại', 404)

    const oldOrg = organization.toObject()

    // VALIDATE PHONE (Organization)
    let processedPhone = phone
    if (phone !== undefined && phone.trim()) {
      const phoneError = validatePhoneNumber(phone)
      if (phoneError) return responseHelper.error(res, phoneError, 400)
      processedPhone = formatPhoneNumber(phone)
    }

    // Validate email (Organization)
    if (email !== undefined && email.trim() && !validator.isEmail(email.trim())) {
      return responseHelper.error(res, 'Email không hợp lệ', 400)
    }

    // Validate tax code
    if (taxCode !== undefined && taxCode.trim() && !validateTaxCode(taxCode.trim())) {
      return responseHelper.error(res, 'Mã số thuế không hợp lệ (10-13 chữ số)', 400)
    }

    // Validate BussinessType
    if (req.user.role === 'Admin') {
      if (businessType && !['shop', 'food', 'drink'].includes(businessType)) {
        return responseHelper.error(res, 'Loại hình tổ chức không hợp lệ', 400)
      }
    }

    // Check trùng email/phone/taxCode (Organization)
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

    // HANDLE PROFILE UPDATE (for both personal and enterprise)
    let profileId = organization.profile
    let processedProfilePhone = null
    let profileDataToSync = {}
    let currentProfile = null

    if (profileId) {
      currentProfile = await Profile.findById(profileId).select('verificationStatus')
    }

    if (currentProfile?.verificationStatus === 'verified' && req.user.role !== 'Admin') {
      // Allowed fields
      const allowedProfileFields = ['email', 'phone', 'defaultWarehouse']

      // Check profile update
      const hasForbiddenProfile =
        profile && Object.keys(profile).some((key) => !allowedProfileFields.includes(key))

      // Check organization update
      const hasForbiddenOrg =
        logo !== undefined ||
        name !== undefined ||
        plan !== undefined ||
        businessType !== undefined ||
        province !== undefined ||
        commune !== undefined ||
        street !== undefined ||
        isActive !== undefined ||
        taxCode !== undefined

      if (hasForbiddenProfile || hasForbiddenOrg) {
        return responseHelper.error(
          res,
          'Tài khoản đã được xác minh. Bạn chỉ được cập nhật Email hoặc Số điện thoại',
          403
        )
      }
    }

    if (profile) {
      // Validate profile phone
      if (profile.phone !== undefined && profile.phone.trim()) {
        const phoneError = validatePhoneNumber(profile.phone)
        if (phoneError) return responseHelper.error(res, `Profile: ${phoneError}`, 400)
        processedProfilePhone = formatPhoneNumber(profile.phone)
      }

      // Validate profile email
      if (
        profile.email !== undefined &&
        profile.email.trim() &&
        !validator.isEmail(profile.email.trim())
      ) {
        return responseHelper.error(res, 'Profile: Email không hợp lệ', 400)
      }

      if (profile.cccd !== undefined && profile.cccd.trim()) {
        if (!isValidCCCDFormat(profile.cccd)) {
          return responseHelper.error(res, 'Profile: CCCD không hợp lệ', 400)
        }
      }

      const profileData = {}
      if (profile.fullName !== undefined && profile.fullName.trim()) {
        profileData.fullName = profile.fullName.trim()
      }
      if (profile.cccd !== undefined) profileData.cccd = profile.cccd.trim()
      if (profile.phone !== undefined) profileData.phone = processedProfilePhone
      if (profile.email !== undefined && profile.email.trim()) {
        profileData.email = profile.email.trim().toLowerCase()
      }
      if (profile.province !== undefined) profileData.province = profile.province
      if (profile.commune !== undefined) profileData.commune = profile.commune
      if (profile.street !== undefined) profileData.street = profile.street
      if (profile.verificationNote !== undefined) {
        profileData.verificationNote = profile.verificationNote.trim()
      }

      // Handle CCCD images
      if (profile.cccdImages) {
        if (!profileData.cccdImages) profileData.cccdImages = {}
        if (profile.cccdImages.front !== undefined) {
          profileData['cccdImages.front'] = profile.cccdImages.front
        }
        if (profile.cccdImages.back !== undefined) {
          profileData['cccdImages.back'] = profile.cccdImages.back
        }
      }

      // Update or create profile
      if (profileId) {
        // Update existing profile
        const oldProfile = organization.profile?.toObject()

        await Profile.findByIdAndUpdate(profileId, profileData, {
          new: true,
          runValidators: true
        })

        // Delete old CCCD images if new ones are uploaded
        if (oldProfile?.cccdImages) {
          if (
            profile.cccdImages?.front &&
            oldProfile.cccdImages.front &&
            oldProfile.cccdImages.front !== profile.cccdImages.front
          ) {
            try {
              await deleteFile(oldProfile.cccdImages.front)
            } catch (err) {
              console.error('Không xóa được ảnh CCCD mặt trước cũ:', err)
            }
          }
          if (
            profile.cccdImages?.back &&
            oldProfile.cccdImages.back &&
            oldProfile.cccdImages.back !== profile.cccdImages.back
          ) {
            try {
              await deleteFile(oldProfile.cccdImages.back)
            } catch (err) {
              console.error('Không xóa được ảnh CCCD mặt sau cũ:', err)
            }
          }
        }
      } else {
        // Create new profile
        const newProfile = await Profile.create(profileData)
        profileId = newProfile._id
      }

      // Prepare sync data for personal accounts
      if (organization.accountType === 'personal') {
        if (profile.fullName !== undefined) profileDataToSync.name = profile.fullName.trim()
        if (profile.cccd !== undefined) profileDataToSync.taxCode = profile.cccd.trim()
        if (profile.phone !== undefined) profileDataToSync.phone = processedProfilePhone
        if (profile.email !== undefined && profile.email.trim()) {
          profileDataToSync.email = profile.email.trim().toLowerCase()
        }
        if (profile.province !== undefined) profileDataToSync.province = profile.province
        if (profile.commune !== undefined) profileDataToSync.commune = profile.commune
        if (profile.street !== undefined) profileDataToSync.street = profile.street
      }
    }

    // CHUẨN BỊ DATA UPDATE (Organization)
    const data = {}
    if (logo !== undefined) data.logo = logo

    // Merge profile sync data for personal accounts (takes priority)
    if (Object.keys(profileDataToSync).length > 0) {
      Object.assign(data, profileDataToSync)
    }

    // Organization data (will be overridden by profileDataToSync if exists)
    if (name !== undefined && name.trim() && !profileDataToSync.name) {
      data.name = name.trim()
    }
    if (email !== undefined && email.trim() && !profileDataToSync.email) {
      data.email = email.trim().toLowerCase()
    }
    if (phone !== undefined && !profileDataToSync.phone) data.phone = processedPhone
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
    if (businessType !== undefined) data.businessType = businessType
    if (province !== undefined && !profileDataToSync.province) data.province = province
    if (commune !== undefined && !profileDataToSync.commune) data.commune = commune
    if (street !== undefined && !profileDataToSync.street) data.street = street
    if (defaultWarehouse !== undefined)
      data.defaultWarehouse = defaultWarehouse === '' ? null : defaultWarehouse
    if (isActive !== undefined) data.isActive = isActive
    if (taxCode !== undefined && !profileDataToSync.taxCode) {
      data.taxCode = taxCode?.trim() || null
    }
    if (profileId) data.profile = profileId

    const oldLogo = organization.logo

    const updated = await Organization.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true
    })
      .populate('plan', 'name')
      .populate('profile')

    if (!updated) {
      return responseHelper.error(res, 'Không thể cập nhật tổ chức', 400)
    }

    if (updated.accountType === 'personal' && updated.profile) {
      const orgToProfileSync = {}

      if (name !== undefined && name.trim() && !profileDataToSync.name) {
        orgToProfileSync.fullName = updated.name
      }
      if (taxCode !== undefined && !profileDataToSync.taxCode) {
        const cccdValue = updated.taxCode || ''
        // Validate CCCD format nếu có giá trị
        if (cccdValue && !isValidCCCDFormat(cccdValue)) {
          return responseHelper.error(
            res,
            'CCCD không hợp lệ (phải có 12 chữ số và mã tỉnh từ 001-096)',
            400
          )
        } else {
          orgToProfileSync.cccd = cccdValue
        }
      }
      if (email !== undefined && email.trim() && !profileDataToSync.email) {
        orgToProfileSync.email = updated.email
      }
      if (phone !== undefined && !profileDataToSync.phone) {
        orgToProfileSync.phone = updated.phone
      }
      if (province !== undefined && !profileDataToSync.province) {
        orgToProfileSync.province = updated.province
      }
      if (commune !== undefined && !profileDataToSync.commune) {
        orgToProfileSync.commune = updated.commune
      }
      if (street !== undefined && !profileDataToSync.street) {
        orgToProfileSync.street = updated.street
      }

      if (Object.keys(orgToProfileSync).length > 0) {
        await Profile.findByIdAndUpdate(updated.profile._id, orgToProfileSync)
      }
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
      req.user.role === 'SubAdmin' ||
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
