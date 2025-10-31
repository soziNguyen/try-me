import express from 'express'
import {
  getProductEntries,
  getProductEntryById,
  createProductEntry,
  updateProductEntry,
  deleteProductEntries,
  lockProductEntry
} from './controller.js'
import isAuthenticated from '../../../helpers/isAuthenticated.js'
import { checkWarehouseAccess } from '../../../helpers/warehouseHelper.js'

const router = express.Router()
router.use(checkWarehouseAccess)

router.get('/api/product/entries', isAuthenticated, getProductEntries)
router.get('/api/product/entry/:id', isAuthenticated, getProductEntryById)
router.post('/api/product/entry/create', isAuthenticated, createProductEntry)
router.post('/api/product/entry/update/:id', isAuthenticated, updateProductEntry)
router.post('/api/product/entry/deletes', isAuthenticated, deleteProductEntries)
router.post('/api/product/entry/lock/:id', isAuthenticated, lockProductEntry)

export default router
