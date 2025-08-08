import Supplier from "../models/supplier.js"
import responseHelper from "../helpers/responseHelper.js"

export const getAllSuppliers = async (req, res) => {
    try {
         const suppliers = await Supplier.find({ isActive: true }).select('_id name')
         responseHelper.success(res, suppliers)
    } catch (error) {
        responseHelper.error(res, error.message)
    }
}

export const getSuppliers = async (req, res) => {
    try {
        const draw = +req.query.draw || 0;
        const start = +req.query.start || 0;
        const length = +req.query.length || 10;
        const searchValue = (req.query["search[value]"] || "").trim();
        const colIdx = req.query["order[0][column]"];
        const sortField = req.query[`columns[${colIdx}][data]`] || "createdAt";
        const sortDir = req.query["order[0][dir]"] === "asc" ? 1 : -1;

        const fieldToSearch = ['code', 'name', 'phone', 'email', 'country', 'address', 'taxId', 'note'];

        const pipeline = [];

        if (searchValue) {
            const orConditions = fieldToSearch.map(field => ({
                [field]: { $regex: searchValue, $options: "i" }
            }));
            pipeline.push({ $match: { $or: orConditions } });
        }

        const countPipeline = [...pipeline, { $count: "count" }];
        const countResult = await Supplier.aggregate(countPipeline);
        const recordsFiltered = countResult[0]?.count || 0;

        const recordsTotal = await Supplier.estimatedDocumentCount();

        pipeline.push(
            { $sort: { [sortField]: sortDir } },
            { $skip: start },
            { $limit: length },
            {
                $project: {
                  code: 1,
                  name: 1,
                  phone: 1,
                  email: 1,
                  country: 1,
                  address: 1,
                  taxId: 1,
                  note: 1,
                  isActive: 1,
                  createdAt: 1
                }
            }
        );

        const suppliers = await Supplier.aggregate(pipeline);

        return res.json({
            draw,
            recordsTotal,
            recordsFiltered,
            data: suppliers
        });
    } catch (error) {
        responseHelper.error(res, error.message);
    }
};

export const createSupplier = async (req, res) => {
    try {
        const newSupplier = new Supplier(req.body)
        await newSupplier.save()
        responseHelper.success(res, null, "Tạo thành công")
    } catch (error) {
        responseHelper.error(res, error.message)
    }
}

export const updateSupplier = async (req, res) => {
    try {
        const { id } = req.params
        const { code, name, phone, email, country, address, taxId, isActive, note } = req.body

        const supplier = await Supplier.findById(id)
        if (!supplier) {
            return responseHelper.error(res, "Khách hàng không tồn tại", 404)
        }

        const conditions = []
        if (code !== undefined) conditions.push({ code })
        if (name !== undefined) conditions.push({ name })

        if (conditions.length > 0) {
            const existing = await Supplier.findOne({
                _id: { $ne: id },
                $or: conditions
            })

            if (existing) {
                return responseHelper.error(res, "Mã hoặc tên khách hàng đã tồn tại", 400)
            }
        }

        const dataUpdate = {}
        if (code !== undefined) dataUpdate.code = code 
        if (name !== undefined) dataUpdate.name = name
        if (phone !== undefined) dataUpdate.phone = phone
        if (email !== undefined) dataUpdate.email = email
        if (country !== undefined) dataUpdate.country = country
        if (address !== undefined) dataUpdate.address = address
        if (taxId !== undefined) dataUpdate.taxId = taxId
        if (isActive !== undefined) dataUpdate.isActive = isActive
        if (note !== undefined) dataUpdate.note = note

        const updated = await Supplier.findByIdAndUpdate(id, dataUpdate, { new: true })
        responseHelper.success(res, updated, "Cập nhật thành công")
    } catch (error) {
        responseHelper.error(res, error.message)
    }
}

export const deleteSuppliers = async (req, res) => {
    try {
        const { ids } = req.body

        if (!Array.isArray(ids) || ids.length === 0) {
            return responseHelper.error(res, "Không có nhà cung cấp nào được chọn để xóa", 400)
        }

        const result = await Supplier.updateMany(
            { _id: { $in: ids } },
            { $set: { isActive: false } }
    )

        responseHelper.success(res, result.modifiedCount, 'Xóa thành công')
    } catch (error) {
        responseHelper.error(res, error.message)
    }
}

export const restoreSuppliers = async (req, res) => {
    try {
        const { ids } = req.body
        await Supplier.updateMany(
            { _id: { $in: ids } },
            { $set: { isActive: true } }
        )
        responseHelper.success(res, 'Khôi phục thành công')    
    } catch (error) {
        responseHelper.error(res, error.message)
    }
}

export const forceDeleteSuppliers = async (req, res) => {
    try {
        const { ids } = req.body
        if (!Array.isArray(ids) || ids.length === 0) {
            return responseHelper.error(res, 'Không có nhà cung cấp nào được chọn để xóa', 400)
        }

        await Supplier.deleteMany({ _id: { $in: ids } })

        responseHelper.success(res, 'Đã xóa vĩnh viễn các nhà cung cấp thành công')
    } catch (error) {
        responseHelper.error(res, error.message)
    }
}
