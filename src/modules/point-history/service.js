import PointHistory from './model.js'

export const createPointHistory = async ({
  customerId,
  orderId = null,
  type,
  points,
  balanceBefore,
  balanceAfter,
  description = '',
  organization,
  createdBy = null,
  session = null
}) => {
  const history = new PointHistory({
    customerId,
    orderId,
    type,
    points,
    balanceBefore,
    balanceAfter,
    description,
    organization,
    createdBy
  })

  if (session) {
    return await history.save({ session })
  }
  return await history.save()
}
