import Table from '../models/tableModel.js';
import responseHelper from '../helpers/responseHelper.js';

export const tablePage = async (req, res) => {
    try {
        const tables = await Table.find();
        responseHelper.success(res, tables)
    } catch (err) {
        console.error(err);
        responseHelper.error(res, err.message)
    }
};


// [CREATE] / table
export const createTable = async (req, res) => {
    try {
        const { name, status, capacity, area } = req.body;

        const exist = await Table.findOne({ name });

    if (exist) {
      return responseHelper.error(res, 'Tên bàn đã tồn tại.', 400);
    }
    const newTable = await Table.create({
      name,
      status,
      capacity: capacity || undefined,
      area: area || undefined,
    });

    responseHelper.success(res, newTable);
  } catch (error) {
    responseHelper.error(res, error.message);
  }
};

// [GET] /api/tables
export const getTables = async (req, res) => {
    try {
        const tables = await Table.find().lean(); 
        responseHelper.success(res, tables);
    } catch (error) {
        responseHelper.error(res, error.message);
    }
};

export const getTableById = async (req, res) => {
  const { id } = req.params;

  try {
    const table = await Table.findById(id);
    if (!table) {
      return responseHelper.error(res, 'Table Not Found', 404);
    }
    responseHelper.success(res, table);
  } catch (error) {
    responseHelper.error(res, error.message);
  }
};

  // UPDATE
export const updateTable = async (req, res) => {
    try {
        const { name, status, capacity, area, checkInTime } = req.body;
        const { id } = req.params;

        // Kiểm tra bàn có tồn tại không
        const tableExist = await Table.findById(id);
        if (!tableExist) {
            return responseHelper.error(res, 'Không tìm thấy bàn.', 404);
        }

        // Kiểm tra trùng tên bàn (trừ chính bản thân nó)
        const duplicated = await Table.findOne({
            name,
            _id: { $ne: id }
        });

        if (duplicated) {
            return responseHelper.error(res, 'Tên bàn đã tồn tại.', 400);
        }

        // Tạo đối tượng dữ liệu mới cần update
        const updatedFields = {
            name,
            status,
            capacity,
            area
        };
        if (checkInTime) {
            updatedFields.checkInTime = checkInTime;
        }

        const updatedTable = await Table.findByIdAndUpdate(id, updatedFields, { new: true });

        if (!updatedTable) {
            return responseHelper.error(res, 'Cập nhật thất bại.', 400);
        }

        responseHelper.success(res, updatedTable);
    } catch (error) {
        console.error('Lỗi khi cập nhật bàn:', error);
        responseHelper.error(res, error.message || 'Lỗi máy chủ.');
    }
};


    // DELETE TABLE
    export const deleteTables = async (req, res) => {
  try {
    const { tableIds } = req.body;

    if (!tableIds || tableIds.length === 0) {
      return responseHelper.error(res, 'Không có bàn nào được chọn.', 400);
    }

    const result = await Table.deleteMany({
      _id: { $in: tableIds }
    });

    if (result.deletedCount === 0) {
      return responseHelper.error(res, 'Không tìm thấy bàn nào để xóa.', 404);
    }

    responseHelper.success(res, 'Xóa bàn thành công');
  } catch (error) {
    responseHelper.error(res, error.message);
  }
};
