import mongoose from 'mongoose'

const menuPriceHistorySchema = new mongoose.Schema({
  menuItem:   { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
  oldPrice:   { type: Number, required: true },
  newPrice:   { type: Number, required: true },
  changedAt:  { type: Date, default: Date.now },
  changedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  note:       { type: String, default: '' }
}, {
  collection: "MenuPriceHistory",
  timestamps: false
})

const MenuPriceHistory = mongoose.model('MenuPriceHistory', menuPriceHistorySchema)
export { MenuPriceHistory }
