import crypto from 'crypto';

export function isDate(str){
    const d = new Date(str);
    return !isNaN(d);
}

export function getDateFromString(str){
  let date = new Date(str);
  if(isNaN(date)) return null;

  date.setHours(date.getHours());
  let result = date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, '0') + "-" + String(date.getDate()).padStart(2, '0') + " " + String(date.getHours()).padStart(2, '0') + ":" + String(date.getMinutes()).padStart(2, '0') + ":00";
  return result;
}

export function getDateFromTimestamp(timestamp){
  if(isNaN(timestamp)) return null;

  let date = new Date(timestamp*1000);
  //date.setHours(date.getHours()+7);
  let result = date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, '0') + "-" + String(date.getDate()).padStart(2, '0') + " " + String(date.getHours()).padStart(2, '0') + ":" + String(date.getMinutes()).padStart(2, '0') + ":00";
  return result;
}

export function getCreatedAt() {
    //const today = new Date(Date.now()+ 7*60*60*1000);
    const today = new Date();
    const hh = String(today.getHours()).padStart(2, '0');
    const minutes = String(today.getMinutes()).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
    const yyyy = today.getFullYear();
    const created_at = yyyy + "-" + mm + "-" + dd + " " + hh + ":" + minutes + ":00";
    return created_at;
}

export function slugify(text){
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
}

export function formatPhoneNumber(phone){
  phone = phone.replace(/[\s\.\+-]+/g, ""); // Loại bỏ các ký tự không cần thiết
  if (phone.startsWith('0')) {
    phone = phone.replace(/^0/, '84'); // Thay thế số 0 ở đầu thành 84
  }
  return phone;
}

export function makeid(length) {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < length; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
}
/**
 * Check time is expired or not
 * @param {timestamp} expiry_date
 * @returns {boolean} True is expired, False is unexpired
 */
export function isExpired(expiry_date) {
  const now = new Date();
  // compare the expiry time of the item with the current time
  if (now.getTime() > expiry_date) {
      return true;
  }
  return false;
}
/**
 * Convert object to query string
 * @param {Object} obj {a: 1, b: 2, c: 3}
 * @returns {String}
 */
export function serialize(obj) {
  var str = [];
  for (var p in obj)
      if (obj.hasOwnProperty(p)) {
          str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
      }
  return str.join("&");
}
/**
 * Mã hóa base64 với việc thay đổi các ký tự để phù hợp với URL và loại bỏ các ký tự = ở cuối
 */
export function base64UrlEncode(str) {
  return str.toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
}
/**
 * Generate a random salt
 */
export function generateSalt(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}
/**
 * MD5 hash of a string
 */
export function md5(string) {
  return crypto.createHash('md5').update(string).digest('hex');
}

/**
 *  Check validate password
 */
export function isValidPassword(input) {
  if (
      input.length < 8 ||
      !/[A-Z]/.test(input) ||
      !/\d/.test(input) ||
      !/[!@#$%^&*(),.?":{}|<>]/.test(input)
  ) {
      return 'Password must be at least 8 characters long and include an uppercase letter, a number, and a special character.';
  }
  return null;
}

/**
 * Chuyển đổi giá trị đầu vào sang kiểu số, với xử lý mặc định và kiểm tra hợp lệ.
 *
 * @param {any} value - Giá trị đầu vào cần parse (có thể là số, chuỗi, null, undefined,...).
 * @param {number} defaultValue - Giá trị mặc định trả về nếu đầu vào rỗng (mặc định là 0).
 * @returns {number} - Giá trị sau khi đã chuyển sang kiểu số.
 * @throws {Error} - Nếu không thể chuyển đổi sang số hợp lệ.
 */
export const parseNumberField = (value, defaultValue = 0) => {
  const raw = value?.toString().trim(); // Chuyển về chuỗi và loại bỏ khoảng trắng

  if (!raw) return defaultValue; // Nếu rỗng -> trả về giá trị mặc định

  const parsed = Number(raw); // Ép sang số

  if (isNaN(parsed)) throw new Error("Giá trị trường này phải là một số"); // Nếu không phải số -> lỗi

  return parsed; // Trả về số hợp lệ
};

export const parseStringField = (value) => {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
};

export const generateDocumentCode = async (model, prefix = 'DOC') => {
  try {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const datePrefix = `${prefix}-${year}${month}${day}`;

    const lastDoc = await model.findOne({
      code: { $regex: `^${datePrefix}-\\d{3}$` }
    }).sort({ code: -1 }).lean();

    let nextNumber = 1;
    if (lastDoc && lastDoc.code) {
      const lastNumber = parseInt(lastDoc.code.split('-')[2]);
      nextNumber = lastNumber + 1;
    }

    const formattedNumber = nextNumber.toString().padStart(3, '0');
    return `${datePrefix}-${formattedNumber}`;

  } catch (error) {
    // Fallback: random mã
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${year}${month}${day}-${randomNum}`;
  }
};
