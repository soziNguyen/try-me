import express from 'express'
import {
  getActiveCombos,
  getCombos,
  createCombo,
  updateCombo,
  deleteCombos,
  searchCombos
} from './controller.js'
import isAuthenticated from '../../../helpers/isAuthenticated.js'
import { isPermit } from '../../../helpers/isPermit.js'
import { checkWarehouseAccess } from '../../../helpers/warehouseHelper.js'

const router = express.Router()

router.get('/api/menu/combos/active', checkWarehouseAccess, getActiveCombos)
router.get(
  '/api/menu/combos',
  isAuthenticated,
  checkWarehouseAccess,
  isPermit('Admin', 'SubAdmin', 'Org'),
  getCombos
)
router.post(
  '/api/menu/combo/create',
  isAuthenticated,
  checkWarehouseAccess,
  isPermit('Admin', 'SubAdmin', 'Org'),
  createCombo
)
router.post(
  '/api/menu/combo/update/:id',
  isAuthenticated,
  checkWarehouseAccess,
  isPermit('Admin', 'SubAdmin', 'Org'),
  updateCombo
)
router.post(
  '/api/menu/combo/deletes',
  isAuthenticated,
  checkWarehouseAccess,
  isPermit('Admin', 'SubAdmin', 'Org'),
  deleteCombos
)
router.get('/api/menu/combo/search', checkWarehouseAccess, searchCombos)
export default router
