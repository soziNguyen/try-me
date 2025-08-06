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
      console.error("Error loading data:", err)
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
    $("#supplier").html(
      '<option value="" class="text-center">— Chọn nhà cung cấp —</option>' + supplierOptions
    )

    // Populate first row
    updateRowDropdowns(0)

    // Event handlers
    $("#addItemBtn").on("click", addNewItem)
    $("#stockEntryForm").on("submit", saveStockEntry)

    // Auto calculate totals
    $(document).on(
      "input",
      'input[name*="[quantity]"], input[name*="[unitPrice]"]',
      calculateRowTotal
    )
    $(document).on("click", ".remove-item-btn", function () {
      $(this).closest("tr").remove()
      calculateTotalAmount()
    })
  }

  function updateRowDropdowns(rowIndex) {
    const ingredientOptions = ingredients
      .map((ing) => `<option value="${ing._id}">${ing.name}</option>`)
      .join("")
    $(`select[name="items[${rowIndex}][ingredient]"]`).html(
      '<option value="" class="text-center">— Chọn nguyên liệu —</option>' +
        ingredientOptions
    )

    const warehouseOptions = warehouses
      .map((wh) => `<option value="${wh._id}">${wh.name} - ${wh.location}</option>`)
      .join("")
    $(`select[name="items[${rowIndex}][warehouse]"]`).html(
      '<option value="" class="text-center">— Chọn kho —</option>' +
        warehouseOptions
    )
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
        <input type="number" class="form-control form-control-sm" name="items[${itemCounter}][quantity]" min="0" step="0.01" placeholder="0">
      </td>
      <td>
        <input type="number" class="form-control form-control-sm" name="items[${itemCounter}][unitPrice]" min="0" step="0.01" placeholder="0">
      </td>
      <td>
        <input type="text" class="form-control form-control-sm" readonly placeholder="0">
      </td>
      <td>
        <select class="form-select form-select-sm" name="items[${itemCounter}][warehouse]">
          <option value="" class="text-center">— Chọn kho —</option>
        </select>
      </td>
      <td class="text-center">
        <button type="button" class="btn btn-danger btn-sm remove-item-btn">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    </tr>
    `
    $("#itemsTableBody").append(newRow)
    const $newSelect = $(`select[name="items[${itemCounter}][ingredient]"]`)
    updateRowDropdowns(itemCounter)
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
    $("#createdBy")
      .val(stockEntry.createdBy?.name || stockEntry.createdBy?.username || "")
      .data("id", stockEntry.createdBy?._id)
    $("#note").val(stockEntry.note || "")

    if (stockEntry.items && stockEntry.items.length > 0) {
      $("#itemsTableBody").empty()
      stockEntry.items.forEach((item, index) => {
        const row = `
        <tr>
          <td>
            <select class="form-select form-select-sm select2-ingredient" name="items[${index}][ingredient]">
              <option value="" class="text-center">— Chọn nguyên liệu —</option>
            </select>
          </td>
          <td>
            <input type="number" class="form-control form-control-sm" name="items[${index}][quantity]" 
              min="0" step="0.01" value="${item.quantity || ""}" placeholder="0">
          </td>
          <td>
            <input type="number" class="form-control form-control-sm" name="items[${index}][unitPrice]" 
              min="0" step="0.01" value="${item.unitPrice || ""}" placeholder="0">
          </td>
          <td>
            <input type="text" class="form-control form-control-sm" readonly value="${
              (item.total || 0).toLocaleString("vi-VN") + " ₫"
            }" placeholder="0">
          </td>
          <td>
            <select class="form-select form-select-sm" name="items[${index}][warehouse]">
              <option value="" class="text-center">— Chọn kho —</option>
            </select>
          </td>
          <td class="text-center">
            <button type="button" class="btn btn-danger btn-sm remove-item-btn">
              <i class="bi bi-trash"></i>
            </button>
          </td>
        </tr>
        `
        $("#itemsTableBody").append(row)
        const $sel = $(`select[name="items[${index}][ingredient]"]`)
        updateRowDropdowns(index)
        $sel.val(item.ingredient?._id || "")
        initSelect2($sel, '— Chọn nguyên liệu —')
        $(`select[name="items[${index}][warehouse]"]`).val(
          item.warehouse?._id || ""
        )
      })
      itemCounter = stockEntry.items.length
      calculateTotalAmount()
    }
  }

  function saveStockEntry(e) {
    e.preventDefault()
  
    const $rows = $("#itemsTableBody tr")
    const partialErrors = []
  
    // Check data trong từng dòng
    $rows.each(function (idx) {
      const rowNum = idx + 1
      const ing = $(this).find('select[name*="[ingredient]"]').val()
      const q   = $(this).find('input[name*="[quantity]"]').val()
      const p   = $(this).find('input[name*="[unitPrice]"]').val()
      const wh  = $(this).find('select[name*="[warehouse]"]').val()
  
      // Nếu đã nhập ít nhất 1 trường nhưng không đủ 4
      if ((ing || q || p || wh) && !(ing && q && p && wh)) {
        const missing = []
        if (!ing) missing.push("nguyên liệu")
        if (!q)   missing.push("số lượng")
        if (!p)   missing.push("đơn giá")
        if (!wh)  missing.push("kho")
        partialErrors.push(`Dòng ${rowNum} thiếu ${missing.join(", ")}`)
      }
    })
  
    // Nếu có lỗi partial, hiển thị chi tiết và dừng
    if (partialErrors.length) {
      toastr.error(partialErrors.join("<br/>"), "Lỗi dữ liệu")
      return
    }
  
    // Xoá những dòng hoàn toàn trống
    $rows.each(function () {
      const ing = $(this).find('select[name*="[ingredient]"]').val()
      const q   = $(this).find('input[name*="[quantity]"]').val()
      const p   = $(this).find('input[name*="[unitPrice]"]').val()
      const wh  = $(this).find('select[name*="[warehouse]"]').val()
      if (!ing && !q && !p && !wh) {
        $(this).remove()
      }
    })
  
    // Thu thập data
    const formData = new FormData(this)
    const data = {
      code: formData.get("code"),
      date: formData.get("date"),
      supplier: formData.get("supplier"),
      note: formData.get("note"),
      items: [],
    }
    if (!stockEntryId) {
      data.createdBy = $("#createdBy").data("id") || "<%= currentUserId %>"
    }
    $("#itemsTableBody tr").each(function () {
      const ingredient = $(this).find('select[name*="[ingredient]"]').val()
      const quantity   = parseFloat($(this).find('input[name*="[quantity]"]').val())
      const unitPrice  = parseFloat($(this).find('input[name*="[unitPrice]"]').val())
      const warehouse  = $(this).find('select[name*="[warehouse]"]').val()
      data.items.push({ ingredient, quantity, unitPrice, total: quantity * unitPrice, warehouse })
    })
  
    if (!data.supplier) {
      toastr.error("Vui lòng chọn nhà cung cấp", "Lỗi dữ liệu")
      return
    }
    if (data.items.length === 0) {
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
      data: JSON.stringify(data),
      success(res) {
        if (res.success) {
          toastr.success(res.message || "Lưu phiếu nhập thành công")
        } else {
          toastr.error(res.message || "Có lỗi xảy ra")
        }
      },
      error(xhr) {
        console.error("Save error:", xhr)
        toastr.error(xhr.responseJSON?.message || "Có lỗi xảy ra khi lưu")
      },
    })
  }
})