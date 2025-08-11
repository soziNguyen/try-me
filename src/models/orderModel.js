import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const OrderSchema = new Schema({
  tableId: {
    type: Schema.Types.ObjectId,
    ref: 'Table',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'paid'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  paidAt: {
    type: Date,
    default: null
  }
}, {
  collection: 'Orders',
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
});

const Order = mongoose.model('Order', OrderSchema);
export default Order;
