import express from 'express'
import {
  getAllSuppliers,
  getSuppliers,
  createSupplier,
  updateSupplier,
  forceDeleteSuppliers
} from './controller.js'
import isAuthenticated from '../../../helpers/isAuthenticated.js'
import { isPermit } from '../../../helpers/isPermit.js'

const router = express.Router()

router.get('/api/inventory/supplier/all', isAuthenticated, getAllSuppliers)
router.get('/api/inventory/suppliers', isAuthenticated, isPermit('Admin', 'Org'), getSuppliers)
router.post(
  '/api/inventory/supplier/create',
  isAuthenticated,
  isPermit('Admin', 'Org'),
  createSupplier
)
router.post(
  '/api/inventory/supplier/update/:id',
  isAuthenticated,
  isPermit('Admin', 'Org'),
  updateSupplier
)
router.post(
  '/api/inventory/supplier/deletes',
  isAuthenticated,
  isPermit('Admin', 'Org'),
  forceDeleteSuppliers
)

export default router
