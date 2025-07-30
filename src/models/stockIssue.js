import mongoose from 'mongoose';

const stockIssueSchema = new mongoose.Schema({
  code:      { type: String },
  date:      { type: Date, default: Date.now },
  reason:    { type: String },                         // ví dụ: “Chế biến”, “Hủy”,…
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  items: [{
    ingredient: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', default: null },
    quantity:   { type: Number, },
    warehouse:  { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', default: null }
  }],
  note:      { type: String }
}, { timestamps: true });

export default mongoose.model('StockIssue', stockIssueSchema);
