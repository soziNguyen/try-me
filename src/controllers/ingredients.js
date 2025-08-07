import { Ingredient, units } from '../models/ingredient.js'
import { parseNumberField, parseStringField } from '../helpers/common.js'
import IngredientCategory from '../models/IngredientCategory.js'
import responseHelper from '../helpers/responseHelper.js'
import mongoose from 'mongoose'

export const getAllIngredients = async (req, res) => {
  try {
    const ings = await Ingredient.aggregate([
      { $match: { isActive: true } },
      { $project: { _id: 1, name: 1 } },
      { $sort: { name: 1 } }
    ])
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

    // Khởi tạo pipeline
    const pipeline = [
      {
        $lookup: {
          from: 'IngredientCategories',
          localField: 'category',
          foreignField: '_id',
          as: 'category'
        }
      },
      {
        $unwind: {
          path: '$category',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'Users',
          localField: 'createdBy',
          foreignField: '_id',
          as: 'createdBy'
        }
      },
      {
        $unwind: {
          path: '$createdBy',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'Users',
          localField: 'updatedBy',
          foreignField: '_id',
          as: 'updatedBy'
        }
      },
      {
        $unwind: {
          path: '$updatedBy',
          preserveNullAndEmptyArrays: true
        }
      }
    ]

    // Search
    if (searchValue) {
      const isNumeric = !isNaN(searchValue)
      const orConditions = [
        { sku: { $regex: searchValue, $options: 'i' } },
        { name: { $regex: searchValue, $options: 'i' } },
        { 'category.name': { $regex: searchValue, $options: 'i' } },
        { unit: { $regex: searchValue, $options: 'i' } },
        { note: { $regex: searchValue, $options: 'i' } }
      ]

      if (isNumeric) {
        orConditions.push({ stock: Number(searchValue) })
      }

      pipeline.push({
        $match: { $or: orConditions }
      })
    }

    // Đếm bản ghi sau lọc (recordsFiltered)
    const countPipeline = [...pipeline, { $count: 'count' }]
    const countResult = await Ingredient.aggregate(countPipeline)
    const recordsFiltered = countResult[0]?.count || 0

    // Sort
    const sortObj = {}
    switch (sortField) {
      case 'category.name':
      case 'category':
        sortObj['category.name'] = sortDir
        break
      case 'createdBy.username':
      case 'createdBy':
        sortObj['createdBy.username'] = sortDir
        break
      case 'updatedBy.username':
      case 'updatedBy':
        sortObj['updatedBy.username'] = sortDir
        break
      case 'stock':
      case 'expirationDays':
        sortObj[sortField] = sortDir
        break
      default:
        sortObj[sortField] = sortDir
    }
    pipeline.push({ $sort: sortObj })

    // Pagination
    pipeline.push({ $skip: start })
    pipeline.push({ $limit: length })

    // Project dữ liệu
    pipeline.push({
      $project: {
        _id: 1,
        sku: 1,
        name: 1,
        image: 1,
        unit: 1,
        stock: 1,
        expirationDays: 1,
        isActive: 1,
        note: 1,
        createdAt: 1,
        updatedAt: 1,
        category: {
          _id: '$category._id',
          name: '$category.name'
        },
        createdBy: {
          username: '$createdBy.username'
        },
        updatedBy: {
          username: '$updatedBy.username'
        }
      }
    })

    // Lấy dữ liệu và tổng bản ghi
    const data = await Ingredient.aggregate(pipeline)
    const recordsTotal = await Ingredient.countDocuments()

    return res.json({
      draw,
      recordsTotal,
      recordsFiltered,
      data,
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

    // Use aggregate to get populated data
    const saved = await Ingredient.aggregate([
      { $match: { _id: newIngredient._id } },
      {
        $lookup: {
          from: 'IngredientCategories',
          localField: 'category',
          foreignField: '_id',
          as: 'category'
        }
      },
      {
        $lookup: {
          from: 'Users',
          localField: 'createdBy',
          foreignField: '_id',
          as: 'createdBy'
        }
      },
      {
        $addFields: {
          category: { $arrayElemAt: ['$category', 0] },
          createdBy: { $arrayElemAt: ['$createdBy', 0] }
        }
      },
      {
        $project: {
          _id: 1,
          sku: 1,
          name: 1,
          image: 1,
          unit: 1,
          stock: 1,
          expirationDays: 1,
          isActive: 1,
          note: 1,
          createdAt: 1,
          updatedAt: 1,
          'category._id': 1,
          'category.name': 1,
          'createdBy.username': 1
        }
      }
    ])

    responseHelper.success(res, saved[0], 'Tạo nguyên liệu thành công')
  } catch (err) {
    return responseHelper.error(res, err.message)
  }
}

export const updateIngredient = async (req, res) => {
  try {
    const { id } = req.params
    const { sku, name, image, unit, category, expirationDays, isActive, note } = req.body

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

    const parsedExpirationDays = parseNumberField(expirationDays)
    if (parsedExpirationDays) updateData.expirationDays = parsedExpirationDays

    if (isActive !== undefined) updateData.isActive = Boolean(isActive)

    const parsedNote = parseStringField(note)
    if (parsedNote) updateData.note = note

    // Update the document
    await Ingredient.findByIdAndUpdate(id, updateData, { new: true })

    // Use aggregate to get updated data with populated fields
    const updated = await Ingredient.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(String(id)) } },
      {
        $lookup: {
          from: 'IngredientCategories',
          localField: 'category',
          foreignField: '_id',
          as: 'category'
        }
      },
      {
        $lookup: {
          from: 'Users',
          localField: 'createdBy',
          foreignField: '_id',
          as: 'createdBy'
        }
      },
      {
        $lookup: {
          from: 'Users',
          localField: 'updatedBy',
          foreignField: '_id',
          as: 'updatedBy'
        }
      },
      {
        $addFields: {
          category: { $arrayElemAt: ['$category', 0] },
          createdBy: { $arrayElemAt: ['$createdBy', 0] },
          updatedBy: { $arrayElemAt: ['$updatedBy', 0] }
        }
      },
      {
        $project: {
          _id: 1,
          sku: 1,
          name: 1,
          image: 1,
          unit: 1,
          stock: 1,
          expirationDays: 1,
          isActive: 1,
          note: 1,
          createdAt: 1,
          updatedAt: 1,
          'category._id': 1,
          'category.name': 1,
          'createdBy.username': 1,
          'updatedBy.username': 1
        }
      }
    ])

    responseHelper.success(res, updated[0], 'Cập nhật thành công')
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