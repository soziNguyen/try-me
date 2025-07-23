import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import User from "../models/user.js";
import bcrypt from 'bcryptjs';

passport.use(
    new LocalStrategy( 
        {
            usernameField: "login",
            passwordField: "password"
        },
        async (login, password, done) => {
        try {
            const user = await User.findOne({
                $or: [{ email: login }, { username: login }],
            });
            if (!user) return done(null, false, {message: "Username or password do not correct."});

            const isMatch = await bcrypt.compare(password, user.password);
            if (!user.password || !isMatch) {
                return done(null, false, {message: "Username or password do not correct."})
            };
            return done(null, user);

        } catch (error) {
            return done(error);
        }
    })
);

passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        if (!user) return done(null, false);
        done(null, user);
    } catch (error) {
        done(error);
    }
});

export default passport;