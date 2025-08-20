import mongoose from 'mongoose'
import { units } from '../../../helpers/unitHelper.js'

const ingredientSchema = new mongoose.Schema({
  sku: { type: String, default: '' },
  name:     { type: String, default: '' },
  image:    { type: String, default: ''},
  unit:     { type: String, enum: units, default: null },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'IngredientCategory', default: null },
  stock: { type: Number, default: 0 },
  expirationDays: { type: Number, default: null },
  isActive:    { type: Boolean, default: true },
  note:     { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true }
}, 
{
    collection: "Ingredients", 
    timestamps: { createdAt: 'createdAt', updatedAt : 'updatedAt'}
}
)

ingredientSchema.index(
  { organization: 1, sku: 1 }, 
  { 
    unique: true,
    partialFilterExpression: { 
      sku: { $exists: true, $ne: "" } 
    }
  }
)
ingredientSchema.index(
  { organization: 1, name: 1 }, 
  { 
    unique: true,
    partialFilterExpression: { 
      name: { $exists: true, $ne: "" } 
    }
  }
)

const Ingredient = mongoose.model('Ingredient', ingredientSchema)
export { Ingredient, units}