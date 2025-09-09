import mongoose from 'mongoose'

const Schema = mongoose.Schema

const TableSchema = new Schema(
  {
    name: { type: String, required: true },
    status: {
      type: String,
      enum: ['available', 'occupied'],
      default: 'available'
    },
    capacity: { type: Number, default: 4 },
    area: { type: String, enum: ['kv1', 'kv2'], default: 'kv1' },
    checkInTime: { type: Date, default: null },
    currentOrderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      default: null
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true
    }
  },
  {
    collection: 'Tables',
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
  }
)

const Table = mongoose.model('Table', TableSchema)
export default Table
