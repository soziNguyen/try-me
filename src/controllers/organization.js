import User from "../models/user.js";
import Organization from "../models/organization.js";
import withTransaction from "../helpers/withTransaction.js"
import responseHelper from "../helpers/responseHelper.js";

export const createOrganization = async (req, res) => {
  try {
    const { 
      orgName, 
      orgEmail, 
      orgPhone, 
      orgProvince, 
      orgCommune,
      orgStreet, 
      adminUsername, 
      adminEmail, 
      adminPassword 
    } = req.body;
    
    const result = await withTransaction(async (session) => {

      // Kiểm tra tổ chức trùng email hoặc phone
      const existingOrg = await Organization.findOne({
        $or: [{ email: orgEmail }, { phone: orgPhone }]
      }).session(session);

      if (existingOrg) {
        throw new Error("Tổ chức với email hoặc số điện thoại này đã tồn tại.");
      }

      // Tạo organization
      const organization = new Organization({
        name: orgName,
        email: orgEmail,
        phone: orgPhone,
        province: orgProvince,
        commune: orgCommune,
        street: orgStreet
      });
      await organization.save({ session });

      // Lần đầu tạo user quản trị 
      const adminUser = new User({
        username: adminUsername,
        email: adminEmail,
        password: adminPassword,
        role: 'Org',
        organization: organization._id
      });
      await adminUser.save({ session });
      
      return { organization, admin: adminUser };
    });
    
    const responseData = {
      organization: result.organization,
      admin: {
        id: result.admin._id,
        username: result.admin.username,
        email: result.admin.email,
        role: result.admin.role
      }
    };
    
    responseHelper.success(res, responseData, 'Tổ chức và quản trị viên đã được tạo thành công');
    
  } catch (error) {
    responseHelper.error(res, error.message);
  }
};
