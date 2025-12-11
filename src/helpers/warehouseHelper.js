import Organization from '../modules/organization/model.js'
import BusinessError from '../modules/error/BusinessError.js'

export const checkWarehouseAccess = (req, res, next) => {
  // Nếu chưa đăng nhập thì bỏ qua
  if (!req.user || req.isUnauthenticated?.()) {
    return next()
  }

  const { role, warehouse } = req.user

  if (['Admin', 'Org'].includes(role)) return next()

  if ((role === 'Staff' || role === 'Kitchen') && warehouse) {
    req.warehouseFilter = warehouse
    return next()
  }

  return res.status(403).json({ message: 'Không có quyền truy cập kho' })
}

// Helper function để lấy warehouse dựa trên role
export const getWarehouse = async (req, organizationId) => {
  if (req.warehouseFilter) {
    // Staff - bắt buộc dùng kho được gán
    return req.warehouseFilter
  } else {
    // Admin/Org - dùng defaultWarehouse
    const org = await Organization.findById(organizationId).select('defaultWarehouse')
    if (!org?.defaultWarehouse) {
      throw new BusinessError(
        'Tổ chức chưa thiết lập kho mặc định. Vui lòng cập nhật kho trong phần hồ sơ.',
        400
      )
    }
    return org.defaultWarehouse
  }
}

export const getWarehouseForAdmin = async (req, organizationId, allowAll = false) => {
  if (req.warehouseFilter) {
    return req.warehouseFilter
  }

  const org = await Organization.findById(organizationId).select('defaultWarehouse')

  const warehouse = org?.defaultWarehouse || ''

  // Nếu allowAll = true và warehouse rỗng => trả về null
  if (allowAll && warehouse === '') {
    return null
  }

  // Nếu allowAll = false và warehouse rỗng => throw error
  if (!warehouse) {
    throw new BusinessError(
      'Tổ chức chưa thiết lập kho mặc định. Vui lòng cập nhật kho trong phần hồ sơ.',
      400
    )
  }

  return warehouse
}
