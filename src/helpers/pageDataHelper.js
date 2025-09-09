export const getPageData = (req, title, page = '', extra = {}) => {
  const base = { title, page, ...extra }
  if (req.user) {
    base.user = req.user
    base.currentUserId = req.user._id.toString()
    base.currentUserName = req.user.username || ''
  }

  base.session = req.session
  return base
}
