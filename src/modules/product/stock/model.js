import mongoose from 'mongoose'

const productStockSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MenuItem',
      default: null
    },
    combo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Combo',
      default: null
    },
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: true
    },
    quantity: { type: Number, default: 0 },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true
    },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  },
  {
    collection: 'ProductStocks',
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
  }
)

productStockSchema.index(
  { organization: 1, product: 1, warehouse: 1 },
  {
    unique: true,
    partialFilterExpression: { product: { $type: 'objectId' } }
  }
)

productStockSchema.index(
  { organization: 1, combo: 1, warehouse: 1 },
  {
    unique: true,
    partialFilterExpression: { combo: { $type: 'objectId' } }
  }
)

const ProductStock = mongoose.model('ProductStock', productStockSchema)
export default ProductStock
