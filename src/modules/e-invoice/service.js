import EInvoiceRepository from './repository.js'
import MInvoiceService from '../m-invoice/service.js'

class EInvoiceService {
  async createInvoiceFromOrder(orderId, cartItems, customerEmail = null) {
    try {
      // Call M-invoice API
      const mInvoiceResult = await MInvoiceService.createAndReleaseInvoice(cartItems)

      // Calculate
      const totalAmount = cartItems.reduce((sum, item) => sum + item.quantity * item.price, 0)
      const totalVAT = cartItems.reduce(
        (sum, item) => sum + (item.quantity * item.price * (item.vatRate || 0)) / 100,
        0
      )
      const finalAmount = totalAmount + totalVAT

      // Save db
      const invoiceData = {
        invoiceId: mInvoiceResult.invoiceId,
        invoiceNumber: mInvoiceResult.invoiceNumber,
        lookupCode: mInvoiceResult.lookupCode,
        orderId,
        items: cartItems.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          unit: item.unit || 'Cái',
          vatRate: item.vatRate || 0,
          amount: item.quantity * item.price,
          vatAmount: (item.quantity * item.price * (item.vatRate || 0)) / 100
        })),
        totalAmount,
        totalVAT,
        finalAmount,
        customerEmail,
        pdfUrl: mInvoiceResult.pdfUrl,
        status: 'issued',
        issuedAt: new Date()
      }

      const invoice = await EInvoiceRepository.create(invoiceData)

      // send email
      if (customerEmail) {
        try {
          await MInvoiceService.sendEmail(mInvoiceResult.invoiceId, customerEmail)
          await EInvoiceRepository.update(invoice._id, { status: 'sent' })
        } catch (emailError) {
          console.error('Email sending failed:', emailError)
        }
      }

      return invoice
    } catch (error) {
      // Lưu log lỗi
      await EInvoiceRepository.create({
        orderId,
        status: 'failed',
        errorMessage: error.message,
        items: cartItems
      })

      throw error
    }
  }

  async getInvoiceById(id) {
    const invoice = await EInvoiceRepository.findById(id)
    if (!invoice) {
      throw new Error('Invoice not found')
    }
    return invoice
  }

  async getInvoiceByLookupCode(lookupCode) {
    const invoice = await EInvoiceRepository.findByLookupCode(lookupCode)
    if (!invoice) {
      throw new Error('Invoice not found')
    }
    return invoice
  }

  async getInvoices(filters = {}, page = 1, limit = 20) {
    return await EInvoiceRepository.findAll(filters, page, limit)
  }

  async resendInvoiceEmail(invoiceId, email) {
    const invoice = await EInvoiceRepository.findByInvoiceId(invoiceId)
    if (!invoice) {
      throw new Error('Invoice not found')
    }

    await MInvoiceService.sendEmail(invoiceId, email)
    await EInvoiceRepository.update(invoice._id, {
      customerEmail: email,
      status: 'sent'
    })

    return invoice
  }

  async getStatistics(startDate, endDate) {
    return await EInvoiceRepository.getStatistics(startDate, endDate)
  }

  async deleteInvoice(id) {
    const invoice = await EInvoiceRepository.findById(id)
    if (!invoice) {
      throw new Error('Invoice not found')
    }

    // Chỉ cho phép xóa invoice failed
    if (invoice.status !== 'failed') {
      throw new Error('Can only delete failed invoices')
    }

    return await EInvoiceRepository.deleteById(id)
  }
}

export default new EInvoiceService()
