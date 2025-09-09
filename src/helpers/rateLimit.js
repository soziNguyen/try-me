import rateLimit from 'express-rate-limit';

// Rate limit cho login
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 5, // tối đa 5 request
  handler: (req, res) => {
    // Trả JSON hợp lệ
    return res.status(429).json({
      message: 'Bạn đã nhập sai thông tin quá 5 lần. Hãy thử lại sau 15 phút.'
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true
});

// Rate limit cho API công khai
export const apiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 giờ
  max: 100, // tối đa 100 request / IP
  message: 'Bạn đã vượt quá giới hạn truy cập API. Hãy thử lại sau 1 giờ.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true
});
