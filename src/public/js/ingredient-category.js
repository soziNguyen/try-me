$(function () {

  let showList = [10, 25, 50, 100];
  const numRows = Math.floor(($(window).height() - $('#ingredientCateTableBody').offset().top - 100) / 45);
  if (!showList.includes(numRows)) {
    showList.push(numRows);
  }
  showList.sort((a, b) => a - b);
  const table = $('#ingredientCateTable').DataTable({
      dom: '<"top-bar d-flex align-items-center justify-content-between flex-wrap mb-3"' +
      'l' +
      'f' +
      '<"right-group d-flex align-items-center btn-group flex-wrap">' +
      '>' +
      'rt' +
      '<"bottom-bar d-flex justify-content-between mt-3"ip>',
    //   serverSide: true,
    //   processing: true,
      order: [],
      ajax: {
        url: '/api/inventory/categories',
        method: 'GET'
      },
      lengthMenu: [showList, showList],
      language: {
        search: '',
        searchPlaceholder: 'Tìm kiếm',
        lengthMenu: `_MENU_ danh mục nguyên liệu mỗi trang`,
        info: 'Hiển thị _START_ đến _END_ trong tổng _TOTAL_ danh mục nguyên liệu',
        infoFiltered: '(được lọc từ tổng _MAX_ nguyên liệu)',
        zeroRecords: 'Không tìm thấy kết quả phù hợp',
        emptyTable: 'Không có dữ liệu trong bảng'
      },
      pageLength: numRows,
      columns: [
        {
          data: null,
          orderable: false,
          className: 'text-center',
          render: (data, type, row) => `<input type="checkbox" class="ingredientCateCheckbox" data-id="${row._id}">`
        },
        { data: 'name',
            render: (data, type, row) => {
                if ( type === 'display' ) {
                  return `<input type="text" class="dataInput border-0 w-100 form-control" data-field="name" value="${data}">`
                }
                return data;
              }
          },
        { data: 'description', 
          render: (data, type, row) => {
            if ( type === 'display' ) {
              return `<input type="text" class="dataInput border-0 w-100 form-control" data-field="description" value="${data}">`
            }
            return data;
          }
        },
      ],
      rowCallback: function(row, data) {
        // Tag row with data-id for update
        $(row).attr('data-id', data._id);
      },
      initComplete: function () {
        $('.right-group').html(`
          <div class="btn-group flex-wrap">
            <button class="btn btn-outline-danger me-2" id="deleteIngredientCateBtn">
            <i class="bi bi-trash"></i> Xóa
            </button>
            <button class="btn btn-outline-success" id="addIngredientCateBtn">
            <i class="bi bi-plus-circle"></i> Thêm
            </button>
          </div>
        `);
      }
    });

  //====================================================================================  
  // EVENT HANDLER
  handlerAddEvent('#ingredientCateTable', '#addIngredientCateBtn', '/api/inventory/category/create')
  handlerDeleteEvent('#ingredientCateTable', '#deleteIngredientCateBtn', 'ingredientCateCheckbox', '/api/inventory/category/deletes')
  handlerUpdateEvent('#ingredientCateTable')

  initTableCheckboxEvents('#ingredientCateTable', 'ingredientCateCheckbox');

})