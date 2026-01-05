import express from 'express'
import EInvoiceController from './controller.js'
import isAuthenticated from '../../helpers/isAuthenticated.js'

const router = express.Router()

// Apply authentication

// Routes
router.post('/', isAuthenticated, EInvoiceController.createInvoice)
router.get('/', isAuthenticated, EInvoiceController.getInvoices)
router.get('/statistics', isAuthenticated, EInvoiceController.getStatistics)
router.get('/lookup/:code', isAuthenticated, EInvoiceController.lookupInvoice)
router.get('/:id', isAuthenticated, EInvoiceController.getInvoice)
router.post('/:invoiceId/resend', isAuthenticated, EInvoiceController.resendEmail)
router.delete('/:id', isAuthenticated, EInvoiceController.deleteInvoice)

export default router
