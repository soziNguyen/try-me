import mongoose from 'mongoose'
import { units } from '../../helpers/productUnitHelper.js'

// Khai báo schema cho ProductExpense (phiếu chi)
const productExpenseSchema = new mongoose.Schema(
  {
    code: { type: String, default: '' }, // Mã phiếu
    date: { type: Date, default: Date.now }, // Ngày chi
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      default: null
    },
    // Danh sách các mặt hàng trong phiếu chi
    items: [
      {
        name: { type: String, required: true },
        quantity: { type: Number, default: 0 },
        unitPrice: { type: Number, default: 0 },
        total: { type: Number, default: 0 } // Tổng theo item
      }
    ],
    total: { type: Number, default: 0 }, // Tổng tiền của phiếu chi
    reason: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    isLocked: { type: Boolean, default: false },
    lockedAt: { type: Date, default: null },
    lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  {
    collection: 'ProductExpenses', // Tên collection mới
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
  }
)

productExpenseSchema.index({ organization: 1, code: 1 }, { unique: true })

const ProductExpense = mongoose.model('ProductExpense', productExpenseSchema)

export { ProductExpense, units }
