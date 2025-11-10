// import Table from '../table/model.js'
// import Order from '../order/model.js'
// import Organization from '../organization/model.js'
// import { getCurrentOrg } from '../../helpers/orgHelper.js'
// import { getWarehouse } from '../../helpers/warehouseHelper.js'
// import { generateInvoiceCode } from '../../helpers/generateInvoiceCode.js'
// import mongoose from 'mongoose'

// export const createOrderForTable = async ({ tableId, req }) => {
//   const organizationId = getCurrentOrg(req)
//   if (!organizationId) throw new Error('Thiếu thông tin tổ chức')

//   const warehouse = await getWarehouse(req, organizationId)

//   // Kiểm tra bàn
//   const table = await Table.findOne({
//     _id: new mongoose.Types.ObjectId(String(tableId)),
//     organization: organizationId,
//     warehouse
//   })

//   if (!table) throw new Error('Bàn không tồn tại')
//   if (table.status === 'occupied') throw new Error('Bàn đã có khách')

//   // Tạo order
//   const orderCode = await generateInvoiceCode(Order, 'INV')
//   const order = await Order.create({
//     tableId,
//     organization: organizationId,
//     warehouse,
//     status: 'open',
//     code: orderCode,
//     createdBy: req.user._id
//   })

//   // Update bàn
//   table.status = 'occupied'
//   table.checkInTime = new Date()
//   table.currentOrderId = order._id
//   await table.save()

//   return { orderId: order._id, orderCode }
// }
