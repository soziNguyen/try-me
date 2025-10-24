import mongoose from 'mongoose'

const Schema = mongoose.Schema

const PlanSchema = new Schema(
  {
    level: { type: Number, default: 1 }, // Cấp độ của gói, FREE=1, STARTER=2, ... dùng cho việc up/down plan
    code: { type: String, uppercase: true, default: '' }, // Mã gói: free / startup / pro / enterprise
    name: { type: String, default: '' }, // Tên gói: FREE / STARTUP / PRO / ENTERPRISE
    priceMonth: { type: Number, default: 0 }, // Giá tháng (VNĐ)
    priceYear: { type: Number, default: 0 }, // Giá năm (VNĐ)
    originalPrice: { type: Number, default: 0 }, // Giá gốc (VNĐ)

    warehouseLimit: { type: Number, default: null }, // Giới hạn kho (null = không giới hạn)
    staffLimit: { type: Number, default: null }, // Giới hạn nhân viên (null = không giới hạn)

    description: { type: String, trim: true, default: '' }, // Mô tả
    isActive: { type: Boolean, default: false } // hiển thị cho người dùng hay không
  },
  {
    collection: 'Plans',
    timestamps: true
  }
)

PlanSchema.index(
  { code: 1 },
  {
    unique: true,
    partialFilterExpression: {
      code: { $ne: '' }
    }
  }
)

const Plan = mongoose.model('Plan', PlanSchema)
export default Plan
