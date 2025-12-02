import mongoose from 'mongoose'
import { units } from '../../helpers/productUnitHelper.js'

const paymentExpenseSchema = new mongoose.Schema(
  {
    code: { type: String, default: '' }, // Mã phiếu
    date: { type: Date, default: Date.now }, // Ngày chi
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      default: null
    },
    expenseAmount: { type: Number, default: 0 },
    reason: { type: String, default: '' },
    note: { type: String, default: '' },
    receiver: { type: String, default: '' },
    reviewer: { type: String, default: '' },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    isLocked: { type: Boolean, default: false },
    lockedAt: { type: Date, default: null },
    lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  {
    collection: 'PaymentExpenses', // Tên collection mới
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
  }
)

paymentExpenseSchema.index({ organization: 1, code: 1 }, { unique: true })

const PaymentExpense = mongoose.model('PaymentExpense', paymentExpenseSchema)

export { PaymentExpense, units }
