import mongoose from 'mongoose'

const couponPlanSchema = new mongoose.Schema(
  {
    code: { type: String, default: '' },
    discountType: { type: String, enum: ['percent', 'amount'], default: null },
    discountValue: { type: Number, default: null },
    description: { type: String, default: '' },
    applicablePlans: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Plan' }],
      default: []
    },
    startDate: { type: Date, default: Date.now },
    endDate: {
      type: Date,
      default: () => {
        const now = new Date()
        now.setHours(23, 59, 59, 999)
        return now
      }
    },
    usageLimit: { type: Number, default: null }, // null = không giới hạn
    usedCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: false }
  },
  {
    collection: 'CouponPlans',
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
  }
)

couponPlanSchema.index(
  { code: 1 },
  {
    unique: true,
    partialFilterExpression: {
      code: { $exists: true, $ne: '' }
    }
  }
)

const CouponPlan = mongoose.model('CouponPlan', couponPlanSchema)
export default CouponPlan
