import EInvoice from './model.js'

class EInvoiceRepository {
  async create(invoiceData) {
    const invoice = new EInvoice(invoiceData)
    return await invoice.save()
  }

  async findById(id) {
    return await EInvoice.findById(id)
  }

  async findByInvoiceId(invoiceId) {
    return await EInvoice.findOne({ invoiceId })
  }

  async findByOrderId(orderId) {
    return await EInvoice.findOne({ orderId })
  }

  async findByLookupCode(lookupCode) {
    return await EInvoice.findOne({ lookupCode })
  }

  async update(id, updateData) {
    return await EInvoice.findByIdAndUpdate(id, { $set: updateData }, { new: true })
  }

  async findAll(filters = {}, page = 1, limit = 20) {
    const skip = (page - 1) * limit

    const [invoices, total] = await Promise.all([
      EInvoice.find(filters).sort({ createdAt: -1 }).skip(skip).limit(limit),
      EInvoice.countDocuments(filters)
    ])

    return {
      invoices,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    }
  }

  async getStatistics(startDate, endDate) {
    return await EInvoice.aggregate([
      {
        $match: {
          issuedAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          },
          status: 'issued'
        }
      },
      {
        $group: {
          _id: null,
          totalInvoices: { $sum: 1 },
          totalRevenue: { $sum: '$finalAmount' },
          totalVAT: { $sum: '$totalVAT' }
        }
      }
    ])
  }

  async deleteById(id) {
    return await EInvoice.findByIdAndDelete(id)
  }
}

export default new EInvoiceRepository()
