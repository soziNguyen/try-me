import mongoose from 'mongoose';

const stockMovementSchema = new mongoose.Schema({
  ingredient: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient' }, // Nguyên liệu
  warehouse:  { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },  // Kho thực hiện
  quantity:   { type: Number, required: true },                            // Số lượng Nhập / Xuất
  type:       { type: String, enum: ['Import','Export','Transfer'] },      // Loại giao dịch *Transfer => Chuyển sang kho khác
  reference:  { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'onModel' }, // Truy xuất ngược từ dòng lịch sử sang chứng từ gốc 
  onModel:    { type: String, required: true, enum: ['StockEntry','StockIssue','Transfer'] }, // (StockEntry, StockIssue, Transfer)
  date:       { type: Date, default: Date.now }                            // Thời điểm giao dịch
},
{
    collection: "StockMovements", 
    timestamps: { createdAt: 'createdAt', updatedAt : 'updatedAt'}
}
);
const StockMovement = mongoose.model('StockMovement', stockMovementSchema);
export default StockMovement;
