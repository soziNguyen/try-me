import BillingWallet from '../billing-wallet/model.js'
import BillingWalletTransaction from '../billing-wallet-transaction/model.js'
import responseHelper from '../../helpers/responseHelper.js'
import withTransaction from '../../helpers/withTransaction.js'
import { payOS } from './service.js'
import BusinessError from '../error/BusinessError.js'

export const payosWebhook = async (req, res) => {
  try {
    const webhookData = req.body

    // Verify webhook signature
    try {
      const verifyResult = payOS.webhooks.verify(webhookData)

      if (!verifyResult) {
        return res.status(400).json({
          error: 'INVALID_SIGNATURE',
          message: 'Chữ ký không hợp lệ'
        })
      }
    } catch (verifyError) {
      return res.status(400).json({
        error: 'VERIFICATION_FAILED',
        message: verifyError.message
      })
    }

    const { orderCode, code } = webhookData.data

    if (!orderCode) {
      return res.status(400).json({
        error: 'INVALID_PAYLOAD',
        message: 'Thiếu orderCode'
      })
    }

    if (code !== '00') {
      return res.status(200).json({
        error: 0,
        message: 'success',
        data: null
      })
    }

    await withTransaction(async (session) => {
      const tx = await BillingWalletTransaction.findOne({
        externalTransactionId: orderCode
      }).session(session)

      if (!tx) {
        throw new BusinessError('Không tìm thấy giao dịch', 404)
      }

      // next() if processed
      if (tx.status !== 'pending') return

      // 00 = SUCCESS
      const wallet = await BillingWallet.findById(tx.wallet).session(session)
      if (!wallet) {
        throw new BusinessError('Không tìm thấy ví', 404)
      }

      wallet.balance += tx.amount
      await wallet.save({ session })

      tx.status = 'completed'
      tx.balanceAfter = wallet.balance
      await tx.save({ session })
    })

    return res.status(200).json({
      error: 0,
      message: 'success',
      data: null
    })
  } catch (error) {
    // return 200 so that PAYOS doesn't keep trying
    return res.status(200).json({
      error: 1,
      message: error.message || 'Internal error',
      data: null
    })
  }
}

export const payosReturn = async (req, res) => {
  try {
    const { cancel, status, orderCode } = req.query

    if (!orderCode) {
      return res.redirect('/wallet?error=missing_order')
    }

    const tx = await BillingWalletTransaction.findOne({
      externalTransactionId: parseInt(orderCode)
    })

    if (!tx) {
      return res.redirect('/wallet?error=transaction_not_found')
    }

    // update if status = pending
    if (tx.status !== 'pending') {
      return res.redirect(`/wallet?status=${tx.status}`)
    }

    // Cancelled
    if (cancel === 'true' || status === 'CANCELLED') {
      tx.status = 'cancelled'
      tx.reason += ' - Người dùng đã hủy thanh toán'
      tx.balanceAfter = wallet.balance
      await tx.save()

      return res.redirect('/wallet?status=cancelled')
    }

    // PAID
    if (status === 'PAID') {
      return res.redirect('/wallet?status=success')
    }

    // PENDING
    if (status === 'PENDING') {
      return res.redirect('/wallet?status=processing')
    }

    return res.redirect('/wallet?status=unknown')
  } catch (error) {
    console.error('PayOS return error:', error)
    res.redirect('/wallet?error=system_error')
  }
}
