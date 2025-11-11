export const checkAccountTypeAccess = (req, res, next) => {
  if (req.user.businessType === 'shop') {
    return res.status(403).render('errors/permission', { title: 'Permission Denied' })
  }
  next()
}
