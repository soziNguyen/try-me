import mongoose from 'mongoose'

const stockHistorySchema = new mongoose.Schema(
  {
    transactionType: {
      type: String,
      enum: ['ENTRY', 'ISSUE', 'TRANSFER'],
      required: true
    },
    documentType: {
      type: String,
      enum: ['StockEntry', 'StockIssue', 'StockTransfer'],
      required: true
    },
    documentId: { type: mongoose.Schema.Types.ObjectId, required: true },
    documentCode: { type: String, required: true },
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: true
    },

    fromWarehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      default: null
    }, // với TRANSFER, kho đi
    toWarehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      default: null
    }, // kho đến

    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      default: null
    },

    items: [
      {
        ingredient: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Ingredient',
          required: true
        },
        quantity: { type: Number, required: true }
      }
    ],

    reason: { type: String, default: null },
    note: { type: String, default: null },
    transactionDate: { type: Date, default: Date.now },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true
    }
  },
  {
    collection: 'StockHistories',
    timestamps: true
  }
)

stockHistorySchema.index({ documentId: 1 })
stockHistorySchema.index({ transactionDate: -1 })
stockHistorySchema.index({ transactionType: 1, transactionDate: -1 })
stockHistorySchema.index({ createdBy: 1 })

const StockHistory = mongoose.model('StockHistory', stockHistorySchema)
export default StockHistory
