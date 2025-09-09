import mongoose from 'mongoose'

const Schema = mongoose.Schema
const ActivityLogSchema = new Schema(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      default: null
    },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, default: 'Unknown' },
    action: { type: String, required: true },
    module: { type: String, required: true },
    description: { type: String, required: true },
    targetName: { type: String, default: '' },
    status: { type: String, default: 'SUCCESS' }
  },
  {
    collection: 'ActivityLogs',
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
  }
)

ActivityLogSchema.index({ organization: 1, createdAt: -1 })
ActivityLogSchema.index({ organization: 1, userId: 1, createdAt: -1 })
ActivityLogSchema.index({ organization: 1, module: 1, createdAt: -1 })

// TTL index - auto delete logs after 1 year
ActivityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 31536000 })

const ActivityLog = mongoose.model('ActivityLog', ActivityLogSchema)
export default ActivityLog
