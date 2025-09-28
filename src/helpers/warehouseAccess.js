export const checkWarehouseAccess = (req, res, next) => {
  const { role, warehouse } = req.user

  if (role === 'Admin' || role === 'Org') {
    // Admin/Org có thể truy cập tất cả kho, nhưng nếu không chỉ định thì lấy tất cả
    return next()
  }

  if (role === 'Staff') {
    if (!warehouse) {
      return res.status(403).json({ message: 'User chưa được gán kho nào' })
    }
    // Staff chỉ có thể truy cập kho của mình
    req.warehouseFilter = warehouse
    return next()
  }

  return res.status(403).json({ message: 'Không có quyền truy cập' })
}
