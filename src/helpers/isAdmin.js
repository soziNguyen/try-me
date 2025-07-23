const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === "Admin") {
      return res.render('users/admin_dashboard', {
        title: 'Dashboard'
      });
    } else {
      return res.render('users/staff_dashboard', {
        title: 'Dashboard'
      })
    }
  };
  
export default isAdmin;