import { Ingredient, units } from '../models/ingredient.js'
import { parseNumberField, parseStringField } from '../helpers/common.js'
import responseHelper from '../helpers/responseHelper.js'
import { lookupUser, lookupRef } from '../helpers/lookupHelper.js'
import mongoose from 'mongoose'

export const getAllIngredients = async (req, res) => {
  try {
    const pipeline = [
     { $match: { isActive: true }},
     { $sort: { name: 1 }},
     { $project: {
        _id: 1, name: 1 
        } 
      }
    ]
    const ings = await Ingredient.aggregate(pipeline)
    responseHelper.success(res, ings)
  } catch (err) {
    responseHelper.error(res, err.message)
  }
}

export const ingredientDataAPI = async (req, res) => {
  try {
    const draw = +req.query.draw || 0
    const start = +req.query.start || 0
    const length = +req.query.length || 10
    const searchValue = (req.query['search[value]'] || '').trim()
    const colIdx = req.query['order[0][column]']
    const sortField = req.query[`columns[${colIdx}][data]`] || 'createdAt'
    const sortDir = req.query['order[0][dir]'] === 'asc' ? 1 : -1

    // Base pipeline
    const pipeline = [
      ...lookupRef('category', 'IngredientCategories', { as: 'category' }),
      ...lookupUser('createdBy'),
      ...lookupUser('updatedBy')
    ]

    // Add search conditions if search value exists
    if (searchValue) {
      const searchNumber = Number(searchValue)
      const orConditions = [
        { name: { $regex: searchValue, $options: 'i' } },
        { sku: { $regex: searchValue, $options: 'i' } },
        { unit: { $regex: searchValue, $options: 'i' } },
        { note: { $regex: searchValue, $options: 'i' } },
        { "category.name": { $regex: searchValue, $options: 'i' } }
      ]

      // Add numeric search for stock and expirationDays if searchValue is a number
      if (!isNaN(searchNumber)) {
        orConditions.push(
          { stock: searchNumber },
          { expirationDays: searchNumber }
        )
      }

      pipeline.push({ $match: { $or: orConditions } })
    }

    // Get total count
    const totalResult = await Ingredient.countDocuments({})
    const recordsTotal = totalResult

    // Get filtered count
    const countPipeline = [...pipeline, { $count: 'count' }]
    const countResult = await Ingredient.aggregate(countPipeline)
    const recordsFiltered = countResult.length > 0 ? countResult[0].count : 0

    // Build sort object
    const sortObj = {}
    switch (sortField) {
      case 'name':
        sortObj.name = sortDir
        break
      case 'sku':
        sortObj.sku = sortDir
        break
      case 'unit':
        sortObj.unit = sortDir
        break
      case 'stock':
        sortObj.stock = sortDir
        break
      case 'expirationDays':
        sortObj.expirationDays = sortDir
        break
      case 'note':
        sortObj.note = sortDir
        break
      case 'category':
      case 'category.name':
        sortObj['category.name'] = sortDir
        break
      case 'createdBy':
        sortObj['createdBy.username'] = sortDir
        break
      case 'updatedBy':
        sortObj['updatedBy.username'] = sortDir
        break
      case 'isActive':
        sortObj.isActive = sortDir
        break
      default:
        sortObj[sortField] = sortDir
    }

    // Add sorting, pagination, and projection
    pipeline.push(
      { $sort: sortObj },
      { $skip: start },
      { $limit: length },
      {
        $project: {
          _id: 1,
          name: 1,
          sku: 1,
          image: 1,
          unit: 1,
          stock: 1,
          expirationDays: 1,
          note: 1,
          isActive: 1,
          createdAt: 1,
          updatedAt: 1,
          category: {
            _id: "$category._id",
            name: "$category.name"
          },
          createdBy: {
            username: "$createdBy.username"
          },
          updatedBy: {
            username: "$updatedBy.username"
          }
        }
      }
    )

    // Execute the main query
    const data = await Ingredient.aggregate(pipeline)

    return res.json({
      draw,
      recordsTotal,
      recordsFiltered,
      data,
      units
    })

  } catch (error) {
    console.error('Error in ingredientDataAPI:', error)
    return res.status(500).json({
      draw: +req.query.draw || 0,
      recordsTotal: 0,
      recordsFiltered: 0,
      data: [],
      error: error.message
    })
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

    const saved = await Ingredient.findById(newIngredient._id)
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
      stock,
      expirationDays,
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

    if (unit !== undefined) {
      updateData.unit = unit === "" ? null : unit
    }

    if (category !== undefined) {
      updateData.category = category === "" ? null : category
    }

    const parsedStock = parseNumberField(stock)
    if (parsedStock !== undefined) updateData.stock = parsedStock

    const parsedExpirationDays = parseNumberField(expirationDays)
    if (parsedExpirationDays !== undefined) updateData.expirationDays = parsedExpirationDays

    if (isActive !== undefined) updateData.isActive = Boolean(isActive)
    

    const parsedNote = parseStringField(note)
    if (parsedNote) updateData.note = parsedNote

    const updated = await Ingredient.findByIdAndUpdate(id, updateData, { new: true })
      .populate('category', 'name')
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

    responseHelper.success(res, result.deletedCount, 'Xóa nguyên liệu thành công')
  } catch (err) {
    return responseHelper.error(res, err.message)
  }
}