require("dotenv").config();
const { Client, MessageMedia, LocalAuth, Poll } = require("whatsapp-web.js");
const express = require("express");
const socketIO = require("socket.io");
const qrcode = require("qrcode");
const http = require("http");
const fs = require("fs");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);
const { phoneNumberFormatter } = require("./helpers/formatter");
const { parseButtons, buildMenuText, buildPoll, matchFlow, matchPollOption, findWelcome } = require("./helpers/botEngine");
const fileUpload = require("express-fileupload");
const { pool, initDatabase } = require("./config/database");
const passport = require("./config/passport");
const store = require("./models/store");

const HOST = process.env.HOST || "localhost";
const PORT = process.env.PORT || 6969;

const isPuppeteerNoise = function (err)
{
    const text = (err && (err.message || err.toString())) || "";
    return (
        text.includes("Target closed") ||
        text.includes("Session closed") ||
        text.includes("Protocol error") ||
        text.includes("Execution context was destroyed") ||
        text.includes("Most likely the page has been closed")
    );
};

process.on("unhandledRejection", (reason) =>
{
    if (isPuppeteerNoise(reason))
    {
        console.error("Ignored browser shutdown rejection:", reason && reason.message);
        return;
    }

    console.error("Unhandled rejection:", reason);
});

process.on("uncaughtException", (err) =>
{
    if (isPuppeteerNoise(err))
    {
        console.error("Ignored browser shutdown exception:", err.message);
        return;
    }

    console.error("Uncaught exception:", err.message);
});

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(
    helmet({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,
    })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.use(
    fileUpload({
        debug: false,
        limits: { fileSize: 25 * 1024 * 1024 },
        abortOnLimit: true,
        safeFileNames: true,
        preserveExtension: true,
    })
);

const sessionStore = new MySQLStore({}, pool);

const sessionMiddleware = session({
    key: "wa_gateway_sid",
    secret: process.env.SESSION_SECRET || "insecure_dev_secret",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 * 1000,
    },
});

app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());

io.use((socket, next) =>
{
    sessionMiddleware(socket.request, {}, next);
});

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: false, message: "Too many login attempts, please try again later." },
});

const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: false, message: "Too many requests, please slow down." },
});

const ensureAuth = function (req, res, next)
{
    if (req.isAuthenticated && req.isAuthenticated())
    {
        return next();
    }

    if (req.accepts("html"))
    {
        return res.redirect("/login");
    }

    return res.status(401).json({ status: false, message: "Authentication required." });
};

app.use("/assets", express.static("assets"));

app.get("/auth/google", loginLimiter, passport.authenticate("google", { scope: ["profile", "email"] }));

app.get(
    "/auth/google/callback",
    loginLimiter,
    passport.authenticate("google", { failureRedirect: "/login" }),
    (req, res) =>
    {
        res.redirect("/");
    }
);

app.post("/auth/logout", (req, res) =>
{
    req.logout(function ()
    {
        res.json({ status: true });
    });
});

app.get("/me", ensureAuth, (req, res) =>
{
    res.json({
        status: true,
        user: { name: req.user.name, email: req.user.email, avatar: req.user.avatar },
    });
});

app.get("/login", (req, res) =>
{
    if (req.isAuthenticated && req.isAuthenticated())
    {
        return res.redirect("/");
    }

    res.sendFile("views/login.html", { root: __dirname });
});

app.get("/", ensureAuth, (req, res) =>
{
    res.sendFile("views/index.html", { root: __dirname });
});

app.get("/broadcast", ensureAuth, (req, res) =>
{
    res.sendFile("views/broadcast.html", { root: __dirname });
});

app.get("/templates-page", ensureAuth, (req, res) =>
{
    res.sendFile("views/templates.html", { root: __dirname });
});

app.get("/bot-page", ensureAuth, (req, res) =>
{
    res.sendFile("views/bot.html", { root: __dirname });
});

app.get("/crm", ensureAuth, (req, res) =>
{
    res.sendFile("views/crm.html", { root: __dirname });
});

const sessions = [];

const findSession = function (id)
{
    return sessions.find((sess) => sess.id == id);
};

const setStatus = async function (id, status)
{
    const session = findSession(id);

    if (session)
    {
        session.status = status;
    }

    try
    {
        await store.setSessionReady(id, status === "ready");
    }
    catch (err)
    {
        console.error("Failed to persist session status:", err.message);
    }

    io.emit("status", { id: id, status: status });
};

const clearAuthFolder = function (id)
{
    const authPath = path.join(__dirname, ".wwebjs_auth", `session-${id}`);

    try
    {
        if (fs.existsSync(authPath))
        {
            fs.rmSync(authPath, { recursive: true, force: true });
        }
    }
    catch (err)
    {
        console.error(`Failed to clear auth folder for ${id}:`, err.message);
    }
};

const removeFromMemory = function (id)
{
    const index = sessions.findIndex((sess) => sess.id == id);

    if (index !== -1)
    {
        sessions.splice(index, 1);
    }
};

const createSession = function (id, userId, description)
{
    if (findSession(id))
    {
        return;
    }

    const client = new Client({
        restartOnAuthFail: false,
        takeoverOnConflict: false,
        puppeteer: {
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
            headless: true,
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-web-security",
                "--disable-gpu",
                "--hide-scrollbars",
                "--disable-gpu-driver-bug-workarounds",
                "--disable-accelerated-2d-canvas",
                "--no-first-run",
                "--no-zygote",
                "--single-process",
            ],
        },
        authStrategy: new LocalAuth({ clientId: id }),
    });

    const session = {
        id: id,
        userId: userId,
        description: description,
        client: client,
        status: "initializing",
        loggingOut: false,
    };

    sessions.push(session);

    client.on("qr", (qr) =>
    {
        qrcode.toDataURL(qr, (err, url) =>
        {
            if (err)
            {
                return;
            }

            io.emit("qr", { id: id, src: url });
            setStatus(id, "qr");
        });
    });

    client.on("ready", async () =>
    {
        const phone = client.info && client.info.wid ? client.info.wid.user : "";

        if (phone)
        {
            session.phone = phone;

            try
            {
                await store.setSessionPhone(id, phone);
            }
            catch (err)
            {
                console.error("Failed to persist session phone:", err.message);
            }
        }

        setStatus(id, "ready");
    });

    client.on("authenticated", () =>
    {
        setStatus(id, "authenticated");
    });

    client.on("auth_failure", () =>
    {
        setStatus(id, "auth_failure");
    });

    client.on("disconnected", async (reason) =>
    {
        setStatus(id, "disconnected");

        const wasLogout = session.loggingOut || reason === "LOGOUT" || reason === "NAVIGATION";

        try
        {
            await client.destroy();
        }
        catch (err)
        {
            console.error(`Destroy failed for ${id}:`, err.message);
        }

        removeFromMemory(id);

        try
        {
            await store.deleteSession(id);
        }
        catch (err)
        {
            console.error("Failed to delete session row:", err.message);
        }

        if (wasLogout)
        {
            clearAuthFolder(id);
        }

        io.emit("remove-session", id);
    });

    client.on("message", async (message) =>
    {
        await handleBotMessage(id, client, message);
    });

    client.on("vote_update", async (vote) =>
    {
        await handlePollVote(client, vote);
    });

    client.initialize().catch((err) =>
    {
        console.error(`Initialize failed for ${id}:`, err.message);
        setStatus(id, "error");
        removeFromMemory(id);
        io.emit("remove-session", id);
    });
};

const logoutSession = async function (id)
{
    const session = findSession(id);

    if (!session)
    {
        await store.deleteSession(id);
        clearAuthFolder(id);
        io.emit("remove-session", id);
        return { status: true, message: "Session removed." };
    }

    session.loggingOut = true;

    try
    {
        await session.client.logout();
    }
    catch (err)
    {
        try
        {
            await session.client.destroy();
        }
        catch (destroyErr)
        {
            console.error(`Destroy after logout failed for ${id}:`, destroyErr.message);
        }

        removeFromMemory(id);
        await store.deleteSession(id);
        io.emit("remove-session", id);
    }

    return { status: true, message: "Logged out successfully." };
};

const buildSessionList = async function (userId)
{
    const saved = await store.getSessionsForUser(userId);

    return Promise.all(saved.map(async (sess) =>
    {
        const live = findSession(sess.id);
        let phone = live && live.phone ? live.phone : sess.phone || "";

        if (!phone && live && live.client && live.client.info && live.client.info.wid)
        {
            phone = live.client.info.wid.user;
            live.phone = phone;

            try
            {
                await store.setSessionPhone(sess.id, phone);
            }
            catch (err)
            {
                console.error("Failed to backfill session phone:", err.message);
            }
        }

        return {
            id: sess.id,
            description: sess.description,
            phone: phone,
            status: live ? live.status : "offline",
        };
    }));
};

const restoreSessions = async function ()
{
    const saved = await store.getAllSessions();

    saved.forEach((sess) =>
    {
        createSession(sess.id, sess.user_id, sess.description);
    });
};

const migrateLegacySessions = async function ()
{
    const legacyFile = "./whatsapp-sessions.json";

    if (!fs.existsSync(legacyFile))
    {
        return;
    }

    try
    {
        const legacy = JSON.parse(fs.readFileSync(legacyFile));

        for (const sess of legacy)
        {
            await store.upsertSession(sess.id, null, sess.description || "", false);
        }

        fs.renameSync(legacyFile, legacyFile + ".migrated");
        console.log(`Migrated ${legacy.length} legacy sessions to database.`);
    }
    catch (err)
    {
        console.error("Legacy migration failed:", err.message);
    }
};

io.on("connection", function (socket)
{
    const user = socket.request.session && socket.request.session.passport && socket.request.session.passport.user;

    if (!user)
    {
        socket.disconnect(true);
        return;
    }

    const userId = user;

    socket.join(`user:${userId}`);

    buildSessionList(userId).then((list) => socket.emit("init", list));

    socket.on("create-session", async function (data)
    {
        if (!data || !data.id || !/^[a-zA-Z0-9_-]+$/.test(data.id))
        {
            socket.emit("message", { id: data?.id, text: "Invalid session ID." });
            return;
        }

        try
        {
            await store.upsertSession(data.id, userId, data.description || "", false);
            createSession(data.id, userId, data.description || "");
            socket.emit("session-added", { id: data.id, description: data.description || "" });
        }
        catch (err)
        {
            console.error("Create session failed:", err.message);
            socket.emit("message", { id: data.id, text: "Failed to create session." });
        }
    });

    socket.on("logout-session", async function (data)
    {
        if (data && data.id && (await store.sessionBelongsToUser(data.id, userId)))
        {
            await store.claimSession(data.id, userId);
            await logoutSession(data.id);
        }
    });
});

const validateNumberRegistered = async function (client, number)
{
    try
    {
        return await client.isRegisteredUser(number);
    }
    catch (err)
    {
        return false;
    }
};

const conversationState = new Map();
const pollState = new Map();

const sendFlowReply = async function (sessionId, client, message, flow)
{
    const buttons = parseButtons(flow.buttons);
    const pollOptions = buildPoll(buttons);
    const urlButtons = buttons.filter((btn) => btn.type === "url");
    const text = buildMenuText(flow.reply_body, urlButtons);

    if (flow.reply_image)
    {
        try
        {
            const media = await MessageMedia.fromUrl(flow.reply_image, { unsafeMime: true });
            await message.reply(media, undefined, { caption: text });
        }
        catch (err)
        {
            console.error("Bot media reply failed:", err.message);
            await message.reply(text);
        }
    }
    else
    {
        await message.reply(text);
    }

    if (pollOptions.length)
    {
        const poll = new Poll(flow.reply_body || "Pilih:", pollOptions.map((opt) => opt.label));
        const sent = await client.sendMessage(message.from, poll);
        pollState.set(sent.id._serialized, { sessionId, from: message.from, flow });
    }

    await recordOutgoing(sessionId, message.from, text);
};

const stateKey = function (sessionId, from)
{
    return `${sessionId}:${from}`;
};

const recordIncoming = async function (sessionId, message)
{
    try
    {
        const userId = await store.getSessionOwner(sessionId);

        if (!userId)
        {
            return;
        }

        const waNumber = message.from;
        const name = (message._data && message._data.notifyName) || null;
        await store.saveIncomingMessage(userId, sessionId, waNumber, name, message.body || "");
        io.to(`user:${userId}`).emit("crm:incoming", { sessionId, waNumber, name, body: message.body || "" });
    }
    catch (err)
    {
        console.error("CRM record incoming failed:", err.message);
    }
};

const recordOutgoing = async function (sessionId, waNumber, body)
{
    try
    {
        const userId = await store.getSessionOwner(sessionId);

        if (!userId)
        {
            return;
        }

        await store.saveOutgoingMessage(userId, sessionId, waNumber, body || "");
        io.to(`user:${userId}`).emit("crm:outgoing", { sessionId, waNumber, body: body || "" });
    }
    catch (err)
    {
        console.error("CRM record outgoing failed:", err.message);
    }
};

const handleBotMessage = async function (sessionId, client, message)
{
    if (message.fromMe || message.isStatus || (message.from && message.from.endsWith("@g.us")))
    {
        return;
    }

    await recordIncoming(sessionId, message);

    try
    {
        const enabled = await store.getBotSetting(sessionId);

        if (!enabled)
        {
            return;
        }

        const flows = await store.getFlowsForSession(sessionId);

        if (!flows.length)
        {
            return;
        }

        const key = stateKey(sessionId, message.from);
        const lastFlow = conversationState.get(key);
        const matched = matchFlow(flows, message.body, lastFlow) || findWelcome(flows);

        if (matched)
        {
            conversationState.set(key, matched);
            await sendFlowReply(sessionId, client, message, matched);
        }
    }
    catch (err)
    {
        console.error(`Bot handler failed for ${sessionId}:`, err.message);
    }
};

const handlePollVote = async function (client, vote)
{
    if (!vote.selectedOptions || !vote.selectedOptions.length)
    {
        return;
    }

    const pollId = vote.parentMessage && vote.parentMessage.id ? vote.parentMessage.id._serialized : null;
    const context = pollId ? pollState.get(pollId) : null;

    if (!context)
    {
        return;
    }

    try
    {
        const flows = await store.getFlowsForSession(context.sessionId);
        const optionName = vote.selectedOptions[0].name;
        const matched = matchPollOption(flows, context.flow, optionName);

        if (matched)
        {
            const target = { from: context.from, reply: (content, _c, opts) => client.sendMessage(context.from, content, opts) };
            conversationState.set(stateKey(context.sessionId, context.from), matched);
            await sendFlowReply(context.sessionId, client, target, matched);
        }
    }
    catch (err)
    {
        console.error(`Poll vote handler failed for ${context.sessionId}:`, err.message);
    }
};

app.get("/sessions", ensureAuth, apiLimiter, async (req, res) =>
{
    const list = await buildSessionList(req.user.id);
    res.status(200).json({ status: true, sessions: list });
});

app.post("/send-message", ensureAuth, apiLimiter, async (req, res) =>
{
    const sender = req.body.sender;
    const message = req.body.message;

    if (!sender || !req.body.number || !message)
    {
        return res.status(400).json({ status: false, message: "sender, number and message are required." });
    }

    if (!(await store.sessionBelongsToUser(sender, req.user.id)))
    {
        return res.status(403).json({ status: false, message: "You do not own this sender session." });
    }

    const number = phoneNumberFormatter(req.body.number);
    const client = findSession(sender)?.client;

    if (!client)
    {
        return res.status(422).json({ status: false, message: `The sender ${sender} is not found or not ready.` });
    }

    if (!(await validateNumberRegistered(client, number)))
    {
        return res.status(422).json({ status: false, message: "The number is not registered." });
    }

    try
    {
        const response = await client.sendMessage(number, message);
        await recordOutgoing(sender, number, message);
        res.status(200).json({ status: true, response: response });
    }
    catch (err)
    {
        res.status(500).json({ status: false, message: "Failed to send message." });
    }
});

app.post("/send-media", ensureAuth, apiLimiter, async (req, res) =>
{
    const sender = req.body.sender;
    const caption = req.body.caption;
    const fileUrl = req.body.file;

    if (!sender || !req.body.number || !fileUrl)
    {
        return res.status(400).json({ status: false, message: "sender, number and file are required." });
    }

    if (!(await store.sessionBelongsToUser(sender, req.user.id)))
    {
        return res.status(403).json({ status: false, message: "You do not own this sender session." });
    }

    const number = phoneNumberFormatter(req.body.number);
    const client = findSession(sender)?.client;

    if (!client)
    {
        return res.status(422).json({ status: false, message: `The sender ${sender} is not found or not ready.` });
    }

    if (!(await validateNumberRegistered(client, number)))
    {
        return res.status(422).json({ status: false, message: "The number is not registered." });
    }

    try
    {
        const media = await MessageMedia.fromUrl(fileUrl, { unsafeMime: true });
        const response = await client.sendMessage(number, media, { caption: caption });
        res.status(200).json({ status: true, response: response });
    }
    catch (err)
    {
        res.status(500).json({ status: false, message: "Failed to send media." });
    }
});

app.post("/logout", ensureAuth, apiLimiter, async (req, res) =>
{
    const id = req.body.id;

    if (!id || !/^[a-zA-Z0-9_-]+$/.test(id))
    {
        return res.status(400).json({ status: false, message: "Valid session id is required." });
    }

    if (!(await store.sessionBelongsToUser(id, req.user.id)))
    {
        return res.status(403).json({ status: false, message: "You do not own this session." });
    }

    const result = await logoutSession(id);
    res.status(200).json(result);
});

const uploadsDir = path.join(__dirname, "assets", "uploads");

if (!fs.existsSync(uploadsDir))
{
    fs.mkdirSync(uploadsDir, { recursive: true });
}

app.post("/upload", ensureAuth, apiLimiter, async (req, res) =>
{
    if (!req.files || !req.files.file)
    {
        return res.status(400).json({ status: false, message: "No file uploaded." });
    }

    const file = req.files.file;
    const safeName = Date.now() + "-" + path.basename(file.name).replace(/[^a-zA-Z0-9._-]/g, "_");
    const uploadPath = path.join(uploadsDir, safeName);

    if (!uploadPath.startsWith(uploadsDir))
    {
        return res.status(400).json({ status: false, message: "Invalid file path." });
    }

    try
    {
        await file.mv(uploadPath);
    }
    catch (err)
    {
        return res.status(500).json({ status: false, message: "Failed to upload file." });
    }

    const publicUrl = `http://${HOST}:${PORT}/assets/uploads/${encodeURIComponent(safeName)}`;
    res.status(200).json({ status: true, url: publicUrl });
});

app.post("/broadcast", ensureAuth, apiLimiter, async (req, res) =>
{
    const sender = req.body.sender;
    const numbers = req.body.numbers;
    const buttons = sanitizeButtons(req.body.buttons);
    const message = buildMenuText(req.body.message || "", buttons);
    const fileUrl = req.body.file;
    const delay = Math.min(300, Math.max(1, parseInt(req.body.delay) || 30));

    if (!sender || !numbers)
    {
        return res.status(400).json({ status: false, message: "sender and numbers are required." });
    }

    if (!(await store.sessionBelongsToUser(sender, req.user.id)))
    {
        return res.status(403).json({ status: false, message: "You do not own this sender session." });
    }

    const client = findSession(sender)?.client;

    if (!client)
    {
        return res.status(422).json({ status: false, message: `The sender ${sender} is not found or not ready.` });
    }

    const numbersArr = numbers.split(",").map((num) => num.trim()).filter(Boolean);
    const results = [];

    let media = null;

    if (fileUrl)
    {
        try
        {
            media = await MessageMedia.fromUrl(fileUrl, { unsafeMime: true });
        }
        catch (err)
        {
            return res.status(422).json({ status: false, message: "Failed to load media file." });
        }
    }

    for (let i = 0; i < numbersArr.length; i++)
    {
        const formattedNumber = phoneNumberFormatter(numbersArr[i]);

        if (!(await validateNumberRegistered(client, formattedNumber)))
        {
            results.push({ number: formattedNumber, status: false, message: "Not registered" });
        }
        else
        {
            try
            {
                if (media)
                {
                    await client.sendMessage(formattedNumber, media, { caption: message });
                    results.push({ number: formattedNumber, status: true, message: "Media sent" });
                }
                else
                {
                    await client.sendMessage(formattedNumber, message);
                    results.push({ number: formattedNumber, status: true, message: "Message sent" });
                }
            }
            catch (err)
            {
                results.push({ number: formattedNumber, status: false, message: "Send failed" });
            }
        }

        if (i < numbersArr.length - 1)
        {
            await new Promise((resolve) => setTimeout(resolve, delay * 1000));
        }
    }

    const success = results.filter((r) => r.status).length;

    try
    {
        await store.logBroadcast(req.user.id, sender, results.length, success, results.length - success, message || "");
        await store.logMessages(req.user.id, sender, results);
    }
    catch (err)
    {
        console.error("Failed to log broadcast:", err.message);
    }

    res.status(200).json({ status: true, results: results });
});

app.get("/stats/summary", ensureAuth, apiLimiter, async (req, res) =>
{
    const stats = await store.getMessageStats(req.user.id);
    res.status(200).json({
        status: true,
        total: Number(stats.total) || 0,
        success: Number(stats.success) || 0,
        failed: Number(stats.failed) || 0,
    });
});

app.get("/stats/daily", ensureAuth, apiLimiter, async (req, res) =>
{
    const rows = await store.getDailyStats(req.user.id);
    const daily = rows.map((r) => ({
        day: r.day,
        success: Number(r.success) || 0,
        failed: Number(r.failed) || 0,
    }));
    res.status(200).json({ status: true, daily: daily });
});

app.get("/templates", ensureAuth, apiLimiter, async (req, res) =>
{
    const templates = await store.getTemplates(req.user.id);
    res.status(200).json({ status: true, templates: templates });
});

const sanitizeButtons = function (raw)
{
    if (!Array.isArray(raw))
    {
        return [];
    }

    return raw
        .slice(0, 5)
        .map(function (btn)
        {
            const type = btn.type === "url" ? "url" : "flow";
            const url = String(btn.url || "").trim().slice(0, 300);

            return {
                label: String(btn.label || "").trim().slice(0, 60),
                type: type,
                goto: type === "flow" ? String(btn.goto || "").trim().slice(0, 60) : "",
                url: type === "url" && isSafeUrl(url) ? url : "",
            };
        })
        .filter((btn) => btn.label.length > 0 && (btn.type === "flow" || btn.url.length > 0));
};

const isSafeUrl = function (value)
{
    try
    {
        const parsed = new URL(value);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
    }
    catch (err)
    {
        return false;
    }
};

const allowedImagePrefix = `http://${HOST}:${PORT}/assets/uploads/`;

const isValidImage = function (image)
{
    return !image || (image.length <= 512 && image.startsWith(allowedImagePrefix));
};

app.post("/templates", ensureAuth, apiLimiter, async (req, res) =>
{
    const title = (req.body.title || "").trim();
    const body = (req.body.body || "").trim();
    const image = (req.body.image || "").trim();
    const buttons = sanitizeButtons(req.body.buttons);

    if (!title || !body || title.length > 255 || body.length > 5000)
    {
        return res.status(400).json({ status: false, message: "Valid title and body are required." });
    }

    if (!isValidImage(image))
    {
        return res.status(400).json({ status: false, message: "Invalid image reference." });
    }

    const buttonsJson = buttons.length ? JSON.stringify(buttons) : null;
    const id = await store.createTemplate(req.user.id, title, body, image, buttonsJson);
    res.status(201).json({ status: true, id: id });
});

app.delete("/templates/:id", ensureAuth, apiLimiter, async (req, res) =>
{
    const id = parseInt(req.params.id);

    if (!id)
    {
        return res.status(400).json({ status: false, message: "Valid template id is required." });
    }

    await store.deleteTemplate(req.user.id, id);
    res.status(200).json({ status: true });
});

app.get("/bot/flows", ensureAuth, apiLimiter, async (req, res) =>
{
    const flows = await store.getBotFlows(req.user.id);
    const sessions = await buildSessionList(req.user.id);
    const settings = {};

    for (const sess of sessions)
    {
        settings[sess.id] = await store.getBotSetting(sess.id);
    }

    res.status(200).json({ status: true, flows: flows, sessions: sessions, settings: settings });
});

app.post("/bot/flows", ensureAuth, apiLimiter, async (req, res) =>
{
    const sessionId = (req.body.session_id || "").trim();
    const name = (req.body.name || "").trim();
    const triggerType = ["keyword", "welcome", "fallback"].includes(req.body.trigger_type) ? req.body.trigger_type : "keyword";
    const matchMode = req.body.match_mode === "exact" ? "exact" : "contains";
    const keyword = (req.body.keyword || "").trim();
    const replyBody = (req.body.reply_body || "").trim();
    const replyImage = (req.body.reply_image || "").trim();
    const buttons = sanitizeButtons(req.body.buttons);

    if (!sessionId || !name || !replyBody || name.length > 255 || replyBody.length > 5000)
    {
        return res.status(400).json({ status: false, message: "session, name and reply are required." });
    }

    if (triggerType === "keyword" && !keyword)
    {
        return res.status(400).json({ status: false, message: "Keyword is required for keyword triggers." });
    }

    if (!isValidImage(replyImage))
    {
        return res.status(400).json({ status: false, message: "Invalid image reference." });
    }

    if (!(await store.sessionBelongsToUser(sessionId, req.user.id)))
    {
        return res.status(403).json({ status: false, message: "You do not own this session." });
    }

    const id = await store.createBotFlow(req.user.id, {
        session_id: sessionId,
        name: name,
        trigger_type: triggerType,
        keyword: keyword,
        match_mode: matchMode,
        reply_body: replyBody,
        reply_image: replyImage,
        buttons: buttons.length ? JSON.stringify(buttons) : null,
        enabled: true,
    });

    res.status(201).json({ status: true, id: id });
});

app.patch("/bot/flows/:id", ensureAuth, apiLimiter, async (req, res) =>
{
    const id = parseInt(req.params.id);

    if (!id)
    {
        return res.status(400).json({ status: false, message: "Valid flow id is required." });
    }

    await store.setFlowEnabled(req.user.id, id, req.body.enabled === true);
    res.status(200).json({ status: true });
});

app.delete("/bot/flows/:id", ensureAuth, apiLimiter, async (req, res) =>
{
    const id = parseInt(req.params.id);

    if (!id)
    {
        return res.status(400).json({ status: false, message: "Valid flow id is required." });
    }

    await store.deleteBotFlow(req.user.id, id);
    res.status(200).json({ status: true });
});

app.post("/bot/settings", ensureAuth, apiLimiter, async (req, res) =>
{
    const sessionId = (req.body.session_id || "").trim();

    if (!sessionId || !(await store.sessionBelongsToUser(sessionId, req.user.id)))
    {
        return res.status(403).json({ status: false, message: "You do not own this session." });
    }

    await store.setBotEnabled(req.user.id, sessionId, req.body.enabled === true);
    res.status(200).json({ status: true });
});

const isValidWaNumber = function (value)
{
    return typeof value === "string" && /^\d{5,20}@(c\.us|lid)$/.test(value);
};

const allowedLabels = ["none", "lead", "customer", "followup"];
const allowedStatuses = ["new", "open", "done"];

app.get("/crm/contacts", ensureAuth, apiLimiter, async (req, res) =>
{
    const search = (req.query.search || "").toString().slice(0, 64).trim();
    const label = allowedLabels.includes(req.query.label) ? req.query.label : "";
    const status = allowedStatuses.includes(req.query.status) ? req.query.status : "";

    try
    {
        const contacts = await store.getContacts(req.user.id, { search, label, status });
        res.status(200).json({ status: true, contacts });
    }
    catch (err)
    {
        console.error("CRM contacts failed:", err.message);
        res.status(500).json({ status: false, message: "Failed to load contacts." });
    }
});

app.get("/crm/conversation", ensureAuth, apiLimiter, async (req, res) =>
{
    const sessionId = (req.query.session_id || "").toString();
    const waNumber = (req.query.wa_number || "").toString();

    if (!isValidWaNumber(waNumber) || !(await store.sessionBelongsToUser(sessionId, req.user.id)))
    {
        return res.status(400).json({ status: false, message: "Invalid request." });
    }

    try
    {
        await store.markRead(req.user.id, sessionId, waNumber);
        const detail = await store.getContactDetail(req.user.id, sessionId, waNumber);
        const messages = await store.getConversation(req.user.id, sessionId, waNumber);
        res.status(200).json({ status: true, detail, messages });
    }
    catch (err)
    {
        console.error("CRM conversation failed:", err.message);
        res.status(500).json({ status: false, message: "Failed to load conversation." });
    }
});

app.post("/crm/reply", ensureAuth, apiLimiter, async (req, res) =>
{
    const sessionId = (req.body.session_id || "").toString();
    const waNumber = (req.body.wa_number || "").toString();
    const body = (req.body.body || "").toString().slice(0, 4096);

    if (!isValidWaNumber(waNumber) || !body.trim())
    {
        return res.status(400).json({ status: false, message: "Invalid request." });
    }

    if (!(await store.sessionBelongsToUser(sessionId, req.user.id)))
    {
        return res.status(403).json({ status: false, message: "You do not own this session." });
    }

    const client = findSession(sessionId)?.client;

    if (!client)
    {
        return res.status(422).json({ status: false, message: "Session is not ready." });
    }

    try
    {
        await client.sendMessage(waNumber, body);
        await recordOutgoing(sessionId, waNumber, body);
        res.status(200).json({ status: true });
    }
    catch (err)
    {
        console.error("CRM reply failed:", err.message);
        res.status(500).json({ status: false, message: "Failed to send reply." });
    }
});

app.patch("/crm/contact", ensureAuth, apiLimiter, async (req, res) =>
{
    const sessionId = (req.body.session_id || "").toString();
    const waNumber = (req.body.wa_number || "").toString();
    const label = allowedLabels.includes(req.body.label) ? req.body.label : "none";
    const status = allowedStatuses.includes(req.body.status) ? req.body.status : "new";
    const notes = (req.body.notes || "").toString().slice(0, 2000);

    if (!isValidWaNumber(waNumber) || !(await store.sessionBelongsToUser(sessionId, req.user.id)))
    {
        return res.status(400).json({ status: false, message: "Invalid request." });
    }

    try
    {
        await store.updateContact(req.user.id, sessionId, waNumber, label, status, notes);
        res.status(200).json({ status: true });
    }
    catch (err)
    {
        console.error("CRM update contact failed:", err.message);
        res.status(500).json({ status: false, message: "Failed to update contact." });
    }
});

app.use((err, req, res, next) =>
{
    console.error("Unhandled error:", err.message);
    res.status(500).json({ status: false, message: "Internal server error." });
});

const bootstrap = async function ()
{
    await initDatabase();
    await migrateLegacySessions();
    await restoreSessions();

    server.listen(PORT, function ()
    {
        console.log(`WhatsApp API running on http://${HOST}:${PORT}`);
    });
};

bootstrap().catch((err) =>
{
    console.error("Startup failed:", err.message);
    process.exit(1);
});
