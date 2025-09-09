import mongoose from 'mongoose'

const shiftSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true
    },
    name: { type: String, default: '' }, // Tên ca
    type: { type: String, enum: ['day', 'night'], default: null }, // Loại ca
    startTime: { type: String, default: '' }, // HH:mm
    endTime: { type: String, default: '' }, // HH:mm
    note: { type: String, default: '' }
  },
  {
    collection: 'Shifts',
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
  }
)

shiftSchema.index(
  { organization: 1, name: 1 },
  {
    unique: true,
    partialFilterExpression: {
      name: { $exists: true, $ne: '' }
    }
  }
)

const Shift = mongoose.model('Shift', shiftSchema)
export { Shift }
