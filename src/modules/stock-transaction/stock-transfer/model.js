import mongoose from 'mongoose'

const stockTransferSchema = new mongoose.Schema(
  {
    code: { type: String, default: '' },
    date: { type: Date, default: Date.now },
    items: [
      {
        ingredient: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Ingredient',
          required: true
        },
        fromWarehouse: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Warehouse',
          required: true
        },
        toWarehouse: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Warehouse',
          required: true
        },
        quantity: { type: Number, required: true, min: 0 }
      }
    ],
    note: { type: String, default: '' },
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
    isLocked: { type: Boolean, default: false },
    lockedAt: { type: Date, default: null },
    lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true
    }
  },
  {
    collection: 'StockTransfers',
    timestamps: true
  }
)

const StockTransfer = mongoose.model('StockTransfer', stockTransferSchema)
export default StockTransfer
