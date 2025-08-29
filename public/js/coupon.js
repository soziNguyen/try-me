$(function () {
    let table

    let showList = [10, 25, 50, 100]
    const numRows = Math.floor(
        ($(window).height() - $("#couponTableBody").offset().top - 100) / 45
    )
    if (!showList.includes(numRows)) {
        showList.push(numRows)
    }
    showList.sort((a, b) => a - b)

    initDataTable()

    function initDataTable() {
        table = $('#couponTable').DataTable({
            dom:
                '<"top-bar d-flex align-items-center justify-content-between flex-wrap mb-3"' +
                'l' +
                'f' +
                '<"right-group d-flex align-items-center btn-group flex-wrap">' +
                '>' +
                'rt' +
                '<"bottom-bar d-flex justify-content-between mt-3"ip>',
            serverSide: true,
            processing: true,
            order: [],
            ajax: {
                url: '/api/coupons',
                method: 'GET'
            },
            language: {
                search: '',
                searchPlaceholder: 'Tìm kiếm mã giảm giá',
                lengthMenu: `_MENU_ mã giảm giá mỗi trang`,
                info: 'Hiển thị _START_ đến _END_ trong tổng _TOTAL_ mã giảm giá',
                infoEmpty: 'Không có bản ghi nào',
                infoFiltered: '(được lọc từ tổng _MAX_ mã giảm giá)',
                zeroRecords: 'Không tìm thấy kết quả phù hợp',
                emptyTable: 'Không có dữ liệu trong bảng'
            },
            columnDefs: [
                { width: "220px", targets: 1 }, 
                { width: "180px", targets: 2 },
                { width: "100px", targets: 7 },
                { width: "60px", targets: 8 }
            ],
            columns: [
                {
                    data: null,
                    orderable: false,
                    className: 'text-center',
                    render: (data, type, row) =>
                        `<input type="checkbox" class="couponCheckbox" data-id="${row._id}">`
                },
                {
                    data: 'code',
                    render: (data, type, row) => {
                        if (type === 'display') {
                            return ` <input type="text" class="dataInput form-control w-100 border-0" data-field="code" value="${data ?? ''}">`
                        }
                        return data
                    }
                },
                {
                    data: 'discountType',
                    render: (data, type, row) => {
                        if (type === 'display') {
                            const discountTypes = ['percent', 'amount']
                            const opts = discountTypes.map(s => {
                                return `
                                    <option 
                                        value="${s}" 
                                        ${data === s ? 'selected' : ''}>
                                        ${s === 'percent' ? 'Phần trăm' : 'Tiền cố định'}
                                    </option>
                                `
                            })
                            return `
                                <select class="dataInput form-select border-0" data-field="discountType">
                                    <option value="">— Chọn —</option>
                                    ${opts}
                                </select>
                                `
                        }
                        return data ?? ''
                    }
                },
                {
                    data: 'discountValue',
                    render: (data, type, row) => {
                        if (type === 'display') {
                            return `
                                <input type="number" 
                                    class="dataInput form-control w-100 border-0" 
                                    placeholder="0"
                                    data-field="discountValue" 
                                    value="${data ?? ''}"
                                >`
                        }
                        return data ?? ''
                    }
                },
                {
                    data: 'description',
                    render: (data, type, row) => {
                        if (type === 'display') {
                            return `
                                <input type="text" 
                                    class="dataInput form-control w-100 border-0" 
                                    placeholder="Mô tả" 
                                    data-field="description"
                                    value="${data ?? ''}"
                                >`
                        }
                        return data ?? ''
                    }
                },
                {
                    data: 'startDate',
                    className: 'text-center',
                    render: (data) => {
                        const val = data ? new Date(data).toISOString().split('T')[0] : ''
                        return `<input type="date" 
                                       class="dataInput form-control border-0 text-center"
                                       data-field="startDate"
                                       value="${val}">`
                    }
                },
                {
                    data: 'endDate',
                    className: 'text-center',
                    render: (data) => {
                        const val = data ? new Date(data).toISOString().split('T')[0] : ''
                        return `<input type="date" 
                                       class="dataInput form-control border-0 text-center"
                                       data-field="endDate"
                                       value="${val}">`
                    }
                },
                {
                    data: 'usageLimit',
                    className: 'text-center',
                    render: (data) => {
                        return `<input type="number"
                                    class="dataInput form-control w-100 border-0" 
                                    placeholder="Số lượng" 
                                    data-field="usageLimit"
                                    value="${data ?? ''}"
                                >`
                    }
                },
                {
                    data: 'usedCount',
                    className: 'text-center',
                    render: (data) => {
                        return data ?? ''
                    }
                },
                {
                    data: 'isActive',
                    className: 'text-center',
                    render: (data) => `
                      <input type="checkbox" class="dataInput form-check-input" 
                             data-field="isActive" ${data ? 'checked' : ''}>
                    `
                }
            ],
            rowCallback: function (row, data) {
                $(row).attr('data-id', data._id)
            },
            initComplete: function () {
                $('.right-group').html(`
              <div class="btn-group flex-wrap">
                <button class="btn btn-outline-danger me-2" id="deleteCouponBtn">
                  <i class="bi bi-trash"></i> Xóa
                </button>
                <button class="btn btn-outline-success" id="addCouponBtn">
                  <i class="bi bi-plus-circle"></i> Thêm
                </button>
              </div>
            `)
            }
        })
        handlerAddEvent('#couponTable', '#addCouponBtn', 'coupon')
        handlerDeleteEvent('#couponTable', '#deleteCouponBtn', 'couponCheckbox', 'coupon')
        initTableCheckboxEvents('#couponTable', 'couponCheckbox')
        handlerUpdateEvent('#couponTable', 'coupon')
    }
})
