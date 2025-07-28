import Table from '../models/tableModel.js';
import responseHelper from '../helpers/responseHelper.js';

export const tablePage = async (req, res) => {
    try {
        const tables = await Table.find(); 
        res.render('staff/tables', {
            title: 'Table Management',
            page: 'Table',
            user: req.user,
            currentUserId: req.user._id.toString(),
            tables
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
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
    res.json(tables); 
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error });
  }
};
