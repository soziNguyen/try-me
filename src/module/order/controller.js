import Order from './model.js';
import Table from '../table/model.js';
import responseHelper from '../../helpers/responseHelper.js'

export const createOrder = async (req, res) => {
  try {
    const { tableId } = req.body;
    const table = await Table.findById(tableId);
    if (!table) return responseHelper.error(res, 'Bàn không tồn tại', 404);
    if (table.status === 'occupied') return responseHelper.error(res, 'Bàn đã có khách', 400);

    const newOrder = await Order.create({ tableId, status: 'pending' });

    table.status = 'occupied';
    table.checkInTime = new Date();
    table.currentOrderId = newOrder._id;  
    await table.save();

    responseHelper.success(res, { orderId: newOrder._id, tableId: table._id });
  } catch (error) {
    responseHelper.error(res, error.message);
  }
};



