import mongoose from 'mongoose'

const pointHistorySchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null
    },
    type: {
      type: String,
      enum: ['earn', 'redeem', 'adjust', 'expire'],
      required: true
    },
    points: {
      type: Number,
      required: true
    },
    balanceBefore: {
      type: Number,
      required: true
    },
    balanceAfter: {
      type: Number,
      required: true
    },
    description: {
      type: String,
      default: ''
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    collection: 'PointHistories',
    timestamps: true
  }
)

// Index để query nhanh
pointHistorySchema.index({ customerId: 1, createdAt: -1 })
pointHistorySchema.index({ organization: 1, createdAt: -1 })

const PointHistory = mongoose.model('PointHistory', pointHistorySchema)
export default PointHistory
