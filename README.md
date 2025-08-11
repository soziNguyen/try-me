# Fast_POS

Fast_POS là hệ thống quản lý bán hàng (Point of Sale) dành cho FnB, được xây dựng bằng **Node.js**, **Express**, **MongoDB** và **EJS**.  
Dự án hỗ trợ đăng nhập, quản lý nguyên liệu, quản lý kho, nhập - xuất hàng, và các tính năng liên quan cho cửa hàng.

## 📌 Tính năng chính
- Đăng ký / đăng nhập bằng **Passport Local**
- Quản lý kho nguyên liệu (nhập kho, xuất kho, chuyển kho)
- Quản lý nhà cung cấp
- Quản lý người dùng
- Tính toán tồn kho tự động
- Giao diện render bằng **EJS**
- Hỗ trợ upload file với **Multer**
- Lưu session với **connect-mongo**
- Hỗ trợ gửi email với **Nodemailer**
- Hỗ trợ đa múi giờ với **moment-timezone**

## 🛠 Công nghệ sử dụng
- **Node.js** v20+
- **Express** v5
- **MongoDB + Mongoose**
- **EJS**
- **Passport Local**
- **Multer**
- **Nodemailer**
- **Moment-timezone**
- **Dotenv**

## 📂 Cấu trúc thư mục
<pre> ``` Fast_POS/ │ ├── src/ │ ├── models/ # Mongoose models │ ├── routes/ # Express routes │ ├── controllers/ # Controllers xử lý logic │ ├── views/ # EJS templates │ ├── public/ # Static files (CSS, JS, images) │ └── server.js # File khởi động server │ ├── .env.example # File mẫu cấu hình môi trường ├── package.json └── README.md ``` </pre>
