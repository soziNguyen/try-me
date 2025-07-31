import IngredientCategory from "../models/IngredientCategory.js";
import responseHelper from "../helpers/responseHelper.js";

export const getIngredientCategories = async (req, res) => {
    try {
        const data = await IngredientCategory.find()
            .populate('createdBy', 'username -_id')
            .populate('updatedBy', 'username -_id')
            .sort({ createdAt: -1 });
        responseHelper.success(res, data);
    } catch (err) {
        responseHelper.error(res, err.message);
    }
}

export const createInredientCategory = async (req, res) => {
    try {
        
        if (!req.user || !req.user._id) {
            return responseHelper.error(res, 'Thiếu thông tin người dùng', 401);
        }

        const categoryData = {...req.body, createdBy: req.user._id};
        const data = new IngredientCategory(categoryData);
        await data.save();

        const saved = await IngredientCategory.findById(data._id)
            .populate('createdBy', 'username -_id')
        responseHelper.success(res, saved, 'Thêm Danh Mục Nguyên Liệu Thành Công')
    } catch (err) {
        responseHelper.error(res, err.message);
    }    
}

export const updateIngredientCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;

        const ingredientCate = await IngredientCategory.findById(id);
        if (!ingredientCate) {
            return responseHelper.error(res, "Danh mục không tồn tại", 404)
        }

        const existing = await IngredientCategory.findOne({ 
            name,
            _id: { $ne: id }
        });
        if (existing) {
            return responseHelper.error(res, "Tên danh mục nguyên liệu đã tồn tại", 400)
        }
        const data = await IngredientCategory.findByIdAndUpdate(id, { name, description, updatedBy: req.user._id }, { new: true} )
            .populate('createdBy', 'username -_id')
            .populate('updatedBy', 'username -_id')
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