import mongoose from 'mongoose';

const comboSchema = new mongoose.Schema({
  sku: { type: String, default: '' }, // mã combo
  name: { type: String, required: true }, // tên combo
  image: { type: String, default: '' }, // ảnh đại diện
  description: { type: String, default: '' }, // mô tả combo
  items: [
    {
      menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'Menu', required: true }, // món trong combo
      quantity: { type: Number, default: 1 }, // số lượng mỗi món
    }
  ],
  price: { type: Number, required: true }, // giá bán hiện tại
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuCategory', default: null }, // danh mục combo
  isActive: { type: Boolean, default: true }, // còn bán hay không
  note: { type: String, default: '' }, // ghi chú nội bộ

  // lịch sử giá
  priceHistory: [
    {
      price: { type: Number, required: true },
      startDate: { type: Date, required: true },
      endDate: { type: Date, default: null },
      updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    }
  ],

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, 
{
  collection: "Combos",
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
});

const Combo = mongoose.model('Combo', comboSchema);
export { Combo };
