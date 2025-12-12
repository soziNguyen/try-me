import IngredientCategory from '../modules/inventory/ingredient-category/model.js'
import IngredientStock from '../modules/inventory/ingredient-stock/model.js'
import { Ingredient } from '../modules/inventory/ingredient/model.js'
import Supplier from '../modules/inventory/supplier/model.js'
import Warehouse from '../modules/inventory/warehouse/model.js'
import { StockEntry } from '../modules/stock-transaction/stock-entry/model.js'
import { MenuCategory } from '../modules/menu/menu-category/model.js'
import { MenuItem } from '../modules/menu/menu-item/model.js'
import { generateDocumentCode } from '../helpers/common.js'
import Tax from '../modules/tax/model.js'
import Table from '../modules/table/model.js'
import Coupon from '../modules/coupon/model.js'
import PaymentMethod from '../modules/payment/model.js'
import ReceivingAccount from '../modules/receiving-account/model.js'
import { Combo } from '../modules/menu/combo/model.js'
import { ProductEntry } from '../modules/product/entry/model.js'
import ProductStock from '../modules/product/stock/model.js'
import QRCode from 'qrcode'
import {
  dummyIngredientCategories,
  dummyIngredients,
  supplierDummy,
  warehouseDummy,
  dummyTables,
  dummyMenuCategories,
  dummyMenuItems,
  dummyTaxes,
  dummyPaymentMethods,
  dummyReceivingAccounts,
  dummyCoupons,
  dummyCombos,
  dummyPEItems
} from '../data/dummy.js'

export async function insertDummyDataForOrganization(session, organizationId, businessType) {
  try {
    // Insert Categories
    const categories = await IngredientCategory.insertMany(
      dummyIngredientCategories.map((c) => ({
        ...c,
        organization: organizationId
      })),
      { session }
    )

    // Insert Ingredients
    const ingredientsData = dummyIngredients.map((i) => ({
      ...i,
      category: categories[i.categoryIndex]._id,
      organization: organizationId
    }))

    const ingredients = await Ingredient.insertMany(ingredientsData, { session })

    // Insert Suppliers
    const suppliers = await Supplier.insertMany(
      supplierDummy.map((s) => ({
        ...s,
        organization: organizationId
      })),
      { session }
    )

    // Insert Warehouses
    const warehouses = await Warehouse.insertMany(
      warehouseDummy.map((w) => ({
        ...w,
        organization: organizationId
      })),
      { session }
    )

    // Lấy kho đầu tiên làm kho nhập default
    const warehouse = warehouses[0]
    const supplier = suppliers[0]

    const items = ingredients.map((ing) => ({
      ingredient: ing._id,
      quantity: ing.stock || 10,
      unit: ing.unit || 'kg',
      unitPrice: 50000,
      total: (ing.stock || 10) * 50000
    }))

    const subTotal = items.reduce((s, i) => s + i.total, 0)
    const taxAmount = subTotal * 0.08
    const grandTotal = subTotal + taxAmount
    const code = await generateDocumentCode(StockEntry, 'SE')

    await StockEntry.create(
      [
        {
          code,
          supplier: supplier._id,
          warehouse: warehouse._id,
          items,
          subTotal,
          taxRate: 0.08,
          taxAmount,
          grandTotal,
          organization: organizationId
        }
      ],
      { session }
    )

    for (const item of items) {
      await Ingredient.findByIdAndUpdate(
        item.ingredient,
        { $inc: { stock: item.quantity } },
        { session }
      )

      await IngredientStock.findOneAndUpdate(
        {
          ingredient: item.ingredient,
          warehouse: warehouse._id,
          organization: organizationId
        },
        {
          $inc: { quantity: item.quantity },
          supplier: supplier._id
        },
        {
          new: true,
          upsert: true,
          session
        }
      )
    }

    // Insert Tables for food & drink business
    if (['drink', 'food'].includes(businessType)) {
      const domain = process.env.DOMAIN || 'http://localhost:6001'

      const tables = []
      for (const t of dummyTables) {
        const tableDoc = {
          ...t,
          warehouse: warehouse._id,
          organization: organizationId
        }

        const newTable = new Table(tableDoc)
        const url = `${domain}/api/scan/${newTable._id.toString()}`

        newTable.qrCode = await QRCode.toDataURL(url, {
          width: 220,
          margin: 1,
          errorCorrectionLevel: 'M'
        })

        await newTable.save({ session })
        tables.push(newTable)
      }
    }

    // Insert Menu Categories
    const menuCategories = await MenuCategory.insertMany(
      dummyMenuCategories.map((c) => ({
        ...c,
        organization: organizationId
      })),
      { session }
    )

    const menuItemData = dummyMenuItems.map((m) => ({
      ...m,
      warehouse: warehouses[0]._id,
      category: menuCategories[m.categoryIndex]._id,
      organization: organizationId
    }))

    const menuItems = await MenuItem.insertMany(menuItemData, { session })

    const comboData = dummyCombos.map((c) => ({
      sku: c.sku,
      name: c.name,
      image: c.image,
      items: c.items.map((it) => ({
        menuItem: menuItems[it.itemIndex]._id,
        quantity: it.quantity
      })),
      price: c.price,
      isActive: c.isActive,
      note: c.note,
      warehouse: warehouses[0]._id,
      organization: organizationId
    }))

    const combos = await Combo.insertMany(comboData, { session })

    const peItems = dummyPEItems.map((it) => {
      const ref = it.type === 'MenuItem' ? menuItems[it.itemIndex] : combos[it.comboIndex]

      const total = it.quantity * it.unitPrice

      return {
        productType: it.type,
        product: ref._id,
        quantity: it.quantity,
        unit: 'món',
        unitPrice: it.unitPrice,
        total
      }
    })

    // tổng toàn bộ phiếu
    const peTotal = peItems.reduce((s, i) => s + i.total, 0)

    // code
    const peCode = await generateDocumentCode(ProductEntry, 'PE')

    // tạo ProductEntry
    await ProductEntry.create(
      [
        {
          code: peCode,
          warehouse: warehouses[0]._id,
          items: peItems,
          total: peTotal,
          note: 'Phiếu nhập sản phẩm mẫu',
          organization: organizationId
        }
      ],
      { session }
    )

    // cập nhật tồn kho ProductStock
    for (const it of peItems) {
      if (it.productType === 'MenuItem') {
        await ProductStock.findOneAndUpdate(
          {
            product: it.product,
            warehouse: warehouses[0]._id,
            organization: organizationId
          },
          { $inc: { quantity: it.quantity } },
          { upsert: true, session }
        )
      } else {
        await ProductStock.findOneAndUpdate(
          {
            combo: it.product,
            warehouse: warehouses[0]._id,
            organization: organizationId
          },
          { $inc: { quantity: it.quantity } },
          { upsert: true, session }
        )
      }
    }

    await Tax.insertMany(
      dummyTaxes.map((t) => ({
        ...t,
        organization: organizationId
      })),
      { session }
    )

    const receivingAccounts = await ReceivingAccount.insertMany(
      dummyReceivingAccounts.map((ra) => ({
        ...ra,
        organization: organizationId
      })),
      { session }
    )

    await Promise.all(
      dummyPaymentMethods.map(async (pm, index) => {
        const data = {
          ...pm,
          organization: organizationId
        }

        if (pm.type === 'bank') {
          data.receivingAccountId = receivingAccounts.find((a) => a.type === 'bank')._id
        }

        if (pm.type === 'e-wallet') {
          data.receivingAccountId = receivingAccounts.find((a) => a.type === 'e-wallet')._id
        }

        await PaymentMethod.create([data], { session })
      })
    )

    await Coupon.insertMany(
      dummyCoupons.map((c) => ({
        ...c,
        organization: organizationId
      })),
      { session }
    )

    return true
  } catch (err) {
    console.error('Error inserting dummy data:', err)
    return false
  }
}
