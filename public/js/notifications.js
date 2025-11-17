const socket = io()

const notificationBtn = document.getElementById('notificationBtn')
const notificationModalBody = document.getElementById('notificationModalBody')
const notificationBadge = document.getElementById('notificationBadge')
const deleteAllNotiBtn = document.querySelector('.delete-all-noti')

// Tạo đối tượng Audio
const notificationSound = new Audio('/assets/sounds/sound.wav')
notificationSound.preload = 'auto'
notificationSound.volume = 1

let audioEnabled = false

// Enable audio sau lần đầu user click
document.addEventListener(
  'click',
  function enableAudio() {
    audioEnabled = true
    notificationSound.volume = 0
    notificationSound.play().then(() => {
      notificationSound.pause()
      notificationSound.currentTime = 0
      notificationSound.volume = 1
    })
    document.removeEventListener('click', enableAudio)
  },
  { once: true }
)

// Nhân viên join room
socket.emit('staff_join')

// Nhận notification từ socket
socket.on('staff_notification', (data) => {
  appendNotificationToModal(data)
  saveNotification(data)
  saveUnseenNotification(data)
  showBadge()

  if (audioEnabled) {
    notificationSound.currentTime = 0
    notificationSound.play().catch(() => {})
  }
})

// Lưu notification
function saveNotification(data) {
  const noti = JSON.parse(localStorage.getItem('staff_notifications') || '[]')
  noti.push(data)
  localStorage.setItem('staff_notifications', JSON.stringify(noti))
}

// Lưu notification chưa xem
function saveUnseenNotification(data) {
  const unseen = JSON.parse(localStorage.getItem('staff_notifications_unseen') || '[]')
  unseen.push(data)
  localStorage.setItem('staff_notifications_unseen', JSON.stringify(unseen))
}

// Map trạng thái sang tiếng Việt
function getStatusInfo(status) {
  const statusMap = {
    pending: { text: 'Chờ chế biến', color: 'warning' }, // Vàng
    cooking: { text: 'Đang chế biến', color: 'primary' }, // Xanh dương
    done: { text: 'Hoàn thành', color: 'success' } // Xanh lá
  }
  return statusMap[status] || { text: status, color: 'secondary' }
}

// Render HTML cho notification (không thao tác DOM)
async function renderNotificationHTML(data) {
  if (!data.tableName && data.tableId) {
    try {
      const table = await ajax(`/api/tables/${data.tableId}`, {}, 'GET')
      data.tableName = table?.name ? `Bàn ${table.name}` : `Bàn ${data.tableId}`
    } catch {
      data.tableName = `Bàn ${data.tableId}`
    }
  }

  let html = ''

  if (data.type === 'kitchen_item_update') {
    const statusInfo = getStatusInfo(data.status)
    const tableDisplay = data.isTakeaway ? 'Mang về' : data.tableName
    const itemName = data.itemName || 'Không rõ tên món'

    html = `
      <div class="border-bottom py-2">
        <strong>${tableDisplay}</strong> - Món <strong>${itemName}</strong> - 
        <span class="badge bg-${statusInfo.color}">${statusInfo.text}</span><br>
        <small>${new Date(data.time).toLocaleString()}</small>
      </div>
    `
  } else {
    html = `
      <div class="border-bottom py-2">
        <strong>${data.tableName}</strong> gửi yêu cầu hỗ trợ<br>
        <small>${new Date(data.time).toLocaleString()}</small>
      </div>
    `
  }

  return html
}

// Append vào modal (dùng cho realtime notification)
async function appendNotificationToModal(data) {
  const html = await renderNotificationHTML(data)
  const $modalBody = $('#notificationModalBody')

  // Destroy scrollbar hoàn toàn
  if ($modalBody.data('mCS')) {
    $modalBody.mCustomScrollbar('destroy')
  }

  // Thêm nội dung mới
  notificationModalBody.insertAdjacentHTML('afterbegin', html)

  // Reinit scrollbar
  $modalBody.mCustomScrollbar({
    theme: 'minimal-dark',
    axis: 'y',
    scrollInertia: 200,
    mouseWheel: { deltaFactor: 20, preventDefault: true },
    setTop: 0,
    callbacks: {
      onInit: function () {
        $modalBody.mCustomScrollbar('scrollTo', 'top', {
          scrollInertia: 0
        })
      }
    }
  })
}

function deleteAllNotifications() {
  // Xóa localStorage
  localStorage.removeItem('staff_notifications')
  localStorage.removeItem('staff_notifications_unseen')

  // Xóa nội dung modal
  const $modalBody = $('#notificationModalBody')

  // Destroy scrollbar
  if ($modalBody.data('mCS')) {
    $modalBody.mCustomScrollbar('destroy')
  }

  // Clear content
  notificationModalBody.innerHTML = ''

  // Reinit scrollbar
  customScrollbarInit()

  // Ẩn badge
  hideBadge()
}

document.addEventListener('DOMContentLoaded', async () => {
  const saved = JSON.parse(localStorage.getItem('staff_notifications') || '[]')

  // Render tất cả notification một lần
  if (saved.length > 0) {
    let allHTML = ''
    for (const item of saved) {
      const html = await renderNotificationHTML(item)
      allHTML += html
    }
    notificationModalBody.innerHTML = allHTML
  }

  const unseen = JSON.parse(localStorage.getItem('staff_notifications_unseen') || '[]')
  if (unseen.length) showBadge()

  if (notificationBtn && !notificationBtn.dataset.bound) {
    notificationBtn.dataset.bound = true
    notificationBtn.addEventListener('click', () => {
      showModal('notificationModal').show()
      hideBadge()
      localStorage.setItem('staff_notifications_unseen', '[]')
    })
  }

  if (deleteAllNotiBtn && !deleteAllNotiBtn.dataset.bound) {
    deleteAllNotiBtn.dataset.bound = true
    deleteAllNotiBtn.addEventListener('click', () => {
      if (confirm('Bạn có chắc muốn xóa tất cả thông báo?')) {
        deleteAllNotifications()
      }
    })
  }

  customScrollbarInit()
})

// Badge
function showBadge() {
  notificationBadge?.classList.remove('d-none')
}

function hideBadge() {
  notificationBadge?.classList.add('d-none')
}

function customScrollbarInit() {
  $('#notificationModalBody').mCustomScrollbar({
    theme: 'minimal-dark',
    axis: 'y',
    scrollInertia: 200,
    mouseWheel: { deltaFactor: 20, preventDefault: true }
  })
}
