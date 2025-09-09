import mongoose from 'mongoose'

export function getCurrentOrg(req) {
  if (!req.user) return null

  if (req.user.role === 'Admin') {
    return req.session?.currentOrg
      ? new mongoose.Types.ObjectId(String(req.session.currentOrg))
      : null
  } else {
    return req.user.organization || null
  }
}
