import mongoose from 'mongoose'

const Schema = mongoose.Schema

const OrderSchema = new Schema(
  {
    code: { type: String, required: true }, // Mã đơn hàng
    tableId: { type: Schema.Types.ObjectId, ref: 'Table', required: false },
    isTakeaway: { type: Boolean, default: false },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: false
    },
    status: {
      type: String,
      enum: ['open', 'completed', 'cancelled'],
      default: 'open'
    },
    items: [
      {
        foodId: { type: Schema.Types.ObjectId, ref: 'MenuItem' },
        comboId: { type: Schema.Types.ObjectId, ref: 'Combo' },
        quantity: { type: Number, default: 1 },
        price: { type: Number, required: true },
        status: { type: String, enum: ['pending', 'cooking', 'done'], default: 'pending' },
        batch: { type: Number, default: null }, // Lần gửi
        sentAt: { type: Date, default: Date.now } // Thời gian gửi
      }
    ],
    totalAmount: { type: Number, default: 0 }, // Tổng tiền gốc
    discount: { type: Number, default: 0 }, // magiamgia (nếu có)
    pointsUsed: { type: Number, default: 0 }, // Số điểm khách dùng
    pointsDiscount: { type: Number, default: 0 }, // Số tiền giảm theo điểm
    serviceCharge: { type: Number, default: 0 }, // Phí dịch vụ (nếu có)
    totalPayable: { type: Number, default: 0 }, // Tổng tiền trước thuế
    extraDiscount: { type: Number, default: 0 }, //chietkhau
    vatRate: { type: Number, default: 0 }, // VAT %
    total: { type: Number, default: 0 }, // Tổng cuối, phải trả
    paymentMethodId: {
      type: Schema.Types.ObjectId,
      ref: 'PaymentMethod',
      required: false
    },
    customerPaid: { type: Number, default: 0 }, // Tiền khách trả
    changeAmount: { type: Number, default: 0 }, // Tiền thừa
    createdAt: { type: Date, default: Date.now },
    qrCode: { type: String, default: null },
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true
    },
    warehouse: {
      type: Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    collection: 'Orders',
    timestamps: true
  }
)

const Order = mongoose.model('Order', OrderSchema)
export default Order
