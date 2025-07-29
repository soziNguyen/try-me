import Ingredient from '../models/Ingredient.js';
import IngredientCategory from '../models/IngredientCategory.js';
import paginationHelper from '../helpers/paginationHelper.js';
import responseHelper from '../helpers/responseHelper.js';

export const ingredientDataAPI = async (req, res) => {
    try {
      const draw  = parseInt(req.query.draw)  || 0;
      const start = parseInt(req.query.start) || 0;
      const length= parseInt(req.query.length)|| 10;
  
      // Tổng số bản ghi
      const recordsTotal = await Ingredient.countDocuments();
  
      // Lấy dữ liệu phân trang
      const data = await Ingredient.find()
        .populate('category', 'name')
        .sort({ name: 1 })
        .skip(start)
        .limit(length)
        .lean();
  
      // Trả đúng format DataTables
      return res.json({
        draw,
        recordsTotal,
        recordsFiltered: recordsTotal,
        data
      });
    } catch (err) {
      return responseHelper.error(res, err.message);
    }
  };
  
  export const createIngredient = async (req, res) => {
    try {
      const { name, unit, category, minStock, note } = req.body;
      await Ingredient.create({ name, unit, category: category || null, minStock, note });
      return responseHelper.success(res, null, 'Tạo nguyên liệu thành công');
    } catch (err) {
      return responseHelper.error(res, err.message);
    }
  };
  

  export const updateIngredient = async (req, res) => {
    try {
      const { id } = req.params;
      const { name, unit, category, minStock, note } = req.body;
      await Ingredient.findByIdAndUpdate(id, { name, unit, category: category || null, minStock, note });
      return responseHelper.success(res, null, 'Cập nhật thành công');
    } catch (err) {
      return responseHelper.error(res, err.message);
    }
  };
  
  export const deleteIngredient = async (req, res) => {
    try {
      const { id } = req.params;
      await Ingredient.findByIdAndDelete(id);
      return responseHelper.success(res, null, 'Xóa nguyên liệu thành công');
    } catch (err) {
      return responseHelper.error(res, err.message);
    }
  };
  