import mongoose from 'mongoose'
const { Schema } = mongoose

const BillingWalletSchema = new Schema(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      unique: true
    },
    balance: {
      type: Number,
      default: 0,
      min: 0
    },
    currency: {
      type: String,
      default: 'VND'
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { collection: 'BillingWallets', timestamps: true }
)

const BillingWallet = mongoose.model('BillingWallet', BillingWalletSchema)
export default BillingWallet
