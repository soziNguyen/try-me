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

router.get('/api/menu/combos/active', getActiveCombos)
router.get(
  '/api/menu/combos',
  isAuthenticated,
  checkWarehouseAccess,
  isPermit('Admin', 'Org'),
  getCombos
)
router.post(
  '/api/menu/combo/create',
  isAuthenticated,
  checkWarehouseAccess,
  isPermit('Admin', 'Org'),
  createCombo
)
router.post(
  '/api/menu/combo/update/:id',
  isAuthenticated,
  checkWarehouseAccess,
  isPermit('Admin', 'Org'),
  updateCombo
)
router.post(
  '/api/menu/combo/deletes',
  isAuthenticated,
  checkWarehouseAccess,
  isPermit('Admin', 'Org'),
  deleteCombos
)
router.get('/api/menu/combo/search', isAuthenticated, checkWarehouseAccess, searchCombos)
export default router
