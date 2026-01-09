import Profile from './model.js'
import Organization from '../organization/model.js'
import { deleteFile } from '../upload/helper.js'
import responseHelper from '../../helpers/responseHelper.js'
import { logActivity } from '../activity-logs/service.js'
import { getCurrentOrg } from '../../helpers/orgHelper.js'

export const updateCCCD = async (req, res) => {
  try {
    const { side, url } = req.body
    const orgId = getCurrentOrg(req)

    if (!['front', 'back'].includes(side)) {
      return responseHelper.error(res, 'Side không hợp lệ', 400)
    }
    if (!url) {
      return responseHelper.error(res, 'Thiếu ảnh CCCD', 400)
    }

    const org = await Organization.findById(orgId).select('profile')

    if (!org || !org.profile) {
      return responseHelper.error(res, 'Tổ chức chưa có hồ sơ cá nhân', 404)
    }

    const profile = await Profile.findById(org.profile)
    if (!profile) {
      return responseHelper.error(res, 'Profile không tồn tại', 404)
    }

    // XÓA FILE CŨ
    const oldFile = profile.cccdImages?.[side]
    if (oldFile && oldFile !== url) {
      try {
        await deleteFile(oldFile)
      } catch (err) {
        console.error('Không xóa được ảnh CCCD cũ:', err)
      }
    }

    profile.cccdImages[side] = url
    profile.verificationStatus = 'pending'
    profile.verifiedAt = null
    profile.verificationNote = ''

    await profile.save()

    responseHelper.success(res, profile, 'Cập nhật CCCD thành công')
  } catch (err) {
    console.error(err)
    responseHelper.error(res, err.message, 500)
  }
}

export const verifyProfile = async (req, res) => {
  try {
    const { id } = req.params
    const { verificationStatus } = req.body

    const validStatuses = ['pending', 'verified', 'rejected']
    if (!validStatuses.includes(verificationStatus)) {
      return responseHelper.error(res, 'Trạng thái không hợp lệ', 400)
    }

    const org = await Organization.findById(id).populate('profile')
    if (!org) {
      return responseHelper.error(res, 'Tổ chức không tồn tại', 404)
    }

    const profile = org.profile

    if (!profile) {
      return responseHelper.error(res, 'Profile không tồn tại', 404)
    }

    if (profile.verificationStatus === 'verified' && req.user.role !== 'Admin') {
      return responseHelper.error(res, 'Profile đã được xác minh', 400)
    }

    const oldStatus = profile.verificationStatus
    const oldImages = profile.cccdImages
      ? { front: profile.cccdImages.front, back: profile.cccdImages.back }
      : null

    profile.verificationStatus = verificationStatus
    profile.kycRequest = false

    const filesToDelete = []

    if (verificationStatus === 'verified') {
      profile.verifiedAt = new Date()
      profile.verifiedBy = req.user._id
      profile.rejectedAt = null
      profile.rejectedBy = null
      profile.verificationNote = ''
      org.isActive = true

      if (oldImages?.front) filesToDelete.push(oldImages.front)
      if (oldImages?.back) filesToDelete.push(oldImages.back)

      profile.cccdImages = { front: null, back: null }
    } else if (verificationStatus === 'rejected') {
      profile.rejectedAt = new Date()
      profile.rejectedBy = req.user._id
      profile.verifiedAt = null
      profile.verifiedBy = null
    } else if (verificationStatus === 'pending') {
      profile.verifiedAt = null
      profile.verifiedBy = null
      profile.rejectedAt = null
      profile.rejectedBy = null
      profile.verificationNote = ''
    }

    await profile.save()
    await org.save()

    for (const filePath of filesToDelete) {
      try {
        await deleteFile(filePath)
      } catch (err) {
        console.error(`Không xóa được file ${filePath}:`, err)
      }
    }

    logActivity(
      null,
      req.user._id,
      req.user.username,
      'UPDATE_STATUS',
      'PROFILE',
      `Đổi trạng thái từ "${oldStatus}" sang "${verificationStatus}"`
    )

    responseHelper.success(res, profile, 'Xác minh thành công')
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const kycRequestAgain = async (req, res) => {
  try {
    const orgId = getCurrentOrg(req)
    const org = await Organization.findById(orgId).populate('profile', 'kycRequest')

    const profile = org.profile
    if (!profile) return responseHelper.error(res, 'Profile không tồn tại', 404)

    if (profile.kycRequest) {
      return responseHelper.error(res, 'Bạn đã gửi yêu cầu KYC. Vui lòng chờ admin xác nhận.', 400)
    }

    profile.kycRequest = true
    profile.kycRequestedAt = new Date()
    await profile.save()

    responseHelper.success(res, 'Yêu cầu KYC đã được gửi thành công')
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const kycRequest = async (req, res) => {
  try {
    const orgId = getCurrentOrg(req)

    const org = await Organization.findById(orgId).populate('profile')
    if (!org || !org.profile) {
      return responseHelper.error(res, 'Profile không tồn tại', 404)
    }

    const profile = org.profile

    if (profile.kycRequest && profile.verificationStatus === 'pending') {
      return responseHelper.error(
        res,
        'Yêu cầu KYC đang được xử lý. Vui lòng chờ admin xác nhận.',
        400
      )
    }

    profile.kycRequest = true
    profile.kycRequestedAt = new Date()

    profile.verificationStatus = 'pending'
    profile.verificationNote = ''
    profile.verifiedAt = null

    await profile.save()

    responseHelper.success(res, 'Yêu cầu KYC đã được gửi thành công')
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}
