import OrgPointSetting from './model.js'
import { getCurrentOrg } from '../../helpers/orgHelper.js'
import responseHelper from '../../helpers/responseHelper.js'
import { has } from '../../helpers/common.js'

export const getPointSetting = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    // Lấy hoặc tạo mặc định nếu chưa có
    let orgPoint = await OrgPointSetting.findOne({ organizationId })
    if (!orgPoint) {
      orgPoint = await OrgPointSetting.create({ organizationId })
    }

    responseHelper.success(res, orgPoint)
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const editPoint = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    const { pointValue, pointsEarnRate } = req.body

    // Không cho giá trị trống
    if (!has(pointValue) || !has(pointsEarnRate)) {
      return responseHelper.error(res, 'Không được để trống', 400)
    }

    const pointValueNum = Number(pointValue)
    const pointsEarnRateNum = Number(pointsEarnRate)

    // Không cho <= 0 hoặc NaN
    if (
      !Number.isFinite(pointValueNum) ||
      !Number.isFinite(pointsEarnRateNum) ||
      pointValueNum <= 0 ||
      pointsEarnRateNum <= 0
    ) {
      return responseHelper.error(res, 'Thông tin không hợp lệ', 400)
    }

    const updated = await OrgPointSetting.findOneAndUpdate(
      { organizationId },
      { pointValue: pointValueNum, pointsEarnRate: pointsEarnRateNum },
      { new: true, upsert: true }
    )

    responseHelper.success(res, updated)
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}
