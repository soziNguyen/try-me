import { Ingredient, units } from '../models/ingredient.js'
import { parseNumberField, parseStringField } from '../helpers/common.js'
import IngredientCategory from '../models/IngredientCategory.js'
import responseHelper from '../helpers/responseHelper.js'

export const ingredientDataAPI = async (req, res) => {
  try {
    const draw = parseInt(req.query.draw) || 0
    const start = parseInt(req.query.start) || 0
    const length = parseInt(req.query.length) || 10
    const searchValue = req.query['search[value]'] || ''
    const orderColumnIndex = req.query['order[0][column]']
    let orderField
    let orderDir

    if (orderColumnIndex === undefined) {
      orderField = 'createdAt'
      orderDir = -1
    } else {
      orderField = req.query[`columns[${orderColumnIndex}][data]`] || 'name'
      orderDir = req.query['order[0][dir]'] === 'desc' ? -1 : 1
    }

    let mongoQuery = {}
    const searchNumber = Number(searchValue)

    if (searchValue) {
      const conditions = [
        { name: { $regex: searchValue, $options: 'i' } },
        { unit: { $regex: searchValue, $options: 'i' } },
        { note: { $regex: searchValue, $options: 'i' } }
      ]

      if (!isNaN(searchNumber)) {
        conditions.push({ stock: searchNumber })
      }

      mongoQuery = { $or: conditions }
    }

    let fullData = []
    let recordsFiltered = 0

    // Sắp xếp trong RAM với category
    if (orderField === 'category.name') {
      fullData = await Ingredient.find(mongoQuery)
        .populate('category', 'name')
        .lean()

      fullData.sort((a, b) => {
        const nameA = a.category?.name || ''
        const nameB = b.category?.name || ''
        return orderDir === 1
          ? nameA.localeCompare(nameB)
          : nameB.localeCompare(nameA)
      })

      recordsFiltered = fullData.length
      fullData = fullData.slice(start, start + length)
    } else {
      fullData = await Ingredient.find(mongoQuery)
        .sort({ [orderField]: orderDir })
        .skip(start)
        .limit(length)
        .populate('category', 'name')
        .populate('supplier', 'name')
        .populate('createdBy', 'username -_id')
        .populate('updatedBy', 'username -_id')
        .lean()

      recordsFiltered = await Ingredient.countDocuments(mongoQuery)
    }

    const recordsTotal = await Ingredient.countDocuments()

    res.json({
      draw,
      recordsTotal,
      recordsFiltered,
      data: fullData,
      units
    })

  } catch (err) {
    responseHelper.error(res, err.message)
  }
}

export const createIngredient = async (req, res) => {
  try {

    if (!req.user || !req.user._id) {
      return responseHelper.error(res, 'Thiếu thông tin người dùng', 401)
    }

    const ingredientData = { ...req.body, createdBy: req.user._id }

    const newIngredient = new Ingredient(ingredientData)
    await newIngredient.save()

    const saved = await Ingredient.find(newIngredient._id)
      .populate('category', 'name')
      .populate('createdBy', 'username -_id')
    responseHelper.success(res, saved, 'Tạo nguyên liệu thành công')
  } catch (err) {
    return responseHelper.error(res, err.message)
  }
}

export const updateIngredient = async (req, res) => {
  try {
    const { id } = req.params
    const {
      sku,
      name,
      image,
      unit,
      category,
      costPrice,
      stock,
      supplier,
      expirationDays,
      barcode,
      isActive,
      note } = req.body

    const ingredient = await Ingredient.findById(id)
    if (!ingredient) {
      return responseHelper.error(res, "Nguyên liệu không tồn tại", 404)
    }

    const orConditions = []
    if (sku !== undefined) orConditions.push({ sku })
    if (name !== undefined) orConditions.push({ name })
    
    if (orConditions.length) {
      const existing = await Ingredient.findOne({
        _id: { $ne: id },
        $or: orConditions
       })
      if (existing) {
        return responseHelper.error(res, "SKU hoặc tên nguyên liệu đã tồn tại", 400)
      }
    }

    const updateData = {
      updatedBy: req.user._id
    }

    const parsedSku = parseStringField(sku)
    if (parsedSku) updateData.sku = parsedSku

    const parsedName = parseStringField(name)
    if (parsedName) updateData.name = parsedName

    const parsedImage = parseStringField(image)
    if (parsedImage) updateData.image = parsedImage

    const parsedUnit = parseStringField(unit)
    if (parsedUnit) updateData.unit = parsedUnit

    if (category !== undefined) updateData.category = category

    const parsedCostPrice = parseNumberField(costPrice)
    if (parsedCostPrice) updateData.costPrice = parsedCostPrice

    const parsedStock = parseNumberField(stock)
    if (parsedStock) updateData.stock = parsedStock

    const parsedBarcode = parseStringField(barcode)
    if (parsedBarcode) updateData.barcode = parsedBarcode

    const parsedExpirationDays = parseNumberField(expirationDays)
    if (parsedExpirationDays) updateData.expirationDays = parsedExpirationDays

    if (supplier !== undefined) updateData.supplier = supplier

    if (isActive !== undefined) updateData.isActive = Boolean(isActive)
    

    const parsedNote = parseStringField(note)
    if (parsedNote) updateData.note = note

    const updated = await Ingredient.findByIdAndUpdate(id, updateData, { new: true })
      .populate('category', 'name')
      .populate('supplier', 'name')
      .populate('createdBy', 'username -_id')
      .populate('updatedBy', 'username -_id')
      .lean()
    responseHelper.success(res, updated, 'Cập nhật thành công')
  } catch (err) {
    return responseHelper.error(res, err.message)
  }
}

export const deleteIngredients = async (req, res) => {
  try {
    const { ids } = req.body

    if (!Array.isArray(ids) || ids.length === 0) {
      return responseHelper.error(res, "Không có nguyên liệu nào được chọn để xóa", 400)
    }

    const result = await Ingredient.deleteMany({
      _id: { $in: ids }
    })

  responseHelper.success(res, result.deletedCount , 'Xóa nguyên liệu thành công')
  } catch (err) {
    return responseHelper.error(res, err.message)
  }
}
  