const logInForm = document.getElementById("login-form");
const signUpForm = document.getElementById("signup-form");
const forgotForm = document.getElementById("forgot-password");
const resetForm = document.getElementById("reset-form");
const API_PROVINCE = 'https://esgoo.net/api-tinhthanh-new/1/0.htm'
const API_COMMUNE = 'https://esgoo.net/api-tinhthanh-new/2';

if (logInForm) {
  // Điền sẵn giá trị từ localStorage khi trang login load
  window.addEventListener("DOMContentLoaded", () => {
    const loginField = document.getElementById("login");
    const passwordField = document.getElementById("password");
    const rememberCheckbox = document.getElementById("remember");

    const savedLogin = localStorage.getItem("savedLogin") || "";
    const savedRemember = localStorage.getItem("savedRemember") === "true";
    const savedPassword = savedRemember ? localStorage.getItem("savedPassword") || "" : "";

    loginField.value = savedLogin;
    rememberCheckbox.checked = savedRemember;
    if (savedRemember) {
      passwordField.value = savedPassword;
    }
  });

  logInForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const loginField = document.getElementById("login");
    const passwordField = document.getElementById("password");
    const rememberCheckbox = document.getElementById("remember");

    if (!loginField || !passwordField) {
      toastr.warning("Username or Password fields are missing.");
      return;
    }

    const login = loginField.value.trim();
    const password = passwordField.value;
    const remember = rememberCheckbox.checked;

    if (!login || !password) {
      toastr.warning("Please enter both username and password.");
      return;
    }

    // Lưu vào localStorage
    localStorage.setItem("savedLogin", login);
    if (remember) {
      localStorage.setItem("savedPassword", password);
      localStorage.setItem("savedRemember", "true");
    } else {
      localStorage.removeItem("savedPassword");
      localStorage.setItem("savedRemember", "false");
    }

    try {
      const result = await ajax("/api/users/login", { login, password, remember: remember ? 1 : 0 });
      if (result) {
        toastr.success("Success");
        setTimeout(() => {
          window.location.href = "/";
        }, 500);
      }
    } catch (error) {
      toastr.error(error.message);
    }
  });
} else if (signUpForm) {
  signUpForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    // Lấy data từ form organization + admin
    const formData = new FormData(signUpForm);
    const data = {
      orgName: formData.get('orgName'),
      orgEmail: formData.get('orgEmail'),
      orgPhone: formData.get('orgPhone'),
      orgProvince: formData.get('orgProvince'),
      orgCommune: formData.get('orgCommune'),
      orgStreet: formData.get('orgStreet'),
      adminUsername: formData.get('adminUsername'),
      adminEmail: formData.get('adminEmail'),
      adminPassword: formData.get('adminPassword')
    };

    const confirmPassword = formData.get('confirmPassword');
    
    // Validate
    if (data.adminPassword !== confirmPassword) {
      toastr.warning('Passwords do not match');
      return;
    }

    if (!data || Object.values(data).some(value => !value)) {
      toastr.warning("Please fill out all fields.");
      return;
    }

    try {
      const result = await ajax("/api/organization/create", data);
      if (result) {
        toastr.success("Organization created successfully. Redirecting to login...");
        setTimeout(() => {
          window.location.href = "/login";
        }, 1000);
      }
    } catch (error) {
      toastr.error(error.message);
    }
  });
} else if (forgotForm) {
  forgotForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const emailElement = document.getElementById("email");
    const email = emailElement.value.trim();

    if (!email) {
      toastr.warning("Please enter your email.");
      emailElement.focus();
      return;
    }

    try {
      const result = await ajax("/api/users/forgot", { email });
      if (result) {
        toastr.info("A reset link has been sent to your email.");
        setTimeout(() => {
          window.location.href = "/login";
        }, 1500);
      }
    } catch (error) {
      toastr.error(error.message);
    }
  });
} else if (resetForm) {
  document.addEventListener("DOMContentLoaded", () => {
    // Lấy token từ URL (http://localhost:3003/reset-password/:token)
    const token = window.location.pathname.split("/").pop();

    resetForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const newPasswordElement = document.getElementById("newPassword");
      const confirmPasswordElement = document.getElementById("confirmPassword");

      const newPassword = newPasswordElement.value.trim();
      const confirmPassword = confirmPasswordElement.value.trim();

      if (newPassword.length === 0) {
        toastr.warning("This field is required.");
        newPasswordElement.focus();
        return;
      }
      if (confirmPassword.length === 0) {
        toastr.warning("This field is required.");
        confirmPasswordElement.focus();
        return;
      }
      if (!isValidPassword(newPassword)) {
        toastr.warning( "Password must be at least 8 characters long and include an uppercase letter, a number, and a special character." );
        return;
      }
      if (!isValidPassword(newPassword, confirmPassword)) {
        toastr.warning("Passwords do not correct.");
        return;
      }
      try {
        const result = await ajax(`/api/users/reset-password/${token}`, { newPassword, confirmPassword });
        if (result) {
          toastr.success("Password has been reset successfully.");
          setTimeout(() => {
            const confirmChange = confirm("Do you want to login?");
            if (!confirmChange) return;
            window.location.href = "/login";
          }, 400);
        }
      } catch (error) {
        toastr.error(error.message);
      }
    });
  });
} else {
  document.addEventListener("DOMContentLoaded", async () => {
    await getUsers();
    await addUser();
  });

  document.getElementById("userTableBody").addEventListener("click", async (event) => {
    if (event.target.classList.contains("updateUserBtn")) { // event.target.id === ""
      const userId = event.target.getAttribute("data-id");
      if (userId) {
        await updateUser(userId);
      }
    }
  });

  async function addUser() {
    const newUserModalElement = document.getElementById("newUserModal");
    const newUserModal = newUserModalElement ? new bootstrap.Modal(newUserModalElement) : null;
    const newUser = document.querySelector("#newUser");
    const createUserBtn = document.getElementById("createUserBtn");
    // const userTable = document.querySelector("#userTable");

    if (newUser && newUserModal) {
      newUser.addEventListener("click", function () {
        newUserModal.show();
      });
    }

    if (createUserBtn) {
      createUserBtn.addEventListener("click", async function (event) {
        event.preventDefault();

        const { username, email, password, confirmPassword } = getFormData();
        const checkInPut = validateUserInput( username, email, password, confirmPassword );

        if (checkInPut) {
          toastr.warning(checkInPut);
          return;
        }

        try {
          const result = await ajax("/api/users/create", { username, email, password });
          if (result) {
            toastr.success("Added");
            if (newUserModal) newUserModal.hide();
            clearForm('new');
            await getUsers();
          }
        } catch (error) {
          toastr.error(error.message);
        }
      });
    }
  }

  let userData = [];
  async function getUsers() {
    try {
      const users = await ajax("/api/users", {}, "GET");
      if (users) {
        userData = users;
        renderTable(users);
        document.getElementById("selectAll").checked = false;
      }
    } catch (error) {
      toastr.error(error.message);
    }
  }
  window.getUsers = getUsers;

  document.getElementById("searchUserInput").addEventListener("input", function () {
    const query = this.value.trim().toLowerCase();
    const filtered = userData.filter(u => {
      const username = removeAccents(u.username).toLowerCase();
      const email = removeAccents(u.email).toLowerCase();
      const createdAt = formatDate(u.createdAt);
      const updatedAt = formatDate(u.updatedAt);
      return username.includes(query) || email.includes(query) || createdAt.includes(query) || updatedAt.includes(query);
    });
    if (filtered.length === 0) {
      userTableBody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center">No users found</td>
        </tr>
      `
    } else {
      renderTable(filtered)
    }
  })
  
  // update event handler
  async function updateUser(userId) {
    try {
      const updateUserModalElement = document.getElementById("updateUserModal");
      if (!updateUserModalElement) {
        toastr.error("Update user modal not found.");
        return;
      }

      const user = await ajax(`/api/users/${userId}`, {}, "GET");
      const roles = ['Admin', 'Org', 'Member'];
      const roleSelect = document.getElementById("new-role");
      roleSelect.innerHTML = "";

      roles.forEach((r) => {
        const opt = document.createElement("option");
        opt.value = r;
        opt.textContent = r;
        roleSelect.appendChild(opt)
      })
      
      document.getElementById("new-username").value = user.username || "";
      document.getElementById("new-email").value = user.email || "";
      document.getElementById("new-role").value = user.role || "Member";

      const updateUserModal = new bootstrap.Modal(updateUserModalElement); // initial & show bootstrap modal
      updateUserModal.show();

      const updateBtn = document.getElementById("updateUserBtnForm"); // form submit
      const updateUserBtnForm = updateBtn.cloneNode(true);
      updateBtn.replaceWith(updateUserBtnForm);

      updateUserBtnForm.addEventListener("click", async function () {
        const currentUserId = document.getElementById("currentUserId").value;
        const username = document.getElementById("new-username").value.trim();
        const email = document.getElementById("new-email").value.trim();
        const password = document.getElementById("new-password").value.trim();
        const confirmPassword = document.getElementById("new-confirm-password").value.trim();
        const role = document.getElementById("new-role").value;
        const dataUpdate = { username, email, role };
        const isValidUser = isValidUserAccountName(username, email);

        if (isValidUser) {
          toastr.warning(isValidUser);
          return;
        }

        if (role !== user.role && userId === currentUserId) {
          toastr.warning("You cannot change your own role.");
          return;
        } 
        if ((password && !confirmPassword) || (!password && confirmPassword)) {
          toastr.warning("Please fill out this field.");
          (password ? document.getElementById("new-confirm-password") : document.getElementById("new-password")).focus();
          return;
        }

        if (password && confirmPassword) {
          if (!isValidPassword(password)) {
            toastr.warning(
              "Password must be at least 8 characters long and include an uppercase letter, a number, and a special character."
            );
            return;
          }
          if (password !== confirmPassword) {
            toastr.warning("Passwords do not match.");
            return;
          }
          dataUpdate.password = password;
          dataUpdate.confirmPassword = confirmPassword;
        }

        try {
          const result = await ajax(
            `/api/users/update/${userId}`,
            dataUpdate,
            "PUT"
          );
          if (result) {
            toastr.success("Updated");
            updateUserModal.hide();
            clearForm('update');
            await getUsers();
          }
        } catch (error) {
          toastr.error(error.message);
        }
      });
    } catch (error) {
      toastr.error(error.message);
    }
  }
  // select all check box
  const selectAll = document.getElementById("selectAll");
  const tbody     = document.getElementById('userTableBody');
  selectAll?.addEventListener("change", () => {
    const checkboxes = document.querySelectorAll(".userCheckbox");
    checkboxes.forEach((checkbox) => (checkbox.checked = selectAll.checked));
  });

  // sync selectAll
  tbody.addEventListener("change", (e) => {
    if (!e.target.matches(".userCheckbox")) return;
    const all = Array.from(tbody.querySelectorAll(".userCheckbox"));
    const every = all.every((cb) => cb.checked);
    selectAll.checked = every;
  });

  // click 'tr' checkbox
  tbody.addEventListener("click", (e) => {
    const target = e.target;
    if (target.matches("input.userCheckbox") || target.closest(".updateUserBtn") || target.closest("button")) return;
    const row = target.closest("tr");
    if (!row) return;
    const cb = row.querySelector("input.userCheckbox");
    if (!cb) return;
    cb.checked = !cb.checked;
    cb.dispatchEvent(new Event("change", { bubbles: true }));
  })

  // delete users handling
  document.getElementById("deleteManyBtn")?.addEventListener("click", deleteUsers); 
  const currentUserId = document.getElementById('currentUserId')?.value;

  async function deleteUsers() {
    const selectedUsers = [...document.querySelectorAll(".userCheckbox:checked"),].map((cb) => cb.dataset.id);

    if (selectedUsers.length === 0) {
      toastr.warning("Please choose at least one user.");
      return;
    }

    if (selectedUsers.includes(currentUserId)) {
      toastr.warning("You cannot delete your own account.");
      return;
    }

    const confirmDelete = confirm(`Are you sure you want to delete ${selectedUsers.length} user${selectedUsers.length > 1 ? "s" : ""}?`);
    if (!confirmDelete) return;
    try {
      const result = await ajax("/api/users/delete", {
        userIds: selectedUsers,
      });
      if (result) {
        toastr.success("Deleted");
        await getUsers();
        selectAll.checked = false;
      }
    } catch (error) {
      toastr.error(error.message);
    }
  }
}

// render table
function renderTable(users = []) {
  const tableBody = document.getElementById("userTableBody");
  if (!Array.isArray(users) || users.length === 0) {
    tableBody.innerHTML = `
        <tr>
            <td colspan="7" class="t_center">No User records found.</td>
        </tr>
        `;
    return;
  }
  tableBody.innerHTML = users
    .map((user) =>
        `<tr>
            <td class="text-center"><input type="checkbox" class="userCheckbox" data-id="${user._id}"></td>
            <td>${user.username}</td>
            <td>${user.email}</td>
            <td>${user.role}</td>
            <td>${formatDate(user.createdAt)}</td>
            <td>${formatDate(user.updatedAt)}</td>
            <td>
                <button class="updateUserBtn btn btn-outline-info" data-id="${user._id}">
                    <i class="bi bi-pencil-square"></i>
                </button>
            </td>
        </tr>`
    ).join("");
}

function listProvinces () {
  $.getJSON('/data/full_address.json', function (res) {
    if (res.error == 0 && res.data) {

      const $provinceSelect = $('#orgProvince');
      $provinceSelect.empty().append('<option value="">— Tỉnh/Thành phố —</option>');

      $.each(res.data, function (key, province) {
        $provinceSelect.append(`<option value="${province.id}">${province.name}</option>`);
      })

      initSelect2($provinceSelect, 'Tỉnh/Thành phố');
    }
  })
  .fail(function () {
    toastr.error("Không thể tải danh sách tỉnh thành.");
  })
}

function listCommunes(provinceId) {
  $.getJSON('/data/full_address.json', function(res) {
    const $communeSelect = $('#orgCommune');
    $communeSelect.empty().append('<option value="">— Chọn Xã/Phường —</option>');

    if (res.error === 0 && res.data) {
      // Tìm đúng tỉnh theo id
      const province = res.data.find(p => p.id === provinceId);
      if (province && province.data2) {
        province.data2.forEach(commune => {
          $communeSelect.append(
            `<option value="${commune.id}">${commune.full_name}</option>`
          );
        });
      }

      $communeSelect.prop('disabled', $communeSelect.children().length <= 1);
      initSelect2($communeSelect, 'Xã/Phường');
    } else {
      $communeSelect.prop('disabled', true);
    }
  }).fail(function() {
    toastr.error("Không thể tải danh sách xã/phường.");
  });
}

$(document).ready(function() {
  if (signUpForm) {
    listProvinces();
    $('#orgProvince').on('change', function() {
        const provinceId = $(this).val();
        if (provinceId) {
            listCommunes(provinceId);
        } else {
            $('#orgCommune')
                .empty()
                .append('<option value="">— Chọn Xã/Phường —</option>')
                .prop('disabled', true);
            initSelect2($('#orgCommune'), '— Chọn Xã/Phường —');
        }
    });
  }
});