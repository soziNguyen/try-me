import mongoose from 'mongoose'

// Khai báo schema cho Receipts (phiếu thu)
const receiptSchema = new mongoose.Schema(
  {
    code: { type: String, default: '' }, // Mã phiếu thu
    date: { type: Date, default: Date.now }, // Ngày thu
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      default: null
    },
    receiptAmount: { type: Number, default: 0 },
    reason: { type: String, default: '' },
    note: { type: String, default: '' },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    submitTer: { type: String, default: '' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    isLocked: { type: Boolean, default: false },
    lockedAt: { type: Date, default: null },
    lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  },
  {
    collection: 'Receipts', // Tên collection
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
  }
)

// Đảm bảo mã phiếu duy nhất trong cùng tổ chức
receiptSchema.index({ organization: 1, code: 1 }, { unique: true })

const Receipt = mongoose.model('Receipt', receiptSchema)

export { Receipt }
