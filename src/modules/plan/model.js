import mongoose from 'mongoose'

const Schema = mongoose.Schema

const PlanSchema = new Schema(
  {
    name: { type: String, required: true, trim: true }, // Tên gói: FREE / STARTUP / PRO / ENTERPRISE
    priceMonth: { type: Number, default: 0 }, // Giá tháng (VNĐ)
    priceYear: { type: Number, default: 0 }, // Giá năm (VNĐ)
    originalPrice: { type: Number, default: 0 }, // Giá gốc (VNĐ)

    warehouseLimit: { type: Number, default: null }, // Giới hạn kho (null = không giới hạn)
    staffLimit: { type: Number, default: null }, // Giới hạn nhân viên (null = không giới hạn)

    description: { type: String, trim: true, default: '' }, // Mô tả
    isActive: { type: Boolean, default: true } // hiển thị cho người dùng hay không
  },
  {
    collection: 'Plans',
    timestamps: true
  }
)

const Plan = mongoose.model('Plan', PlanSchema)
export default Plan
