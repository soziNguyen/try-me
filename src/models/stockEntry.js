import mongoose from 'mongoose';

const stockEntrySchema = new mongoose.Schema({
  code:      { type: String, default: '' },         // mã phiếu
  date:      { type: Date, default: Date.now },
  supplier:  { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  items: [{
    ingredient: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', default: null },
    quantity:   { type: Number, required: true },
    unitPrice:  { type: Number },
    warehouse:  { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', default: null }
  }],
  note:      { type: String, default: '' }
}, 
{
    collection: "Suppliers",
    timestamps: { createdAt: 'createdAt', updatedAt : 'updatedAt'}
}
);
const StockEntry = mongoose.model('StockEntry', stockEntrySchema)
export default StockEntry;
