import mongoose from "mongoose";
import bcrypt from 'bcryptjs'

// define Schema
const Schema = mongoose.Schema; 

const UserSchema = new Schema(
    {
        username: {type: String, default:''},
        email: {type: String, default:''},
        password: {type: String, default:''},
        role: {type: String, enum: ['Admin', 'Org', 'Member'], default:'Member'},
        organization: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
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

UserSchema.index({ organization: 1, username: 1 }, { unique: true });
UserSchema.index({ organization: 1, email: 1 }, { unique: true });

const User = mongoose.model('User', UserSchema);
export default User;