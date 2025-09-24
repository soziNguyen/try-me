import mongoose from 'mongoose'
import { units } from '../../../helpers/unitHelper.js'

// Khai báo schema cho ProductEntry
const productEntrySchema = new mongoose.Schema(
  {
    code: { type: String, default: '' }, // Mã phiếu
    date: { type: Date, default: Date.now }, // Ngày nhập
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      default: null
    },
    // Danh sách các mặt hàng trong phiếu nhập
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'MenuItem',
          default: null
        },
        quantity: { type: Number, default: 0 },
        unit: { type: String, enum: units, default: 'cái' },
        unitPrice: { type: Number, default: 0 },
        total: { type: Number, default: 0 } // Tổng theo items
      }
    ],
    total: { type: Number, default: 0 }, // Tổng tiền của phiếu
    note: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    isLocked: { type: Boolean, default: false },
    lockedAt: { type: Date, default: null },
    lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  {
    collection: 'ProductEntries',
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
  }
)

productEntrySchema.index({ organization: 1, code: 1 }, { unique: true })

const ProductEntry = mongoose.model('ProductEntry', productEntrySchema)
export { ProductEntry, units }
