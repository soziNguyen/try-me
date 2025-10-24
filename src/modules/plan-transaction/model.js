import mongoose from 'mongoose'
const Schema = mongoose.Schema

const PlanTransactionSchema = new Schema(
  {
    organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    plan: { type: Schema.Types.ObjectId, ref: 'Plan', required: true },
    mode: { type: String, enum: ['month', 'year'], default: 'month' },
    amount: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    couponCode: { type: String, default: '' },
    subtotal: { type: Number, default: 0 },
    vat: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    paidAt: { type: Date, default: Date.now },
    expiredAt: { type: Date },
    note: { type: String, default: '' }
  },
  {
    collection: 'PlanTransactions',
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
  }
)

const PlanTransaction = mongoose.model('PlanTransaction', PlanTransactionSchema)
export default PlanTransaction
