import mongoose from 'mongoose';

const stockIssueSchema = new mongoose.Schema({
  code:      { type: String, default: '' },
  date:      { type: Date, default: Date.now },
  reason:    { type: String, default: '' },
  items: [{
    ingredient: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', default: null },
    quantity:   { type: Number, default: 0, min: 0 },
    warehouse:  { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', default: null }
  }],
  note:      { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isLocked: {
    type: Boolean,
    default: false
  }
}, 
{
  collection: "StockIssues",
  timestamps: { createdAt: 'createdAt', updatedAt : 'updatedAt'}
}
)

const StockIssue = mongoose.model('StockIssue', stockIssueSchema);
export default StockIssue
