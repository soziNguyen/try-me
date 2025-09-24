$(function () {
  let table
  const editableFields = ['name', 'email', 'phone']
  let provinceLists = []
  let communeLists = []

  $.getJSON('data/full_address.json', function (res) {
    if (res.error == 0 && res.data) {
      provinceLists = res.data
      communeLists = provinceLists.flatMap((province) => province.data2 || [])
    }
  })

  let showList = [10, 25, 50, 100]
  const numRows = Math.floor(($(window).height() - $('#orgTableBody').offset().top - 100) / 45)
  if (!showList.includes(numRows)) {
    showList.push(numRows)
  }
  showList.sort((a, b) => a - b)

  table = $('#orgTable').DataTable({
    dom:
      '<"top-bar d-flex align-items-center justify-content-between flex-wrap"' +
      'l' +
      'f' +
      '<"right-group d-flex align-items-center btn-group flex-wrap">' +
      '>' +
      'rt' +
      '<"bottom-bar d-flex justify-content-between mt-3"ip>',
    serverSide: true,
    processing: true,
    autoWidth: false,
    // scrollX: true,
    order: [],
    ajax: {
      url: '/api/organizations/get',
      method: 'GET'
    },
    lengthMenu: [showList, showList],
    language: {
      search: '',
      searchPlaceholder: 'Tìm kiếm',
      lengthMenu: `_MENU_ tổ chức cấp mỗi trang`,
      info: 'Hiển thị _START_ đến _END_ trong tổng _TOTAL_ tổ chức',
      infoEmpty: 'Không có bản ghi nào',
      infoFiltered: '(được lọc từ tổng _MAX_ tổ chức)',
      zeroRecords: 'Không tìm thấy kết quả phù hợp',
      emptyTable: 'Không có dữ liệu trong bảng'
    },
    pageLength: numRows,
    columns: [
      {
        data: null,
        orderable: false,
        className: 'text-center',
        render: (data, type, row) =>
          `<input type="checkbox" class="orgCheckbox" data-id="${row._id}">`
      },
      ...editableFields.map((field) => ({
        data: field,
        render: (data, type, row) => {
          if (field === 'phone') {
            return inputRenderer(field)(formatToInternational(data), type, row)
          }
          return inputRenderer(field)(data, type, row)
        }
      })),
      {
        data: 'province',
        className: 'text-start px-1',
        render: (data, type, row) => {
          if (type === 'display') {
            const provinceObj = provinceLists.find((p) => p.id === data)
            return provinceObj ? provinceObj.name : ''
          }
          return data
        }
      },
      {
        data: 'commune',
        render: (data, type, row) => {
          if (type === 'display') {
            const communeObj = communeLists.find((p) => p.id === data)
            return communeObj ? communeObj.name : ''
          }
          return data
        }
      },
      {
        data: 'street',
        render: (data, type, row) => {
          if (type === 'display') {
            return data ? data : ''
          }
          return data
        }
      },
      {
        data: 'isActive',
        className: 'text-center',
        render: (data, type, row) => {
          if (type === 'display') {
            return `<input type="checkbox" class="dataInput form-check-input" data-field="isActive" data-id="${row._id}" ${data ? 'checked' : ''}>`
          }
          return data
        }
      }
    ],
    rowCallback: function (row, data) {
      // Tag row with data-id for update
      $(row).attr('data-id', data._id)
    },
    initComplete: function () {
      $('.right-group').html(`
        <div class="btn-group flex-wrap mb-2">
          <button class="btn btn-outline-danger me-2" id="deleteOrgsBtn">
          <i class="bi bi-trash"></i> Xóa
          </button>
          <button class="btn btn-outline-success" id="addOrgBtn">
          <i class="bi bi-plus-circle"></i> Thêm
          </button>
        </div>
      `)
      handlerAddEvent('#orgTable', '#addOrgBtn', 'admin/organization')
      handlerDeleteEvent('#orgTable', '#deleteOrgsBtn', 'orgCheckbox', 'admin/organization')
      handlerUpdateEvent('#orgTable', 'organization')
      initTableCheckboxEvents('#orgTable', 'orgCheckbox')

      $('#orgTable').on('blur', 'input[data-field="phone"]', function () {
        const val = $(this).val()
        $(this).val(formatToInternational(val))
      })
    }
  })
})
