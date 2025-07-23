const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
      // Người dùng đã đăng nhập, tiếp tục yêu cầu
      return next();
  }
  // Người dùng chưa đăng nhập, chuyển hướng đến trang đăng nhập
  res.redirect("/login");
};

export default isAuthenticated;
