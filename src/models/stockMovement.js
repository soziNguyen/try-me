import mongoose from 'mongoose';

const stockMovementSchema = new mongoose.Schema({
  ingredient:    { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', required: true },
  fromWarehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true }, // Kho thực hiện
  toWarehouse:   { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', default: null }, // Kho nhận
  quantity:      { type: Number, required: true },
  unitPrice:     { type: Number, default: 0 },
  type:          { type: String, enum: ['Nhập kho','Xuất kho','Chuyển kho','Trả hàng'], required: true },
  reference:     { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'onModel' },
  onModel:       { type: String, required: true, enum: ['StockEntry','StockIssue','Transfer'] },
  note:          { type: String, default: '' },
  date:          { type: Date, default: Date.now }
}, {
  collection: "StockMovements",
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
});

const StockMovement = mongoose.model('StockMovement', stockMovementSchema);
export default StockMovement;
