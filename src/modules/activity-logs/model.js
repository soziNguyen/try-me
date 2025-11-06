import mongoose from 'mongoose'

const Schema = mongoose.Schema

const ActivityLogSchema = new Schema(
  {
    organization: { type: Schema.Types.ObjectId, ref: 'Organization', default: null },
    warehouse: { type: Schema.Types.ObjectId, ref: 'Warehouse', default: null },

    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, default: 'Unknown' },

    action: { type: String, required: true },
    module: { type: String, required: true },
    description: { type: String, required: true },
    targetName: { type: String, default: '' },
    status: { type: String, default: 'SUCCESS' },

    // field dùng cho TTL
    expireAt: {
      type: Date,
      default: () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // +1 năm
    }
  },
  {
    collection: 'ActivityLogs',
    timestamps: true
  }
)

ActivityLogSchema.index({ organization: 1, createdAt: -1 })
ActivityLogSchema.index({ organization: 1, userId: 1, createdAt: -1 })
ActivityLogSchema.index({ organization: 1, module: 1, createdAt: -1 })

// TTL index — Mongo sẽ tự xoá sau 1 năm dựa trên expireAt
ActivityLogSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 })

const ActivityLog = mongoose.model('ActivityLog', ActivityLogSchema)
export default ActivityLog
