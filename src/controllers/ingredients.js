import { Ingredient, units } from '../models/ingredient.js';
import IngredientCategory from '../models/IngredientCategory.js';
import responseHelper from '../helpers/responseHelper.js';

export const ingredientDataAPI = async (req, res) => {
  try {
    const draw = parseInt(req.query.draw) || 0;
    const start = parseInt(req.query.start) || 0;
    const length = parseInt(req.query.length) || 10;
    const searchValue = req.query['search[value]'] || '';
    const orderColumnIndex = req.query['order[0][column]'];
    let orderField;
    let orderDir;

    if (orderColumnIndex === undefined) {
      orderField = 'createdAt';
      orderDir = -1;
    } else {
      orderField = req.query[`columns[${orderColumnIndex}][data]`] || 'name';
      orderDir = req.query['order[0][dir]'] === 'desc' ? -1 : 1;
    }

    let mongoQuery = {};
    const searchNumber = Number(searchValue);

    if (searchValue) {
      const conditions = [
        { name: { $regex: searchValue, $options: 'i' } },
        { unit: { $regex: searchValue, $options: 'i' } },
        { note: { $regex: searchValue, $options: 'i' } }
      ];

      if (!isNaN(searchNumber)) {
        conditions.push({ stock: searchNumber });
      }

      mongoQuery = { $or: conditions };
    }

    let fullData = [];
    let recordsFiltered = 0;

    // Sắp xếp trong RAM với category
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
        .populate('createdBy', 'username -_id')
        .populate('updatedBy', 'username -_id')
        .lean();

      recordsFiltered = await Ingredient.countDocuments(mongoQuery);
    }

    const recordsTotal = await Ingredient.countDocuments();

    res.json({
      draw,
      recordsTotal,
      recordsFiltered,
      data: fullData,
      units
    });

  } catch (err) {
    responseHelper.error(res, err.message)
  }
};

export const createIngredient = async (req, res) => {
  try {

    if (!req.user || !req.user._id) {
      return responseHelper.error(res, 'Thiếu thông tin người dùng', 401);
    }

    const ingredientData = { ...req.body, createdBy: req.user._id };

    const newIngredient = new Ingredient(ingredientData);
    await newIngredient.save();

    const saved = await Ingredient.find(newIngredient._id)
      .populate('category', 'name')
      .populate('createdBy', 'username -_id')
    responseHelper.success(res, saved, 'Tạo nguyên liệu thành công');
  } catch (err) {
    return responseHelper.error(res, err.message);
  }
};

export const updateIngredient = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, unit, category, stock, note, image } = req.body;

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

    const updateData = {};

    if (name !== undefined) updateData.name = name;
    if (unit !== undefined) updateData.unit = unit;
    if (category !== undefined) updateData.category = category || null;
    if (stock !== undefined) {
      const rawStock = stock.toString().trim();
      if (rawStock === "") {
        updateData.stock = 0;
      }
      const parsedStock = Number(stock);
      if (isNaN(parsedStock)) {
        return responseHelper.error(res, "Dữ liệu tồn kho phải là một số", 400);
      }
      updateData.stock = parsedStock;
    }
    if (note !== undefined) updateData.note = note;
    if (image !== undefined) updateData.image = image;
    if (req.user._id) updateData.updatedBy = req.user._id;

    const updated = await Ingredient.findByIdAndUpdate(id, updateData, { new: true });
    const populated = await Ingredient.findById(updated._id)
      .populate('category', 'name')
      .populate('createdBy', 'username -_id')
      .populate('updatedBy', 'username -_id')
      .lean();
    responseHelper.success(res, populated, 'Cập nhật thành công');
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

  responseHelper.success(res, result.deletedCount , 'Xóa nguyên liệu thành công');
  } catch (err) {
    return responseHelper.error(res, err.message);
  }
};
  