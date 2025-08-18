import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const OrderSchema = new Schema({
  tableId: {
    type: Schema.Types.ObjectId,
    ref: 'Table',
    required: true
  },
   items: [
    {
      foodId: {
        type: Schema.Types.ObjectId,
        ref: 'Food',
        required: true
      },
      quantity: {
        type: Number,
        required: true,
        min: 1
      },
      price: {
        type: Number,
        required: true,
        min: 0
      }
    }
  ],
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'paid'],
    default: 'pending'
  },
  paidAt: {
    type: Date,
    default: null
  }
}, {
  collection: 'Orders',
  timestamps: true
});

OrderSchema.index({ tableId: 1 });
OrderSchema.index({ status: 1 });

const Order = mongoose.model('Order', OrderSchema);
export default Order;
