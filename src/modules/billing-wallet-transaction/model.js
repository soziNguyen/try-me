import mongoose from 'mongoose'
const { Schema } = mongoose

const BillingWalletTransactionSchema = new Schema(
  {
    wallet: {
      type: Schema.Types.ObjectId,
      ref: 'BillingWallet',
      required: true
    },
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true
    },
    type: {
      type: String,
      enum: ['credit', 'debit'],
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    reason: {
      type: String,
      default: ''
    },
    source: {
      type: String,
      enum: ['upgrade', 'downgrade', 'manual'],
      required: true
    },
    externalTransactionId: {
      type: Number,
      unique: true,
      sparse: true,
      index: true
    },
    paymentProvider: {
      type: String,
      enum: ['payos', 'manual'],
      default: 'manual'
    },
    balanceAfter: {
      type: Number,
      default: 0
    },
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' }
  },
  { collection: 'BillingWalletTransactions', timestamps: true }
)

const BillingWalletTransaction = mongoose.model(
  'BillingWalletTransaction',
  BillingWalletTransactionSchema
)
export default BillingWalletTransaction
