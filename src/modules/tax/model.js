import mongoose from 'mongoose'

const taxSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    rate: { type: Number, min: 0, max: 100 },
    description: { type: String, default: '', trim: true },
    isActive: { type: Boolean, default: true },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      require: true
    }
  },
  {
    collection: 'Taxes',
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
  }
)

taxSchema.index(
  { organization: 1, name: 1 },
  {
    unique: true,
    partialFilterExpression: {
      name: { $exists: true, $ne: '' }
    }
  }
)

const Tax = mongoose.model('Tax', taxSchema)
export default Tax
