# Fast_POS

Fast_POS là hệ thống quản lý bán hàng, được xây dựng bằng **Node.js**, **Express**, **MongoDB** và **EJS**.  
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
- **Node.js** v18+
- **Express** v5
- **MongoDB + Mongoose**
- **EJS**
- **Passport Local**
- **Multer**
- **Nodemailer**
- **Moment-timezone**
- **Dotenv**

## 📂 Cấu trúc thư mục
```
Fast_POS/ 
│
├── src/
│ ├── models/ # Mongoose models
│ ├── routes/ # Express routes
│ ├── controllers/ # Controllers xử lý logic
│ ├── views/ # EJS templates
│ ├── public/ # Static files (CSS, JS, images)
│ ├── app.js          # Khởi tạo và cấu hình Express app (middleware, routes, view engine)
│ └── server.js # File khởi động server
├── .env # File mẫu cấu hình môi trường
├── package.json └── README.md
```

## ⚙️ Cài đặt
1. **Clone dự án**
```bash
git clone https://github.com/soziNguyen/Fast_POS.git
cd Fast_POS
```

2. **Cài dependencies**
```bash
npm install
```

3. **Tạo file .env từ mẫu**
```env
PORT=3000
MONGODB_URI=your_mongodb
SESSION_SECRET=your_secret
```
4. **Chạy dự án**
```bash
npm run dev
```


