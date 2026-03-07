import responseHelper from '../../helpers/responseHelper.js'
import Plan from './model.js'
import Organization from '../organization/model.js'
import { getCurrentOrg } from '../../helpers/orgHelper.js'
import CouponPlan from '../coupon-plan/model.js'
import PlanTransaction from '../plan-transaction/model.js'
import { generateInvoiceCodeForPlan } from '../../helpers/generateInvoiceCode.js'
import withTransaction from '../../helpers/withTransaction.js'
import BusinessError from '../error/BusinessError.js'
import BillingWallet from '../billing-wallet/model.js'
import BillingWalletTransaction from '../billing-wallet-transaction/model.js'
import { logActivity } from '../activity-logs/service.js'
import { buildChangeLog } from '../../helpers/changeLog.js'

// Lấy tất cả các gói (chỉ hiển thị gói active)
export const getActivePlans = async (req, res) => {
  try {
    const plans = await Plan.find({ isActive: true }).sort({ level: 1 })
    return responseHelper.success(res, plans)
  } catch (error) {
    return responseHelper.error(res, error.message)
  }
}

// Lấy tất cả các gói (bao gồm cả inactive - dành cho admin)
export const getAllPlansAdmin = async (req, res) => {
  try {
    const draw = +req.query.draw || 0
    const start = +req.query.start || 0
    const length = +req.query.length || 10
    const searchValue = (req.query['search[value]'] || '').trim()
    const colIdx = req.query['order[0][column]']
    const sortField = req.query[`columns[${colIdx}][data]`] || 'createdAt'
    const sortDir = req.query['order[0][dir]'] === 'asc' ? 1 : -1

    // Query gốc
    let query = {}

    // Tìm kiếm
    if (searchValue) {
      const tokens = searchValue.split(/\s+/).filter(Boolean)
      const andConditions = tokens.map((token) => {
        const regex = { $regex: token, $options: 'i' }
        return {
          $or: [{ name: regex }, { description: regex }]
        }
      })
      query = { $and: andConditions }
    }

    // Lấy tổng số bản ghi
    const recordsTotal = await Plan.countDocuments()

    // Lấy số bản ghi đã lọc
    const recordsFiltered = await Plan.countDocuments(query)

    // Xử lý sắp xếp
    const sortObj = {}
    switch (sortField) {
      case 'code':
        sortObj.code = sortDir
        break
      case 'name':
        sortObj.name = sortDir
        break
      case 'priceMonth':
        sortObj.priceMonth = sortDir
        break
      case 'priceYear':
        sortObj.priceYear = sortDir
        break
      case 'warehouseLimit':
        sortObj.warehouseLimit = sortDir
        break
      case 'staffLimit':
        sortObj.staffLimit = sortDir
        break
      case 'isActive':
        sortObj.isActive = sortDir
        break
      default:
        sortObj[sortField] = sortDir
    }

    // Thực hiện truy vấn với sắp xếp và phân trang
    const data = await Plan.find(query).sort(sortObj).skip(start).limit(length).lean()

    return res.json({
      draw,
      recordsTotal,
      recordsFiltered,
      data
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

export const getPlanByCode = async (req, res) => {
  try {
    const { code } = req.params
    if (!code) return responseHelper.error(res, 'Thiếu mã gói', 400)

    const plan = await Plan.findOne({ code }).lean()
    if (!plan) return responseHelper.error(res, 'Không tìm thấy gói', 404)

    responseHelper.success(res, plan)
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

// Lấy chi tiết một gói theo ID
export const getPlanById = async (req, res) => {
  try {
    const { id } = req.params
    const plan = await Plan.findById(id)

    if (!plan) {
      return responseHelper.error(res, 'Không tìm thấy gói', 404)
    }

    return responseHelper.success(res, plan)
  } catch (error) {
    return responseHelper.error(res, error.message)
  }
}

// Tạo gói mới (dành cho admin)
export const createPlan = async (req, res) => {
  try {
    const newPlan = new Plan(req.body)

    await newPlan.save()

    logActivity(
      null,
      req.user?._id || null,
      req.user?.username || null,
      'CREATE',
      'PLAN',
      'THÊM MỚI GÓI DỊCH VỤ'
    )

    return responseHelper.success(res, newPlan)
  } catch (error) {
    return responseHelper.error(res, error.message)
  }
}

// Cập nhật gói (dành cho admin)
export const updatePlan = async (req, res) => {
  try {
    const { id } = req.params
    const {
      level,
      code,
      name,
      priceMonth,
      priceYear,
      originalPrice,
      warehouseLimit,
      staffLimit,
      description,
      isActive
    } = req.body

    const plan = await Plan.findById(id)
    if (!plan) {
      return responseHelper.error(res, 'Không tìm thấy gói', 404)
    }

    const oldPlan = plan.toObject() // lưu bản cũ để build change log

    // Kiểm tra trùng code
    if (code && code.trim().toUpperCase() !== plan.code) {
      const existingCode = await Plan.findOne({ code: code.trim().toUpperCase(), _id: { $ne: id } })
      if (existingCode) {
        return responseHelper.error(res, 'Mã gói đã tồn tại', 409)
      }
    }

    // Kiểm tra trùng name
    if (name && name.trim().toUpperCase() !== plan.name) {
      const existingPlan = await Plan.findOne({ name: name.trim().toUpperCase(), _id: { $ne: id } })
      if (existingPlan) {
        return responseHelper.error(res, 'Tên gói đã tồn tại', 409)
      }
    }

    // Cập nhật các trường
    if (level) plan.level = level
    if (code) plan.code = code.trim().toUpperCase()
    if (name) plan.name = name.trim().toUpperCase()
    if (priceMonth !== undefined) plan.priceMonth = priceMonth
    if (priceYear !== undefined) plan.priceYear = priceYear
    if (originalPrice !== undefined) plan.originalPrice = originalPrice
    if (warehouseLimit !== undefined) plan.warehouseLimit = warehouseLimit
    if (staffLimit !== undefined) plan.staffLimit = staffLimit
    if (description !== undefined) plan.description = description
    if (isActive !== undefined) plan.isActive = isActive

    const updatedPlan = await plan.save()

    // Build change log
    const changeLog = buildChangeLog(
      oldPlan,
      updatedPlan.toObject(),
      [
        { field: 'level', label: 'Cấp độ' },
        { field: 'code', label: 'Mã gói' },
        { field: 'name', label: 'Tên gói' },
        { field: 'priceMonth', label: 'Giá tháng' },
        { field: 'priceYear', label: 'Giá năm' },
        { field: 'originalPrice', label: 'Giá gốc' },
        { field: 'warehouseLimit', label: 'Số kho tối đa' },
        { field: 'staffLimit', label: 'Số nhân viên tối đa' },
        { field: 'description', label: 'Mô tả' },
        { field: 'isActive', label: 'Trạng thái' }
      ],
      updatedPlan.name,
      'gói dịch vụ'
    )

    if (changeLog) {
      logActivity(
        updatedPlan._id,
        req.user?._id,
        req.user?.username,
        'UPDATE',
        'PLAN',
        changeLog,
        updatedPlan.name
      )
    }

    return responseHelper.success(res, updatedPlan, 'Cập nhật gói thành công')
  } catch (error) {
    console.error('Update Plan error:', error)
    return responseHelper.error(res, error.message)
  }
}

// Xóa vĩnh viễn gói (dành cho admin)
export const hardDeletePlan = async (req, res) => {
  try {
    const { ids } = req.body

    if (!Array.isArray(ids) || ids.length === 0) {
      return responseHelper.error(res, 'Không có gói nào được chọn để xóa', 400)
    }

    const inUse = await Organization.exists({ plan: { $in: ids } })

    if (inUse) {
      return responseHelper.error(res, 'Không thể xóa vì có tổ chức đang sử dụng gói này', 400)
    }

    const result = await Plan.deleteMany({ _id: { $in: ids } })

    logActivity(
      null,
      req.user?._id || null,
      req.user?.username || null,
      'DELETE',
      'PLAN',
      `ĐÃ XÓA ${result.deletedCount} GÓI DỊCH VỤ`
    )

    return responseHelper.success(res, result.deletedCount, 'Xóa vĩnh viễn gói thành công')
  } catch (error) {
    return responseHelper.error(res, error.message)
  }
}

export const upgradePlan = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req)
    const { planId, mode, duration, paymentMethodId, couponCode } = req.body // mode: month/ year

    const now = new Date()

    if (!organizationId) return responseHelper.error(res, 'Không tìm thấy tổ chức', 400)
    if (!planId) return responseHelper.error(res, 'Thiếu ID gói dịch vụ', 400)
    if (!mode || !['month', 'year'].includes(mode)) {
      return responseHelper.error(res, 'Mode không hợp lệ (month/year)', 400)
    }

    // Tìm gói dịch vụ đang hoạt động
    const plan = await Plan.findOne({ _id: planId, isActive: true })
    if (!plan) {
      return responseHelper.error(res, 'Gói dịch vụ không hợp lệ hoặc đã ngừng hoạt động', 404)
    }

    // Lấy tổ chức hiện tại
    const org = await Organization.findById(organizationId).populate('plan')
    if (!org) return responseHelper.error(res, 'Không tìm thấy tổ chức', 404)

    // Kiểm tra nếu cùng gói hoặc hạ cấp
    // Nếu cùng plan
    if (org.plan && org.plan.code === plan.code) {
      const currentDuration = org.planDuration || 1

      const isUsingYear = currentDuration >= 12
      const isUpgradeToYear = mode === 'year'

      // Nếu đang dùng year và lại chọn year -> chặn
      // Nếu đang dùng month và lại chọn month -> chặn
      if ((isUsingYear && isUpgradeToYear) || (!isUsingYear && !isUpgradeToYear)) {
        return responseHelper.error(res, 'Bạn đang sử dụng gói này rồi', 400)
      }
    }

    // Không cho hạ cấp
    if (org.plan && org.plan.level > plan.level) {
      return responseHelper.error(res, 'Không thể hạ cấp sang gói thấp hơn', 400)
    }

    // PHÂN LUỒNG 1: GỌI TỪ TRANG DANH SÁCH (không có duration)
    if (!duration) {
      // Check có pending transaction nào không (bất kể duration)
      const existingTransaction = await PlanTransaction.findOne({
        organization: organizationId,
        plan: planId,
        mode: mode, //them
        status: 'pending',
        paidAt: null
      }).sort({ createdAt: -1 })

      if (existingTransaction) {
        return responseHelper.success(
          res,
          {
            redirect: `/checkout/${existingTransaction._id}/invoice`,
            transactionId: existingTransaction._id
          },
          'Bạn đã có đơn hàng chờ thanh toán cho gói này. Đang chuyển hướng đến trang thanh toán.'
        )
      }

      // Chưa có pending -> redirect sang trang confirm
      return responseHelper.success(
        res,
        {
          redirect: `/checkout/${planId}?mode=${mode}`
        },
        'Đang chuyển đến trang xác nhận...'
      )
    }

    // PHÂN LUỒNG 2: GỌI TỪ TRANG CONFIRM (có duration)

    // Validate duration
    const durationNum = parseInt(duration)
    if (isNaN(durationNum) || durationNum < 1) {
      return responseHelper.error(res, 'Duration không hợp lệ', 400)
    }

    // Check pending với ĐÚNG plan + mode + duration
    const existingTransactionWithDuration = await PlanTransaction.findOne({
      organization: organizationId,
      plan: planId,
      mode: mode,
      duration: durationNum,
      status: 'pending',
      paidAt: null
    }).sort({ createdAt: -1 })

    if (existingTransactionWithDuration) {
      return responseHelper.success(
        res,
        {
          redirect: `/checkout/${existingTransactionWithDuration._id}/invoice`,
          transactionId: existingTransactionWithDuration._id
        },
        'Đơn hàng này đã tồn tại. Đang chuyển đến hóa đơn...'
      )
    }

    // START TRANSACTION
    const result = await withTransaction(async (session) => {
      const basePrice = mode === 'year' ? plan.priceYear : plan.priceMonth
      const totalBasePrice = basePrice * durationNum
      let discountAmount = 0
      let couponUsed = null

      // ÁP DỤNG MÃ GIẢM GIÁ
      if (couponCode) {
        const coupon = await CouponPlan.findOneAndUpdate(
          {
            isActive: true,
            code: couponCode,
            startDate: { $lte: now },
            endDate: { $gte: now },
            $expr: {
              $or: [{ $eq: ['$usageLimit', null] }, { $lt: ['$usedCount', '$usageLimit'] }]
            }
          },
          { $inc: { usedCount: 1 } },
          { new: true, session }
        )

        if (!coupon) {
          logActivity(
            organizationId,
            req.user._id,
            req.user.username,
            'UPGRADE_PLAN',
            'PLAN',
            `Áp dụng mã giảm giá ${couponCode}`,
            plan.name,
            'FAILED'
          )
          throw new BusinessError('Mã giảm giá không hợp lệ hoặc đã hết hạn', 400)
        }

        couponUsed = coupon
        discountAmount =
          coupon.discountType === 'percent'
            ? Math.round((totalBasePrice * coupon.discountValue) / 100)
            : coupon.discountValue
      }

      // TÍNH GIÁ CUỐI CÙNG
      const subtotal = Math.max(totalBasePrice - discountAmount, 0)
      const vatRate = 0.1
      const vat = Math.round(subtotal * vatRate)
      const total = subtotal + vat

      let isPaid = false
      if (paymentMethodId) {
        const wallet = await BillingWallet.findOne(
          {
            _id: paymentMethodId,
            organization: organizationId
          },
          null,
          { session }
        )

        if (wallet) {
          if (wallet.balance < total) {
            throw new BusinessError('Số dư trong ví không đủ để thanh toán', 400)
          }

          wallet.balance -= total
          await wallet.save({ session })

          await BillingWalletTransaction.create(
            [
              {
                wallet: wallet._id,
                organization: organizationId,
                type: 'debit',
                amount: total,
                reason: `Thanh toán nâng cấp gói ${plan.name}`,
                source: 'upgrade',
                paymentProvider: 'manual',
                balanceAfter: wallet.balance,
                status: 'completed'
              }
            ],
            { session }
          )

          isPaid = true
        }
      }

      // TẠO MÃ HÓA ĐƠN
      const invoiceCode = await generateInvoiceCodeForPlan(PlanTransaction, 'HD')

      // TẠO TRANSACTION
      const [transaction] = await PlanTransaction.create(
        [
          {
            code: invoiceCode,
            organization: organizationId,
            plan: plan._id,
            mode,
            duration: durationNum,
            amount: totalBasePrice,
            discountAmount,
            couponCode: couponUsed?.code || '',
            subtotal,
            vat,
            total,
            paidAt: null,
            expiredAt: null,
            paymentMethod: paymentMethodId,
            note: `Tổ chức ${org.name} nâng cấp gói ${plan.name} - ${durationNum} ${
              mode === 'year' ? 'năm' : 'tháng'
            }`,
            status: isPaid ? 'paid' : 'pending'
          }
        ],
        { session }
      )

      if (isPaid) {
        const expireAt = new Date()

        if (mode === 'year') {
          expireAt.setFullYear(expireAt.getFullYear() + durationNum)
        } else {
          expireAt.setMonth(expireAt.getMonth() + durationNum)
        }

        // cập nhật transaction
        transaction.paidAt = new Date()
        transaction.expiredAt = expireAt
        transaction.status = 'paid'
        await transaction.save({ session })

        // cập nhật organization
        org.plan = plan._id
        org.planExpiredAt = expireAt
        org.lastUpgradedAt = new Date()

        // LƯU THÔNG TIN CHU KỲ
        org.planDuration = mode === 'year' ? durationNum * 12 : durationNum
        org.planTotalPaid = totalBasePrice // Giá gốc = basePrice * duration

        await org.save({ session })
      }

      return { transaction, total }
    })
    //END TRANSACTION

    logActivity(
      organizationId,
      req.user._id,
      req.user.username,
      'UPGRADE_PLAN',
      'PLAN',
      `Gửi yêu cầu nâng cấp gói: Mã gói ${plan.code}, Thời hạn: ${durationNum} ${
        mode === 'month' ? 'Tháng' : 'Năm'
      }, Tổng: ${result.total} đ`,
      plan.name,
      'SUCCESS'
    )

    return responseHelper.success(
      res,
      {
        redirect: `/checkout/${result.transaction._id}/invoice`,
        transactionId: result.transaction._id,
        total: result.total
      },
      'Tạo đơn hàng thành công. Đang chuyển đến hóa đơn...'
    )
  } catch (error) {
    if (error instanceof BusinessError) {
      return responseHelper.error(res, error.message, error.statusCode)
    }
    responseHelper.error(res, error.message)
  }
}

export const approvePlanTransaction = async (req, res) => {
  try {
    const { id } = req.params
    const transaction = await PlanTransaction.findById(id).populate('organization').populate('plan')

    if (!transaction) return responseHelper.error(res, 'Không tìm thấy giao dịch', 404)
    if (transaction.status !== 'pending')
      return responseHelper.error(res, 'Giao dịch này đã được xử lý', 400)

    // Cập nhật trạng thái
    transaction.status = 'paid'
    transaction.paidAt = new Date()

    // Tính ngày hết hạn lại từ thời điểm thanh toán
    const expireAt = new Date()
    if (transaction.mode === 'year')
      expireAt.setFullYear(expireAt.getFullYear() + transaction.duration)
    else expireAt.setMonth(expireAt.getMonth() + transaction.duration)

    transaction.expiredAt = expireAt
    await transaction.save()

    // Áp dụng gói cho tổ chức
    const org = transaction.organization
    org.plan = transaction.plan._id
    org.planExpiredAt = expireAt
    org.lastUpgradedAt = new Date()

    // LƯU THÔNG TIN CHU KỲ
    org.planDuration =
      transaction.mode === 'year' ? transaction.duration * 12 : transaction.duration

    org.planTotalPaid = transaction.amount

    await org.save()

    logActivity(
      org._id,
      req.user?._id || null,
      req.user?.username || null,
      'APPROVE_TRANSACTION',
      'PLAN',
      `Xác nhận giao dịch ${transaction.code}: Gói ${transaction.plan.code}, Thời hạn: ${transaction.duration} ${transaction.mode === 'month' ? 'Tháng' : 'Năm'}`,
      transaction.plan.code,
      'SUCCESS'
    )

    responseHelper.success(res, 1, 'Thanh toán thành công. Gói đã được kích hoạt.')
  } catch (err) {
    responseHelper.error(res, err.message)
  }
}

export const cancelPlanTransaction = async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user?._id

    const transaction = await PlanTransaction.findById(id)
    if (!transaction) return responseHelper.error(res, 'Không tìm thấy giao dịch', 404)

    // Đơn hàng đã hủy trước đó
    if (transaction.status === 'cancelled') {
      return responseHelper.error(res, 'Đơn hàng đã được hủy trước đó.', 400)
    }
    // Chỉ được hủy khi đang chờ thanh toán
    if (transaction.status !== 'pending') {
      return responseHelper.error(res, 'Chỉ có thể hủy giao dịch khi đang chờ thanh toán')
    }

    // Cập nhật trạng thái và thông tin người hủy
    transaction.status = 'cancelled'
    transaction.cancelledAt = new Date()
    transaction.cancelledBy = userId || null
    await transaction.save()

    logActivity(
      transaction.organization._id,
      req.user?._id || null,
      req.user?.username || null,
      'CANCEL_TRANSACTION',
      'PLAN',
      `Xác nhận hủy giao dịch ${transaction.code}`,
      transaction.plan.code,
      'SUCCESS'
    )

    return responseHelper.success(res, transaction, 'Hủy giao dịch thành công')
  } catch (err) {
    return responseHelper.error(res, err.message || 'Lỗi hệ thống')
  }
}

export const changePlan = async (req, res) => {
  try {
    const { planId, orgId, duration, action } = req.body

    if (!planId || !['upgrade', 'downgrade', 'renew'].includes(action)) {
      throw new BusinessError('Dữ liệu không hợp lệ')
    }

    await withTransaction(async (session) => {
      const org = await Organization.findById(orgId).populate('plan').session(session)

      if (!org) {
        throw new BusinessError('Tổ chức không tồn tại', 404)
      }

      const currentPlan = org.plan

      const newPlan = await Plan.findById(planId).session(session)
      if (!newPlan) {
        throw new BusinessError('Gói không tồn tại', 404)
      }

      const wallet = await BillingWallet.findOne({ organization: orgId }).session(session)
      if (!wallet) {
        throw new BusinessError('Ví không tồn tại', 404)
      }

      // RENEW - GIA HẠN
      if (action === 'renew') {
        if (currentPlan.level === 1) {
          throw new BusinessError('Không thể gia hạn gói miễn phí')
        }

        if (newPlan._id.toString() !== currentPlan._id.toString()) {
          throw new BusinessError('Gia hạn phải cùng gói hiện tại')
        }

        if (!duration || duration < 1) {
          throw new BusinessError('Thời hạn gói không hợp lệ')
        }

        // TÍNH GIÁ GIA HẠN (bao gồm VAT)
        const baseAmount = newPlan.priceMonth * duration
        const vatRate = 0.1
        const vat = Math.round(baseAmount * vatRate)
        const totalAmount = baseAmount + vat

        if (wallet.balance < totalAmount) {
          throw new BusinessError('Số dư ví không đủ', 402)
        }

        // TRỪ TIỀN
        wallet.balance -= totalAmount
        await wallet.save({ session })

        // GHI NHẬN GIAO DỊCH
        await BillingWalletTransaction.create(
          [
            {
              wallet: wallet._id,
              organization: orgId,
              type: 'debit',
              source: 'renew',
              amount: totalAmount,
              balanceAfter: wallet.balance,
              reason: `Gia hạn gói ${newPlan.name} (${duration} tháng, bao gồm VAT 10%)`,
              status: 'completed'
            }
          ],
          { session }
        )

        const now = new Date()
        const startFrom = org.planExpiredAt && org.planExpiredAt > now ? org.planExpiredAt : now
        const newExpiredAt = new Date(startFrom)
        newExpiredAt.setMonth(newExpiredAt.getMonth() + duration)

        // CẬP NHẬT THÔNG TIN
        org.planExpiredAt = newExpiredAt
        org.lastUpgradedAt = now

        const invoiceCode = await generateInvoiceCodeForPlan(PlanTransaction, 'HD')
        await PlanTransaction.create(
          [
            {
              code: invoiceCode,
              organization: orgId,
              plan: newPlan._id,
              mode: 'month',
              duration: duration,
              amount: baseAmount,
              discountAmount: 0,
              subtotal: baseAmount,
              vat: vat,
              total: totalAmount,
              paidAt: now,
              expiredAt: newExpiredAt,
              paymentMethod: wallet._id,
              note: `Gia hạn gói ${newPlan.name} - ${duration} tháng`,
              status: 'paid'
            }
          ],
          { session }
        )

        // CỘNG THÊM duration và totalPaid
        org.planDuration = (org.planDuration || 0) + duration
        org.planTotalPaid = (org.planTotalPaid || 0) + baseAmount

        await org.save({ session })
      }

      // UPGRADE
      if (action === 'upgrade') {
        if (newPlan.level <= currentPlan.level) {
          throw new BusinessError('Gói nâng cấp phải cao hơn gói hiện tại')
        }

        if (!duration || duration < 1) {
          throw new BusinessError('Thời hạn gói không hợp lệ')
        }

        // TÍNH GIÁ GÓI MỚI (bao gồm VAT)
        const baseAmount = newPlan.priceMonth * duration
        const vatRate = 0.1
        const vat = Math.round(baseAmount * vatRate)
        const totalAmount = baseAmount + vat

        if (wallet.balance < totalAmount) {
          throw new BusinessError('Số dư ví không đủ', 402)
        }

        // TRỪ TIỀN
        wallet.balance -= totalAmount
        await wallet.save({ session })

        // GHI NHẬN GIAO DỊCH
        await BillingWalletTransaction.create(
          [
            {
              wallet: wallet._id,
              organization: orgId,
              type: 'debit',
              source: 'upgrade',
              amount: totalAmount,
              balanceAfter: wallet.balance,
              reason: `Nâng cấp gói ${newPlan.name} (${duration} tháng, bao gồm VAT 10%)`,
              status: 'completed'
            }
          ],
          { session }
        )

        const now = new Date()
        const expiredAt = new Date(now)
        expiredAt.setMonth(expiredAt.getMonth() + duration)

        const invoiceCode = await generateInvoiceCodeForPlan(PlanTransaction, 'HD')
        await PlanTransaction.create(
          [
            {
              code: invoiceCode,
              organization: orgId,
              plan: newPlan._id,
              mode: 'month',
              duration: duration,
              amount: baseAmount,
              discountAmount: 0,
              subtotal: baseAmount,
              vat: vat,
              total: totalAmount,
              paidAt: now,
              expiredAt: expiredAt,
              paymentMethod: wallet._id,
              note: `Nâng cấp gói ${newPlan.name} - ${duration} tháng`,
              status: 'paid'
            }
          ],
          { session }
        )

        // ÁP DỤNG GÓI MỚI
        org.plan = newPlan._id
        org.planExpiredAt = expiredAt
        org.lastUpgradedAt = now
        org.planDuration = duration
        org.planTotalPaid = baseAmount // Lưu giá gốc (không bao gồm VAT)

        await org.save({ session })
      }

      // DOWNGRADE
      if (action === 'downgrade') {
        if (newPlan.level >= currentPlan.level) {
          throw new BusinessError('Gói downgrade phải thấp hơn gói hiện tại')
        }

        if (!org.planExpiredAt || !org.lastUpgradedAt || !org.planDuration || !org.planTotalPaid) {
          throw new BusinessError('Không xác định được chu kỳ gói')
        }

        const now = new Date()

        const totalDays = diffDays(org.lastUpgradedAt, org.planExpiredAt)
        const remainingDays = diffDays(now, org.planExpiredAt)

        if (remainingDays <= 0 || totalDays <= 0) {
          throw new BusinessError('Gói hiện tại đã hết hạn')
        }

        // SỬ DỤNG SỐ TIỀN ĐÃ TRẢ THỰC TẾ
        const totalPaid = org.planTotalPaid

        // Tính giá trị hàng ngày của gói hiện tại
        const currentDailyRate = totalPaid / totalDays

        // Tính giá trị hàng ngày của gói mới (theo cùng duration)
        const newTotalPrice = newPlan.priceMonth * org.planDuration
        const newDailyRate = newTotalPrice / totalDays

        // Hoàn tiền = (chênh lệch giá hàng ngày) × số ngày còn lại
        let refundAmount = (currentDailyRate - newDailyRate) * remainingDays

        refundAmount = Math.max(0, Math.floor(refundAmount))
        refundAmount = Math.min(refundAmount, totalPaid)

        wallet.balance += refundAmount
        await wallet.save({ session })

        await BillingWalletTransaction.create(
          [
            {
              wallet: wallet._id,
              organization: orgId,
              type: 'credit',
              source: 'downgrade',
              amount: refundAmount,
              balanceAfter: wallet.balance,
              reason: `Hoàn tiền phần còn lại (${remainingDays} ngày) khi hạ gói xuống ${newPlan.name}`,
              status: 'completed'
            }
          ],
          { session }
        )

        const invoiceCode = await generateInvoiceCodeForPlan(PlanTransaction, 'HD')
        await PlanTransaction.create(
          [
            {
              code: invoiceCode,
              organization: orgId,
              plan: newPlan._id,
              mode: 'month',
              duration: 0, // Downgrade không có duration mới
              amount: -refundAmount, // Số âm để thể hiện hoàn tiền
              discountAmount: 0,
              subtotal: -refundAmount,
              vat: 0,
              total: -refundAmount,
              paidAt: now,
              expiredAt: org.planExpiredAt, // Giữ nguyên expiredAt
              paymentMethod: wallet._id,
              note: `Hạ gói xuống ${newPlan.name} - Hoàn tiền ${refundAmount.toLocaleString()} đ (${remainingDays} ngày)`,
              status: 'paid'
            }
          ],
          { session }
        )

        // CẬP NHẬT THÔNG TIN CHU KỲ MỚI
        org.plan = newPlan._id
        org.planTotalPaid = newTotalPrice

        await org.save({ session })
      }
    })

    responseHelper.success(res, 'Thay đổi gói thành công')
  } catch (err) {
    if (err instanceof BusinessError) {
      return responseHelper.error(res, err.message, err.statusCode)
    }

    return responseHelper.error(res, err.message)
  }
}

function diffDays(from, to) {
  const msPerDay = 1000 * 60 * 60 * 24
  return Math.max(0, Math.ceil((to.getTime() - from.getTime()) / msPerDay))
}
