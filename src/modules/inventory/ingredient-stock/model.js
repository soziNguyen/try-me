import mongoose from 'mongoose'

const ingredientStockSchema = new mongoose.Schema(
  {
    ingredient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ingredient',
      default: null
    },
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      default: null
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      default: null
    },
    quantity: { type: Number, default: 0 },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true
    }
  },
  {
    collection: 'IngredientStocks',
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
  }
)

ingredientStockSchema.index({ ingredient: 1, warehouse: 1 })
ingredientStockSchema.index({ createdAt: -1 })

const IngredientStock = mongoose.model('IngredientStock', ingredientStockSchema)
export default IngredientStock
