import IngredientCategory from "../models/IngredientCategory.js";
import responseHelper from "../helpers/responseHelper.js";

export const getIngredientCategories = async (req, res) => {
    try {
        const data = await IngredientCategory.find().sort({ createdAt: -1 });
        responseHelper.success(res, data);
    } catch (err) {
        responseHelper.error(res, err.message);
    }
}

export const createInredientCategory = async (req, res) => {
    try {
        const data = new IngredientCategory({})
        await data.save();
        responseHelper.success(res, data, 'Thêm Danh Mục Nguyên Liệu Thành Công')
    } catch (err) {
        responseHelper.error(res, err.message);
    }    
}

export const updateIngredientCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;

        const ingredientCateId = await IngredientCategory.findById(id);
        if (!ingredientCateId) {
            return responseHelper.error(res, "Danh mục không tồn tại", 404)
        }

        const existing = await IngredientCategory.findOne({ name });
        if (existing) {
            return responseHelper.error(res, "Tên danh mục nguyên liệu đã tồn tại", 400)
        }
        const data = await IngredientCategory.findByIdAndUpdate(id, { name, description }, { new: true} );
        responseHelper.success(res, data, "Cập nhật thành công");
    } catch (err) {
        responseHelper.error(res, err.message);
    }
}

export const deleteIngredientCategories = async (req, res) => {
    try {
        const { ids } = req.body;

        if (!Array.isArray(ids) || ids.length === 0) {
            return responseHelper.error(res, "Không có danh mục nào được chọn để xóa", 400)
        }

        const result = await IngredientCategory.deleteMany({
            _id: { $in : ids }
        })

        responseHelper.success(res, result.deletedCount, 'Xóa danh mục thành công');
    } catch (err) {
        responseHelper.error(res, err.message);
    }
}