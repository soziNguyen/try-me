import mongoose from "mongoose"
import StockIssue from "../models/stockIssue.js"
import { Ingredient } from "../models/ingredient.js"
import responseHelper from "../helpers/responseHelper.js"
import withTransaction from "../helpers/withTransaction.js"
import { lookupRef } from "../helpers/lookupHelper.js"

// GET
export const getStockIssues = async (req, res) => {
  try {
    const draw = +req.query.draw || 0;
    const start = +req.query.start || 0;
    const length = +req.query.length || 10;
    const searchValue = (req.query["search[value]"] || "").trim();
    const colIdx = req.query["order[0][column]"];
    const sortField = req.query[`columns[${colIdx}][data]`] || "date";
    const sortDir = req.query["order[0][dir]"] === "asc" ? 1 : -1;

    const pipeline = [
      ...lookupRef('createdBy', 'Users', { as: 'creator' }),
      { $unwind: { path: '$items', preserveNullAndEmptyArrays: true } },
      ...lookupRef('items.ingredient', 'Ingredients', { as: 'ingredient' }),
      ...lookupRef('items.warehouse', 'Warehouses', { as: 'warehouse' }),
    ];

    if (searchValue) {
      pipeline.push({
        $match: {
          $or: [
            { code: { $regex: searchValue, $options: "i" } },
            { reason: { $regex: searchValue, $options: "i" } },
            { note: { $regex: searchValue, $options: "i" } },
            { "creator.username": { $regex: searchValue, $options: "i" } },
            { "ingredient.name": { $regex: searchValue, $options: "i" } },
            { "warehouse.name": { $regex: searchValue, $options: "i" } },
            {
              $expr: {
                $regexMatch: {
                  input: { $toString: "$items.quantity" },
                  regex: searchValue
                }
              }
            },
            {
              $expr: {
                $regexMatch: {
                  input: { $dateToString: { format: "%d/%m/%Y", date: "$date" } },
                  regex: searchValue,
                  options: "i"
                }
              }
            }
          ]
        }
      });
    }

    pipeline.push(
      {
        $addFields: {
          "items.ingredient": {
            _id: "$ingredient._id",
            name: "$ingredient.name"
          },
          "items.warehouse": {
            _id: "$warehouse._id",
            name: "$warehouse.name"
          }
        }
      },
      {
        $group: {
          _id: "$_id",
          code: { $first: "$code" },
          reason: { $first: "$reason" },
          note: { $first: "$note" },
          date: { $first: "$date" },
          createdBy: { $first: "$creator" },
          items: { $push: "$items" }
        }
      }
    );

    const countPipeline = [...pipeline, { $count: "count" }];
    const countResult = await StockIssue.aggregate(countPipeline);
    const recordsFiltered = countResult[0]?.count || 0;

    const sortObj = {};
    switch (sortField) {
      case "createdBy.username":
        sortObj["createdBy.username"] = sortDir;
        break;
      case "code":
      case "note":
      case "reason":
      case "date":
        sortObj[sortField] = sortDir;
        break;
      default:
        sortObj[sortField] = sortDir;
    }
    pipeline.push({ $sort: sortObj });

    pipeline.push({ $skip: start }, { $limit: length });

    pipeline.push({
      $project: {
        ingredient: 0,
        warehouse: 0
      }
    });

    const data = await StockIssue.aggregate(pipeline);
    const recordsTotal = await StockIssue.countDocuments();

    res.json({
      draw,
      recordsTotal,
      recordsFiltered,
      data
    });
  } catch (err) {
    responseHelper.error(res, err.message);
  }
};

// CREATE
export const createStockIssue = async (req, res) => {
  try {
    const issue = await withTransaction(async (session) => {
      const doc = new StockIssue({
        ...req.body,
        createdBy: req.user._id
      })
      await doc.save({ session })

      for (const item of doc.items) {
        await Ingredient.updateOne(
          { _id: item.ingredient },
          { $inc: { stock: -Math.abs(item.quantity) } },
          { session }
        )
      }
      return doc
    })

    responseHelper.success(res, issue, "Tạo phiếu xuất kho thành công")
  } catch (err) {
    responseHelper.error(res, err.message)
  }
}

// UPDATE
export const updateStockIssue = async (req, res) => {
  try {
    const updatedIssue = await withTransaction(async (session) => {
      const { id } = req.params

      if (!mongoose.isValidObjectId(id)) {
        throw new Error("ID không hợp lệ")
      }

      const oldIssue = await StockIssue.findById(id).session(session)
      if (!oldIssue) {
        throw new Error("Phiếu xuất không tồn tại")
      }

      // Hoàn trả tồn kho từ phiếu cũ
      for (const item of oldIssue.items) {
        await Ingredient.updateOne(
          { _id: item.ingredient },
          { $inc: { stock: Math.abs(item.quantity) } },
          { session }
        )
      }

      // Chuẩn hóa dữ liệu
      const payload = {}

      for (const [key, value] of Object.entries(req.body)) {
        if (key.endsWith(".quantity")) {
          const raw = value?.toString().trim()
          let num = raw === "" ? 0 : Number(raw)
          if (num < 0) num = 0
          payload[key] = num
        } else if (
          key.endsWith(".ingredient") ||
          key.endsWith(".warehouse")
        ) {
          payload[key] = value === "" ? null : value
        } else {
          payload[key] = value
        }
      }

      payload.updatedBy = req.user._id

      // Cập nhật phiếu xuất
      const newIssue = await StockIssue.findByIdAndUpdate(
        id,
        { $set: payload },
        { new: true, session }
      )

      if (!newIssue) {
        throw new Error("Cập nhật thất bại")
      }

      // Trừ kho với kiểm tra tồn kho an toàn
      for (const item of newIssue.items) {
        const updateResult = await Ingredient.updateOne(
          {
            _id: item.ingredient,
            stock: { $gte: item.quantity }
          },
          {
            $inc: { stock: -Math.abs(item.quantity) }
          },
          { session }
        )

        if (updateResult.modifiedCount === 0) {
          const ing = await Ingredient.findById(item.ingredient).session(session)
          const stockLeft = ing?.stock ?? 0;
          throw new Error(`Nguyên liệu "${ing?.name || item.ingredient}" chỉ còn ${stockLeft}, không đủ để xuất ${item.quantity}`);
        }
      }

      await newIssue.populate("createdBy", "username")
      await newIssue.populate("items.ingredient", "name")
      await newIssue.populate("items.warehouse", "name")

      return newIssue
    })

    responseHelper.success(res, updatedIssue, "Cập nhật phiếu xuất kho thành công")
  } catch (err) {
    responseHelper.error(res, err.message)
  }
}

// DELETE
export const deleteStockIssues = async (req, res) => {
  try {
    await withTransaction(async (session) => {
      const { ids } = req.body
      if (!Array.isArray(ids) || ids.length === 0) {
        throw new Error("Không có phiếu nào được chọn")
      }

      const issues = await StockIssue.find({ _id: { $in: ids } }).session(session)

      for (const issue of issues) {
        for (const item of issue.items) {
          await Ingredient.updateOne(
            { _id: item.ingredient },
            { $inc: { stock: Math.abs(item.quantity) } },
            { session }
          )
        }
      }

      await StockIssue.deleteMany({ _id: { $in: ids } }).session(session)
    })

    responseHelper.success(res, null, "Xóa thành công")
  } catch (err) {
    responseHelper.error(res, err.message)
  }
}
