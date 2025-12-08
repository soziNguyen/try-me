import Organization from '../modules/organization/model.js'
import Warehouse from '../modules/inventory/warehouse/model.js'
import User from '../modules/user/model.js'
import { getCurrentOrg } from './orgHelper.js'
import responseHelper from './responseHelper.js'

function getSafeEndpoints() {
  return [
    '/api/inventory/ingredient-stock',
    '/api/admin/plan/upgrade',
    '/api/users/logout',
    /^\/api\/admin\/plan\/[0-9a-f]{24}\/cancel$/
  ]
}

const checkPlanAccess = async (req, res, next) => {
  try {
    // Cho phép sử dụng method GET
    if (req.method === 'GET') return next()

    // Cho phép 1 số API đặc biệt
    const SAFE_ENDPOINTS = getSafeEndpoints()

    if (SAFE_ENDPOINTS.includes(req.path)) {
      return next()
    }

    // Không cần login || Admin => Next()
    if (!req.isAuthenticated()) return next()
    if (req.user.role === 'Admin') return next()

    const organizationId = getCurrentOrg(req)
    if (!organizationId) {
      return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)
    }

    const org = await Organization.findById(organizationId).populate('plan')
    if (!org) return responseHelper.error(res, 'Không tìm thấy tổ chức', 404)

    const now = new Date()
    const isExpired = org.planExpiredAt && org.planExpiredAt <= now

    if (!isExpired) return next() // gói chưa hết hạn, cho tiếp tục

    // Kiểm tra điều kiện ngoại lệ: 1 kho và <=2 nhân viên
    const warehouseCount = await Warehouse.countDocuments({ organization: org._id })
    const staffCount = await User.countDocuments({ organization: org._id, role: { $ne: 'Org' } })

    if (warehouseCount <= 1 && staffCount <= 2) {
      return next() // cho phép thao tác như gói free
    }

    // Gói hết hạn và không thỏa ngoại lệ -> chặn
    responseHelper.error(
      res,
      'Gói dịch vụ của bạn đã hết hạn. Vui lòng gia hạn hoặc nâng cấp để tiếp tục sử dụng tính năng này.',
      403
    )
  } catch (err) {
    return responseHelper.error(res, err.message)
  }
}

export default checkPlanAccess
