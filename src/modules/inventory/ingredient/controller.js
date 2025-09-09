import { Ingredient, units } from './model.js'
import { deleteFile } from '../../upload/helper.js'
import { parseNumberField, parseStringField } from '../../../helpers/common.js'
import responseHelper from '../../../helpers/responseHelper.js'
import { lookupUser, lookupRef } from '../../../helpers/lookupHelper.js'
import { getCurrentOrg } from '../../../helpers/orgHelper.js'
import { normalizeValue } from '../../../helpers/common.js'
import { logActivity } from '../../activity-logs/service.js'

export const getAllIngredients = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, "Thiếu thông tin tổ chức", 400)
    const pipeline = [
      {
        $match: {
          isActive: true,
          organization: organizationId
        }
      },
      { $sort: { name: 1 } },
      {
        $project: {
          _id: 1, name: 1, unit: 1
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

    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, "Thiếu thông tin tổ chức", 400)

    // Base pipeline
    const pipeline = [
      { $match: { organization: organizationId } },
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
    const recordsTotal = await Ingredient.countDocuments({ organization: organizationId })

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

    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, "Thiếu thông tin tổ chức", 400)

    if (!req.user || !req.user._id) {
      return responseHelper.error(res, 'Thiếu thông tin người dùng', 401)
    }

    const ingredientData = { ...req.body, createdBy: req.user._id, organization: organizationId }

    const newIngredient = new Ingredient(ingredientData)
    await newIngredient.save()

    const saved = await Ingredient.findById(newIngredient._id)
      .populate('category', 'name')
      .populate('createdBy', 'username -_id')

    await logActivity(
      organizationId,
      req.user._id,
      req.user.username || 'Unknown',
      'Tạo nguyên liệu',
      'INGREDIENT',
      `Tạo nguyên liệu ${saved.name}`,
      saved.name,
      'SUCCESS'
    )
    responseHelper.success(res, saved, 'Tạo nguyên liệu thành công')
  } catch (err) {
    if (req?.user?._id) {
      await logActivity(
        getCurrentOrg(req),
        req.user._id,
        req.user.username || 'Unknown',
        'CREATE',
        'INGREDIENT',
        `Lỗi khi tạo nguyên liệu: ${err.message}`,
        req.body?.name || '',
        'FAILED'
      )
    }
    return responseHelper.error(res, err.message)
  }
}

export const updateIngredient = async (req, res) => {
  try {
    const { id } = req.params
    const { sku, name, image, unit, category, expirationDays, isActive, note } = req.body

    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, "Thiếu thông tin tổ chức", 400)

    const ingredient = await Ingredient.findOne({
      _id: id,
      organization: organizationId
    }).populate('category', 'name')
    if (!ingredient) return responseHelper.error(res, "Nguyên liệu không tồn tại", 404)

    const orConditions = []
    if (sku !== undefined) orConditions.push({ sku })
    if (name !== undefined) orConditions.push({ name })

    if (orConditions.length) {
      const existing = await Ingredient.findOne({
        _id: { $ne: id },
        organization: organizationId,
        $or: orConditions
      })
      if (existing) return responseHelper.error(res, "SKU hoặc tên nguyên liệu đã tồn tại", 400)
    }

    const updateData = { updatedBy: req.user._id }

    if (sku !== undefined) updateData.sku = sku
    if (name !== undefined) updateData.name = name
    if (image !== undefined) updateData.image = image
    if (unit !== undefined) updateData.unit = unit === "" ? null : unit
    if (category !== undefined) updateData.category = category === "" ? null : category
    if (expirationDays !== undefined) updateData.expirationDays = expirationDays
    if (isActive !== undefined) updateData.isActive = Boolean(isActive)
    if (note !== undefined) updateData.note = note

    // Lọc field thực sự thay đổi
    const actualChanges = {}
    for (const key in updateData) {
      if (normalizeValue(updateData[key]) !== normalizeValue(ingredient[key])) {
        actualChanges[key] = updateData[key]
      }
    }

    const updated = await Ingredient.findOneAndUpdate(
      { _id: id, organization: organizationId },
      actualChanges,
      { new: true }
    )
      .populate('category', 'name')
      .populate('createdBy', 'username -_id')
      .populate('updatedBy', 'username -_id')
      .lean()

    if (ingredient.image && actualChanges.image && ingredient.image !== actualChanges.image) {
      try {
        await deleteFile(ingredient.image)
      } catch (err) {
        console.error('Không xóa được file cũ:', err)
      }
    }

    // Gộp log các field thay đổi
    const fieldLabels = {
      name: 'Tên nguyên liệu',
      sku: 'Mã SKU',
      unit: 'Đơn vị',
      category: 'Danh mục',
      expirationDays: 'HSD (ngày)',
      isActive: 'Kích hoạt',
      note: 'Ghi chú',
      image: 'Ảnh'
    }

    let description = ''
    if (ingredient && Object.keys(actualChanges).length) {
      description = `Cập nhật nguyên liệu "${ingredient.name}": ` +
        Object.keys(actualChanges)
          .map(key => {
            let oldVal = ingredient?.[key] ?? ''
            if (key === 'category' && oldVal) oldVal = oldVal.name || ''
            let newVal = actualChanges[key]
            if (key === 'category' && newVal) newVal = updated.category?.name || ''
            return `${fieldLabels[key] || key}: "${normalizeValue(oldVal)}" → "${normalizeValue(newVal)}"`
          })
          .join(', ')
    }

    await logActivity(
      organizationId,
      req.user._id,
      req.user.username || 'Unknown',
      'UPDATE',
      'INGREDIENT',
      description,
      ingredient.name,
      'SUCCESS'
    )

    responseHelper.success(res, updated, 'Cập nhật thành công')
  } catch (err) {
    return responseHelper.error(res, err.message)
  }
}

export const deleteIngredients = async (req, res) => {
  try {
    const { ids } = req.body

    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, "Thiếu thông tin tổ chức", 400)

    if (!Array.isArray(ids) || ids.length === 0) {
      return responseHelper.error(res, "Không có nguyên liệu nào được chọn để xóa", 400)
    }

    const ingredientsToDelete = await Ingredient.find({
      _id: { $in: ids },
      organization: organizationId
    }).lean()

    const result = await Ingredient.deleteMany({
      _id: { $in: ids },
      organization: organizationId
    })

    for (const ing of ingredientsToDelete) {
      if (ing.image) {
        try {
          await deleteFile(ing.image)
        } catch (err) {
          console.error(`Không xóa được ảnh của ${ing.name}:`, err)
        }
      }
    }

    await logActivity(
      organizationId,
      req.user._id,
      req.user.username,
      'DELETE',
      'INGREDIENT',
      `Đã xóa ${result.deletedCount} nguyên liệu`,
      ingredientsToDelete.map(i => i.name).join(', '),
      'SUCCESS'
    )

    responseHelper.success(res, result.deletedCount, 'Xóa nguyên liệu thành công')
  } catch (err) {
    if (req?.user?._id) {
      await logActivity(
        getCurrentOrg(req),
        req.user._id,
        req.user.username || 'Unknown',
        'DELETE',
        'INGREDIENT',
        `Lỗi khi xóa nguyên liệu: ${err.message}`,
        req.body?.ids?.join(', ') || '',
        'FAILED'
      )
    }
    return responseHelper.error(res, err.message)
  }
}
