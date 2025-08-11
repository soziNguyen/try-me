import Order from '../models/orderModel.js';
import responseHelper from '../helpers/responseHelper.js';
import paginationHelper from '../helpers/paginationHelper.js';

// [VIEW] Trang danh sách đơn hàng
export const orderPage = async (req, res) => {
  try {
    const orders = await Order.find();
    responseHelper.success(res, orders);
  } catch (err) {
    console.error(err);
    responseHelper.error(res, err.message);
  }
};

// [CREATE] /order
export const createOrder = async (req, res) => {
  try {
    const { tableId, items, totalPrice, status, note } = req.body;

    const newOrder = await Order.create({
      tableId,
      items,
      totalPrice,
      status,
      note,
    });

    responseHelper.success(res, newOrder);
  } catch (error) {
    responseHelper.error(res, error.message);
  }
};

// [GET] /api/orders
export const getOrders = async (req, res) => {
  try {
    const { page, limit } = req.query;
    const { currentPage, perPage, skip } = paginationHelper(page, limit);

    const [orders, totalItems] = await Promise.all([
      Order.find().skip(skip).limit(perPage).lean(),
      Order.countDocuments(),
    ]);

    const totalPages = Math.ceil(totalItems / perPage);

    responseHelper.success(res, {
      orders,
      pagination: {
        currentPage,
        perPage,
        totalItems,
        totalPages,
      },
    });
  } catch (error) {
    responseHelper.error(res, error.message);
  }
};

// [GET] /api/orders/:id
export const getOrderById = async (req, res) => {
  const { id } = req.params;

  try {
    const order = await Order.findById(id);
    if (!order) {
      return responseHelper.error(res, 'Order Not Found', 404);
    }
    responseHelper.success(res, order);
  } catch (error) {
    responseHelper.error(res, error.message);
  }
};

// [UPDATE] /api/orders/:id
export const updateOrder = async (req, res) => {
  try {
    const { tableId, items, totalPrice, status, note } = req.body;
    const { id } = req.params;

    const orderExist = await Order.findById(id);
    if (!orderExist) {
      return responseHelper.error(res, 'Không tìm thấy đơn hàng.', 404);
    }

    const updatedFields = {
      tableId,
      items,
      totalPrice,
      status,
      note,
    };

    const updatedOrder = await Order.findByIdAndUpdate(id, updatedFields, { new: true });

    if (!updatedOrder) {
      return responseHelper.error(res, 'Cập nhật thất bại.', 400);
    }

    responseHelper.success(res, updatedOrder);
  } catch (error) {
    console.error('Lỗi khi cập nhật đơn hàng:', error);
    responseHelper.error(res, error.message || 'Lỗi máy chủ.');
  }
};

// [DELETE] /api/orders
export const deleteOrders = async (req, res) => {
  try {
    const { orderIds } = req.body;

    if (!orderIds || orderIds.length === 0) {
      return responseHelper.error(res, 'Không có đơn hàng nào được chọn.', 400);
    }

    const result = await Order.deleteMany({
      _id: { $in: orderIds },
    });

    if (result.deletedCount === 0) {
      return responseHelper.error(res, 'Không tìm thấy đơn hàng nào để xóa.', 404);
    }

    responseHelper.success(res, 'Xóa đơn hàng thành công');
  } catch (error) {
    responseHelper.error(res, error.message);
  }
};
