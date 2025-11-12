import Table from '../table/model.js'
import Order from '../order/model.js'
import Organization from '../organization/model.js'
import { generateInvoiceCode } from '../../helpers/generateInvoiceCode.js'
import InvoiceOption from '../invoice/model.js'
import BusinessError from '../error/BusinessError.js'
import mongoose from 'mongoose'

export const createOrderForTable = async ({ tableId, req }) => {
  // Lấy thông tin bàn
  const table = await Table.findById(tableId)

  const organizationId = table.organization || null
  if (!organizationId) throw new BusinessError('Thiếu thông tin tổ chức', 400)

  if (!table) throw new BusinessError('Bàn không tồn tại', 404)
  if (table.status === 'occupied') throw new BusinessError('Bàn đã có khách', 400)

  // Lấy thông tin kho khi quét QR tại bàn
  const warehouse = table.warehouse

  let prefix = 'INV'
  const invoiceOptions = await InvoiceOption.findOne({ organizationId, warehouseId: warehouse })
  if (invoiceOptions?.prefix?.trim()) {
    prefix = invoiceOptions.prefix.trim()
  }

  const orderCode = await generateInvoiceCode(Order, prefix)
  const order = await Order.create({
    tableId,
    organization: organizationId,
    warehouse,
    status: 'open',
    code: orderCode,
    createdBy: req.user?._id || null // người dùng quét
  })

  table.status = 'occupied'
  table.checkInTime = new Date()
  table.currentOrderId = order._id
  await table.save()

  return { orderId: order._id, orderCode, tableId }
}
