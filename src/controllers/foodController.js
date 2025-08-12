import Food from "../models/foodModel.js";
import responseHelper from "../helpers/responseHelper.js";

export const getFoods = async (req, res) => {
    try {
        const data = await Food.find()
            .sort({ createdAt: -1 });
        responseHelper.success(res, data);
    } catch (err) {
        responseHelper.error(res, err.message);
    }
}

export const createFood = async (req, res) => {
    try {
        const data = new Food(req.body);
        await data.save();

        responseHelper.success(res, data, 'Thêm món ăn thành công');
    } catch (err) {
        responseHelper.error(res, err.message);
    }
}

export const updateFood = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, price, description, image, status, category } = req.body;

        const food = await Food.findById(id);
        if (!food) {
            return responseHelper.error(res, "Món ăn không tồn tại", 404);
        }

        // Nếu bạn muốn kiểm tra tên món ăn không trùng (có thể bỏ nếu không cần)
        const existing = await Food.findOne({
            name,
            _id: { $ne: id }
        });
        if (existing) {
            return responseHelper.error(res, "Tên món ăn đã tồn tại", 400);
        }

        const data = await Food.findByIdAndUpdate(
            id,
            { name, price, description, image, status, category },
            { new: true }
        );

        responseHelper.success(res, data, "Cập nhật món ăn thành công");
    } catch (err) {
        responseHelper.error(res, err.message);
    }
}

export const deleteFoods = async (req, res) => {
    try {
        const { ids } = req.body;

        if (!Array.isArray(ids) || ids.length === 0) {
            return responseHelper.error(res, "Không có món ăn nào được chọn để xóa", 400);
        }

        const result = await Food.deleteMany({
            _id: { $in: ids }
        });

        responseHelper.success(res, result.deletedCount, 'Xóa món ăn thành công');
    } catch (err) {
        responseHelper.error(res, err.message);
    }
}
