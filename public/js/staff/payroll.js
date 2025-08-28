$(function () {
  let table

  let showList = [10, 25, 50, 100]
  const numRows = Math.floor(
    ($(window).height() - $("#payrollTableBody").offset().top - 100) / 45
  )
  if (!showList.includes(numRows)) {
    showList.push(numRows)
  }
  showList.sort((a, b) => a - b)
  initDataTable()

  function initDataTable() {
    table = $("#payrollTable").DataTable({
      dom:
        '<"top-bar d-flex align-items-center justify-content-between flex-wrap mb-3"' +
        "l" +
        "f" +
        '<"right-group d-flex align-items-center btn-group flex-wrap">' +
        ">" +
        "rt" +
        '<"bottom-bar d-flex justify-content-between mt-3"ip>',
      serverSide: true,
      processing: true,
      order: [],
      ajax: {
        url: "/api/payrolls", // endpoint backend payroll
        method: "GET",
      },
      lengthMenu: [showList, showList],
      language: {
        search: "",
        searchPlaceholder: "Tìm kiếm",
        lengthMenu: `_MENU_ bản ghi mỗi trang`,
        info: "Hiển thị _START_ đến _END_ trong tổng _TOTAL_ bản ghi",
        infoEmpty: "Không có bản ghi nào",
        infoFiltered: "(được lọc từ tổng _MAX_ bản ghi)",
        zeroRecords: "Không tìm thấy kết quả phù hợp",
        emptyTable: "Không có dữ liệu trong bảng",
      },
      pageLength: numRows,
      columns: [
        {
          data: null,
          className: "text-center",
          title: "STT",
          render: (data, type, row, meta) =>
            meta.row + 1 + meta.settings._iDisplayStart,
        },
        {
          data: "user.username",
          className: "text-center",
          title: "Nhân viên",
          render: (data) => data || "",
        },
        {
          data: null,
          className: "text-center",
          title: "Tháng/Năm",
          render: (data) => `${data.month}/${data.year}`,
        },
        {
          data: "totalWorkingMinutes",
          className: "text-end",
          title: "Tổng giờ làm",
          render: (val) => (val ? `${(val / 60).toFixed(1)}h` : ""),
        },
        {
          data: "totalSalary",
          className: "text-end",
          title: "Tổng lương",
          render: (val) => (val ? val.toLocaleString("vi-VN") + " đ" : "0 đ"),
        },
        {
          data: null,
          orderable: false,
          className: "text-center",
          width: "120px",
          title: "Hành động",
          render: (data, type, row) => {
            if (type === "display") {
              return `
                <button class="btn btn-sm btn-outline-primary my-1 detail-btn"
                    data-id="${row._id}"
                    title="Xem chi tiết">
                  <i class="bi bi-eye"></i> Chi tiết
                </button>
              `
            }
            return ""
          },
        },
      ],
      rowCallback: function (row, data) {
        $(row).attr("data-id", data._id)
      },
      initComplete: function () {
        $("#payrollTable").on("click", ".detail-btn", function () {
          const id = $(this).data("id")
          window.location.href = `/staff/payroll/${id}`
        })
      },
    })
  }
  $("#btnCreatePayroll").on("click", async () => {
    showConfirmModal({
      title: "Tính lương",
      message: "Tính lương cho tháng này?",
      confirmed: 'Xác nhận',
      onConfirm: async () => {
        try {
          await $.post("/api/payroll/create")
          toastr.success("Đã tạo bảng lương")
          $("#payrollTable").DataTable().ajax.reload()
        } catch (err) {
          console.log(err)
          toastr.error("Có lỗi khi tính lương")
        }
      },
    })
  })
})
