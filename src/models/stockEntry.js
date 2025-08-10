import mongoose from 'mongoose';

const stockEntrySchema = new mongoose.Schema({
  code:      { type: String, default: '' },         // mã phiếu
  date:      { type: Date, default: Date.now },
  supplier:  { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', default: null },
  warehouse:  { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', default: null },
  items: [{
    ingredient: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', default: null },
    quantity:   { type: Number, default: 0 },
    unitPrice:  { type: Number, default: 0 },
    total:      { type: Number, default: 0 }
  }],
  total:     { type: Number, default: 0 },
  note:      { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isLocked: { type: Boolean, default: false },
  lockedAt: { type: Date, default: null },
  lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, 
{
    collection: "StockEntries",
    timestamps: { createdAt: 'createdAt', updatedAt : 'updatedAt'}
}
);
const StockEntry = mongoose.model('StockEntry', stockEntrySchema)
export default StockEntry;
