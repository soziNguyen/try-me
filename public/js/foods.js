$(function () {
  let table;

  initDataTable()
  let currentImgCell = null;

  $('#foodTable').on('click', 'img', function () {
    currentImgCell = $(this).closest('td');

    $('<input type="file" accept="image/*">').on('change', function (e) {
      const file = e.target.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('file', file);

      $.ajax({
        url: '/api/upload',
        method: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        success: res => {
          const imgUrl = '/' + res.file.path.replace(/\\/g, '/');
          const timestamp = new Date().getTime();

          // Cập nhật ảnh trong bảng
          currentImgCell.find('img').attr('src', imgUrl + '?t=' + timestamp);

          // Gửi API để lưu ảnh vào DB
          const row = currentImgCell.closest('tr');
          const id = row.data('id');
          if (id) {
            $.ajax({
              url: `/api/foods/update/${id}`,
              method: 'POST',
              contentType: 'application/json',
              data: JSON.stringify({ image: imgUrl }),
              success: () => toastr.success('Cập nhật ảnh thành công'),
              error: () => toastr.error('Lỗi khi cập nhật ảnh'),
            });
          }
        },
        error: () => toastr.error('Lỗi upload ảnh'),
      });
    }).trigger('click');
  });


  function initDataTable() {
    let showList = [10, 25, 50, 100];
    const numRows = Math.floor(($(window).height() - $('#foodTableBody').offset().top - 100) / 45);
    if (!showList.includes(numRows)) {
      showList.push(numRows);
    }
    showList.sort((a, b) => a - b);

    table = $('#foodTable').DataTable({
      dom: '<"top-bar d-flex align-items-center justify-content-between flex-wrap mb-3"' +
           'l' +
           'f' +
           '<"right-group d-flex align-items-center btn-group flex-wrap">' +
           '>' +
           'rt' +
           '<"bottom-bar d-flex justify-content-between mt-3"ip>',
      serverSide: true,
      processing: true,
      autoWidth: false,
      order: [[2, 'asc']],
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
        render: (data, type, row) =>
          `<input type="checkbox" class="foodCheckbox" data-id="${row._id}">`
      },
      {
        data: 'image',
        orderable: false,
        className: 'text-center align-middle', 
        render: (data, type, row) =>
          `<img src="${data || ''}" alt="${row.name || 'No image'}" style="width: 100%; height: 50px; object-fit: cover;">`
      },
      {
        data: 'name',
        render: (data, type, row) => {
          if (type === 'display') {
            return `<input type="text" class="dataInput border-0 w-100 form-control" data-field="name" value="${data ?? ''}">`
          }
          return data
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
          return categories[data] || data || '';
        }
      },
      {
        data: 'description',
        render: (data, type, row) => {
          if (type === 'display') {
            return `<input type="text" class="dataInput border-0 w-100 form-control" data-field="description" value="${data ?? ''}">`
          }
          return data
        }
      },
      {
        data: 'price',
        render: (data, type, row) => {
          if (type === 'display') {
            return `<input type="number" min="0" class="dataInput border-0 w-100 form-control" data-field="price" value="${data ?? 0}">`
          }
          return data
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
          return data || '';
        }
      }
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

    // EVENT HANDLERS
    handlerAddEvent('#foodTable', '#addFoodBtn', 'foods');
    handlerDeleteEvent('#foodTable', '#deleteFoodBtn', 'foodCheckbox', 'foods');
    handlerUpdateEvent('#foodTable', 'foods');
    initTableCheckboxEvents('#foodTable', 'foodCheckbox');
  }
});
