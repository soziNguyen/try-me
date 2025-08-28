import mongoose from 'mongoose'

const couponSchema = new mongoose.Schema({
    code: { type: String, unique: true, default: '' },
    discountType: { type: String, enum: ['percent', 'amount'], default: null },
    discountValue: { type: Number, default: 0 },
    description: { type: String, default: '' },
    startDate: { type: Date, default: Date.now() },
    endDate: { type: Date, default: Date.now() },
    usageLimit: { type: Number, default: null }, // null = không giới hạn
    usedCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true }
},
    {
        collection: "Coupons",
        timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
    }
)

couponSchema.index(
    { organization: 1, code: 1 },
    {
        unique: true,
        partialFilterExpression: {
            code: { $exists: true, $ne: "" }
        }
    }
)

const Coupon = mongoose.model('Coupon', couponSchema)
export default Coupon
