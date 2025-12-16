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
  { name: '01', capacity: 4, area: 'KV1' },
  { name: '02', capacity: 4, area: 'KV1' },
  { name: '03', capacity: 4, area: 'KV2' },
  { name: '04', capacity: 4, area: 'KV2' },
  { name: '05', capacity: 4, area: 'KV3' }
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

export const dummyCombos = [
  {
    sku: 'CB001',
    name: 'Combo Cà phê đen + Trà đào',
    image: '',
    items: [
      { itemIndex: 0, quantity: 1 }, // Cà phê đen
      { itemIndex: 2, quantity: 1 } // Trà đào
    ],
    price: 55000,
    isActive: true,
    note: 'Combo tiết kiệm'
  },
  {
    sku: 'CB002',
    name: 'Combo Cà phê sữa + Cà phê đen',
    image: '',
    items: [
      { itemIndex: 1, quantity: 1 }, // Cà phê sữa
      { itemIndex: 0, quantity: 1 } // Cà phê đen
    ],
    price: 52000,
    isActive: true,
    note: 'Combo buổi sáng'
  }
]

export const dummyPEItems = [
  { type: 'MenuItem', itemIndex: 0, quantity: 50, unitPrice: 20000 },
  { type: 'MenuItem', itemIndex: 1, quantity: 35, unitPrice: 25000 },
  { type: 'MenuItem', itemIndex: 2, quantity: 40, unitPrice: 30000 },

  { type: 'Combo', comboIndex: 0, quantity: 20, unitPrice: 60000 },
  { type: 'Combo', comboIndex: 1, quantity: 15, unitPrice: 55000 }
]

export const dummyTaxes = [
  {
    name: 'Thuế 0%',
    rate: 0,
    description: 'Áp dụng cho các nhóm hàng không chịu thuế'
  },
  {
    name: 'Thuế 8%',
    rate: 8,
    description: 'Thuế VAT 8% theo quy định'
  }
]

export const dummyReceivingAccounts = [
  {
    type: 'bank',
    bankCode: 'VCB',
    bankName: 'Vietcombank',
    accountNumber: '0011001234567',
    name: 'Công ty TNHH ABC'
  },
  {
    type: 'e-wallet',
    bankCode: 'MOMO',
    bankName: 'Momo E-Wallet',
    accountNumber: '0988123456',
    name: 'Công ty TNHH ABC'
  }
]

export const dummyPaymentMethods = [
  {
    name: 'Tiền mặt',
    type: 'cash',
    description: 'Thanh toán bằng tiền mặt',
    isDefault: true
  },
  {
    name: 'Chuyển khoản',
    type: 'bank',
    description: 'Thanh toán qua tài khoản ngân hàng'
  },
  {
    name: 'Momo',
    type: 'e-wallet',
    description: 'Thanh toán qua ví MoMo'
  }
]

export const dummyCoupons = [
  {
    code: 'SALE10',
    discountType: 'percent',
    discountValue: 10,
    description: 'Giảm 10% cho toàn bộ đơn hàng',
    startDate: new Date(),
    endDate: new Date(new Date().setDate(new Date().getDate() + 30)), // 30 ngày
    usageLimit: null,
    usedCount: 0,
    isActive: true
  },
  {
    code: 'GIAM50K',
    discountType: 'amount',
    discountValue: 50000,
    description: 'Giảm trực tiếp 50.000đ',
    startDate: new Date(),
    endDate: new Date(new Date().setDate(new Date().getDate() + 60)), // 60 ngày
    usageLimit: 100,
    usedCount: 0,
    isActive: true
  },
  {
    code: 'FLASH20',
    discountType: 'percent',
    discountValue: 20,
    description: 'Flash sale giảm 20% trong 24h',
    startDate: new Date(),
    endDate: new Date(new Date().setDate(new Date().getDate() + 1)), // 1 ngày
    usageLimit: 50,
    usedCount: 0,
    isActive: true
  }
]

export const dummyShifts = [
  {
    name: 'Ca Sáng',
    type: 'morning',
    startTime: '08:00',
    endTime: '14:00',
    note: 'Ca làm việc buổi sáng'
  },
  {
    name: 'Ca Chiều',
    type: 'afternoon',
    startTime: '14:00',
    endTime: '20:00',
    note: 'Ca làm việc buổi chiều'
  },
  {
    name: 'Ca Tối',
    type: 'night',
    startTime: '20:00',
    endTime: '02:00',
    note: 'Ca làm việc buổi tối'
  }
]
