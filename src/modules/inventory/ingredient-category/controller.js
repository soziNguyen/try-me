import IngredientCategory from './model.js'
import responseHelper from '../../../helpers/responseHelper.js'
import { getCurrentOrg } from '../../../helpers/orgHelper.js'
import { logActivity } from '../../activity-logs/service.js'
import { buildChangeLog } from '../../../helpers/changeLog.js'

export const getIngredientCategories = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)
    const data = await IngredientCategory.find({ organization: organizationId })
      .populate('createdBy', 'username -_id')
      .populate('updatedBy', 'username -_id')
      .sort({ createdAt: -1 })
    responseHelper.success(res, data)
  } catch (err) {
    responseHelper.error(res, err.message)
  }
}

export const createInredientCategory = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    if (!req.user || !req.user._id) {
      return responseHelper.error(res, 'Thiếu thông tin người dùng', 401)
    }

    const categoryData = {
      ...req.body,
      createdBy: req.user._id,
      organization: organizationId
    }

    const newCategory = await IngredientCategory.create(categoryData)

    const saved = await IngredientCategory.findOne({
      _id: newCategory._id,
      organization: organizationId
    }).populate('createdBy', 'username -_id')

    logActivity(
      organizationId,
      req.user._id,
      req.user.username,
      'CREATE',
      'CATEGORIES',
      `Tạo danh mục nguyên liệu`,
      saved.name,
      'SUCCESS'
    )

    return responseHelper.success(res, saved, 'Thêm Danh Mục Nguyên Liệu Thành Công')
  } catch (err) {
    logActivity(
      getCurrentOrg(req),
      req.user?._id,
      req.user?.username,
      'CREATE',
      'CATEGORIES',
      `Lỗi khi tạo danh mục: ${err.message}`,
      req.body?.name || '',
      'FAILED'
    )

    return responseHelper.error(res, err.message)
  }
}

export const updateIngredientCategory = async (req, res) => {
  try {
    const { id } = req.params
    const { name, description } = req.body

    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    const oldCate = await IngredientCategory.findOne({
      _id: id,
      organization: organizationId
    })
    if (!oldCate) {
      return responseHelper.error(res, 'Danh mục không tồn tại', 404)
    }

    const existing = await IngredientCategory.findOne({
      name,
      _id: { $ne: id },
      organization: organizationId
    })
    if (existing) {
      return responseHelper.error(res, 'Tên danh mục nguyên liệu đã tồn tại', 400)
    }

    const updated = await IngredientCategory.findOneAndUpdate(
      { _id: id, organization: organizationId },
      { name, description, updatedBy: req.user._id },
      { new: true }
    )
      .populate('createdBy', 'username -_id')
      .populate('updatedBy', 'username -_id')

    const changeDetailsCat = buildChangeLog(
      oldCate,
      updated,
      [
        { field: 'name', label: 'Tên danh mục' },
        { field: 'description', label: 'Mô tả' }
      ],
      oldCate.name,
      'danh mục'
    )

    logActivity(
      organizationId,
      req.user._id,
      req.user.username,
      'Cập nhật danh mục nguyên liệu',
      'INGREDIENT_CATEGORY',
      changeDetailsCat || 'Không có thay đổi',
      updated.name
    )

    responseHelper.success(res, updated, 'Cập nhật thành công')
  } catch (err) {
    responseHelper.error(res, err.message)
  }
}

export const deleteIngredientCategories = async (req, res) => {
  try {
    const { ids } = req.body

    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    if (!Array.isArray(ids) || ids.length === 0) {
      return responseHelper.error(res, 'Không có danh mục nào được chọn để xóa', 400)
    }

    const result = await IngredientCategory.deleteMany({
      _id: { $in: ids },
      organization: organizationId
    })

    logActivity(
      organizationId,
      req.user._id,
      req.user.username,
      'DELETE',
      'INGREDIENT_CATEGORY',
      `Xóa ${result.deletedCount} danh mục nguyên liệu`,
      '',
      'SUCCESS'
    )

    return responseHelper.success(res, result.deletedCount, 'Xóa danh mục thành công')
  } catch (err) {
    logActivity(
      getCurrentOrg(req),
      req.user?._id,
      req.user?.username,
      'DELETE',
      'INGREDIENT_CATEGORY',
      `Lỗi khi xóa danh mục: ${err.message}`,
      '',
      'FAILED'
    )

    return responseHelper.error(res, err.message)
  }
}
