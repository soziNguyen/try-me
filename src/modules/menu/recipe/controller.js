import { Recipe, units } from './model.js'
import responseHelper from '../../../helpers/responseHelper.js'
import { lookupRef } from '../../../helpers/lookupHelper.js'
import { getCurrentOrg } from '../../../helpers/orgHelper.js'
import { logActivity } from '../../activity-logs/service.js'

export const getActiveRecipes = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    const recipes = await Recipe.find({
      organization: organizationId,
      isActive: true
    })
      .populate('menuItem', '_id name')
      .populate('items.ingredient', '_id name')

    responseHelper.success(res, recipes)
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const getRecipes = async (req, res) => {
  try {
    const draw = +req.query.draw || 0
    const start = +req.query.start || 0
    const length = +req.query.length || 10
    const searchValue = (req.query['search[value]'] || '').trim()
    const colIdx = req.query['order[0][column]']
    const sortField = req.query[`columns[${colIdx}][data]`] || 'createdAt'
    const sortDir = req.query['order[0][dir]'] === 'asc' ? 1 : -1

    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    const totalRecords = await Recipe.countDocuments({
      organization: organizationId
    })

    const pipeline = [
      { $match: { organization: organizationId } },
      ...lookupRef('menuItem', 'MenuItems'),
      { $unwind: { path: '$items', preserveNullAndEmptyArrays: true } },
      ...lookupRef('items.ingredient', 'Ingredients', { as: 'ingredient' })
    ]

    if (searchValue) {
      const searchNumber = Number(searchValue)
      const orConditions = [
        { 'menuItem.name': { $regex: searchValue, $options: 'i' } },
        { 'ingredient.name': { $regex: searchValue, $options: 'i' } },
        { note: { $regex: searchValue, $options: 'i' } }
      ]

      if (!isNaN(searchNumber)) {
        orConditions.push({
          items: { $elemMatch: { quantity: searchNumber } }
        })
      }
      pipeline.push({ $match: { $or: orConditions } })
    }

    pipeline.push(
      {
        $addFields: {
          'items.ingredient': {
            _id: '$ingredient._id',
            name: '$ingredient.name'
          }
        }
      },
      {
        $group: {
          _id: '$_id',
          menuItem: { $first: '$menuItem' },
          items: { $push: '$items' },
          note: { $first: '$note' },
          isActive: { $first: '$isActive' },
          createdAt: { $first: '$createdAt' },
          updatedAt: { $first: '$updatedAt' }
        }
      }
    )

    const countFiltered = await Recipe.aggregate([...pipeline, { $count: 'count' }])
    const recordsFiltered = countFiltered[0]?.count || 0

    pipeline.push({ $sort: { [sortField]: sortDir } })
    pipeline.push({ $skip: start })
    pipeline.push({ $limit: length })

    const data = await Recipe.aggregate(pipeline)

    res.json({
      draw,
      recordsTotal: totalRecords,
      recordsFiltered,
      data,
      units
    })
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const getRecipeById = async (req, res) => {
  try {
    const { id } = req.params
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    if (!id) {
      return responseHelper.error(res, 'ID không hợp lệ', 400)
    }

    const recipe = await Recipe.findOne({
      _id: id,
      organization: organizationId
    })
      .populate('menuItem', '_id name')
      .populate('items.ingredient', '_id name')

    if (!recipe) return responseHelper.error(res, 'Không tìm thấy công thức', 404)

    responseHelper.success(res, { recipe, units }, 'Lấy thông tin công thức thành công')
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const createRecipe = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    const { menuItem, items, note } = req.body

    const recipe = new Recipe({
      organization: organizationId,
      menuItem,
      items,
      note
    })

    await recipe.save()

    logActivity(
      organizationId,
      req.user._id,
      req.user.username || 'Unknown',
      'CREATE',
      'RECIPE',
      `Thêm mới công thức món ăn`,
      recipe.name
    )

    responseHelper.success(res, recipe, 'Tạo thành công')
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const updateRecipe = async (req, res) => {
  try {
    const { id } = req.params
    const { menuItem, items, note } = req.body

    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    if (!id) return responseHelper.error(res, 'Thiếu ID công thức', 400)
    if (!menuItem) return responseHelper.error(res, 'Thiếu món ăn', 400)

    if (!Array.isArray(items) || items.length === 0) {
      return responseHelper.error(res, 'Công thức phải có ít nhất 1 nguyên liệu', 400)
    }

    for (const it of items) {
      if (!it.ingredient || !it.quantity || !it.unit) {
        return responseHelper.error(res, 'Vui lòng điền đầy đủ thông tin', 400)
      }
      if (it.quantity <= 0) {
        return responseHelper.error(res, 'Số lượng phải lớn hơn 0', 400)
      }
    }

    const oldRecipe = await Recipe.findOne({
      _id: id,
      organization: organizationId
    })
      .populate('menuItem', '_id name')
      .populate('items.ingredient', '_id name')

    if (!oldRecipe) {
      return responseHelper.error(res, 'Không tìm thấy công thức', 404)
    }

    const recipe = await Recipe.findOneAndUpdate(
      { _id: id, organization: organizationId },
      { menuItem, items, note },
      { new: true }
    )
      .populate('menuItem', '_id name')
      .populate('items.ingredient', '_id name')

    if (!recipe) {
      return responseHelper.error(res, 'Cập nhật thất bại', 400)
    }

    const changes = []

    if (oldRecipe.menuItem?._id?.toString() !== recipe.menuItem?._id?.toString()) {
      changes.push(
        `Món ăn: "${oldRecipe.menuItem?.name || '(Trống)'}" → "${recipe.menuItem?.name || '(Trống)'}"`
      )
    }

    if ((oldRecipe.note || '') !== (recipe.note || '')) {
      changes.push(`Ghi chú: "${oldRecipe.note || '(Trống)'}" → "${recipe.note || '(Trống)'}"`)
    }

    const deltaMap = new Map()

    for (const oldItem of oldRecipe.items) {
      if (oldItem.ingredient) {
        const ingId = oldItem.ingredient._id.toString()
        deltaMap.set(ingId, {
          name: oldItem.ingredient.name,
          unit: oldItem.unit,
          old: oldItem.quantity,
          new: 0,
          delta: -oldItem.quantity
        })
      }
    }

    // Ghi nhận số lượng mới và tính delta
    for (const newItem of items) {
      const ingId = newItem.ingredient.toString()
      const existing = deltaMap.get(ingId)

      if (existing) {
        existing.new = newItem.quantity
        existing.unit = newItem.unit
        existing.delta = newItem.quantity - existing.old
      } else {
        const ingredientName =
          recipe.items.find((i) => i.ingredient._id.toString() === ingId)?.ingredient?.name || 'N/A'

        deltaMap.set(ingId, {
          name: ingredientName,
          unit: newItem.unit,
          old: 0,
          new: newItem.quantity,
          delta: newItem.quantity
        })
      }
    }

    const itemChanges = []
    // Phần ghi lại thay đổi mới -> cũ
    for (const [ingId, data] of deltaMap) {
      if (data.delta !== 0) {
        if (data.old === 0) {
          itemChanges.push(`Thêm "${data.name}": ${data.new} ${data.unit}`)
        } else if (data.new === 0) {
          itemChanges.push(`Xóa "${data.name}": ${data.old} ${data.unit}`)
        } else {
          itemChanges.push(`"${data.name}": ${data.old} ${data.unit} →
             ${data.new} ${data.unit}`)
        }
      } else {
        const oldItem = oldRecipe.items.find((i) => i.ingredient._id.toString() === ingId)
        if (oldItem && oldItem.unit !== data.unit) {
          itemChanges.push(`"${data.name}": Đơn vị ${oldItem.unit} → ${data.unit}`)
        }
      }
    }

    if (itemChanges.length > 0) {
      changes.push(`Nguyên liệu: ${itemChanges.join('; ')}`)
    }

    if (changes.length > 0) {
      const description = `Cập nhật công thức: ${recipe.menuItem?.name || 'N/A'} - ${changes.join(' | ')}`

      logActivity(
        organizationId,
        req.user._id,
        req.user.username,
        'UPDATE',
        'RECIPE',
        description,
        recipe._id.toString(),
        'SUCCESS',
        null
      )
    }
    responseHelper.success(res, recipe, 'Cập nhật thành công')
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const deleteRecipes = async (req, res) => {
  try {
    const { ids } = req.body
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    if (!Array.isArray(ids) || ids.length === 0) {
      return responseHelper.error(res, 'Không có công thức nào được chọn để xóa', 400)
    }

    const result = await Recipe.deleteMany({
      _id: { $in: ids },
      organization: organizationId
    })

    logActivity(
      organizationId,
      req.user._id,
      req.user.username,
      'DELETE',
      'RECIPE',
      `Đã xóa ${result.deletedCount} công thức`
    )

    responseHelper.success(res, result.deletedCount, 'Xóa thành công')
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}
