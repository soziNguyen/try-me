import Order from './model.js';
import Table from '../table/model.js';
import { MenuItem } from '../menu/menu-item/model.js';
import { Combo } from '../menu/combo/model.js';
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
      .populate('items.foodId', 'name price')
      .populate('items.comboId', 'name price')
      .lean(); 

    if (!order) return res.status(404).json({ message: 'Order không tồn tại' });

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const addItemToOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { foodId, comboId, quantity } = req.body;

    if ((!foodId && !comboId) || !quantity || quantity <= 0) {
      return responseHelper.error(res, 'Thông tin món/combo không hợp lệ', 400);
    }

    const order = await Order.findById(orderId);
    if (!order) return responseHelper.error(res, 'Order không tồn tại', 404);
    if (order.status !== 'open') return responseHelper.error(res, 'Order đã đóng', 400);

    // 👉 Nếu là combo
    if (comboId) {
      const combo = await Combo.findById(comboId);
      if (!combo) return responseHelper.error(res, 'Combo không tồn tại', 404);

      const existingCombo = order.items.find(item => item.comboId?.toString() === comboId);
      if (existingCombo) {
        existingCombo.quantity += quantity;
      } else {
        order.items.push({
          comboId,
          quantity,
          price: combo.price,
        });
      }
    }

    // 👉 Nếu là món ăn
    if (foodId) {
      const menuItem = await MenuItem.findById(foodId);
      if (!menuItem) return responseHelper.error(res, 'Món ăn không tồn tại', 404);

      const existingItem = order.items.find(item => item.foodId?.toString() === foodId);
      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        order.items.push({
          foodId,
          quantity,
          price: menuItem.price,
        });
      }
    }

    await order.save();

  const populatedOrder = await Order.findById(orderId)
  .populate('items.foodId', 'name price')
  .populate('items.comboId', 'name price')
  .lean(); 

  responseHelper.success(res, populatedOrder)
  } catch (error) {
    console.error('Lỗi khi thêm món/combo:', error); 
    responseHelper.error(res, 'Lỗi server nội bộ', 500);
  }
};

export const updateItemQuantity = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { itemId, quantity, type } = req.body;

    if (!itemId || !quantity || quantity <= 0) {
      return responseHelper.error(res, 'Thông tin không hợp lệ', 400);
    }

    if (!['food', 'combo'].includes(type)) {
      return responseHelper.error(res, 'Loại item không hợp lệ', 400);
    }

    const order = await Order.findById(orderId);
    if (!order) return responseHelper.error(res, 'Order không tồn tại', 404);
    if (order.status !== 'open') return responseHelper.error(res, 'Order đã đóng', 400);

    const item = order.items.find(item => {
      if (type === 'food') return item.foodId?.toString() === itemId;
      if (type === 'combo') return item.comboId?.toString() === itemId;
    });

    if (!item) return responseHelper.error(res, `${type === 'food' ? 'Món ăn' : 'Combo'} không có trong order`, 404);

    item.quantity = quantity;
    await order.save();

    const populatedOrder = await Order.findById(orderId)
      .populate('items.foodId', 'name price')
      .populate('items.comboId', 'name price')
      .lean();

    responseHelper.success(res, populatedOrder);
  } catch (error) {
    console.error('Lỗi khi cập nhật số lượng:', error);
    responseHelper.error(res, 'Lỗi server nội bộ', 500);
  }
};

export const removeItemFromOrder = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { type } = req.query;

    if (!['food', 'combo'].includes(type)) {
      return responseHelper.error(res, 'Loại item không hợp lệ', 400);
    }

    const order = await Order.findById(orderId);
    if (!order) return responseHelper.error(res, 'Order không tồn tại', 404);
    if (order.status !== 'open') return responseHelper.error(res, 'Order đã đóng', 400);

    // Tìm item cần xoá
    const itemIndex = order.items.findIndex(item => {
      if (type === 'food') return item.foodId?.toString() === itemId;
      if (type === 'combo') return item.comboId?.toString() === itemId;
    });

    if (itemIndex === -1) {
      return responseHelper.error(res, 'Món/combo không tồn tại trong order', 404);
    }

    order.items.splice(itemIndex, 1);
    await order.save();

    const populatedOrder = await Order.findById(orderId)
      .populate('items.foodId', 'name price')
      .populate('items.comboId', 'name price')
      .lean();

    responseHelper.success(res, populatedOrder);
  } catch (error) {
    console.error('Lỗi khi xóa item:', error);
    responseHelper.error(res, 'Lỗi server nội bộ', 500);
  }
};

export const checkoutOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const {
      discount = 0,
      serviceCharge = 0,
      vatRate = 0,
      paymentMethod,
      customerPaid,
    } = req.body;

    if (!orderId) return responseHelper.error(res, 'Thiếu orderId', 400);

    const order = await Order.findById(orderId);
    if (!order) return responseHelper.error(res, 'Order không tồn tại', 404);

    if (order.status !== 'open') {
      return responseHelper.error(res, 'Order đã được thanh toán hoặc đã đóng', 400);
    }

    if (!paymentMethod) {
      return responseHelper.error(res, 'Phương thức thanh toán không hợp lệ', 400);
    }
    const parsedDiscount = Number(discount) || 0;
    const parsedServiceCharge = Number(serviceCharge) || 0;
    const parsedVatRate = Number(vatRate) || 0;

    const totalAmount = order.items.reduce((sum, item) => {
      return sum + item.price * item.quantity;
    }, 0);

    const totalPayable = totalAmount - parsedDiscount + parsedServiceCharge;
    const total = Math.round(totalPayable + (totalPayable * (parsedVatRate / 100)));

    if (customerPaid < total) {
      return responseHelper.error(res, 'Số tiền khách trả chưa đủ', 400);
    }

    order.discount = parsedDiscount;
    order.serviceCharge = parsedServiceCharge;
    order.vatRate = parsedVatRate;

    order.totalAmount = totalAmount;
    order.totalPayable = totalPayable;
    order.total = total;

    order.paymentMethod = paymentMethod;
    order.customerPaid = customerPaid;
    order.changeAmount = customerPaid - total;
    order.status = 'completed';
    order.updatedAt = new Date();

    await order.save();
    if (order.tableId) {
      const table = await Table.findById(order.tableId);
      if (table) {
        table.status = 'available';
        table.currentOrderId = null;
        await table.save();
      }
    }

    return responseHelper.success(res, {
      message: 'Thanh toán thành công',
      data: {
        totalAmount,
        discount: parsedDiscount,
        serviceCharge: parsedServiceCharge,
        vatRate: parsedVatRate,
        totalPayable,
        total,
        changeAmount: order.changeAmount,
      }
    });
  } catch (error) {
    console.error('Lỗi thanh toán:', error);
    return responseHelper.error(res, 'Lỗi server nội bộ', 500);
  }
};

export const printInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId)
      .populate('items.foodId', 'name price')
      .populate('tableId', 'name');

    if (!order) return res.status(404).send('Không tìm thấy đơn hàng');

    res.render('staff/printbill', { 
      title: 'Hóa đơn thanh toán', 
      order,
      orderId: order._id, 
      currentUserId: req.user ? req.user._id : null ,
      user: req.user || { username: 'Admin' }
    });
  } catch (error) {
    console.error('Lỗi khi in hóa đơn:', error);
    res.status(500).send('Lỗi máy chủ');
  }
};

