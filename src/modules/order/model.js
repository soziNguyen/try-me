import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const OrderSchema = new Schema({
  tableId: { type: Schema.Types.ObjectId, ref: 'Table', required: false },  
  isTakeaway: { type: Boolean, default: false },  
  status: { type: String, enum: ['open', 'completed', 'cancelled'], default: 'open' },
  items: [
    {
      foodId: { type: Schema.Types.ObjectId, ref: 'MenuItem' },
      quantity: { type: Number, default: 1 },
      price: { type: Number, required: true }  
    }
  ],
  totalAmount: { type: Number, default: 0 },       // Tổng tiền gốc
  discount: { type: Number, default: 0 },          // Chiết khấu (nếu có)
  serviceCharge: { type: Number, default: 0 },     // Phí dịch vụ (nếu có)
  totalPayable: { type: Number, default: 0 },       // Tổng tiền trước thuế
  vatRate: { type: Number, default: 0 },           // VAT %
  total: { type: Number, default: 0 },      // Tổng cuối, phải trả
  paymentMethod: { type: String, enum: ['cash', 'card', 'bank'], required: false },
  customerPaid: { type: Number, default: 0 },      // Tiền khách trả
  changeAmount: { type: Number, default: 0 },      // Tiền thừa
  createdAt: { type: Date, default: Date.now },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
}, 
{
  collection: 'Orders',
  timestamps: true
});

const Order = mongoose.model('Order', OrderSchema);
export default Order;
