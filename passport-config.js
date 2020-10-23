const localStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const e = require('express');

function initialize(passport, getUserByEmail, getUserById) {
    const authUser = async (email, password, done) => {
        const user = await getUserByEmail(email);
        if (!user) {
            return done(null, false, {message: "No user with that email"});
        }

        try {
            const same = await bcrypt.compare(password, user.password);
            if (same) {
                return done(null, user);
            } else {
                return done(null, false, {message: 'Password incorrect'});
            }
        } catch (e) {
            return done(e);
        }
    };

    passport.use(new localStrategy({usernameField: 'email'}, authUser));
    passport.serializeUser((user, done) => {
        return done(null, user._id)
    });
    passport.deserializeUser(async (id, done) => {
        const u = await getUserById(id);
        return done (null, u);
    });
}

module.exports = initialize;