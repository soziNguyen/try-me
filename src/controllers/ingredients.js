import Ingredient from '../models/ingredient.js';
import IngredientCategory from '../models/IngredientCategory.js';
import responseHelper from '../helpers/responseHelper.js';

export const ingredientDataAPI = async (req, res) => {
  try {
    const draw = parseInt(req.query.draw) || 0;
    const start = parseInt(req.query.start) || 0;
    const length = parseInt(req.query.length) || 10;
    const searchValue = req.query['search[value]'] || '';
    const orderColumnIndex = req.query['order[0][column]'] || 0;
    const orderField = req.query[`columns[${orderColumnIndex}][data]`] || 'name';
    const orderDir = req.query['order[0][dir]'] === 'desc' ? -1 : 1;

    let mongoQuery = {};
    const searchNumber = Number(searchValue);

    if (searchValue) {
      const conditions = [
        { name: { $regex: searchValue, $options: 'i' } },
        { unit: { $regex: searchValue, $options: 'i' } },
        { note: { $regex: searchValue, $options: 'i' } }
      ];

      if (!isNaN(searchNumber)) {
        conditions.push({ minStock: searchNumber });
      }

      mongoQuery = { $or: conditions };
    }

    let fullData = [];
    let recordsFiltered = 0;

    // Sort trong RAM voi category
    if (orderField === 'category.name') {
      fullData = await Ingredient.find(mongoQuery)
        .populate('category', 'name')
        .lean();

      fullData.sort((a, b) => {
        const nameA = a.category?.name || '';
        const nameB = b.category?.name || '';
        return orderDir === 1
          ? nameA.localeCompare(nameB)
          : nameB.localeCompare(nameA);
      });

      recordsFiltered = fullData.length;
      fullData = fullData.slice(start, start + length);
    } else {
      fullData = await Ingredient.find(mongoQuery)
        .sort({ [orderField]: orderDir })
        .skip(start)
        .limit(length)
        .populate('category', 'name')
        .lean();

      recordsFiltered = await Ingredient.countDocuments(mongoQuery);
    }

    const recordsTotal = await Ingredient.countDocuments();

    res.json({
      draw,
      recordsTotal,
      recordsFiltered,
      data: fullData
    });

  } catch (err) {
    responseHelper.error(res, err.message)
  }
};

export const createIngredient = async (req, res) => {
  try {
    const ingredient = new Ingredient({})
    await ingredient.save();
    return responseHelper.success(res, null, 'Tạo nguyên liệu thành công');
  } catch (err) {
    return responseHelper.error(res, err.message);
  }
};

export const updateIngredient = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, unit, category, minStock, note, image } = req.body;

    const ingredientId = await Ingredient.findById(id);
    if (!ingredientId) {
      return responseHelper.error(res, "Nguyên liệu không tồn tại", 404);
    }

    const existing = await Ingredient.findOne({
        name,
        _id: { $ne: id }
     });
    if (existing) {
      return responseHelper.error(res, "Tên nguyên liệu đã tồn tại", 400);
    }

    await Ingredient.findByIdAndUpdate(id, { name, unit, category: category || null, minStock, note, image }, { new: true });
    return responseHelper.success(res, null, 'Cập nhật thành công');
  } catch (err) {
    return responseHelper.error(res, err.message);
  }
};

export const deleteIngredients = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return responseHelper.error(res, "Không có nguyên liệu nào được chọn để xóa", 400)
    }

    const result = await Ingredient.deleteMany({
      _id: { $in: ids }
    })

    return responseHelper.success(res, result.deletedCount , 'Xóa nguyên liệu thành công');
  } catch (err) {
    return responseHelper.error(res, err.message);
  }
};
  