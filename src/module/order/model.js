import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const OrderSchema = new Schema({
  tableId: { type: Schema.Types.ObjectId, ref: 'Table', required: true },
  status: {type: String,enum: ['open', 'completed', 'cancelled'],default: 'open'},
  items: [
    {
      foodId: { type: Schema.Types.ObjectId, ref: 'MenuItem' },
      quantity: { type: Number, default: 1 },
      price: { type: Number, required: true }  
    }
  ],
  createdAt: { type: Date, default: Date.now },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
}, 
{
  collection: 'Orders',
  timestamps: true
});

const Order = mongoose.model('Order', OrderSchema);
export default Order;
