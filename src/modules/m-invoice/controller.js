import MInvoiceService from '../m-invoice/service.js'

const orderData = {
  orderCode: '0001',
  paymentMethod: 'TM', // TM = tiền mặt, CK = chuyển khoản
  discountAmount: 0,

  customer: {
    displayName: 'Nguyễn Văn B',
    name: 'Nguyễn Văn B',
    taxCode: '',
    address: 'Tuyên Quang',
    email: 'nguyenvana@example.com',
    bankAccount: '',
    bankName: '',
    identityCard: '012345678923',
    passport: ''
  },

  items: [
    {
      itemCode: '',
      name: 'Cà phê đen',
      unit: 'Ly',
      quantity: 2,
      unitPrice: 30000,
      vatRate: 10
    },
    {
      itemCode: 'SP002',
      name: 'Bánh mì',
      unit: 'Cái',
      quantity: 1,
      unitPrice: 20000,
      vatRate: 10
    }
  ]
}

const organization = {
  name: 'CÔNG TY TNHH NAVADO',
  taxCode: '0101234567',
  address: 'Số 1 Trần Hưng Đạo, Hà Nội',
  email: 'contact@navado.com',
  phone: '0988888888'
}

const createInvoice = async (req, res) => {
  try {
    const test = await MInvoiceService.createInvoice(orderData, organization)
    console.log('Invoice created:', test)
  } catch (error) {}
}

const getInvoiceById = async () => {
  try {
    const invoiceId = '3a1fe3d2-9aa2-fac3-ee3e-c67e32c65ccb'
    const res = await MInvoiceService.getInvoiceById(invoiceId)
    console.log(res)
  } catch (error) {}
}

const updateInvoice = async () => {
  try {
    const invoiceId = '3a1fe3d2-9aa2-fac3-ee3e-c67e32c65ccb'
    const res = await MInvoiceService.updateInvoice(invoiceId, orderData, organization)
    console.log(res)
  } catch (error) {}
}

const cancelInvoice = async () => {
  try {
    const invoiceId = '3a1fe3d2-9aa2-fac3-ee3e-c67e32c65ccb'
    const res = await MInvoiceService.cancelInvoice(invoiceId)
    console.log(res)
  } catch (error) {}
}
