import mailer from '../helpers/mailer.js'
import SMTP from "../configs/smtp.js";
import User from "../models/user.js";
import bcrypt from "bcryptjs";
import passport from "passport";
import responseHelper from '../helpers/responseHelper.js';
import { isValidPassword, generateSalt } from '../helpers/common.js';

// [CREATE] / User
export const createUser = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        const exist = await User.findOne({
            $or: [
                { username },
                { email }
            ],
        });

        if (exist) {
            return responseHelper.error(res, 'Username or Email already exists.', 400);
        }
        const newUser = await User.create({ username, email, password });
        responseHelper.success(res, newUser);
    } catch (error) {
        responseHelper.error(res, error.message);
    }
};

/*
 *  [GET] / Users
 */

export const getUsers = async (req, res) => {
    try {
        const { s } = req.query;
        const filter = {};
        if (s) {
            filter["$or"] = [
                { username: { $regex: s, $options: 'i' } },
                { email: { $regex: s, $options: 'i' } }
            ]
        }
        const users = await User.find(filter);
        responseHelper.success(res, users);
    } catch (error) {
        responseHelper.error(res, error.message);
    }
};

/*
 * [GET] / User/:id
 */

export const getUser = async (req, res) => {
  const { id } = req.params;

  try {
      const user = await User.findById(id);

      if (!user) {
          responseHelper.error(res, 'User Not Found.', 404);
      }
      responseHelper.success(res, user)
  } catch (error) {
      responseHelper.error(res, error.message);
  }
}

/*
 * [UPDATE] / User/:id 
 */

export const updateUser = async (req, res) => {
    try {
        const { username, email, password, confirmPassword, role } = req.body;
        const { id } = req.params;

        const userExist = await User.findById(id);
        if (!userExist) {
            return responseHelper.error(res, 'User Not Found', 404);
        }

        const existUser = await User.findOne({
            $or: [{ username }, { email }],
            _id: { $ne: id },
        });

        if (existUser) {
            return responseHelper.error(res, 'Username or Email already exists.', 400);
        }

        let updatedFields = { username, email, role };
        if (password) {
            if (password !== confirmPassword) {
                return responseHelper.error(res, 'Passwords do not match', 400);
            }
            const passwordValidation = isValidPassword(password);
            if (passwordValidation) {
                return responseHelper.error(res, passwordValidation, 400);
            }
                const hashedPassword = await bcrypt.hash(password, 10);
                updatedFields.password = hashedPassword;
        }
        const updateUser = await User.findByIdAndUpdate(id, updatedFields, { new: true });

        if (!updateUser) {
            return responseHelper.error(res, 'Update failed.', 400);
        }
        responseHelper.success(res, updateUser);
    } catch (error) {
        responseHelper.error(res, error.message);
    }
};

/*
 * [DEL] / Users
 */

export const deleteUsers = async (req, res) => {
    try {
        const { userIds } = req.body;
        if (!userIds || userIds.length === 0) {
            return responseHelper.error(res, 'No users selected.', 400);
        }

        if (userIds.includes(req.user._id.toString())) {
            return responseHelper.error(res, 'You cannot delete your own account.', 400);
        }

        const result = await User.deleteMany({
            _id: { $in: userIds }
        })

        if (result.deletedCount === 0) {            
            return responseHelper.error(res, 'User Not Found To Delete.', 404);
        }
        responseHelper.success(res, '1');
    } catch (error) {
        responseHelper.error(res, error.message);
    }
}

/* 
 * [LOGIN] / User
 */

export const logIn = async (req, res, next) => {
    passport.authenticate("local", async (err, user, info) => {
        if (err) return next(err);
        if (!user) {
            return responseHelper.error(res, info.message, 400) 
        }

        req.logIn(user, async (err) => {
            if (err) return next(err);
             if (req.body.remember) {
            // Thiết lập cookie tồn tại 30 ngày (ms)    
            req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
            } else {
                // Không tick: cookie sẽ hết khi đóng trình duyệt
                req.session.cookie.expires = false;
            }
            return responseHelper.success(res, '1')
        });
    })(req, res, next);
};

// [LOGOUT]
export const logOut = (req, res) => {
    req.logout((err) => {
        if (err) return responseHelper.error(res, 'Logout failed', 500);

        req.session.destroy((err) => {
            if (err) return responseHelper.error(res, 'Session destroy failed', 500);

            res.clearCookie('connect.sid');
            return responseHelper.success(res, 'Logged out');
        });
    });
};

// [FORGOT] / Password
export const forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return responseHelper.error(res, `${email} Not Found.`, 404)
        }

        const resetToken = generateSalt(32);
        const tokenExpires = Date.now() + 60 * 60 * 1000; 

        user.resetToken = resetToken;
        user.resetTokenExpires = tokenExpires;
        await user.save();

        const resetLink = `http://localhost:6001/reset-password/${resetToken}`;
        await mailer.sendMail({
            from: SMTP.username,
            to: user.email,
            subject: 'Password Reset Request',
            html: `
                <h3>Reset Your Password</h3>
                <p>Click the link below to reset your password. This link will expire in 1 hour:</p>
                <p>Click <a href="${resetLink}"><i>here</i></a> to reset your password</p>
            `
        });        
        responseHelper.success(res, '1', 'A password reset link has been sent to your email.')
    } catch (error) {
        responseHelper.error(res, error.message)
    }
}

// [RESET] / Password
export const resetPassword = async (req, res) => {
    const { token } = req.params;
    const { newPassword, confirmPassword } = req.body;

    if (newPassword != confirmPassword) {
        return responseHelper.error(res, 'Passwords do not correct.', 400);
    }
    try {
        const user = await User.findOne({
            resetToken: token,
            resetTokenExpires: { $gt: Date.now() }
        });
        if (!user) {
            return responseHelper.error(res, 'Invalid or expired token.', 404)
        }

        user.password = newPassword;
        user.resetToken = undefined;
        user.resetTokenExpires = undefined;
        await user.save();
        responseHelper.success(res, user);
    } catch (error) {
        responseHelper.error(res, error.message);
    }
}

