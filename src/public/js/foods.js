$(function () {

  let showList = [10, 25, 50, 100];
  const numRows = Math.floor(($(window).height() - $('#foodTableBody').offset().top - 100) / 45);
  if (!showList.includes(numRows)) {
    showList.push(numRows);
  }
  showList.sort((a, b) => a - b);

  const table = $('#foodTable').DataTable({
      dom: '<"top-bar d-flex align-items-center justify-content-between flex-wrap mb-3"' +
           'l' +
           'f' +
           '<"right-group d-flex align-items-center btn-group flex-wrap">' +
           '>' +
           'rt' +
           '<"bottom-bar d-flex justify-content-between mt-3"ip>',
      order: [],
      ajax: {
        url: '/api/foods',
        method: 'GET'
      },
      lengthMenu: [showList, showList],
      language: {
        search: '',
        searchPlaceholder: 'Tìm kiếm',
        lengthMenu: `_MENU_ món ăn mỗi trang`,
        info: 'Hiển thị _START_ đến _END_ trong tổng _TOTAL_ món ăn',
        infoEmpty: 'Không có bản ghi nào',
        infoFiltered: '(được lọc từ tổng _MAX_ món ăn)',
        zeroRecords: 'Không tìm thấy kết quả phù hợp',
        emptyTable: 'Không có dữ liệu trong bảng'
      },
      pageLength: numRows,
      columns: [
        {
          data: null,
          orderable: false,
          className: 'text-center',
          render: (data, type, row) => `<input type="checkbox" class="foodCheckbox" data-id="${row._id}">`
        },
        {
          data: 'image',
          orderable: false,
          render: (data, type, row) => {
            if (data) {
              return `<img src="${data}" alt="${row.name}" style="max-width:50px;">`
            }
            return `<img src="/images/default.png" alt="No image" style="max-width:50px;">`
          }
        },
        {
          data: 'name',
          render: (data, type, row) => {
            if (type === 'display') {
              return `<input type="text" class="dataInput border-0 w-100 form-control" data-field="name" value="${data}">`
            }
            return data;
          }
        },
        {
          data: 'price',
          render: (data, type, row) => {
            if (type === 'display') {
              return `<input type="number" min="0" class="dataInput border-0 w-100 form-control" data-field="price" value="${data}">`
            }
            return data;
          }
        },
        {
          data: 'description',
          render: (data, type, row) => {
            if (type === 'display') {
              return `<input type="text" class="dataInput border-0 w-100 form-control" data-field="description" value="${data}">`
            }
            return data;
          }
        },
        {
          data: 'status',
          render: (data, type, row) => {
            if (type === 'display') {
              return `<select class="dataInput border-0 w-100 form-select" data-field="status">
                        <option value="available" ${data === 'available' ? 'selected' : ''}>Có sẵn</option>
                        <option value="unavailable" ${data === 'unavailable' ? 'selected' : ''}>Hết hàng</option>
                      </select>`
            }
            return data;
          }
        },
        {
          data: 'category',
          render: (data, type, row) => {
            const categories = {
              main: 'Món chính',
              side: 'Món phụ',
              drink: 'Đồ uống',
              dessert: 'Tráng miệng'
            };
            if (type === 'display') {
              return `<select class="dataInput border-0 w-100 form-select" data-field="category">
                        <option value="main" ${data === 'main' ? 'selected' : ''}>Món chính</option>
                        <option value="side" ${data === 'side' ? 'selected' : ''}>Món phụ</option>
                        <option value="drink" ${data === 'drink' ? 'selected' : ''}>Đồ uống</option>
                        <option value="dessert" ${data === 'dessert' ? 'selected' : ''}>Tráng miệng</option>
                      </select>`
            }
            return categories[data] || data;
          }
        },
      ],
      rowCallback: function(row, data) {
        $(row).attr('data-id', data._id);
      },
      initComplete: function () {
        $('.right-group').html(`
          <div class="btn-group flex-wrap">
            <button class="btn btn-outline-danger me-2" id="deleteFoodBtn">
              <i class="bi bi-trash"></i> Xóa
            </button>
            <button class="btn btn-outline-success" id="addFoodBtn">
              <i class="bi bi-plus-circle"></i> Thêm
            </button>
          </div>
        `);
      }
    });

  // Gọi các hàm sự kiện đã có sẵn của bạn
    handlerAddEvent('#foodTable', '#addFoodBtn', 'foods');
    handlerDeleteEvent('#foodTable', '#deleteFoodBtn', 'foodCheckbox', 'foods');
    handlerUpdateEvent('#foodTable', 'foods');
    initTableCheckboxEvents('#foodTable', 'foodCheckbox');

});
