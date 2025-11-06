import ActivityLog from './model.js'

export const logActivity = (
  organizationId,
  userId,
  userName,
  action,
  module,
  description,
  targetName = '',
  status = 'SUCCESS',
  warehouse = null
) => {
  ActivityLog.create({
    organization: organizationId,
    userId,
    userName,
    action,
    module,
    description,
    targetName,
    status,
    warehouse
  }).catch((err) => console.error('ActivityLog Error:', err?.message))
}
