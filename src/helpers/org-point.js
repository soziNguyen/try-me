import OrgPointSetting from '../modules/point-setting/model.js'

export const loadPointSetting = async (organizationId) => {
  let setting = await OrgPointSetting.findOne({ organizationId })
  if (!setting) setting = await OrgPointSetting.create({ organizationId })

  return {
    pointValue: setting.pointValue,
    pointsEarnRate: setting.pointsEarnRate
  }
}
