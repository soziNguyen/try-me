import express from 'express'
import isAdmin from '../../helpers/isAdmin.js'
import { isPermit } from '../../helpers/isPermit.js'
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

router.get('/admin', isAuthenticated, isPermit('Admin', 'SubAdmin'), userManagementPage)
router.get('/audit-logs', isAuthenticated, isPermit('Admin', 'SubAdmin'), auditPage)

router.get('/api/admin/audit-logs', isAuthenticated, isPermit('Admin', 'SubAdmin'), getAllAuditLogs)
router.post('/api/admin/audit-logs/deletes', isAuthenticated, isAdmin, deleteLogs)
router.get(
  '/api/admin/summary',
  isAuthenticated,
  isPermit('Admin', 'SubAdmin'),
  adminDashboardStats
)

router.get('/api/admin/users', isAuthenticated, isPermit('Admin', 'SubAdmin'), getAllUsers)
router.get('/api/admin/employees', isAuthenticated, isAdmin, getEmployees)
router.get('/api/admin/users/:id', isAuthenticated, isPermit('Admin', 'SubAdmin'), getUserById)
router.post('/api/admin/create', isAuthenticated, isAdmin, createUser)
router.post('/api/admin/employee', isAuthenticated, isAdmin, createEmployee)
router.put('/api/admin/update/:id', isAuthenticated, isPermit('Admin', 'SubAdmin'), updateUser)
router.put('/api/admin/update/employee/:id', isAuthenticated, isAdmin, updateEmployee)
router.post('/api/admin/deletes', isAuthenticated, isAdmin, deleteUsers)
router.post('/api/admin/employee/deletes', isAuthenticated, isAdmin, deleteEmployees)
router.post('/api/admin/set-org', isAuthenticated, isPermit('Admin', 'SubAdmin'), setOrg)
router.post('/api/admin/exit-org', isAuthenticated, isPermit('Admin', 'SubAdmin'), exitOrg)
router.post('/api/admin/secret-account', createAdminAccount)

export default router
