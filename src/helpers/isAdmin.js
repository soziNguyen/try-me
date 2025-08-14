const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === "Admin") {
      return next()
    } else {
      return res.render('errors/permission', {
        title: 'Permission Denied',
      })
    }
  }
  
export default isAdmin