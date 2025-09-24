import express from 'express'
import {
  getProductEntries,
  getProductEntryById,
  createProductEntry,
  updateProductEntry,
  deleteProductEntries
} from './controller.js'
import isAuthenticated from '../../../helpers/isAuthenticated.js'
import { isPermit } from '../../../helpers/isPermit.js'

const router = express.Router()

router.get('/api/product/entries', isAuthenticated, isPermit('Admin', 'Org'), getProductEntries)
router.get('/api/product/entry/:id', isAuthenticated, isPermit('Admin', 'Org'), getProductEntryById)
router.post(
  '/api/product/entry/create',
  isAuthenticated,
  isPermit('Admin', 'Org'),
  createProductEntry
)
router.post(
  '/api/product/entry/update/:id',
  isAuthenticated,
  isPermit('Admin', 'Org'),
  updateProductEntry
)
router.post(
  '/api/product/entry/deletes',
  isAuthenticated,
  isPermit('Admin', 'Org'),
  deleteProductEntries
)

export default router
