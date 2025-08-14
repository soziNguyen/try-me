import express from "express"
import isAdmin from "../helpers/isAdmin.js"
import isAuthenticated from "../helpers/isAuthenticated.js"
import { userManagementPage } from "../controllers/pages.js" 
import { getAllUsers } from "../controllers/admin.js"

const router = express.Router()

router.get('/admin', isAuthenticated, isAdmin, userManagementPage)
router.get('/api/admin/users', isAuthenticated, isAdmin, getAllUsers)

export default router