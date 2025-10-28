import mongoose from 'mongoose'

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    phone: { type: String, default: null },
    totalPoints: { type: Number, default: 0 }, // tổng điểm hiện có
    totalOrders: { type: Number, default: 0 }, // tổng số đơn đã mua
    totalSpent: { type: Number, default: 0 }, // tổng tiền đã chi
    lastOrderDate: { type: Date, default: null }, // đơn gần nhất
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true
    }
  },
  {
    collection: 'Customers',
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
  }
)

customerSchema.index(
  { organization: 1, phone: 1 },
  {
    unique: true,
    partialFilterExpression: { phone: { $ne: null } }
  }
)
const Customer = mongoose.model('Customer', customerSchema)
export default Customer
