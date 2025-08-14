$(function () {
  let suppliers = []
  let ingredients = []
  let warehouses = []
  let stockEntryId = null
  let itemCounter = 1

  // Lấy stockEntryId từ URL
  const urlPath = window.location.pathname
  const matches = urlPath.match(/\/inventory\/stock-entry\/([^\/?#]+)/)
  if (matches) {
    stockEntryId = matches[1]
  }

  // Load dữ liệu ban đầu
  Promise.all([
    fetchData("inventory/supplier/all"),
    fetchData("inventory/ingredient/all"),
    fetchData("inventory/warehouse/all"),
    stockEntryId
      ? fetchData(`inventory/stock-entry/${stockEntryId}`)
      : Promise.resolve(null),
  ])
    .then(([sups, ings, whs, stockEntry]) => {
      suppliers = sups
      ingredients = ings
      warehouses = whs

      console.log(suppliers)
      console.log(warehouses)

      initForm()
      if (stockEntry) {
        populateForm(stockEntry)
      } else {
        const currentUserName = "<%= currentUserName %>"
        const currentUserId = "<%= currentUserId %>"
        $("#createdBy").val(currentUserName).data("id", currentUserId)
      }
    })
    .catch((err) => {
      // console.error("Error loading initial data:", err)
      toastr.error("Không thể load dữ liệu cần thiết")
    })

  function initForm() {
    if ($("#itemsTableBody tr").length === 0) {
      addNewItem()
    }

    $('.select2-ingredient').each(function() {
      initSelect2($(this), '— Chọn nguyên liệu —')
    })

    // Populate suppliers dropdown
    const supplierOptions = suppliers
      .map((sup) => `<option value="${sup._id}">${sup.name}</option>`)
      .join("")
    const $supplierSelect = $("#supplier").html(
      '<option value="" class="text-center">— Chọn nhà cung cấp —</option>' + supplierOptions
    )
    initSelect2($supplierSelect, '— Chọn nhà cung cấp —')

    // Populate warehouses dropdown (main warehouse select)
    const warehouseOptions = warehouses
      .map((wh) => `<option value="${wh._id}">${wh.name} - ${wh.location}</option>`)
      .join("")
    const $warehouseSelected = $("#warehouse").html(
      '<option value="" class="text-center">— Chọn kho —</option>' + warehouseOptions
    )

    initSelect2($warehouseSelected, '— Chọn kho —')

    // Event handlers
    $("#addItemBtn").on("click", addNewItem)
    $("#stockEntryForm").on("submit", saveStockEntry)
    $("#btn-lock-entry").on("click", function () {
      if (!confirm("Bạn có chắc chắn muốn khóa phiếu này? Sau khi khóa sẽ không thể chỉnh sửa hoặc xóa.")) return
      $.ajax({
        url: `/api/inventory/stock-entry/lock/${stockEntryId}`,
        method: "POST",
        beforeSend: function () {
          $("#btn-lock-entry").prop("disabled", true).text("Đang khóa...")
        },
        success(res) {
          if (res.success && res.data.isLocked) {
            toastr.success("Phiếu nhập đã được khóa thành công")
            $("#btn-lock-entry").prop("disabled", true).html(`<i class="bi bi-lock me-1"></i>Phiếu đã khóa`)
    
            $("#stockEntryForm")
              .find("input, select, textarea, button")
              .not("#btn-lock-entry, #btn-print-entry")
              .add("#btn-save-entry, #addItemBtn, #supplier, #warehouse")
              .prop("disabled", true)
          } else {
            toastr.error(res.message || "Có lỗi xảy ra")
            $("#btn-lock-entry").prop("disabled", false).text("Khóa phiếu")
          }
        },
        error(xhr) {
          const msg = xhr.responseJSON?.message || "Lỗi hệ thống"
          toastr.error(msg)
          $("#btn-lock-entry").prop("disabled", false).text("Khóa phiếu")
        }
      })
    })
    
    // Auto calculate totals
    $(document).on(
      "input",
      'input[name*="[quantity]"], input[name*="[unitPrice]"]',
      calculateRowTotal
    )
    $(document).on("click", ".remove-item-btn", function () {
      const $row = $(this).closest("tr")
      const $tbody = $("#itemsTableBody")
      if ($tbody.find("tr").length <= 1) {
        toastr.warning("Phải có ít nhất 1 dòng để nhập liệu")
        return
      }
      $row.remove()
      calculateTotalAmount()
    })
  }

  function updateRowDropdowns(rowIndex) {
    const $select = $(`select[name="items[${rowIndex}][ingredient]"]`)
    
    const ingredientOptions = ingredients
      .map((ing) => `<option value="${ing._id}">${ing.name}</option>`)
      .join("")
    
    $select.empty().html(
      '<option value="" class="text-center">— Chọn nguyên liệu —</option>' +
      ingredientOptions
    )
  }

  function addNewItem() {
    const newRow = `
    <tr>
      <td>
        <select class="select2-ingredient" name="items[${itemCounter}][ingredient]">
          <option value="" class="text-center">— Chọn nguyên liệu —</option>
        </select>
      </td>
      <td>
        <input type="number" class="form-control form-control-sm" name="items[${itemCounter}][quantity]" min="0" step="0.01" placeholder="0">
      </td>
      <td>
        <input type="number" class="form-control form-control-sm" name="items[${itemCounter}][unitPrice]" min="0" step="0.01" placeholder="0">
      </td>
      <td>
        <input type="text" class="form-control form-control-sm" readonly placeholder="0">
      </td>
      <td class="text-center">
        <button type="button" class="btn btn-danger btn-sm remove-item-btn">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    </tr>
    `
    $("#itemsTableBody").append(newRow)
    
    const currentRowIndex = itemCounter
    updateRowDropdowns(currentRowIndex)
    
    const $newSelect = $(`select[name="items[${currentRowIndex}][ingredient]"]`)
    initSelect2($newSelect, '— Chọn nguyên liệu —')
    
    itemCounter++
  }

  function calculateRowTotal() {
    const row = $(this).closest("tr")
    const quantity =
      parseFloat(row.find('input[name*="[quantity]"]').val()) || 0
    const unitPrice =
      parseFloat(row.find('input[name*="[unitPrice]"]').val()) || 0
    const total = quantity * unitPrice

    row.find("input[readonly]").val(total.toLocaleString("vi-VN") + " ₫")
    calculateTotalAmount()
  }

  function calculateTotalAmount() {
    let totalAmount = 0
    $("#itemsTableBody tr").each(function () {
      const quantity =
        parseFloat($(this).find('input[name*="[quantity]"]').val()) || 0
      const unitPrice =
        parseFloat($(this).find('input[name*="[unitPrice]"]').val()) || 0
      totalAmount += quantity * unitPrice
    })
    $("#totalAmount").text(totalAmount.toLocaleString("vi-VN") + " ₫")
  }

  function populateForm(stockEntry) {
    $("#code").val(stockEntry.code || "")
    $("#date").val(formatDate(stockEntry.date) || "")
    $("#supplier").val(stockEntry.supplier?._id || "")
    $("#warehouse").val(stockEntry.warehouse?._id || "")
    $("#createdBy")
      .val(stockEntry.createdBy?.name || stockEntry.createdBy?.username || "")
      .data("id", stockEntry.createdBy?._id)
    $("#note").val(stockEntry.note || "")

    if (stockEntry.items && stockEntry.items.length > 0) {
      // Clear existing rows
      $("#itemsTableBody").empty()
      
      stockEntry.items.forEach((item, index) => {
        const row = `
        <tr>
          <td>
            <select class="select2-ingredient" name="items[${index}][ingredient]">
              <option value="" class="text-center">— Chọn nguyên liệu —</option>
            </select>
          </td>
          <td>
            <input type="number" class="form-control form-control-sm" name="items[${index}][quantity]" 
              min="0" step="1" value="${item.quantity || ""}" placeholder="0">
          </td>
          <td>
            <input type="number" class="form-control form-control-sm" name="items[${index}][unitPrice]" 
              min="0" step="1" value="${item.unitPrice || ""}" placeholder="0">
          </td>
          <td>
            <input type="text" class="form-control form-control-sm" readonly value="${
              (item.total || 0).toLocaleString("vi-VN") + " ₫"
            }" placeholder="0">
          </td>
          <td class="text-center">
            <button type="button" class="btn btn-danger btn-sm remove-item-btn">
              <i class="bi bi-trash"></i>
            </button>
          </td>
        </tr>
        `
        $("#itemsTableBody").append(row)
        
        updateRowDropdowns(index)
        
        const $sel = $(`select[name="items[${index}][ingredient]"]`)
        $sel.val(item.ingredient?._id || "")
        initSelect2($sel, '— Chọn nguyên liệu —')
      })
      
      itemCounter = stockEntry.items.length
      calculateTotalAmount()
    }
    
    if (stockEntry?.isLocked) {
      $("#btn-lock-entry").prop("disabled", true).html(`<i class="bi bi-lock me-1"></i>Phiếu đã khóa`)
    
      $("#stockEntryForm")
        .find("input, select, textarea, button")
        .not("#btn-lock-entry, #btn-print-entry")
        .add("#btn-save-entry, #addItemBtn, #supplier, #warehouse")
        .prop("disabled", true)
    }   
  }

  function saveStockEntry(e) {
    e.preventDefault()
  
    const $rows = $("#itemsTableBody tr")
    const partialErrors = []
  
    // Kiểm tra từng dòng
    $rows.each(function (index) {
      const rowIndex = index + 1
  
      const ingredientId = $(this).find('select[name*="[ingredient]"]').val()
      const quantity = $(this).find('input[name*="[quantity]"]').val()
      const unitPrice = $(this).find('input[name*="[unitPrice]"]').val()
  
      const hasAnyValue = ingredientId || quantity || unitPrice
      const isComplete = ingredientId && quantity && unitPrice
  
      if (hasAnyValue && !isComplete) {
        const missingFields = []
        if (!ingredientId) missingFields.push("nguyên liệu")
        if (!quantity) missingFields.push("số lượng")
        if (!unitPrice) missingFields.push("đơn giá")
  
        partialErrors.push(`Dòng ${rowIndex} thiếu ${missingFields.join(", ")}`)
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
        const quantity = $(this).find('input[name*="[quantity]"]').val()
        const unitPrice = $(this).find('input[name*="[unitPrice]"]').val()
  
        if (!ingredientId && !quantity && !unitPrice) {
          $(this).remove()
        }
      })
    }
  
    // Thu thập dữ liệu từ form
    const formData = new FormData(this)
    const stockEntryData = {
      code: formData.get("code"),
      date: formData.get("date"),
      supplier: formData.get("supplier"),
      warehouse: formData.get("warehouse"),
      note: formData.get("note"),
      items: [],
    }
  
    if (!stockEntryId) {
      stockEntryData.createdBy = $("#createdBy").data("id") || "<%= currentUserId %>"
    }
  
    $("#itemsTableBody tr").each(function () {
      const ingredientId = $(this).find('select[name*="[ingredient]"]').val()
      const quantity = parseFloat($(this).find('input[name*="[quantity]"]').val())
      const unitPrice = parseFloat($(this).find('input[name*="[unitPrice]"]').val())
  
      if (ingredientId && quantity && unitPrice) {
        stockEntryData.items.push({
          ingredient: ingredientId,
          quantity,
          unitPrice,
          total: quantity * unitPrice,
        })
      }
    })
  
    if (!stockEntryData.supplier) {
      toastr.error("Vui lòng chọn nhà cung cấp", "Lỗi dữ liệu")
      return
    }

    if (!stockEntryData.warehouse) {
      toastr.error("Vui lòng chọn kho", "Lỗi dữ liệu")
      return
    }
  
    if (stockEntryData.items.length === 0) {
      toastr.error("Phải có ít nhất 1 dòng nguyên liệu hợp lệ", "Lỗi dữ liệu")
      return
    }
  
    // Gửi AJAX
    const url = stockEntryId
      ? `/api/inventory/stock-entry/update/${stockEntryId}`
      : "/api/inventory/stock-entry/create"
  
    $.ajax({
      url,
      method: "POST",
      contentType: "application/json",
      data: JSON.stringify(stockEntryData),
      success(res) {
        if (res.success) {
          toastr.success(res.message || "Lưu phiếu nhập thành công")
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