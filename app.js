const { Client, MessageMedia } = require('whatsapp-web.js');
const express = require('express');
const { body, validationResult } = require('express-validator');
const socketIO = require('socket.io');
const qrcode = require('qrcode');
const http = require('http');
const fs = require('fs');
const { phoneNumberFormatter } = require('./helpers/formatter');
const fileUpload = require('express-fileupload');
const axios = require('axios');
const port = process.env.PORT || 8000;

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.json());
app.use(express.urlencoded({ 
	extended: true 
}));
app.use(fileUpload({
	debug: true
}));

const SESSION_FILE_PATH = './whatsapp-session.json';
let sessionCfg;
if (fs.existsSync(SESSION_FILE_PATH)) {
    sessionCfg = require(SESSION_FILE_PATH);
}

app.get('/', (req, res) => {
	res.sendFile('index.html', { root: __dirname });
});

const client = new Client({ 
	puppeteer: { 
		headless: true,
		args: [
			'--no-sandbox',
			'--disable-setuid-sandbox',
			'--disable-dev-shm-usage',
			'--disable-accelerated-2d-canvas',
			'--no-first-run',
			'--no-zygote',
			'--disable-gpu'
		  ],
	}, 
	session: sessionCfg 
});

client.on('message', msg => {
    if (msg.body == '!ping') {
        msg.reply('Pong!');
    }
});

client.initialize();

// Socket IO
io.on('connection', function(socket) {
	socket.emit('message', 'Connecting ...');

	client.on('qr', (qr) => {
	    console.log('QR RECEIVED', qr);
	    qrcode.toDataURL(qr, (err, url) => {
	    	socket.emit('qr', url);
	    	socket.emit('message', 'QR Received, Scan Please!');
	    });
	});

	client.on('ready', () => {
		socket.emit('ready', 'Whatsapp is Ready!');
	    socket.emit('message', 'Whatsapp is Ready!');
	});

	client.on('authenticated', (session) => {
		socket.emit('ready', 'Whatsapp is Authenticated!');
	    socket.emit('message', 'Whatsapp is Authenticated!');
	    console.log('AUTHENTICATED', session);
	    sessionCfg=session;
	    fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function (err) {
	        if (err) {
	            console.error(err);
	        }
	    });
	});
});

// Check Registered Number
const checkRegisteredNumber = async function(number) {
	const isRegistered = await client.isRegisteredUser(number);

	return isRegistered;
}

// Send Message
app.post('/send-message', [
	body('number').notEmpty(),
	body('message').notEmpty(),
] , async (req, res) => {
	const errors = validationResult(req).formatWith(({ msg }) => {
		return msg;
	});

	if (!errors.isEmpty()) {
		return res.status(422).json({
			status: false,
			message: errors.mapped()
		})
	}
	const number = phoneNumberFormatter(req.body.number);
	const message = req.body.message;

	const isRegisteredNumber = await checkRegisteredNumber(number);

	// return back if number is not registered
	// if (!isRegisteredNumber) {
	// 	return res.status(422).json({
	// 		status: false,
	// 		message: 'The Number in Not Registered WhatsApp'
	// 	});
	// }

	// skip if number not registered
	if (!isRegisteredNumber) {
		return res.status(200).json({
			status: true,
			response: 'The Number in Not Registered WhatsApp'
		});
	}

	client.sendMessage(number, message).then(response => {
		res.status(200).json({
			status: true,
			response: response
		});
	}).catch(err => {
		res.status(500).json({
			status: false,
			response: err
		});
	});
});

// Send Media
app.post('/send-media', async (req, res) => {
	const number = phoneNumberFormatter(req.body.number);
	const caption = req.body.caption;
	const fileUrl = req.body.file;

	// skip if number not registered
	const isRegisteredNumber = await checkRegisteredNumber(number);
	if (!isRegisteredNumber) {
		return res.status(200).json({
			status: true,
			response: 'The Number in Not Registered WhatsApp'
		});
	}
	
	// const media = MessageMedia.fromFilePath('./image-example.png');
	// const file = req.files.file;
	// const media = new MessageMedia(file.mimetype, file.data.toString('base64'), file.name);

	let mimetype;
	const attachment = await axios.get(fileUrl, { responseType: 'arraybuffer' }).then(response => {
		mimetype = response.headers['content-type'];
		return response.data.toString('base64');
	});

	const media = new MessageMedia(mimetype,attachment,'Lampiran Berkas');

	client.sendMessage(number, media, { caption: caption }).then(response => {
		res.status(200).json({
			status: true,
			response: response
		});
	}).catch(err => {
		res.status(500).json({
			status: false,
			response: err
		});
	});
});

server.listen(port, function() {
	console.log('App running on *: ' + port);
});