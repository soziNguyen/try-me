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
    name: 'Gia vị & Nước chấm',
    description: 'Muối, đường, nước mắm, tương ớt...'
  },
  {
    name: 'Đồ khô & Tinh bột',
    description: 'Mì, bún, phở, gạo, bột...'
  },
  {
    name: 'Đồ uống',
    description: 'Nước ngọt, bia, nước suối...'
  },
  {
    name: 'Dầu ăn & Gia dụng',
    description: 'Dầu ăn, giấy ăn, túi nilon...'
  }
]

export const dummyIngredients = [
  // THỰC PHẨM TƯƠI SỐNG (index 0)
  {
    sku: 'BEEF-001',
    name: 'Thịt bò úc',
    unit: 'kg',
    categoryIndex: 0,
    stock: 20,
    expirationDays: 3,
    note: 'Thịt bò nhập khẩu Úc cao cấp',
    image: ''
  },
  {
    sku: 'PORK-001',
    name: 'Thịt heo ba chỉ',
    unit: 'kg',
    categoryIndex: 0,
    stock: 35,
    expirationDays: 3,
    note: 'Thịt heo tươi sạch',
    image: ''
  },
  {
    sku: 'FISH-001',
    name: 'Cá hồi Na Uy',
    unit: 'kg',
    categoryIndex: 0,
    stock: 8,
    expirationDays: 2,
    note: 'Cá hồi tươi nhập khẩu',
    image: ''
  },
  {
    sku: 'SHRIMP-001',
    name: 'Tôm sú',
    unit: 'kg',
    categoryIndex: 0,
    stock: 12,
    expirationDays: 2,
    note: 'Tôm sú size 8-10 con/kg',
    image: ''
  },
  {
    sku: 'CHICKEN-001',
    name: 'Gà ta nguyên con',
    unit: 'kg',
    categoryIndex: 0,
    stock: 25,
    expirationDays: 3,
    note: 'Gà ta thả vườn',
    image: ''
  },

  // RAU CỦ QUẢ (index 1)
  {
    sku: 'VEG-001',
    name: 'Cà chua',
    unit: 'kg',
    categoryIndex: 1,
    stock: 15,
    expirationDays: 5,
    note: 'Cà chua Đà Lạt',
    image: ''
  },
  {
    sku: 'VEG-002',
    name: 'Khoai tây',
    unit: 'kg',
    categoryIndex: 1,
    stock: 28,
    expirationDays: 14,
    note: 'Khoai tây Đà Lạt',
    image: ''
  },
  {
    sku: 'VEG-003',
    name: 'Hành tây',
    unit: 'kg',
    categoryIndex: 1,
    stock: 18,
    expirationDays: 30,
    note: 'Hành tây tím',
    image: ''
  },
  {
    sku: 'VEG-004',
    name: 'Rau muống',
    unit: 'kg',
    categoryIndex: 1,
    stock: 10,
    expirationDays: 2,
    note: 'Rau muống tươi',
    image: ''
  },
  {
    sku: 'VEG-005',
    name: 'Xà lách',
    unit: 'kg',
    categoryIndex: 1,
    stock: 8,
    expirationDays: 3,
    note: 'Xà lách xoong',
    image: ''
  },

  // GIA VỊ & NƯỚC CHẤM (index 2)
  {
    sku: 'SAUCE-001',
    name: 'Nước mắm Phú Quốc',
    unit: 'chai',
    categoryIndex: 2,
    stock: 15,
    expirationDays: 365,
    note: 'Nước mắm truyền thống 40 độ đạm',
    image: ''
  },
  {
    sku: 'SUGAR-001',
    name: 'Đường trắng',
    unit: 'kg',
    categoryIndex: 2,
    stock: 25,
    expirationDays: 730,
    note: 'Đường tinh luyện',
    image: ''
  },
  {
    sku: 'SALT-001',
    name: 'Muối i-ốt',
    unit: 'kg',
    categoryIndex: 2,
    stock: 10,
    expirationDays: 730,
    note: 'Muối biển i-ốt',
    image: ''
  },
  {
    sku: 'SOY-001',
    name: 'Nước tương đậu nành',
    unit: 'chai',
    categoryIndex: 2,
    stock: 12,
    expirationDays: 365,
    note: 'Nước tương cao cấp',
    image: ''
  },
  {
    sku: 'PEPPER-001',
    name: 'Tiêu đen hạt',
    unit: 'gói',
    categoryIndex: 2,
    stock: 8,
    expirationDays: 365,
    note: 'Tiêu đen Phú Quốc',
    image: ''
  },

  // ĐỒ KHÔ & TINH BỘT (index 3)
  {
    sku: 'RICE-001',
    name: 'Gạo ST25',
    unit: 'kg',
    categoryIndex: 3,
    stock: 80,
    expirationDays: 180,
    note: 'Gạo thơm ST25',
    image: ''
  },
  {
    sku: 'NOODLE-001',
    name: 'Bún khô',
    unit: 'kg',
    categoryIndex: 3,
    stock: 22,
    expirationDays: 90,
    note: 'Bún khô cao cấp',
    image: ''
  },
  {
    sku: 'INSTANT-001',
    name: 'Mì gói Hảo Hảo',
    unit: 'gói',
    categoryIndex: 3,
    stock: 200,
    expirationDays: 180,
    note: 'Mì ăn liền 75g',
    image: ''
  },
  {
    sku: 'FLOUR-001',
    name: 'Bột mì đa dụng',
    unit: 'kg',
    categoryIndex: 3,
    stock: 30,
    expirationDays: 365,
    note: 'Bột mì số 8',
    image: ''
  },

  // ĐỒ UỐNG (index 4)
  {
    sku: 'DRINK-001',
    name: 'Coca Cola',
    unit: 'chai',
    categoryIndex: 4,
    stock: 50,
    expirationDays: 180,
    note: 'Nước ngọt có gas 390ml',
    image: ''
  },
  {
    sku: 'BEER-001',
    name: 'Bia Sài Gòn',
    unit: 'lon',
    categoryIndex: 4,
    stock: 80,
    expirationDays: 180,
    note: 'Bia lon 330ml',
    image: ''
  },
  {
    sku: 'COFFEE-001',
    name: 'Cà phê hạt Arabica',
    unit: 'kg',
    categoryIndex: 4,
    stock: 8,
    expirationDays: 90,
    note: 'Cà phê hạt rang',
    image: ''
  },
  {
    sku: 'WATER-001',
    name: 'Nước suối Lavie',
    unit: 'chai',
    categoryIndex: 4,
    stock: 100,
    expirationDays: 365,
    note: 'Nước suối 500ml',
    image: ''
  },

  // DẦU ĂN & GIA DỤNG (index 5)
  {
    sku: 'OIL-001',
    name: 'Dầu ăn Neptune',
    unit: 'chai',
    categoryIndex: 5,
    stock: 20,
    expirationDays: 365,
    note: 'Dầu ăn cao cấp 1L',
    image: ''
  },
  {
    sku: 'OIL-002',
    name: 'Dầu olive',
    unit: 'chai',
    categoryIndex: 5,
    stock: 8,
    expirationDays: 365,
    note: 'Dầu olive extra virgin',
    image: ''
  }
]
