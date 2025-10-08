import express from 'express'
import {
  getProductEntries,
  getProductEntryById,
  createProductEntry,
  updateProductEntry,
  deleteProductEntries
} from './controller.js'
import isAuthenticated from '../../../helpers/isAuthenticated.js'
import { checkWarehouseAccess } from '../../../helpers/warehouseHelper.js'

const router = express.Router()

router.get('/api/product/entries', isAuthenticated, checkWarehouseAccess, getProductEntries)
router.get('/api/product/entry/:id', isAuthenticated, checkWarehouseAccess, getProductEntryById)
router.post('/api/product/entry/create', isAuthenticated, checkWarehouseAccess, createProductEntry)
router.post(
  '/api/product/entry/update/:id',
  isAuthenticated,
  checkWarehouseAccess,
  updateProductEntry
)
router.post(
  '/api/product/entry/deletes',
  isAuthenticated,
  checkWarehouseAccess,
  deleteProductEntries
)

export default router
