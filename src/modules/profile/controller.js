import Profile from './model.js'
import Organization from '../organization/model.js'
import { deleteFile } from '../upload/helper.js'
import responseHelper from '../../helpers/responseHelper.js'

export const updateCCCD = async (req, res) => {
  try {
    const { side, url } = req.body
    const orgId = req.user.organization
    console.log(req.user)

    if (!['front', 'back'].includes(side)) {
      return responseHelper.error(res, 'Side không hợp lệ', 400)
    }
    if (!url) {
      return responseHelper.error(res, 'Thiếu ảnh CCCD', 400)
    }

    const org = await Organization.findById(orgId).select('profile')
    console.log(org)

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
