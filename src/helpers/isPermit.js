// Middleware phân quyền theo role
export const isPermit = (...allowedRoles) => {
  return (req, res, next) => {
    if (allowedRoles.includes(req.user.role)) {
      return next()
    }

    return res.status(403).render('errors/permission', { title: 'Permission Denied' })
  }
}
