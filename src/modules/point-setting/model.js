import mongoose from 'mongoose'
const Schema = mongoose.Schema

const OrgPointSettingSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      unique: true
    },
    pointValue: { type: Number, default: 500 },
    pointsEarnRate: { type: Number, default: 10000 }
  },
  {
    collection: 'OrgPointSettings',
    timestamps: true
  }
)

const OrgPointSetting = mongoose.model('OrgPointSetting', OrgPointSettingSchema)
export default OrgPointSetting
