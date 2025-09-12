import mongoose from "mongoose";

const customerSchema = new mongoose.Schema({
  name: { type: String, default: '' },
  phone: { type: String, default: '' },
  totalPoints: { type: Number, default: 0 }, // tổng điểm hiện có
  totalOrders: { type: Number, default: 0 }, // tổng số đơn đã mua
  lastOrderDate: { type: Date }              // đơn gần nhất
}, {
  collection: 'Customers',
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
})

customerSchema.index({ name: 1 })
customerSchema.index(
  { phone: 1 },
  {
    unique: true,
    partialFilterExpression: {
      phone: { $exists: true, $ne: '' }
    }
  }
)
const Customer = mongoose.model("Customer", customerSchema)
export default Customer
