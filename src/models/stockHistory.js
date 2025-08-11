import mongoose from 'mongoose'

const stockHistorySchema = new mongoose.Schema({
  transactionType: { type: String, enum: ['ENTRY', 'ISSUE', 'TRANSFER'], required: true },
  documentType: { type: String, enum: ['StockEntry', 'StockIssue', 'StockTransfer'], required: true },
  documentId: { type: mongoose.Schema.Types.ObjectId, required: true },
  documentCode: { type: String, required: true },
  ingredient: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', required: true },
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  warehouseTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
  quantity: { type: Number, required: true },
  quantityBefore: { type: Number, default: 0 },
  quantityAfter: { type: Number, default: 0 },
  reason: String,
  note: String,
  transactionDate: { type: Date, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, {
  timestamps: true
})

// Index cho performance
stockHistorySchema.index({ ingredient: 1, warehouse: 1, createdAt: -1 })
stockHistorySchema.index({ documentId: 1 })
stockHistorySchema.index({ transactionDate: -1 })
stockHistorySchema.index({ createdBy: 1 })

const StockHistory = mongoose.model('StockHistory', stockHistorySchema)
export default StockHistory