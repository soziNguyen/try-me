import passport from "passport"
import { Strategy as LocalStrategy } from "passport-local"
import User from "../modules/user/model.js"

passport.use(
    new LocalStrategy(
        { usernameField: "login", passwordField: "password" },
        async (login, password, done) => {
            try {
                const identifier = (login || "").trim()
                if (!identifier) return done(null, false, { message: "Tài khoản hoặc mật khẩu không chính xác" })

                const query = identifier.includes("@")
                    ? { email: identifier.toLowerCase() }
                    : { username: identifier.toLowerCase() }

                const user = await User.findOne(query).select('+password')
                if (!user || !(await user.comparePassword(password))) {
                    return done(null, false, { message: "Tài khoản hoặc mật khẩu không chính xác" })
                }

                return done(null, user)
            } catch (error) {
                return done(error)
            }
        }
    )
)

passport.serializeUser((user, done) => done(null, user.id))

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id)
        if (!user) return done(null, false)
        done(null, user)
    } catch (error) {
        done(error)
    }
})

export default passport