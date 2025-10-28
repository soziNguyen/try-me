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
router.use(checkWarehouseAccess)

router.get('/api/menu/combos/active', getActiveCombos)
router.get('/api/menu/combos', isAuthenticated, isPermit('Admin', 'Org'), getCombos)
router.post('/api/menu/combo/create', isAuthenticated, isPermit('Admin', 'Org'), createCombo)
router.post('/api/menu/combo/update/:id', isAuthenticated, isPermit('Admin', 'Org'), updateCombo)
router.post('/api/menu/combo/deletes', isAuthenticated, isPermit('Admin', 'Org'), deleteCombos)
router.get('/api/menu/combo/search', isAuthenticated, searchCombos)
export default router
