import Ingredient from "../models/inventory.js"
import responseHelper from "../helpers/responseHelper.js"

export const inventoryPage = (req, res) => {
    res.render('inventory/inventory', {
        title: 'Inventory Management',
        page: 'Inventory',
        user: req.user,
        currentUserId: req.user._id.toString()
    })
}

export const importItem = async (req, res) => {
    try {
        const { itemName, quantity, unit, supplier, threshold } = req.body
        let item = await Ingredient.findOne({ itemName })
        if (item) {
            item.quantity += quantity
            if (supplier) item.supplier = supplier
            await item.save();
            return responseHelper.success(res, "OK", 200)
        }

        item = new Ingredient({ itemName, quantity, unit, supplier, threshold })
        await item.save()
        responseHelper.success(res, item,'Thêm nguyên liệu thành công')
    } catch (error) {
        responseHelper.error(res, error.message)
    }
}

export const exportItem = async (req, res) => {
    try {
        const { itemName, quantity } = req.body;

        if (!itemName || !quantity) {
            return responseHelper.error(res, "Thiếu tên nguyên liệu hoặc số lượng", 400);
        }

        const item = await Ingredient.findOne({ itemName });

        if (!item) {
            return responseHelper.error(res, "Nguyên liệu không tồn tại", 404);
        }

        if (item.quantity < quantity) {
            return responseHelper.error(res, "Không đủ số lượng trong kho", 400);
        }

        item.quantity -= quantity;

        await item.save();

        return responseHelper.success(res, item, "Xuất kho thành công");
    } catch (error) {
        return responseHelper.error(res, error.message);
    }
}
