import express from 'express'
import * as tableController from './controller.js'
import { tablePage } from '../../pages/staffPages.js'
import isAuthenticated from '../../helpers/isAuthenticated.js'
import { checkWarehouseAccess } from '../../helpers/warehouseHelper.js'
import { checkAccountTypeAccess } from '../../helpers/permission.js'

const router = express.Router()

// --- GET PAGE ---
router.get('/tables', isAuthenticated, tablePage)

// --- Quản lý bàn ---
router.get(
  '/api/tables',
  isAuthenticated,
  checkWarehouseAccess,
  // checkAccountTypeAccess,
  tableController.getTables
)
router.get(
  '/api/tables/get',
  isAuthenticated,
  checkWarehouseAccess,
  checkAccountTypeAccess,
  tableController.getDataTables
)
router.get(
  '/api/tables/:id',
  isAuthenticated,
  checkWarehouseAccess,
  checkAccountTypeAccess,
  tableController.getTableById
)
router.post(
  '/api/tables/create',
  isAuthenticated,
  checkWarehouseAccess,
  checkAccountTypeAccess,
  tableController.createTable
)
router.post(
  '/api/tables/update/:id',
  isAuthenticated,
  checkWarehouseAccess,
  checkAccountTypeAccess,
  tableController.updateTable
)
router.get(
  '/api/tables-total',
  isAuthenticated,
  checkWarehouseAccess,
  checkAccountTypeAccess,
  tableController.getTablesWithTotal
)
router.post(
  '/api/tables/deletes',
  isAuthenticated,
  checkWarehouseAccess,
  checkAccountTypeAccess,
  tableController.deleteTables
)

router.get(
  '/api/scan/:id',
  isAuthenticated,
  checkWarehouseAccess,
  checkAccountTypeAccess,
  tableController.scanQRCode
)

export default router
