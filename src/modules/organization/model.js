import mongoose from 'mongoose'

const Schema = mongoose.Schema

const OrganizationSchema = new Schema(
  {
    name: { type: String, trim: true }, // tên tổ chức
    email: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    province: { type: String, trim: true, default: '' }, // tỉnh thành
    commune: { type: String, trim: true, default: '' }, // xã phường
    street: { type: String, trim: true, default: '' }, // địa chỉ cụ thể
    businessType: {
      type: String,
      enum: ['shop', 'food', 'drink'],
      default: 'shop',
      require: true
    },
    accountType: {
      type: String,
      enum: ['personal', 'enterprise'],
      required: true
    },
    profile: {
      type: Schema.Types.ObjectId,
      ref: 'Profile',
      default: null
    },
    defaultWarehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse', // collection kho
      default: null
    },
    logo: { type: String, trim: true, default: '' },
    taxCode: { type: String, trim: true, default: '' },
    isActive: { type: Boolean, default: true },
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Plan', // liên kết với bảng Plan
      default: null
    },

    // số tháng đã mua trong chu kỳ hiện tại
    planDuration: {
      type: Number,
      default: null
    },

    // tổng tiền đã trả cho chu kỳ hiện tại
    planTotalPaid: {
      type: Number,
      default: null
    },

    planExpiredAt: {
      type: Date,
      default: null
    },

    // lưu thông tin khi nâng cấp gần nhất
    lastUpgradedAt: {
      type: Date,
      default: null
    }
  },
  {
    collection: 'Organizations',
    timestamps: true
  }
)

OrganizationSchema.index(
  { name: 1 },
  {
    partialFilterExpression: {
      name: { $exists: true, $ne: '' }
    }
  }
)

OrganizationSchema.index(
  { taxCode: 1 },
  {
    partialFilterExpression: {
      taxCode: { $exists: true, $ne: '' }
    }
  }
)

OrganizationSchema.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: {
      email: { $exists: true, $ne: '' }
    }
  }
)
OrganizationSchema.index(
  { phone: 1 },
  {
    unique: true,
    partialFilterExpression: {
      phone: { $exists: true, $ne: '' }
    }
  }
)

const Organization = mongoose.model('Organization', OrganizationSchema)
export default Organization
