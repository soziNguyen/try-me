import mongoose from 'mongoose';
import { units } from '../helpers/unitHelper.js';

const batchSchema = new mongoose.Schema({
  ingredient: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', required: true },
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  lotNumber: { type: String, default: '' },
  unit: { type: String, enum: ['kg', 'g', 'l', 'ml', 'pcs'], required: true },
  quantity: { type: Number, required: true },
  remainingQuantity: { type: Number, required: true },
  costPrice: { type: Number, default: 0 },
  receivedDate: { type: Date, default: Date.now },
  expirationDate: { type: Date, default: null },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', default: null },
  stockEntry: { type: mongoose.Schema.Types.ObjectId, ref: 'StockEntry', required: true },
  isActive: { type: Boolean, default: true },
  note: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, {
  collection: 'IngredientBatches',
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
});

batchSchema.index({ ingredient: 1, warehouse: 1, lotNumber: 1 }, { unique: true, sparse: true });

const IngredientBatch = mongoose.model('IngredientBatch', batchSchema);
export { IngredientBatch };
