import mongoose from "mongoose";
import bcrypt from 'bcrypt'

// define Schema
const Schema = mongoose.Schema; 

const UserSchema = new Schema(
    {
        username: {type: String, unique: true, default:''},
        email: {type: String, default:''},
        password: {type: String, default:''},
        role: {type: String, enum: ['Admin', 'Member'], default:'Member'},
        resetToken: { type: String, default: null },
        resetTokenExpires: { type: Date, default: null }
    },
    {
        collection: "Users", 
        timestamps: { createdAt: 'createdAt', updatedAt : 'updatedAt'}
    }
);
// encrypt password before saving
UserSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next(); 
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt); 
    next();
});

UserSchema.methods.comparePassword = async function (password){
    return bcrypt.compare(password, this.password);
}

const User = mongoose.model('User', UserSchema);
export default User;