import Food from '../models/foodModel.js';
import responseHelper from '../helpers/responseHelper.js';
import paginationHelper from '../helpers/paginationHelper.js';

// [VIEW] Trang danh sách món ăn
export const foodPage = async (req, res) => {
  try {
    const foods = await Food.find();
    responseHelper.success(res, foods);
  } catch (err) {
    console.error(err);
    responseHelper.error(res, err.message);
  }
};

// [CREATE] /api/foods
export const createFood = async (req, res) => {
  try {
    const { name, category, price, description, imageUrl, status } = req.body;

    // --- MỞ RỘNG: Kiểm tra status hợp lệ ---
    const validStatuses = ['available', 'unavailable'];
    if (status && !validStatuses.includes(status)) {
      return responseHelper.error(res, 'Trạng thái món ăn không hợp lệ.', 400);
    }
    // Kiểm tra trùng tên món ăn
    const exist = await Food.findOne({ name });
    if (exist) {
      return responseHelper.error(res, 'Tên món ăn đã tồn tại.', 400);
    }

    // Validate cơ bản
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return responseHelper.error(res, 'Tên món ăn là bắt buộc.', 400);
    }
    if (!category || !['main', 'side', 'drink', 'dessert'].includes(category)) {
      return responseHelper.error(res, 'Loại món ăn không hợp lệ.', 400);
    }
    if (price === undefined || isNaN(price) || price < 0) {
      return responseHelper.error(res, 'Giá món ăn không hợp lệ.', 400);
    }

    const newFood = await Food.create({
      name: name.trim(),
      category,
      price,
      description: description ? description.trim() : '',
      imageUrl: imageUrl || '',
      status: status || 'available',
    });

    responseHelper.success(res, newFood);
  } catch (error) {
    console.error('Lỗi tạo món ăn:', error);
    responseHelper.error(res, error.message);
  }
};

// [GET] /api/foods
export const getFoods = async (req, res) => {
  try {
    const { page, limit } = req.query;
    const { currentPage, perPage, skip } = paginationHelper(page, limit);

    const [foods, totalItems] = await Promise.all([
      Food.find().skip(skip).limit(perPage).lean(),
      Food.countDocuments(),
    ]);

    const totalPages = Math.ceil(totalItems / perPage);

    responseHelper.success(res, {
      foods,
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

// [GET] /api/foods/:id
export const getFoodById = async (req, res) => {
  const { id } = req.params;

  try {
    const food = await Food.findById(id);
    if (!food) {
      return responseHelper.error(res, 'Không tìm thấy món ăn.', 404);
    }
    responseHelper.success(res, food);
  } catch (error) {
    responseHelper.error(res, error.message);
  }
};

// [UPDATE] /api/foods/:id
export const updateFood = async (req, res) => {
  try {
    const { name, category, price, description, imageUrl, status } = req.body;
    const { id } = req.params;

    const foodExist = await Food.findById(id);
    if (!foodExist) {
      return responseHelper.error(res, 'Không tìm thấy món ăn.', 404);
    }

    // Kiểm tra trùng tên món ăn (trừ chính món này)
    const duplicated = await Food.findOne({ name, _id: { $ne: id } });
    if (duplicated) {
      return responseHelper.error(res, 'Tên món ăn đã tồn tại.', 400);
    }

    // Validate giống create
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return responseHelper.error(res, 'Tên món ăn là bắt buộc.', 400);
    }
    if (!category || !['main', 'side', 'drink', 'dessert'].includes(category)) {
      return responseHelper.error(res, 'Loại món ăn không hợp lệ.', 400);
    }
    if (price === undefined || isNaN(price) || price < 0) {
      return responseHelper.error(res, 'Giá món ăn không hợp lệ.', 400);
    }

    const updatedFields = {
      name: name.trim(),
      category,
      price,
      description: description ? description.trim() : '',
      imageUrl: imageUrl || '',
      status,
    };

    const updatedFood = await Food.findByIdAndUpdate(id, updatedFields, { new: true });

    if (!updatedFood) {
      return responseHelper.error(res, 'Cập nhật món ăn thất bại.', 400);
    }

    responseHelper.success(res, updatedFood);
  } catch (error) {
    console.error('Lỗi khi cập nhật món ăn:', error);
    responseHelper.error(res, error.message || 'Lỗi máy chủ.');
  }
};

// [DELETE] /api/foods
export const deleteFoods = async (req, res) => {
  try {
    const { foodIds } = req.body;

    if (!foodIds || foodIds.length === 0) {
      return responseHelper.error(res, 'Không có món ăn nào được chọn.', 400);
    }

    const result = await Food.deleteMany({
      _id: { $in: foodIds },
    });

    if (result.deletedCount === 0) {
      return responseHelper.error(res, 'Không tìm thấy món ăn nào để xóa.', 404);
    }

    responseHelper.success(res, 'Xóa món ăn thành công');
  } catch (error) {
    responseHelper.error(res, error.message);
  }
};
