import ActivityLog from './model.js'

export const logActivity = async (organization, userId, userName, action, module, description, targetName = '', status = 'SUCCESS') => {
    try {
        await ActivityLog.create({
            organization,
            userId,
            userName,
            action,
            module,
            description,
            targetName,
            status
        })
    } catch (error) {
        console.error('Failed to log activity:', error)
    }
}
