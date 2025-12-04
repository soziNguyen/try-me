import app from './app.js'
import { createServer } from 'http'
import { Server } from 'socket.io'

const port = app.get('port')
const httpServer = createServer(app)

const io = new Server(httpServer, {
  cors: {
    origin: '*'
  }
})

app.set('io', io)

// Lưu thông tin socket của nhân viên
const staffSockets = new Map() // Map<socketId, {organizationId, warehouseId, staffId}>

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)

  // Nhân viên join room theo tổ chức + kho
  socket.on('staff_join', (data) => {
    const { userId, organizationId, warehouseId } = data

    if (!organizationId || !warehouseId) {
      console.error('❌ Missing organizationId or warehouseId:', data)
      return
    }

    // Tạo room name riêng cho mỗi tổ chức + kho
    const roomName = `staff_${organizationId}_${warehouseId}`
    socket.join(roomName)

    // Lưu thông tin nhân viên
    staffSockets.set(socket.id, {
      userId,
      organizationId,
      warehouseId,
      roomName
    })

    // console.log(`✅ Staff ${userId} joined room: ${roomName}`)
  })

  // Khách hàng gọi nhân viên
  socket.on('customer_call_staff', (data) => {
    console.log(data)

    const { organizationId, warehouseId, tableId } = data

    if (!organizationId || !warehouseId) {
      console.error('Missing organizationId or warehouseId in notification')
      return
    }

    // Chỉ gửi cho nhân viên của tổ chức + kho tương ứng
    const roomName = `staff_${organizationId}_${warehouseId}`

    // console.log(`Customer at table ${tableId} called staff in room: ${roomName}`)

    io.to(roomName).emit('staff_notification', {
      type: 'customer_call_staff',
      tableId,
      organizationId,
      warehouseId,
      time: data.time,
      message: `Bàn ${tableId} đang gọi nhân viên!`
    })
  })

  // Xử lý disconnect
  socket.on('disconnect', () => {
    const staffInfo = staffSockets.get(socket.id)

    if (staffInfo) {
      // console.log(`Staff ${staffInfo.userId} disconnected from ${staffInfo.roomName}`)
      staffSockets.delete(socket.id)
    }
  })
})

httpServer.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`)
})
