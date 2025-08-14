import User from "../models/user.js"
import Organization from "../models/organization.js"
import withTransaction from "../helpers/withTransaction.js"
import responseHelper from "../helpers/responseHelper.js"

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
    } = req.body

    const cleanOrgEmail = orgEmail.trim().toLowerCase();
    const cleanAdminEmail = adminEmail.trim().toLowerCase();
    const cleanAdminUsername = adminUsername.trim();
    const cleanOrgName = orgName.trim();
    
    const result = await withTransaction(async (session) => {

      // Kiểm tra tổ chức trùng email hoặc phone
      const existingOrg = await Organization.findOne({
        $or: [{ email: cleanOrgEmail }, { phone: orgPhone }]
      }).session(session)

      if (existingOrg) throw new Error("Tổ chức với email hoặc số điện thoại này đã tồn tại.")

      const existingUserEmail = await User.findOne({
        email: cleanAdminEmail,
      }).session(session)

      if (existingUserEmail) throw new Error("Email quản trị viên đã tồn tại trong hệ thống.")

      // Tạo organization
      const organization = new Organization({
        name: cleanOrgName,
        email: cleanOrgEmail,
        phone: orgPhone,
        province: orgProvince,
        commune: orgCommune,
        street: orgStreet
      })
      await organization.save({ session })

      // Lần đầu tạo user quản trị 
      const adminUser = new User({
        username: cleanAdminUsername,
        email: cleanAdminEmail,
        password: adminPassword,
        role: 'Org',
        organization: organization._id
      })
      await adminUser.save({ session })
      
      return { organization, admin: adminUser }
    })
    
    const responseData = {
      organization: result.organization,
      admin: {
        id: result.admin._id,
        username: result.admin.username,
        email: result.admin.email,
        role: result.admin.role
      }
    }
    
    responseHelper.success(res, responseData, 'Tổ chức và quản trị viên đã được tạo thành công')
    
  } catch (error) {
    if (error.code === 11000) {
      if (error.keyPattern?.email) {
        return responseHelper.error(res, "Email đã tồn tại", 400);
      }
      if (error.keyPattern?.username) {
        return responseHelper.error(res, "Tên đăng nhập đã tồn tại trong tổ chức", 400);
      }
    }
    responseHelper.error(res, error.message)
  }
}
