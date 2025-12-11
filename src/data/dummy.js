export const dummyIngredientCategories = [
  {
    name: 'Thực phẩm tươi sống',
    description: 'Thịt, cá, hải sản tươi'
  },
  {
    name: 'Rau củ quả',
    description: 'Rau xanh, củ, quả tươi'
  },
  {
    name: 'Gia vị',
    description: 'Gia vị, nước chấm'
  }
]

export const dummyIngredients = [
  // THỰC PHẨM TƯƠI SỐNG (index 0)
  {
    sku: 'BEEF-001',
    name: 'Thịt bò úc',
    unit: 'kg',
    categoryIndex: 0,
    expirationDays: 3,
    note: 'Thịt bò nhập khẩu',
    image: ''
  },
  {
    sku: 'FISH-001',
    name: 'Cá hồi Na Uy',
    unit: 'kg',
    categoryIndex: 0,
    expirationDays: 2,
    note: 'Cá hồi tươi',
    image: ''
  },

  // RAU CỦ QUẢ (index 1)
  {
    sku: 'VEG-001',
    name: 'Cà chua',
    unit: 'kg',
    categoryIndex: 1,
    expirationDays: 5,
    note: 'Cà chua Đà Lạt',
    image: ''
  },
  {
    sku: 'VEG-002',
    name: 'Khoai tây',
    unit: 'kg',
    categoryIndex: 1,
    expirationDays: 14,
    note: 'Khoai tây Đà Lạt',
    image: ''
  },
  {
    sku: 'SUGAR-001',
    name: 'Đường trắng',
    unit: 'kg',
    categoryIndex: 2,
    expirationDays: 730,
    note: 'Đường tinh luyện',
    image: ''
  }
]

// Supplier Dummy Data
export const supplierDummy = [
  {
    code: 'SUP001',
    name: 'FreshFarm Supply',
    phone: '0909000111',
    email: 'contact@freshfarm.vn',
    country: 'Vietnam',
    address: '12 Phạm Văn Đồng, Cầu Giấy, Hà Nội',
    taxId: '0101234567',
    note: 'Rau củ tươi – thực phẩm sạch'
  },
  {
    code: 'SUP002',
    name: 'Premium Meat Co.',
    phone: '0933445566',
    email: 'meat@premium.vn',
    country: 'Vietnam',
    address: '45 Trần Duy Hưng, Cầu Giấy, Hà Nội',
    taxId: '0107766554',
    note: 'Thịt bò – thịt gà – thịt heo'
  },
  {
    code: 'SUP003',
    name: 'Asia Beverage',
    phone: '0888123456',
    email: 'beverage@asia.vn',
    country: 'Vietnam',
    address: '88 Hoàng Quốc Việt, Bắc Từ Liêm, Hà Nội',
    taxId: '0109988776',
    note: 'Đồ uống – nước giải khát'
  }
]

export const warehouseDummy = [
  {
    name: 'Kho Tổng Hà Nội',
    location: '123 Xuân Thủy, Cầu Giấy, Hà Nội'
  }
]

export const dummyTables = [
  { name: 'Bàn 01', capacity: 4, area: 'KV1' },
  { name: 'Bàn 02', capacity: 4, area: 'KV1' },
  { name: 'Bàn 03', capacity: 4, area: 'KV2' },
  { name: 'Bàn 04', capacity: 4, area: 'KV2' },
  { name: 'Bàn 05', capacity: 4, area: 'KV3' }
]

export const dummyMenuCategories = [
  {
    name: 'Cà phê',
    description: 'Các món cà phê'
  },
  {
    name: 'Trà – Trà sữa',
    description: 'Các món trà'
  },
  {
    name: 'Đồ ăn vặt',
    description: 'Các món ăn nhẹ'
  }
]

export const dummyMenuItems = [
  {
    name: 'Cà phê đen',
    sku: 'CFD001',
    image: '',
    price: 25000,
    categoryIndex: 0
  },
  {
    name: 'Cà phê sữa',
    sku: 'CFS001',
    image: '',
    price: 30000,
    categoryIndex: 0
  },
  {
    name: 'Trà đào',
    sku: 'TD001',
    image: '',
    price: 35000,
    categoryIndex: 1
  }
]
