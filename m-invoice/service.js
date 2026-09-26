import axios from 'axios'
import config from './config.js'

class MInvoiceService {
  constructor() {
    this.baseURL = config.baseURL
    this.username = config.username
    this.password = config.password
    this.ma_dvcs = config.ma_dvcs
    this.defaultSerial = config.serial // Ký hiệu hóa đơn cố định

    this.token = null
    this.tokenExpiry = null
  }

  async login() {
    try {
      const response = await axios.post(
        `${this.baseURL}/api/Account/Login`,
        {
          username: this.username,
          password: this.password,
          ma_dvcs: this.ma_dvcs
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      this.token = response.data.token
      this.tokenExpiry = Date.now() + (response.data.expiresIn || 3600) * 1000
      return this.token
    } catch (error) {
      throw new Error(`M-invoice login failed: ${error.response?.data?.message || error.message}`)
    }
  }

  async ensureToken() {
    if (!this.token || Date.now() >= this.tokenExpiry) {
      await this.login()
    }
  }

  /**
   * Format dữ liệu hóa đơn
   * @param {Object} orderData - Dữ liệu đơn hàng
   * @param {Array} orderData.items - Danh sách sản phẩm
   * @param {Object} orderData.customer - Thông tin khách hàng
   * @param {string} orderData.paymentMethod - Phương thức thanh toán (TM/CK/TM,CK)
   * @param {number} orderData.discountAmount - Tổng giảm giá
   * @param {string} orderData.orderCode - Mã đơn hàng
   *
   * @param {Object} organization - Thông tin tổ chức
   * @param {string} organization.name - Tên công ty
   * @param {string} organization.taxCode - Mã số thuế
   * @param {string} organization.address - Địa chỉ
   * @param {string} organization.email - Email
   * @param {string} organization.phone - Số điện thoại
   *
   * @returns {Object} Payload theo format M-Invoice API
   * @returns {number} return.editmode - 1 = tạo mới, 2 = sửa hóa đơn
   * @returns {Array} return.data - Mảng chứa thông tin hóa đơn
   * @returns {string} return.data[].inv_invoiceSeries - Ký hiệu hóa đơn (VD: 1C26TBK)
   * @returns {string} return.data[].inv_invoiceIssuedDate - Ngày lập (YYYY-MM-DD)
   * @returns {string} return.data[].inv_currencyCode - Mã tiền tệ (VND)
   * @returns {number} return.data[].inv_exchangeRate - Tỷ giá
   * @returns {string} return.data[].so_benh_an - Số đơn hàng
   * @returns {string} return.data[].inv_sellerLegalName - Tên công ty người bán
   * @returns {string} return.data[].inv_sellerTaxCode - Mã số thuế người bán
   * @returns {string} return.data[].inv_sellerAddressLine - Địa chỉ người bán
   * @returns {string} return.data[].inv_sellerEmail - Email người bán
   * @returns {string} return.data[].inv_sellerPhoneNumber - SĐT người bán
   * @returns {string} return.data[].inv_buyerDisplayName - Tên người mua
   * @returns {string} return.data[].inv_buyerLegalName - Tên đơn vị mua
   * @returns {string} return.data[].inv_buyerTaxCode - Mã số thuế đơn vị mua
   * @returns {string} return.data[].inv_buyerAddressLine - Địa chỉ người mua
   * @returns {string} return.data[].inv_buyerEmail - Email người mua
   * @returns {string} return.data[].inv_buyerBankAccount - Số tài khoản người mua
   * @returns {string} return.data[].inv_buyerBankName - Tên ngân hàng
   * @returns {string} return.data[].inv_paymentMethodName - Phương thức thanh toán
   * @returns {number} return.data[].inv_discountAmount - Tổng giảm giá
   * @returns {number} return.data[].inv_TotalAmountWithoutVat - Tổng tiền trước VAT (sau giảm giá)
   * @returns {number} return.data[].inv_vatAmount - Tổng tiền VAT
   * @returns {number} return.data[].inv_TotalAmount - Tổng cộng tiền thanh toán
   * @returns {string} return.data[].key_api - Key unique để tránh tạo hóa đơn trùng
   * @returns {string} return.data[].cccdan - Số CCCD/CMND người mua
   * @returns {string} return.data[].so_hchieu - Số hộ chiếu (nếu có)
   * @returns {Array} return.data[].details - Chi tiết sản phẩm
   * @returns {Array} return.data[].details[].data - Danh sách sản phẩm
   * @returns {number} return.data[].details[].data[].tchat - Tính chất: 1 = hàng hóa thường
   * @returns {number} return.data[].details[].data[].stt_rec0 - Số thứ tự dòng
   * @returns {string} return.data[].details[].data[].inv_itemCode - Mã hàng hóa/SKU
   * @returns {string} return.data[].details[].data[].inv_itemName - Tên hàng hóa
   * @returns {string} return.data[].details[].data[].inv_unitCode - Đơn vị tính
   * @returns {number} return.data[].details[].data[].inv_quantity - Số lượng
   * @returns {number} return.data[].details[].data[].inv_unitPrice - Đơn giá
   * @returns {number} return.data[].details[].data[].inv_discountPercentage - Tỷ lệ chiết khấu (%)
   * @returns {number} return.data[].details[].data[].inv_discountAmount - Số tiền chiết khấu
   * @returns {number} return.data[].details[].data[].inv_Amount - Thành tiền trước VAT
   * @returns {number} return.data[].details[].data[].inv_TotalAmountWithoutVat - Thành tiền chưa VAT
   * @returns {number} return.data[].details[].data[].ma_thue - Thuế suất VAT (%)
   * @returns {number} return.data[].details[].data[].inv_vatAmount - Tiền VAT
   * @returns {number} return.data[].details[].data[].inv_TotalAmount - Thành tiền sau VAT
   */
  formatInvoiceData(orderData, organization) {
    const {
      items,
      customer = {},
      paymentMethod = 'CK',
      discountAmount = 0,
      orderCode = ''
    } = orderData

    // Tổng tiền
    const totalWithoutVat = items.reduce((sum, item) => {
      return sum + item.quantity * item.unitPrice
    }, 0)

    const totalVat = items.reduce((sum, item) => {
      const itemTotal = item.quantity * item.unitPrice
      const vatRate = item.vatRate || 0
      return sum + (itemTotal * vatRate) / 100
    }, 0)

    const totalAmount = totalWithoutVat + totalVat - discountAmount

    // Thông tin Organization
    const storeInfo = {
      name: organization.name || '',
      address: organization.address || '',
      email: organization.email || '',
      phone: organization.phone || '',
      taxCode: organization.taxCode || ''
    }

    // Format chi tiết sản phẩm
    const details = items.map((item, index) => {
      const quantity = item.quantity
      const unitPrice = item.unitPrice
      const vatRate = item.vatRate || 0

      const itemTotal = quantity * unitPrice
      const vatAmount = (itemTotal * vatRate) / 100

      return {
        tchat: 1,
        stt_rec0: index + 1,
        inv_itemCode: item.itemCode,
        inv_itemName: item.name,
        inv_unitCode: item.unit || 'Phần',
        inv_quantity: quantity,
        inv_unitPrice: unitPrice,
        inv_discountPercentage: 0,
        inv_discountAmount: 0,
        inv_Amount: itemTotal,
        inv_TotalAmountWithoutVat: itemTotal,
        ma_thue: vatRate,
        inv_vatAmount: vatAmount,
        inv_TotalAmount: itemTotal + vatAmount
      }
    })

    // Format dữ liệu hóa đơn
    return {
      editmode: 1,
      data: [
        {
          // Thông tin hóa đơn
          inv_invoiceSeries: this.defaultSerial,
          inv_invoiceIssuedDate: new Date().toISOString().split('T')[0],
          inv_currencyCode: 'VND',
          inv_exchangeRate: 1,
          so_benh_an: orderCode || '', // Số đơn hàng

          // Thông tin người bán (từ Organization)
          inv_sellerLegalName: storeInfo.name,
          inv_sellerTaxCode: storeInfo.taxCode,
          inv_sellerAddressLine: storeInfo.address,
          inv_sellerEmail: storeInfo.email,
          inv_sellerPhoneNumber: storeInfo.phone,

          // Thông tin người mua
          inv_buyerDisplayName: customer.displayName || customer.name || 'Khách lẻ',
          inv_buyerLegalName: customer.name || '',
          inv_buyerTaxCode: customer.taxCode || '',
          inv_buyerAddressLine: customer.address || '',
          inv_buyerEmail: customer.email || '',
          inv_buyerBankAccount: customer.bankAccount || '',
          inv_buyerBankName: customer.bankName || '',

          // Thông tin thanh toán
          inv_paymentMethodName: paymentMethod,
          inv_discountAmount: discountAmount,
          inv_TotalAmountWithoutVat: totalWithoutVat - discountAmount,
          inv_vatAmount: totalVat,
          inv_TotalAmount: totalAmount,

          // Các trường bổ sung
          key_api: orderCode || '',
          cccdan: customer.identityCard || '',
          so_hchieu: customer.passport || '',

          // Chi tiết sản phẩm
          details: [
            {
              data: details
            }
          ]
        }
      ]
    }
  }

  /**
   * Tạo hóa đơn
   */
  async createInvoice(orderData, organization) {
    await this.ensureToken()

    try {
      const invoiceData = this.formatInvoiceData(orderData, organization)

      const response = await axios.post(`${this.baseURL}/api/InvoiceApi78/Save`, invoiceData, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`
        }
      })

      // Kiểm tra response
      if (response.data.code === '00' && response.data.ok) {
        return {
          success: true,
          data: {
            invoiceId: response.data.data.inv_invoiceAuth_id,
            invoiceNumber: response.data.data.inv_invoiceNumber,
            invoiceSeries: response.data.data.inv_invoiceSeries,
            securityCode: response.data.data.sobaomat,
            totalAmount: response.data.data.inv_TotalAmount,
            status: response.data.data.tthai,
            issuedDate: response.data.data.inv_invoiceIssuedDate,
            rawData: response.data.data
          }
        }
      } else {
        throw new Error(response.data.message || 'Failed to create invoice')
      }
    } catch (error) {
      // Retry nếu lỗi 401
      if (error.response?.status === 401) {
        this.token = null
        await this.ensureToken()

        const invoiceData = this.formatInvoiceData(orderData, organization)
        const retryResponse = await axios.post(
          `${this.baseURL}/api/InvoiceApi78/Save`,
          invoiceData,
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${this.token}`
            }
          }
        )

        if (retryResponse.data.code === '00' && retryResponse.data.ok) {
          return {
            success: true,
            data: {
              invoiceId: retryResponse.data.data.inv_invoiceAuth_id,
              invoiceNumber: retryResponse.data.data.inv_invoiceNumber,
              invoiceSeries: retryResponse.data.data.inv_invoiceSeries,
              securityCode: retryResponse.data.data.sobaomat,
              totalAmount: retryResponse.data.data.inv_TotalAmount,
              status: retryResponse.data.data.tthai,
              issuedDate: retryResponse.data.data.inv_invoiceIssuedDate,
              rawData: retryResponse.data.data
            }
          }
        }
      }

      throw new Error(`Failed to create invoice: ${error.response?.data?.message || error.message}`)
    }
  }
}

export default new MInvoiceService()
