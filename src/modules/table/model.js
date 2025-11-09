import mongoose from 'mongoose'

const Schema = mongoose.Schema

const TableSchema = new Schema(
  {
    name: { type: String, default: '' },
    status: {
      type: String,
      enum: ['available', 'occupied'],
      default: 'available'
    },
    capacity: { type: Number, default: 4 },
    area: { type: String, default: 'KV1' },
    checkInTime: { type: Date, default: null },
    qrCode: { type: String, unique: true },
    currentOrderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      default: null
    },
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: true
    },
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true
    }
  },
  {
    collection: 'Tables',
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
  }
)

TableSchema.index(
  { organization: 1, warehouse: 1, name: 1 },
  {
    unique: true,
    partialFilterExpression: { name: { $ne: '' } }
  }
)

const Table = mongoose.model('Table', TableSchema)
export default Table
