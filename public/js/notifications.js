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
  // Tạo ID cho notification mới
  if (!data.id) {
    data.id = `noti_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
  }

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

// Append vào modal
async function appendNotificationToModal(data) {
  if (!data.tableName && data.tableId) {
    try {
      const table = await ajax(`/api/tables/${data.tableId}`, {}, 'GET')
      data.tableName = table?.name ? `Bàn ${table.name}` : `Bàn ${data.tableId}`
    } catch {
      data.tableName = `Bàn ${data.tableId}`
    }
  }

  // Tạo ID duy nhất cho mỗi thông báo (hoặc sử dụng ID có sẵn)
  const notiId = data.id || `noti_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
  data.id = notiId // Gán ID vào data để lưu vào localStorage

  let html = ''

  // Phân biệt loại thông báo
  if (data.type === 'kitchen_item_update') {
    // Thông báo update status món
    const statusInfo = getStatusInfo(data.status)
    const tableDisplay = data.isTakeaway ? 'Mang về' : data.tableName
    const itemName = data.itemName || 'Không rõ tên món'

    html = `
      <div class="border-bottom py-2 position-relative notification-item" data-noti-id="${notiId}">
        <strong>${tableDisplay}</strong> - Món <strong>${itemName}</strong> - 
        <span class="badge bg-${statusInfo.color}">${statusInfo.text}</span><br>
        <small>${formatDateVN(data.time)}</small>
        <button type="button" class="btn-close position-absolute delete-noti-btn top-50 end-0 translate-middle-y" 
                data-noti-id="${notiId}"
                aria-label="Xóa thông báo">
        </button>
      </div>
    `
  } else if (data.type === 'new_order_items') {
    // Thông báo đơn hàng mới từ khách
    const tableDisplay = data.table ? `Bàn ${data.table}` : 'Không rõ bàn'
    const itemCount = data.items?.length || 0
    const itemsText = itemCount === 1 ? '1 món' : `${itemCount} món`

    html = `
      <div class="border-bottom py-2 position-relative notification-item" data-noti-id="${notiId}">
        <strong>${tableDisplay}</strong> đã gửi đơn hàng mới -
        <span class="badge bg-info">Đợt ${data.batch}</span> - ${itemsText}<br>
        <small>${formatDateVN(data.time)}</small>
        <button type="button" class="btn-close position-absolute delete-noti-btn top-50 end-0 translate-middle-y" 
                data-noti-id="${notiId}"
                aria-label="Xóa thông báo">
        </button>
      </div>
    `
  } else {
    // Thông báo gọi nhân viên (mặc định)
    html = `
      <div class="border-bottom py-2 position-relative notification-item" data-noti-id="${notiId}">
        <strong>${data.tableName}</strong> gửi yêu cầu hỗ trợ<br>
        <small>${formatDateVN(data.time)}</small>
        <button type="button" class="btn-close position-absolute delete-noti-btn top-50 end-0 translate-middle-y" 
                data-noti-id="${notiId}"
                aria-label="Xóa thông báo">
        </button>
      </div>
    `
  }

  const $modalBody = $('#notificationModalBody')

  // Destroy scrollbar hoàn toàn
  if ($modalBody.data('mCS')) {
    $modalBody.mCustomScrollbar('destroy')
  }

  // Thêm nội dung mới
  notificationModalBody.insertAdjacentHTML('afterbegin', html)

  // Thêm event listener cho nút xóa vừa tạo
  const deleteBtn = notificationModalBody.querySelector(
    `[data-noti-id="${notiId}"] .delete-noti-btn`
  )
  if (deleteBtn) {
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      deleteSingleNotification(notiId)
    })
  }

  // Reinit scrollbar
  $modalBody.mCustomScrollbar({
    theme: 'minimal-dark',
    axis: 'y',
    scrollInertia: 200,
    mouseWheel: { deltaFactor: 20, preventDefault: true },
    setTop: 0, // Luôn scroll về top
    callbacks: {
      onInit: function () {
        // Scroll về top sau khi init
        $modalBody.mCustomScrollbar('scrollTo', 'top', {
          scrollInertia: 0
        })
      }
    }
  })
}

// Xóa từng thông báo
function deleteSingleNotification(notiId) {
  const $modalBody = $('#notificationModalBody')

  // Destroy scrollbar
  if ($modalBody.data('mCS')) {
    $modalBody.mCustomScrollbar('destroy')
  }

  // Xóa element khỏi DOM
  const notiElement = notificationModalBody.querySelector(`[data-noti-id="${notiId}"]`)
  if (notiElement) {
    notiElement.remove()
  }

  // Xóa khỏi localStorage
  const notifications = JSON.parse(localStorage.getItem('staff_notifications') || '[]')
  const updatedNotifications = notifications.filter((noti) => noti.id !== notiId)
  localStorage.setItem('staff_notifications', JSON.stringify(updatedNotifications))

  // Xóa khỏi unseen notifications
  const unseenNotifications = JSON.parse(localStorage.getItem('staff_notifications_unseen') || '[]')
  const updatedUnseenNotifications = unseenNotifications.filter((noti) => noti.id !== notiId)
  localStorage.setItem('staff_notifications_unseen', JSON.stringify(updatedUnseenNotifications))

  // Reinit scrollbar
  customScrollbarInit()

  // Kiểm tra nếu không còn thông báo nào thì ẩn badge
  const remainingNotifications = notificationModalBody.querySelectorAll('.notification-item')
  if (remainingNotifications.length === 0) {
    hideBadge()
  }
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

document.addEventListener('DOMContentLoaded', async () => {
  const saved = JSON.parse(localStorage.getItem('staff_notifications') || '[]')

  // Thêm ID cho các thông báo cũ nếu chưa có
  let hasUpdated = false
  saved.forEach((item) => {
    if (!item.id) {
      item.id = `noti_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
      hasUpdated = true
    }
  })

  // Lưu lại nếu có cập nhật
  if (hasUpdated) {
    localStorage.setItem('staff_notifications', JSON.stringify(saved))
  }

  for (const item of saved) {
    await appendNotificationToModal(item)
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
