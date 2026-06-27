require("dotenv").config();
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const { pool } = require("./database");

const findOrCreateUser = async function (profile)
{
    const googleId = profile.id;
    const email = profile.emails && profile.emails[0] ? profile.emails[0].value : "";
    const name = profile.displayName || "";
    const avatar = profile.photos && profile.photos[0] ? profile.photos[0].value : "";

    const [rows] = await pool.execute("SELECT * FROM users WHERE google_id = ? LIMIT 1", [googleId]);

    if (rows.length > 0)
    {
        return rows[0];
    }

    const [result] = await pool.execute(
        "INSERT INTO users (google_id, email, name, avatar) VALUES (?, ?, ?, ?)",
        [googleId, email, name, avatar]
    );

    const [created] = await pool.execute("SELECT * FROM users WHERE id = ? LIMIT 1", [result.insertId]);
    return created[0];
};

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
{
    passport.use(
        new GoogleStrategy(
            {
                clientID: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:6969/auth/google/callback",
            },
            async function (accessToken, refreshToken, profile, done)
            {
                try
                {
                    const user = await findOrCreateUser(profile);
                    done(null, user);
                }
                catch (err)
                {
                    done(err, null);
                }
            }
        )
    );
}
else
{
    console.warn("Google OAuth disabled: set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env");
}

passport.serializeUser(function (user, done)
{
    done(null, user.id);
});

passport.deserializeUser(async function (id, done)
{
    try
    {
        const [rows] = await pool.execute("SELECT * FROM users WHERE id = ? LIMIT 1", [id]);
        done(null, rows[0] || null);
    }
    catch (err)
    {
        done(err, null);
    }
});

module.exports = passport;
