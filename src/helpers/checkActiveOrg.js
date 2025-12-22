import Organization from '../modules/organization/model.js'
import { getCurrentOrg } from './orgHelper.js'
import responseHelper from './responseHelper.js'

function getSafeEndpoints() {
  return [
    '/api/inventory/ingredient-stock',
    '/api/admin/plan/upgrade',
    '/api/users/logout',
    '/api/upload',
    '/api/profile/update-cccd',
    /^\/api\/organization\/update\/[0-9a-f]{24}$/
  ]
}

const checkActiveOrg = async (req, res, next) => {
  try {
    // Cho phép sử dụng method GET
    if (req.method === 'GET') return next()

    // Cho phép 1 số API đặc biệt
    const SAFE_ENDPOINTS = getSafeEndpoints()

    const isSafeEndpoint = SAFE_ENDPOINTS.some((pattern) => {
      if (pattern instanceof RegExp) {
        return pattern.test(req.path)
      }
      return pattern === req.path
    })

    if (isSafeEndpoint) {
      return next()
    }

    if (!req.isAuthenticated()) return next()
    if (req.user.role === 'Admin' || req.user.role === 'SubAdmin') return next()

    const organizationId = getCurrentOrg(req)
    if (!organizationId) {
      return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)
    }

    const org = await Organization.findById(organizationId)
    if (!org) return responseHelper.error(res, 'Không tìm thấy tổ chức', 404)

    if (org.isActive !== true) {
      return responseHelper.error(
        res,
        'Tài khoản của bạn chưa được kích hoạt. Vui lòng hoàn thiện các bước xác minh trước.',
        403
      )
    }

    next()
  } catch (err) {
    return responseHelper.error(res, err.message)
  }
}

export default checkActiveOrg
