import mongoose from 'mongoose'

export default async function withTransaction(fn) {
  let session

  const topologyType =
    mongoose.connection?.client?.topology?.description?.type || ''
  const isReplicaSet = topologyType.includes('ReplicaSet')

  if (isReplicaSet) {
    session = await mongoose.startSession()
    session.startTransaction()
  }

  try {
    const result = await fn(session) // Lưu kết quả
    if (session) {
      await session.commitTransaction()
      session.endSession()
    }
    return result // Trả về kết quả
  } catch (err) {
    if (session) {
      await session.abortTransaction()
      session.endSession()
    }
    throw err
  }
}
