$(function () {
    let ingredients = []
    let warehouses = []
    let table
  
    // 1. Fetch danh sách nguyên liệu và kho
    Promise.all([
      fetchData('inventory/ingredient/all'),
      fetchData('inventory/warehouse/all')
    ])
    .then(([ings, whs]) => {
      ingredients = ings
      warehouses  = whs
      initDataTable()
    })
    .catch(err => {
      toastr.error('Không load đủ dữ liệu trước khi khởi tạo DataTable', err)
    })
  
    function initDataTable () {
      // tính số dòng
      let showList = [10,25,50,100]
      const numRows = Math.floor(
        ($(window).height() - $('#stockIssueTableBody').offset().top - 100) / 45
      )
      if (!showList.includes(numRows)) showList.push(numRows)
      showList.sort((a,b)=>a-b)
  
      table = $('#stockIssueTable').DataTable({
        dom: '<"top-bar d-flex justify-content-between mb-3"l f <"btn-group">>' +
             'rt' +
             '<"bottom-bar d-flex justify-content-between mt-3"ip>',
        serverSide: true,
        processing: true,
        autoWidth: false,
        order: [],
  
        ajax: {
          url: '/api/inventory/stock-issue',
          type: 'GET'
        },
  
        lengthMenu: [showList, showList],
        pageLength: numRows,
  
        language: {
          search: '',
          searchPlaceholder: 'Tìm kiếm',
          lengthMenu: '_MENU_ phiếu mỗi trang',
          info: 'Hiển thị _START_ đến _END_ trong tổng _TOTAL_ phiếu',
          infoFiltered: '(được lọc từ tổng _MAX_ phiếu)',
          zeroRecords: 'Không tìm thấy kết quả',
          emptyTable: 'Chưa có dữ liệu'
        },
  
        columns: [
          // checkbox
          {
            data: null,
            orderable: false,
            className: 'text-center',
            render: (data, type, row) =>
              `<input type="checkbox" class="stockIssueCheckbox" data-id="${row._id}">`
          },
          // code
          {
            data: 'code',
            render: inputRenderer('code')
          },
          // date
          {
            data: 'date',
            render: d => {
              const dt = new Date(d)
              return dt.toLocaleDateString('vi-VN', {
                day: '2-digit', month: '2-digit', year: 'numeric'
              })
            }
          },
          // reason
          {
            data: 'reason',
            render: inputRenderer('reason')
          },
          // ingredient (first item)
          {
            data: 'items',
            render: (items, type, row) => {
              const first = Array.isArray(items) && items.length ? items[0] : null
              if (type === 'display') {
                const opts = ingredients.map(ing => {
                  const sel = first?.ingredient?._id===ing._id?'selected':''
                  return `<option value="${ing._id}" ${sel}>${ing.name}</option>`
                }).join('')
                return `
                  <select class="dataInput form-select form-select-sm"
                          data-field="items.0.ingredient"
                          data-id="${row._id}">
                    <option value="" class="text-center">— Chọn nguyên liệu —</option>
                    ${opts}
                  </select>`
              }
              return first?.ingredient?.name||''
            }
          },
          // quantity
          {
            data: 'items',
            render: (items, type, row) => {
              const first = Array.isArray(items) && items.length ? items[0] : null
              if (type==='display') {
                return `<input type="number" class="dataInput text-end border-0 form-control"
                                data-field="items.0.quantity"
                                data-id="${row._id}"
                                value="${first?.quantity||''}">`
              }
              return first?.quantity||''
            }
          },
          // warehouse
          {
            data: 'items',
            render: (items, type, row) => {
              const first = Array.isArray(items) && items.length ? items[0] : null
              if (type==='display') {
                const opts = warehouses.map(wh => {
                  const sel = first?.warehouse?._id===wh._id?'selected':''
                  return `<option value="${wh._id}" ${sel}>${wh.name} - ${wh.location}</option>`
                }).join('')
                return `
                  <select class="dataInput form-select form-select-sm"
                          data-field="items.0.warehouse"
                          data-id="${row._id}">
                    <option value="" class="text-center">— Chọn kho —</option>
                    ${opts}
                  </select>`
              }
              return first?.warehouse?.name||''
            }
          },
          // note
          {
            data: 'note',
            render: inputRenderer('note')
          }
        ],
  
        rowCallback(row, data) {
          $(row).attr('data-id', data._id)
        },
  
        initComplete() {
          $('.btn-group').html(`
            <button class="btn btn-outline-danger me-2" id="deleteStockIssueBtn">
              <i class="bi bi-trash"></i> Xóa
            </button>
            <button class="btn btn-outline-success" id="addStockIssueBtn">
              <i class="bi bi-plus-circle"></i> Thêm
            </button>
          `)
        }
      })
  
      // các handler
      handlerAddEvent('#stockIssueTable', '#addStockIssueBtn', 'stock-issue')
      handlerDeleteEvent('#stockIssueTable', '#deleteStockIssueBtn', 'stockIssueCheckbox', 'stock-issue')
      handlerUpdateEvent('#stockIssueTable', 'stock-issue')
      initTableCheckboxEvents('#stockIssueTable', 'stockIssueCheckbox')
    }
  })
  