/**
 * ✔️ Mọi API trả về response đồng nhất.
 * ✔️ Dễ kiểm soát lỗi và phản hồi từ backend.
 */
const responseHelper = {
  success: (res, data, message = 'Success') => {
      res.status(200).json({ success: true, message, data });
  },

  error: (res, error, statusCode = 500) => {
      res.status(statusCode).json({ success: false, message: error || 'Internal Server Error' });
  }
};

export default responseHelper;
