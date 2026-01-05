import EInvoiceService from './service.js'

class EInvoiceController {
  async createInvoice(req, res) {
    try {
      const { orderId, items, customerEmail } = req.body

      if (!orderId || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid request data'
        })
      }

      const invoice = await EInvoiceService.createInvoiceFromOrder(orderId, items, customerEmail)

      return res.status(201).json({
        success: true,
        message: 'Invoice created successfully',
        data: {
          id: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          lookupCode: invoice.lookupCode,
          totalAmount: invoice.finalAmount,
          pdfUrl: invoice.pdfUrl,
          status: invoice.status
        }
      })
    } catch (error) {
      console.error('Create invoice error:', error)
      return res.status(500).json({
        success: false,
        message: 'Failed to create invoice',
        error: error.message
      })
    }
  }

  async getInvoice(req, res) {
    try {
      const { id } = req.params
      const invoice = await EInvoiceService.getInvoiceById(id)

      return res.status(200).json({
        success: true,
        data: invoice
      })
    } catch (error) {
      console.error('Get invoice error:', error)
      return res.status(404).json({
        success: false,
        message: error.message
      })
    }
  }

  async lookupInvoice(req, res) {
    try {
      const { code } = req.params
      const invoice = await EInvoiceService.getInvoiceByLookupCode(code)

      return res.status(200).json({
        success: true,
        data: invoice
      })
    } catch (error) {
      console.error('Lookup invoice error:', error)
      return res.status(404).json({
        success: false,
        message: error.message
      })
    }
  }

  async getInvoices(req, res) {
    try {
      const { status, page = 1, limit = 20 } = req.query

      const filters = {}
      if (status) filters.status = status

      const result = await EInvoiceService.getInvoices(filters, parseInt(page), parseInt(limit))

      return res.status(200).json({
        success: true,
        data: result.invoices,
        pagination: {
          page: result.page,
          limit: parseInt(limit),
          total: result.total,
          totalPages: result.totalPages
        }
      })
    } catch (error) {
      console.error('Get invoices error:', error)
      return res.status(500).json({
        success: false,
        message: 'Failed to get invoices',
        error: error.message
      })
    }
  }

  async resendEmail(req, res) {
    try {
      const { invoiceId } = req.params
      const { email } = req.body

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required'
        })
      }

      await EInvoiceService.resendInvoiceEmail(invoiceId, email)

      return res.status(200).json({
        success: true,
        message: 'Email sent successfully'
      })
    } catch (error) {
      console.error('Resend email error:', error)
      return res.status(500).json({
        success: false,
        message: 'Failed to send email',
        error: error.message
      })
    }
  }

  async getStatistics(req, res) {
    try {
      const { startDate, endDate } = req.query

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required'
        })
      }

      const stats = await EInvoiceService.getStatistics(startDate, endDate)

      return res.status(200).json({
        success: true,
        data: stats[0] || {
          totalInvoices: 0,
          totalRevenue: 0,
          totalVAT: 0
        }
      })
    } catch (error) {
      console.error('Get statistics error:', error)
      return res.status(500).json({
        success: false,
        message: 'Failed to get statistics',
        error: error.message
      })
    }
  }

  async deleteInvoice(req, res) {
    try {
      const { id } = req.params
      await EInvoiceService.deleteInvoice(id)

      return res.status(200).json({
        success: true,
        message: 'Invoice deleted successfully'
      })
    } catch (error) {
      console.error('Delete invoice error:', error)
      return res.status(400).json({
        success: false,
        message: error.message
      })
    }
  }
}

export default new EInvoiceController()
