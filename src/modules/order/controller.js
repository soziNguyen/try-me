import Order from './model.js';
import Table from '../table/model.js';
import { MenuItem } from '../menu/menu-item/model.js';
import responseHelper from '../../helpers/responseHelper.js';
import { getCurrentOrg } from '../../helpers/orgHelper.js';

export const createOrder = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req);
    if (!organizationId) {
      return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400);
    }

    const { tableId, isTakeaway } = req.body;

    if (isTakeaway) {
      const existingOrder = await Order.findOne({
        isTakeaway: true,
        status: 'open',
        organization: organizationId,
      });

      if (existingOrder) {
        return responseHelper.success(res, {
          orderId: existingOrder._id,
          tableId: null,
          isNewOrder: false
        });
      }

      const newOrder = await Order.create({
        tableId: null,
        isTakeaway: true,
        status: 'open',
        organization: organizationId,
      });

      return responseHelper.success(res, {
        orderId: newOrder._id,
        tableId: null,
        isNewOrder: true
      });
    }


    if (!tableId) {
      return responseHelper.error(res, 'Thiếu thông tin bàn', 400);
    }

    const table = await Table.findById(tableId);

    if (!table) return responseHelper.error(res, 'Bàn không tồn tại', 404);
    if (table.status === 'occupied') return responseHelper.error(res, 'Bàn đã có khách', 400);

    const newOrder = await Order.create({
      tableId,
      isTakeaway: false,
      status: 'open',
      organization: organizationId,
    });

    table.status = 'occupied';
    table.checkInTime = new Date();
    table.currentOrderId = newOrder._id;
    await table.save();

    responseHelper.success(res, { orderId: newOrder._id, tableId: table._id });
  } catch (error) {
    responseHelper.error(res, error.message);
  }
};

export const getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId)
      .populate('tableId', 'name area')
      .populate('items.foodId', 'name price');

    if (!order) return res.status(404).json({ message: 'Order không tồn tại' });

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const addItemToOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { foodId, quantity } = req.body;

    if (!foodId || !quantity || quantity <= 0) {
      return responseHelper.error(res, 'Thông tin món ăn không hợp lệ', 400);
    }

    const order = await Order.findById(orderId);
    if (!order) return responseHelper.error(res, 'Order không tồn tại', 404);
    if (order.status !== 'open') return responseHelper.error(res, 'Order đã đóng', 400);

    const menuItem = await MenuItem.findById(foodId);
    if (!menuItem) return responseHelper.error(res, 'Món ăn không tồn tại', 404);

    const existingItem = order.items.find(item => item.foodId.toString() === foodId);
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      order.items.push({
        foodId,
        quantity,
        price: menuItem.price,
      });
    }

    await order.save();
    await order.populate('items.foodId', 'name price');

    responseHelper.success(res, order);
  } catch (error) {
    console.error('Lỗi khi thêm món:', error); 
    responseHelper.error(res, 'Lỗi server nội bộ', 500);
  }
};

export const updateItemQuantity = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { foodId, quantity } = req.body;

    if (!foodId || !quantity || quantity <= 0) {
      return responseHelper.error(res, 'Thông tin không hợp lệ', 400);
    }

    const order = await Order.findById(orderId);
    if (!order) return responseHelper.error(res, 'Order không tồn tại', 404);
    if (order.status !== 'open') return responseHelper.error(res, 'Order đã đóng', 400);

    const item = order.items.find(item => item.foodId.toString() === foodId);
    if (!item) return responseHelper.error(res, 'Món ăn không có trong order', 404);

    item.quantity = quantity;
    await order.save();
    await order.populate('items.foodId', 'name price');

    responseHelper.success(res, order);
  } catch (error) {
    console.error('Lỗi khi cập nhật số lượng:', error);
    responseHelper.error(res, 'Lỗi server nội bộ', 500);
  }
};

export const removeItemFromOrder = async (req, res) => {
  try {
    const { orderId, foodId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) return responseHelper.error(res, 'Order không tồn tại', 404);
    if (order.status !== 'open') return responseHelper.error(res, 'Order đã đóng', 400);

    const itemIndex = order.items.findIndex(i => i.foodId.toString() === foodId);
    if (itemIndex === -1) return responseHelper.error(res, 'Món ăn không tồn tại trong order', 404);

    order.items.splice(itemIndex, 1); 
    await order.save();
    await order.populate('items.foodId', 'name price');

    responseHelper.success(res, order);
  } catch (error) {
    console.error('Lỗi khi xóa món:', error);
    responseHelper.error(res, 'Lỗi server nội bộ', 500);
  }
};