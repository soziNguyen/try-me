export const getPageData = (req, title, page = '', extra = {}) => {
    const base = { title, page, ...extra }
    if (req.user) {
        base.user = req.user
        base.currentUserId = req.user._id.toString()
    }
    return base
}
