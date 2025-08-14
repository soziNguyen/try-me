$(function () {
    let ingredients = []
    let warehouses = []
    let stockTransferId = null
    let itemCounter = 1
  
    // Lấy stockTransferId từ URL
    const urlPath = window.location.pathname
    const matches = urlPath.match(/\/inventory\/stock-transfer\/([^\/?#]+)/)
    if (matches) {
      stockTransferId = matches[1]
    }
  
    // Load dữ liệu ban đầu
    Promise.all([
      fetchData("inventory/ingredient/all"),
      fetchData("inventory/warehouse/all"),
      stockTransferId
        ? fetchData(`inventory/stock-transfer/${stockTransferId}`)
        : Promise.resolve(null),
    ])
      .then(([ings, whs, stockTransfer]) => {
        ingredients = ings
        warehouses = whs
  
        initForm()
        if (stockTransfer) {
          populateForm(stockTransfer)
        } else {
          const currentUserName = "<%= currentUserName %>"
          const currentUserId = "<%= currentUserId %>"
          $("#createdBy").val(currentUserName).data("id", currentUserId)
        }
      })
      .catch((err) => {
        toastr.error("Không thể load dữ liệu cần thiết")
      })
  
    function initForm() {
      if ($("#itemsTableBody tr").length === 0) {
        addNewItem()
      }
  
      $('.select2-ingredient').each(function() {
        initSelect2($(this), '— Chọn nguyên liệu —')
      })
  
      // Event handlers
      $("#addItemBtn").on("click", addNewItem)
      $("#stockTransferForm").on("submit", saveStockTransfer)
      $("#btn-lock-transfer").on("click", function () {
        if (!confirm("Bạn có chắc chắn muốn khóa phiếu này? Sau khi khóa sẽ không thể chỉnh sửa hoặc xóa.")) return
        $.ajax({
          url: `/api/inventory/stock-transfer/lock/${stockTransferId}`,
          method: "POST",
          beforeSend: function () {
            $("#btn-lock-transfer").prop("disabled", true).text("Đang khóa...")
          },
          success(res) {
            if (res.success && res.data.isLocked) {
              toastr.success("Phiếu chuyển kho đã được khóa thành công")
              $("#btn-lock-transfer").prop("disabled", true).html(`<i class="bi bi-lock me-1"></i>Phiếu đã khóa`)
      
              $("#stockTransferForm")
                .find("input, select, textarea, button")
                .not("#btn-lock-transfer, #btn-print-entry")
                .add("#btn-save-transfer, #addItemBtn")
                .prop("disabled", true)
            } else {
              toastr.error(res.message || "Có lỗi xảy ra")
              $("#btn-lock-transfer").prop("disabled", false).text("Khóa phiếu")
            }
          },
          error(xhr) {
            const msg = xhr.responseJSON?.message || "Lỗi hệ thống"
            toastr.error(msg)
            $("#btn-lock-transfer").prop("disabled", false).text("Khóa phiếu")
          }
        })
      })
      
      // Remove item handler
      $(document).on("click", ".remove-item-btn", function () {
        const $row = $(this).closest("tr")
        const $tbody = $("#itemsTableBody")
        if ($tbody.find("tr").length <= 1) {
          toastr.warning("Phải có ít nhất 1 dòng để nhập liệu")
          return
        }
        $row.remove()
      })
    }
  
    function updateRowDropdowns(rowIndex) {
      const $ingredientSelect = $(`select[name="items[${rowIndex}][ingredient]"]`)
      const $fromWarehouseSelect = $(`select[name="items[${rowIndex}][fromWarehouse]"]`)
      const $toWarehouseSelect = $(`select[name="items[${rowIndex}][toWarehouse]"]`)
      
      // Update ingredient options
      const ingredientOptions = ingredients
        .map((ing) => `<option value="${ing._id}">${ing.name}</option>`)
        .join("")
      $ingredientSelect.empty().html(
        '<option value="" class="text-center">— Chọn nguyên liệu —</option>' +
        ingredientOptions
      )
  
      // Update warehouse options
      const warehouseOptions = warehouses
        .map((wh) => `<option value="${wh._id}">${wh.name} - ${wh.location}</option>`)
        .join("")
      
      const $fSelected = $fromWarehouseSelect.empty().html(
        '<option value="" class="text-center">— Chọn kho nguồn —</option>' +
        warehouseOptions
      )

      initSelect2($fSelected, '— Chọn kho nguồn —')
      
      const tSelected = $toWarehouseSelect.empty().html(
        '<option value="" class="text-center">— Chọn kho đích —</option>' +
        warehouseOptions
      )
      initSelect2(tSelected, '— Chọn kho đích —')
    }
  
    function addNewItem() {
      const newRow = `
      <tr>
        <td>
          <select class="form-select form-select-sm select2-ingredient" name="items[${itemCounter}][ingredient]">
            <option value="" class="text-center">— Chọn nguyên liệu —</option>
          </select>
        </td>
        <td>
          <select class="form-select form-select-sm" name="items[${itemCounter}][fromWarehouse]">
            <option value="" class="text-center">— Chọn kho nguồn —</option>
          </select>
        </td>
        <td>
          <select class="form-select form-select-sm" name="items[${itemCounter}][toWarehouse]">
            <option value="" class="text-center">— Chọn kho đích —</option>
          </select>
        </td>
        <td>
          <input type="number" class="form-control form-control-sm" name="items[${itemCounter}][quantity]" min="0" step="1" placeholder="0">
        </td>
        <td class="text-center">
          <button type="button" class="btn btn-danger btn-sm remove-item-btn">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      </tr>
      `
      $("#itemsTableBody").append(newRow)
      
      // Update dropdown options và init Select2
      const currentRowIndex = itemCounter
      updateRowDropdowns(currentRowIndex)
      
      const $newSelect = $(`select[name="items[${currentRowIndex}][ingredient]"]`)
      initSelect2($newSelect, '— Chọn nguyên liệu —')
      
      itemCounter++
    }
  
    function populateForm(stockTransfer) {
      $("#code").val(stockTransfer.code || "")
      $("#date").val(formatDate(stockTransfer.date) || "")
      $("#createdBy")
        .val(stockTransfer.createdBy?.name || stockTransfer.createdBy?.username || "")
        .data("id", stockTransfer.createdBy?._id)
      $("#note").val(stockTransfer.note || "")
  
      if (stockTransfer.items && stockTransfer.items.length > 0) {
        // Clear existing rows
        $("#itemsTableBody").empty()
        
        stockTransfer.items.forEach((item, index) => {
          const row = `
          <tr>
            <td>
              <select class="form-select form-select-sm select2-ingredient" name="items[${index}][ingredient]">
                <option value="" class="text-center">— Chọn nguyên liệu —</option>
              </select>
            </td>
            <td>
              <select class="form-select form-select-sm" name="items[${index}][fromWarehouse]">
                <option value="" class="text-center">— Chọn kho nguồn —</option>
              </select>
            </td>
            <td>
              <select class="form-select form-select-sm" name="items[${index}][toWarehouse]">
                <option value="" class="text-center">— Chọn kho đích —</option>
              </select>
            </td>
            <td>
              <input type="number" class="form-control form-control-sm" name="items[${index}][quantity]" 
                min="0" step="1" value="${item.quantity || ""}" placeholder="0">
            </td>
            <td class="text-center">
              <button type="button" class="btn btn-danger btn-sm remove-item-btn">
                <i class="bi bi-trash"></i>
              </button>
            </td>
          </tr>
          `
          $("#itemsTableBody").append(row)
          
          // Update dropdown options và set values
          updateRowDropdowns(index)
          
          const $sel = $(`select[name="items[${index}][ingredient]"]`)
          $sel.val(item.ingredient?._id || "")
          initSelect2($sel, '— Chọn nguyên liệu —')
          
          $(`select[name="items[${index}][fromWarehouse]"]`).val(
            item.fromWarehouse?._id || ""
          )
          $(`select[name="items[${index}][toWarehouse]"]`).val(
            item.toWarehouse?._id || ""
          )
        })
        
        itemCounter = stockTransfer.items.length
      }
      
      if (stockTransfer?.isLocked) {
        $("#btn-lock-transfer").prop("disabled", true).html(`<i class="bi bi-lock me-1"></i>Phiếu đã khóa`)
      
        $("#stockTransferForm")
          .find("input, select, textarea, button")
          .not("#btn-lock-transfer, #btn-print-entry")
          .add("#btn-save-transfer, #addItemBtn")
          .prop("disabled", true)
      }   
    }
  
    function saveStockTransfer(e) {
      e.preventDefault()
    
      const $rows = $("#itemsTableBody tr")
      const partialErrors = []
    
      // Kiểm tra từng dòng
      $rows.each(function (index) {
        const rowIndex = index + 1
    
        const ingredientId = $(this).find('select[name*="[ingredient]"]').val()
        const fromWarehouseId = $(this).find('select[name*="[fromWarehouse]"]').val()
        const toWarehouseId = $(this).find('select[name*="[toWarehouse]"]').val()
        const quantity = $(this).find('input[name*="[quantity]"]').val()
    
        const hasAnyValue = ingredientId || fromWarehouseId || toWarehouseId || quantity
        const isComplete = ingredientId && fromWarehouseId && toWarehouseId && quantity
    
        if (hasAnyValue && !isComplete) {
          const missingFields = []
          if (!ingredientId) missingFields.push("nguyên liệu")
          if (!fromWarehouseId) missingFields.push("kho nguồn")
          if (!toWarehouseId) missingFields.push("kho đích")
          if (!quantity) missingFields.push("số lượng")
    
          partialErrors.push(`Dòng ${rowIndex} thiếu ${missingFields.join(", ")}`)
        }
  
        // Kiểm tra kho nguồn và kho đích không được giống nhau
        if (fromWarehouseId && toWarehouseId && fromWarehouseId === toWarehouseId) {
          partialErrors.push(`Dòng ${rowIndex}: Kho nguồn và kho đích không được giống nhau`)
        }
      })
    
      // Nếu có lỗi dữ liệu từng dòng thì báo lỗi và dừng lại
      if (partialErrors.length) {
        toastr.error(partialErrors.join("<br/>"), "Lỗi dữ liệu")
        return
      }
    
      // Loại bỏ những dòng hoàn toàn trống (nếu có nhiều hơn 1 dòng)
      if ($rows.length > 1) {
        $rows.each(function () {
          const ingredientId = $(this).find('select[name*="[ingredient]"]').val()
          const fromWarehouseId = $(this).find('select[name*="[fromWarehouse]"]').val()
          const toWarehouseId = $(this).find('select[name*="[toWarehouse]"]').val()
          const quantity = $(this).find('input[name*="[quantity]"]').val()
    
          if (!ingredientId && !fromWarehouseId && !toWarehouseId && !quantity) {
            $(this).remove()
          }
        })
      }
    
      // Thu thập dữ liệu từ form
      const formData = new FormData(this)
      const stockTransferData = {
        code: formData.get("code"),
        date: formData.get("date"),
        note: formData.get("note"),
        items: [],
      }
    
      if (!stockTransferId) {
        stockTransferData.createdBy = $("#createdBy").data("id") || "<%= currentUserId %>"
      }
    
      $("#itemsTableBody tr").each(function () {
        const ingredientId = $(this).find('select[name*="[ingredient]"]').val()
        const fromWarehouseId = $(this).find('select[name*="[fromWarehouse]"]').val()
        const toWarehouseId = $(this).find('select[name*="[toWarehouse]"]').val()
        const quantity = parseFloat($(this).find('input[name*="[quantity]"]').val())
    
        if (ingredientId && fromWarehouseId && toWarehouseId && quantity) {
          stockTransferData.items.push({
            ingredient: ingredientId,
            fromWarehouse: fromWarehouseId,
            toWarehouse: toWarehouseId,
            quantity
          })
        }
      })
    
      if (stockTransferData.items.length === 0) {
        toastr.error("Phải có ít nhất 1 dòng nguyên liệu hợp lệ", "Lỗi dữ liệu")
        return
      }
    
      // Gửi AJAX
      const url = stockTransferId
        ? `/api/inventory/stock-transfer/update/${stockTransferId}`
        : "/api/inventory/stock-transfer/create"
    
      $.ajax({
        url,
        method: "POST",
        contentType: "application/json",
        data: JSON.stringify(stockTransferData),
        success(res) {
          if (res.success) {
            toastr.success(res.message || "Lưu phiếu chuyển kho thành công")
          } else {
            toastr.error(res.message || "Có lỗi xảy ra")
          }
        },
        error(xhr) {
          toastr.error(xhr.responseJSON?.message || "Có lỗi xảy ra khi lưu")
        },
      })
    }
    setupBackButton()
})