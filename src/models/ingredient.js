import mongoose from 'mongoose';
import { units } from '../helpers/unitHelper.js';

const ingredientSchema = new mongoose.Schema({
  sku: { type: String, default: '', unique: true, sparse: true },
  name:     { type: String, default: '', unique: true, sparse: true },
  image:    { type: String, default: ''},
  unit:     { type: String, enum: units, default: null },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'IngredientCategory', default: null },
  costPrice: { type: Number, default: 0 }, // Giá nhập
  stock: { type: Number, default: 0 },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', default: null },
  expirationDays: { type: Number, default: null },
  isActive:    { type: Boolean, default: true },
  note:     { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, 
{
    collection: "Ingredients", 
    timestamps: { createdAt: 'createdAt', updatedAt : 'updatedAt'}
}
);

const Ingredient = mongoose.model('Ingredient', ingredientSchema);
export { Ingredient, units};