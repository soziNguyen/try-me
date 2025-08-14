import mongoose from 'mongoose'
import { units } from '../helpers/unitHelper.js'

const recipeSchema = new mongoose.Schema({
  menuItem:    { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
  ingredients: [
    {
      ingredient: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', required: true },
      quantity:   { type: Number, required: true },
      unit:       { type: String, enum: units, required: true },
    }
  ],
  note:       { type: String, default: '' },
  isActive:    { type: Boolean, default: true },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, {
  collection: "Recipes",
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
})

const Recipe = mongoose.model('Recipe', recipeSchema)
export { Recipe }
