const { Client, MessageMedia, LocalAuth } = require("whatsapp-web.js");
const express = require("express");
const socketIO = require("socket.io");
const qrcode = require("qrcode");
const http = require("http");
const fs = require("fs");
const { phoneNumberFormatter } = require("./helpers/formatter");
const fileUpload = require("express-fileupload");
const axios = require("axios");
const os = require('os');

const HOST = process.env.HOST || 'localhost';
const PORT = process.env.PORT || 6969;

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.json());

app.use(
    express.urlencoded({
        extended: true,
    })
);

app.use(
    fileUpload({
        debug: false,
    })
);

app.use('/assets', express.static('assets'));

app.get("/", (req, res) =>
{
    res.sendFile("views/index.html", {
        root: __dirname,
    });
});

app.get("/broadcast", (req, res) =>
{
    res.sendFile("views/broadcast.html", {
        root: __dirname,
    });
});

const sessions      = [];
const SESSIONS_FILE = "./whatsapp-sessions.json";

const createSessionsFileIfNotExists = function ()
{
    if (!fs.existsSync(SESSIONS_FILE))
    {
        try
        {
            fs.writeFileSync(SESSIONS_FILE, JSON.stringify([]));
            console.log("Sessions file created successfully.");
        }
        catch (err)
        {
            console.log("Failed to create sessions file: ", err);
        }
    }
};

createSessionsFileIfNotExists();

const setSessionsFile = function (sessions)
{
    fs.writeFile(SESSIONS_FILE, JSON.stringify(sessions), function (err)
    {
        if (err)
        {
            console.log(err);
        }
    });
};

const getSessionsFile = function ()
{
    return JSON.parse(fs.readFileSync(SESSIONS_FILE));
};

const createSession = function (id, description)
{
    console.log("Creating session: " + id);

    const client = new Client({
        restartOnAuthFail: true,
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
                "--disable-cache",
                "--disable-application-cache",
                "--disable-gpu-driver-bug-workarounds",
                "--disable-accelerated-2d-canvas",
                "--no-first-run",
                "--no-zygote",
                "--single-process",
            ],
        },
        authStrategy: new LocalAuth({
            clientId: id,
        }),
    });

    client.initialize();

    client.on("qr", (qr) =>
    {
        console.log("QR RECEIVED", qr);

        qrcode.toDataURL(qr, (err, url) =>
        {
            io.emit("qr", { id: id, src: url });
            io.emit("message", { id: id, text: "QR Code received, scan please!" });
        });
    });

    client.on("ready", () =>
    {
        io.emit("ready", { id: id });
        io.emit("message", { id: id, text: "Whatsapp is ready!" });

        const savedSessions   = getSessionsFile();
        const sessionIndex    = savedSessions.findIndex((sess) => sess.id == id);

        savedSessions[sessionIndex].ready = true;
        setSessionsFile(savedSessions);
    });

    client.on("authenticated", () =>
    {
        io.emit("authenticated", { id: id });
        io.emit("message", { id: id, text: "Whatsapp is authenticated!" });
    });

    client.on("auth_failure", function ()
    {
        io.emit("message", { id: id, text: "Auth failure, restarting..." });
    });

    client.on("disconnected", (reason) =>
    {
        io.emit("message", { id: id, text: "Whatsapp is disconnected!" });
        client.destroy();
        client.initialize();

        const savedSessions   = getSessionsFile();
        const sessionIndex    = savedSessions.findIndex((sess) => sess.id == id);

        savedSessions.splice(sessionIndex, 1);
        setSessionsFile(savedSessions);

        io.emit("remove-session", id);
    });

    sessions.push({
        id: id,
        description: description,
        client: client,
    });

    const savedSessions   = getSessionsFile();
    const sessionIndex    = savedSessions.findIndex((sess) => sess.id == id);

    if (sessionIndex == -1)
    {
        savedSessions.push({
            id: id,
            description: description,
            ready: false,
        });

        setSessionsFile(savedSessions);
    }
};

const init = function (socket)
{
    const savedSessions = getSessionsFile();

    if (savedSessions.length > 0)
    {
        if (socket)
        {
            savedSessions.forEach((e, i, arr) =>
            {
                arr[i].ready = false;
            });

            socket.emit("init", savedSessions);
        }
        else
        {
            savedSessions.forEach((sess) =>
            {
                createSession(sess.id, sess.description);
            });
        }
    }
};

init();

io.on("connection", function (socket)
{
    init(socket);

    socket.on("create-session", function (data)
    {
        console.log("Create session: " + data.id);
        createSession(data.id, data.description);
    });
});

app.post("/send-message", async (req, res) =>
{
    const sender    = req.body.sender;
    const number    = phoneNumberFormatter(req.body.number);
    const message   = req.body.message;

    const client    = sessions.find((sess) => sess.id == sender)?.client;

    if (!client)
    {
        return res.status(422).json({
            status: false,
            message: `The sender: ${sender} is not found!`,
        });
    }

    const isRegisteredNumber = await client.isRegisteredUser(number);

    if (!isRegisteredNumber)
    {
        return res.status(422).json({
            status: false,
            message: "The number is not registered",
        });
    }

    client
        .sendMessage(number, message)
        .then((response) =>
        {
            res.status(200).json({
                status: true,
                response: response,
            });
        })
        .catch((err) =>
        {
            res.status(500).json({
                status: false,
                response: err,
            });
        });
});

app.post("/send-media", async (req, res) =>
{
    const sender    = req.body.sender;
    const number    = phoneNumberFormatter(req.body.number);
    const caption   = req.body.caption;
    const fileUrl   = req.body.file;

    const client    = sessions.find((sess) => sess.id == sender)?.client;

    if (!client)
    {
        return res.status(422).json({
            status: false,
            message: `The sender: ${sender} is not found!`,
        });
    }

    const isRegisteredNumber = await client.isRegisteredUser(number);

    if (!isRegisteredNumber)
    {
        return res.status(422).json({
            status: false,
            message: "The number is not registered",
        });
    }

    let mimetype;
    const attachment = await axios
        .get(fileUrl, { responseType: "arraybuffer" })
        .then((response) =>
        {
            mimetype = response.headers["content-type"];
            return response.data.toString("base64");
        });

    const media = new MessageMedia(mimetype, attachment, "Lampiran Berkas");

    client
        .sendMessage(number, media, { caption: caption })
        .then((response) =>
        {
            res.status(200).json({
                status: true,
                response: response,
            });
        })
        .catch((err) =>
        {
            res.status(500).json({
                status: false,
                response: err,
            });
        });
});

app.post('/upload', async (req, res) =>
{
    if (!req.files || !req.files.file)
    {
        console.log('Tidak ada file yang diupload');
        return res.status(400).json({ status: false, message: 'No file uploaded' });
    }

    const file          = req.files.file;
    const uploadPath    = __dirname + '/assets/uploads/' + file.name;

    try
    {
        await file.mv(uploadPath);
        console.log('File berhasil diupload ke:', uploadPath);
    }
    catch (err)
    {
        console.error('Gagal upload file:', err);
        return res.status(500).json({ status: false, message: 'Gagal upload file', error: err.message });
    }

    const publicUrl = `http://${HOST}:${PORT}/assets/uploads/${encodeURIComponent(file.name)}`;

    res.json({ status: true, url: publicUrl });
});

app.post("/broadcast", async (req, res) =>
{
    const sender    = req.body.sender;
    const numbers   = req.body.numbers;
    const message   = req.body.message;
    const fileUrl   = req.body.file;
    const delay     = Math.max(1, parseInt(req.body.delay) || 30);

    const client    = sessions.find((sess) => sess.id == sender)?.client;

    if (!client)
    {
        return res.status(422).json({
            status: false,
            message: `The sender: ${sender} is not found!`,
        });
    }

    let results = [];
    let numbersArr = numbers.split(",").map(num => num.trim()).filter(Boolean);

    for (let i = 0; i < numbersArr.length; i++)
    {
        const number = numbersArr[i];
        const formattedNumber = phoneNumberFormatter(number);

        const isRegisteredNumber = await client.isRegisteredUser(formattedNumber);

        if (!isRegisteredNumber)
        {
            results.push({
                number: formattedNumber,
                status: false,
                message: "The number is not registered"
            });
        }
        else
        {
            try
            {
                if (fileUrl)
                {
                    let mimetype;
                    const attachment = await axios
                        .get(fileUrl, { responseType: "arraybuffer" })
                        .then((response) =>
                        {
                            mimetype = response.headers["content-type"];
                            return response.data.toString("base64");
                        });

                    const media = new MessageMedia(mimetype, attachment, "Lampiran Berkas");

                    await client.sendMessage(formattedNumber, media, { caption: message });

                    results.push({
                        number: formattedNumber,
                        status: true,
                        message: "Media sent"
                    });
                }
                else
                {
                    await client.sendMessage(formattedNumber, message);

                    results.push({
                        number: formattedNumber,
                        status: true,
                        message: "Message sent"
                    });
                }
            }
            catch (err)
            {
                results.push({
                    number: formattedNumber,
                    status: false,
                    message: err.message
                });
            }
        }

        if (i < numbersArr.length - 1) {
            await new Promise(resolve => setTimeout(resolve, delay * 1000));
        }
    }

    res.json({
        status: true,
        results: results
    });
});

server.listen(PORT, function ()
{
    console.log("App running on *: " + PORT);
});

const uploadsDir = __dirname + '/assets/uploads';

if (!fs.existsSync(uploadsDir))
{
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('Folder uploads dibuat:', uploadsDir);
}
else
{
    console.log('Folder uploads sudah ada:', uploadsDir);
}
