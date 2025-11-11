import Table from '../table/model.js'
import Order from '../order/model.js'
import Organization from '../organization/model.js'
import { getCurrentOrg } from '../../helpers/orgHelper.js'
import { getWarehouse } from '../../helpers/warehouseHelper.js'
import { generateInvoiceCode } from '../../helpers/generateInvoiceCode.js'
import InvoiceOption from '../invoice/model.js'
import BusinessError from '../error/BusinessError.js'
import mongoose from 'mongoose'

export const createOrderForTable = async ({ tableId, req }) => {
  const organizationId = getCurrentOrg(req)
  if (!organizationId) throw new BusinessError('Thiếu thông tin tổ chức', 400)

  const warehouse = await getWarehouse(req, organizationId)
  let prefix = 'INV'

  // Kiểm tra bàn
  const table = await Table.findOne({
    _id: new mongoose.Types.ObjectId(String(tableId)),
    organization: organizationId,
    warehouse
  })

  const invoiceOptions = await InvoiceOption.findOne({ organizationId, warehouseId: warehouse })
  if (invoiceOptions?.prefix?.trim()) {
    prefix = invoiceOptions.prefix.trim()
  }

  if (!table) throw new BusinessError('Bàn không tồn tại', 404)
  if (table.status === 'occupied') throw new BusinessError('Bàn đã có khách', 400)

  // Tạo order
  const orderCode = await generateInvoiceCode(Order, prefix)
  const order = await Order.create({
    tableId,
    organization: organizationId,
    warehouse,
    status: 'open',
    code: orderCode,
    createdBy: req.user._id
  })

  // Update bàn
  table.status = 'occupied'
  table.checkInTime = new Date()
  table.currentOrderId = order._id
  await table.save()

  return { orderId: order._id, orderCode, tableId }
}
