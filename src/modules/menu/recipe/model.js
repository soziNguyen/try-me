import mongoose from 'mongoose'
import { units } from '../../../helpers/unitHelper.js'

const recipeSchema = new mongoose.Schema({
  menuItem:    { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', default: null },
  items: [{
    ingredient: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', default: null },
    quantity:   { type: Number, default: 0 },
    unit:       { type: String, enum: units, default: null },
  }],
  note:       { type: String, default: '' },
  isActive:    { type: Boolean, default: true },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  updatedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null }
}, {
  collection: "Recipes",
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
})

const Recipe = mongoose.model('Recipe', recipeSchema)
export { Recipe, units }
