import InvoiceOptions from './model.js'
import responseHelper from '../../helpers/responseHelper.js'
import { getCurrentOrg } from '../../helpers/orgHelper.js'

export const getInvoiceOptions = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    const options = await InvoiceOptions.findOne({ organizationId })
    responseHelper.success(res, options)
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const updateInvoiceOptions = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    const updateData = {}
    Object.keys(req.body).forEach((key) => {
      if (req.body[key] !== undefined) updateData[key] = req.body[key]
    })

    const options = await InvoiceOptions.findOneAndUpdate(
      { organizationId },
      { $set: updateData },
      { upsert: true, new: true }
    )

    responseHelper.success(res, options, 'Cập nhật thành công')
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}
