import Organization from '../modules/organization/model.js'
import BusinessError from '../modules/error/BusinessError.js'

export const checkWarehouseAccess = (req, res, next) => {
  const { role, warehouse } = req.user

  if (['Admin', 'Org'].includes(role)) return next()

  if (role === 'Staff' && warehouse) {
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
        'Tổ chức chưa thiết lập kho mặc định. Vui lòng cập nhật trong profile.',
        400
      )
    }
    return org.defaultWarehouse
  }
}
