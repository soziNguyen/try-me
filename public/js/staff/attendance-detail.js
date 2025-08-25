$(function () {
    const pathname = window.location.pathname.split('/')
    const attendanceId = pathname[pathname.length - 1]

    function formatTime(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr)
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    function formatDuration(min) {
        if (!min) return ''
        return (min / 60).toFixed(1) // phút -> giờ 1 chữ số thập phân
    }

    function fillData(att) {
        if (!att) return
        console.log(att.sessions)
        // Thông tin chung
        $('#employeeName').text(att.user?.username || '')
        $('#workDate').text(new Date(att.date).toLocaleDateString('vi-VN'))

        // Sessions
        const $tbody = $('#sessionsTable')
        $tbody.empty()

        if (Array.isArray(att.sessions) && att.sessions.length) {
            att.sessions.forEach(s => {
                const shiftName = s.shift?.name || ''
                const shiftStart = s.shift?.startTime || ''
                const shiftEnd = s.shift?.endTime || ''
                $('#note').text(s.note || '')

                $tbody.append(`
                    <tr>
                        <td class="text-center">${shiftName}</td>
                        <td class="text-center">${shiftStart}</td>
                        <td class="text-center">${shiftEnd}</td>
                        <td class="text-center">${formatTime(s.checkIn)}</td>
                        <td class="text-center">${formatTime(s.checkOut)}</td>
                        <td class="text-center">${formatDuration(s.duration)}</td>
                    </tr>
                `)
            })
        } else {
            $tbody.append('<tr><td colspan="6" class="text-center">Không có ca làm việc</td></tr>')
        }
    }

    Promise.all([
        attendanceId
            ? fetchData(`attendance/${attendanceId}`)
            : Promise.resolve(null)
    ])
        .then(([att]) => fillData(att))
        .catch(err => console.log(err))
})
