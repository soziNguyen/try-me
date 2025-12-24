import responseHelper from '../../helpers/responseHelper.js'
import BillingWallet from './model.js'
import BillingWalletTransaction from '../billing-wallet-transaction/model.js'
import withTransaction from '../../helpers/withTransaction.js'
import BusinessError from '../error/BusinessError.js'
import { payOS } from '../payos/service.js'
import { generateOrderCode } from '../../helpers/common.js'

export const getWalletInfo = async (req, res) => {
  try {
    const orgId = req.user.organization
    const wallet = await BillingWallet.findOne({ organization: orgId })
    if (!wallet) {
      return responseHelper.error(res, 'Ví chưa tồn tại', 404)
    }

    const transactions = await BillingWalletTransaction.find({ organization: orgId })
      .populate('wallet', 'balance currency')
      .sort({ createdAt: -1 })
      .limit(50)

    responseHelper.success(res, { wallet, transactions })
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const walletTopup = async (req, res) => {
  try {
    const { amount, method } = req.body
    if (!amount || amount <= 0 || !method) {
      return responseHelper.error(res, 'Số tiền hoặc phương thức không hợp lệ', 400)
    }

    const orgId = req.user.organization

    let wallet = await BillingWallet.findOne({ organization: orgId })
    if (!wallet) {
      wallet = await BillingWallet.create({ organization: orgId, balance: 0 })
    }

    // Tạo transaction pending
    const tx = await BillingWalletTransaction.create({
      wallet: wallet._id,
      organization: orgId,
      type: 'credit',
      amount,
      source: 'manual',
      reason: `Nạp tiền qua ${method}`,
      status: 'pending'
    })

    const orderCode = generateOrderCode()

    const payment = await payOS.paymentRequests.create({
      orderCode,
      amount: tx.amount,
      description: `Nap tien vi`,
      returnUrl: `${process.env.DOMAIN}/wallet`,
      cancelUrl: `${process.env.DOMAIN}/wallet`
    })

    tx.externalTransactionId = orderCode
    tx.paymentProvider = 'payos'
    await tx.save()

    responseHelper.success(
      res,
      { paymentUrl: payment.checkoutUrl, transactionId: tx._id },
      'Tạo giao dịch nạp tiền thành công, chờ xác nhận từ cổng thanh toán'
    )
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const walletTopupCallback = async (req, res) => {
  try {
    const { transactionId, status } = req.body
    if (!transactionId || !['pending', 'completed', 'failed'].includes(status)) {
      return responseHelper.error(res, 'Dữ liệu callback không hợp lệ', 400)
    }

    const result = await withTransaction(async (session) => {
      const tx = await BillingWalletTransaction.findById(transactionId).session(session)
      if (!tx) throw new BusinessError('Không tìm thấy giao dịch', 404)
      if (tx.status !== 'pending') return tx // đã xử lý rồi

      if (status === 'completed') {
        const wallet = await BillingWallet.findById(tx.wallet).session(session)
        wallet.balance += tx.amount
        await wallet.save({ session })

        tx.status = 'completed'
        tx.balanceAfter = wallet.balance
      }

      if (status === 'failed') {
        tx.status = 'failed'
      }

      await tx.save({ session })
      return { txId: tx._id, status: tx.status }
    })

    responseHelper.success(res, result, 'Callback đã được xử lý')
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}
