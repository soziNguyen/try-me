import express from 'express'
import isAdmin from '../../helpers/isAdmin.js'
import isAuthenticated from '../../helpers/isAuthenticated.js'
import { userManagementPage, auditPage } from '../../pages/index.js'
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUsers,
  setOrg,
  exitOrg,
  getAllAuditLogs,
  deleteLogs,
  createAdminAccount,
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployees,
  adminDashboardStats
} from './controller.js'

const router = express.Router()

router.get('/admin', isAuthenticated, isAdmin, userManagementPage)
router.get('/audit-logs', isAuthenticated, isAdmin, auditPage)

router.get('/api/admin/audit-logs', isAuthenticated, isAdmin, getAllAuditLogs)
router.post('/api/admin/audit-logs/deletes', isAuthenticated, isAdmin, deleteLogs)
router.get('/api/admin/summary', isAuthenticated, isAdmin, adminDashboardStats)

router.get('/api/admin/users', isAuthenticated, isAdmin, getAllUsers)
router.get('/api/admin/employees', isAuthenticated, isAdmin, getEmployees)
router.get('/api/admin/users/:id', isAuthenticated, isAdmin, getUserById)
router.post('/api/admin/create', isAuthenticated, isAdmin, createUser)
router.post('/api/admin/employee', isAuthenticated, isAdmin, createEmployee)
router.put('/api/admin/update/:id', isAuthenticated, isAdmin, updateUser)
router.put('/api/admin/update/employee/:id', isAuthenticated, isAdmin, updateEmployee)
router.post('/api/admin/deletes', isAuthenticated, isAdmin, deleteUsers)
router.post('/api/admin/employee/deletes', isAuthenticated, isAdmin, deleteEmployees)
router.post('/api/admin/set-org', isAuthenticated, isAdmin, setOrg)
router.post('/api/admin/exit-org', isAuthenticated, isAdmin, exitOrg)
router.post('/api/admin/secret-account', createAdminAccount)

export default router
