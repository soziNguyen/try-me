import axios from 'axios'
import config from '../../config/index.js'

class MInvoiceService {
  constructor() {
    this.baseURL = config.mInvoice.baseURL
    this.username = config.mInvoice.username
    this.password = config.mInvoice.password
    this.taxCode = config.mInvoice.taxCode
    this.storeInfo = config.mInvoice.storeInfo

    this.token = null
    this.tokenExpiry = null
  }

  async login() {
    try {
      const response = await axios.post(`${this.baseURL}/api/auth/login`, {
        username: this.username,
        password: this.password,
        taxCode: this.taxCode
      })

      this.token = response.data.token
      this.tokenExpiry = Date.now() + (response.data.expiresIn || 3600) * 1000

      return this.token
    } catch (error) {
      throw new Error(`M-invoice login failed: ${error.message}`)
    }
  }

  async ensureToken() {
    if (!this.token || Date.now() >= this.tokenExpiry) {
      await this.login()
    }
  }

  formatInvoiceData(cartItems) {
    const subtotal = cartItems.reduce((sum, item) => sum + item.quantity * item.price, 0)

    const totalVAT = cartItems.reduce(
      (sum, item) => sum + (item.quantity * item.price * (item.vatRate || 0)) / 100,
      0
    )

    return {
      seller: {
        taxCode: this.taxCode,
        name: this.storeInfo.name,
        address: this.storeInfo.address,
        email: this.storeInfo.email,
        phone: this.storeInfo.phone
      },
      invoiceInfo: {
        templateCode: this.storeInfo.templateCode,
        serial: this.storeInfo.serial,
        invoiceDate: new Date().toISOString(),
        currencyCode: 'VND'
      },
      items: cartItems.map((item, idx) => ({
        lineNumber: idx + 1,
        itemName: item.name,
        unit: item.unit || 'Cái',
        quantity: item.quantity,
        unitPrice: item.price,
        amount: item.quantity * item.price,
        vatRate: item.vatRate || 0,
        vatAmount: (item.quantity * item.price * (item.vatRate || 0)) / 100
      })),
      summary: {
        totalAmountWithoutVAT: subtotal,
        totalVATAmount: totalVAT,
        totalAmount: subtotal + totalVAT
      }
    }
  }

  async createAndReleaseInvoice(cartItems) {
    await this.ensureToken()

    const invoiceData = this.formatInvoiceData(cartItems)

    try {
      const response = await axios.post(
        `${this.baseURL}/api/invoice/create-and-release`,
        invoiceData,
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      return response.data
    } catch (error) {
      throw new Error(`Failed to create invoice: ${error.response?.data?.message || error.message}`)
    }
  }

  async sendEmail(invoiceId, email) {
    await this.ensureToken()

    try {
      await axios.post(
        `${this.baseURL}/api/invoice/send-email`,
        { invoiceId, email },
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      return true
    } catch (error) {
      throw new Error(`Failed to send email: ${error.message}`)
    }
  }

  async getInvoice(invoiceId) {
    await this.ensureToken()

    try {
      const response = await axios.get(`${this.baseURL}/api/invoice/${invoiceId}`, {
        headers: {
          Authorization: `Bearer ${this.token}`
        }
      })

      return response.data
    } catch (error) {
      throw new Error(`Failed to get invoice: ${error.message}`)
    }
  }
}

export default new MInvoiceService()
