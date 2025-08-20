import Food from "./model.js";
import responseHelper from '../../helpers/responseHelper.js'

export const getFoods = async (req, res) => {
    try {
        // Lấy params từ DataTables
        const draw = +req.query.draw || 0;
        const start = +req.query.start || 0;
        const length = +req.query.length || 10;
        const searchValue = (req.query["search[value]"] || "").trim();
        const colIdx = req.query["order[0][column]"];
        const sortField = req.query[`columns[${colIdx}][data]`] || "createdAt";
        const sortDir = req.query["order[0][dir]"] === "asc" ? 1 : -1;

        // Pipeline query
        const pipeline = [];

        // Nếu có search
        if (searchValue) {
            pipeline.push({
                $match: {
                    $or: [
                        { name: { $regex: searchValue, $options: 'i' } },
                        { description: { $regex: searchValue, $options: 'i' } },
                        { category: { $regex: searchValue, $options: 'i' } }
                    ]
                }
            });
        }

        // Tổng số bản ghi
        const recordsTotal = await Food.countDocuments({});
        // Số bản ghi sau khi lọc
        const countPipeline = [...pipeline, { $count: 'count' }];
        const countResult = await Food.aggregate(countPipeline);
        const recordsFiltered = countResult.length ? countResult[0].count : 0;

        // Sắp xếp
        const sortObj = { [sortField]: sortDir };

        pipeline.push(
            { $sort: sortObj },
            { $skip: start },
            { $limit: length },
            {
                $project: {
                    _id: 1,
                    image: 1,
                    name: 1,
                    category: 1,
                    description: 1,
                    price: 1,
                    status: 1,
                    createdAt: 1
                }
            }
        );

        // Lấy dữ liệu
        const data = await Food.aggregate(pipeline);

        return res.json({
            draw,
            recordsTotal,
            recordsFiltered,
            data
        });

    } catch (err) {
        return res.status(500).json({
            draw: +req.query.draw || 0,
            recordsTotal: 0,
            recordsFiltered: 0,
            data: [],
            error: err.message
        });
    }
};

export const createFood = async (req, res) => {
    try {
        const data = new Food(req.body);
        await data.save();

        responseHelper.success(res, data, 'Thêm món ăn thành công');
    } catch (err) {
        responseHelper.error(res, err.message);
    }
}

export const updateFood = async (req, res) => {
    try {
        const { id } = req.params;
        const updateFields = (({ name, price, description, image, status, category }) =>
            ({ name: name?.trim(), price, description: description?.trim(), image, status, category }))(req.body);

        // Check trùng tên nếu có cập nhật name
        if (updateFields.name) {
            const existing = await Food.findOne({
                name: updateFields.name,
                _id: { $ne: id }
            });
            if (existing) {
                return responseHelper.error(res, "Tên món ăn đã tồn tại", 400);
            }
        }

        const updatedFood = await Food.findByIdAndUpdate(
            id,
            updateFields,
            { new: true, runValidators: true }
        );

        if (!updatedFood) {
            return responseHelper.error(res, "Món ăn không tồn tại", 404);
        }

        responseHelper.success(res, updatedFood, "Cập nhật món ăn thành công");
    } catch (err) {
        console.error(err);
        responseHelper.error(res, err.message);
    }
};


export const deleteFoods = async (req, res) => {
    try {
        const { ids } = req.body;

        if (!Array.isArray(ids) || ids.length === 0) {
            return responseHelper.error(res, "Không có món ăn nào được chọn để xóa", 400);
        }

        const result = await Food.deleteMany({
            _id: { $in: ids }
        });

        responseHelper.success(res, result.deletedCount, 'Xóa món ăn thành công');
    } catch (err) {
        responseHelper.error(res, err.message);
    }
}

