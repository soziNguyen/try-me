import mongoose from 'mongoose'
import { units } from '../../../helpers/unitHelper.js'

const stockEntrySchema = new mongoose.Schema({
  code: { type: String, default: '' },         // mã phiếu
  date: { type: Date, default: Date.now },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', default: null },
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', default: null },
  items: [{
    ingredient: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', default: null },
    quantity: { type: Number, default: 0 },
    unit: { type: String, enum: units, default: '' },
    unitPrice: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  }],
  subTotal: { type: Number, default: 0 },
  taxRate: { type: Number, default: 0.08 }, // mặc định 8%
  taxAmount: { type: Number, default: 0 },  // số tiền thuế
  grandTotal: { type: Number, default: 0 },  // tổng cuối cùng = subTotal + taxAmount
  note: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isLocked: { type: Boolean, default: false },
  lockedAt: { type: Date, default: null },
  lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true }
},
  {
    collection: "StockEntries",
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
  }
)
const StockEntry = mongoose.model('StockEntry', stockEntrySchema)
export { StockEntry, units }
