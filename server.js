const express = require('express');
const path = require('path');

const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const multer = require('multer');
const { spawn } = require('child_process');
const fs = require('fs');

const https = require('https');

const app = express();

const db = new sqlite3.Database('./chat.db');


const PORT = 3010;
const HOST = '0.0.0.0';

app.use(cors());

const proxyMiddleware = createProxyMiddleware({
    target: 'http://localhost:11434/api',
    changeOrigin: false,
    on: {
        proxyReq: (req, res) => {
            // console.log('request before',req);
        },
        proxyRes: (req, res) => {
            // console.log('\n\n\n\nRequest ',req);
            // console.log('Resoponse ',res);
        },
        error: (err, req, res) => {
            /* handle error */
        },
    }
});
// Proxy API calls to Ollama
//

const options = {
    key: fs.readFileSync('./certs/key.pem'),
    cert: fs.readFileSync('./certs/cert.pem')
};


const upload = multer({ dest: 'uploads/' });
const { exec } = require('child_process');

const axios = require('axios');
const FormData = require('form-data');


db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS chats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
  )`);

    db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id INTEGER NOT NULL,
    sender TEXT CHECK(sender IN ('user', 'assistant')) NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_id) REFERENCES chats(id)
  )`);
});

// Log incoming requests
app.use((req, res, next) => {
    console.log(`Incoming request: ${req.method} ${req.url}`);
    next();
});

app.use('/api', proxyMiddleware);


app.use(express.static('public'));
app.use(express.json());

// 1️⃣ Handle audio upload + transcription
app.post('/transcribe', upload.single('audio'), (req, res) => {
    const inputPath = req.file.path;

    const wavPath = `${inputPath}.wav`;

    exec(`ffmpeg -i ${inputPath} -ar 16000 -ac 1 -f wav ${wavPath}`, async (err) => {
        if (err) {
            console.error('FFmpeg error:', err);
            return res.status(500).send('Error converting to WAV');
        }

        // Now call Whisper on the WAV file
        const whisper = spawn('whisper-cli', ['-m', '/home/danila/Desktop/whisper.cpp/models/ggml-base.en.bin', '-f', wavPath]);

        let output = '';
        whisper.stdout.on('data', data => output += data.toString());
        whisper.on('close', () => {
            fs.unlink(inputPath, () => {});
            fs.unlink(wavPath, () => {});
            res.json({ text: output.trim() });
        });

        // try {
        //     const form = new FormData();
        //     form.append('file', fs.createReadStream(wavPath));
        //     form.append('temperature', '0.0');
        //     form.append('temperature_inc', '0.2');
        //     form.append('response_format', 'json');
        //
        //     const whisperRes = await axios.post('http://127.0.0.1:8080/inference', form, {
        //         headers: form.getHeaders()
        //     });
        //
        //     fs.unlink(inputPath, () => {});
        //     fs.unlink(wavPath, () => {});
        //
        //     const resultText = whisperRes.data?.text || '[No transcription result]';
        //     res.json({ text: resultText });
        // } catch (error) {
        //     console.error('Whisper server error:', error.response?.data || error.message);
        //     res.status(500).send('Error during Whisper inference');
        // }
    });
});

// Create a new chat
app.post('/chats', (req, res) => {
    const { name } = req.body;
    console.log(name);
    // Check if a chat with the same name already exists
    db.get(`SELECT 1 FROM chats WHERE name = ?`, [name], function(err, row) {
        if (err || row !== undefined) {
            return res.status(400).json({ error: 'A chat with this name already exists' });
        }

        // If no chat with the same name exists, create a new one
        db.run(`INSERT INTO chats (name) VALUES (?)`, [name], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ chatId: this.lastID });
        });
    });
});

// Add message to a chat
app.post('/chats/:chatId/messages', (req, res) => {
    const { chatId } = req.params;
    const { sender, content } = req.body;

    db.run(
        `INSERT INTO messages (chat_id, sender, content) VALUES (?, ?, ?)`,
        [chatId, sender, content],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ messageId: this.lastID });
        }
    );
});

// Get all messages in a chat
app.get('/chats/:chatId/messages', (req, res) => {
    const { chatId } = req.params;
    db.all(
        `SELECT sender, content, created_at FROM messages WHERE chat_id = ? ORDER BY created_at ASC`,
        [chatId],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});

app.delete('/chats/:chatId', (req, res) => {
    const { chatId } = req.params;

    // First delete the messages associated with the chat
    db.run(`DELETE FROM messages WHERE chat_id = ?`, [chatId], function(err) {
        if (err) return res.status(500).json({ error: err.message });

        // Then delete the chat itself
        db.run(`DELETE FROM chats WHERE id = ?`, [chatId], function(err) {
            if (err) return res.status(500).json({ error: err.message });

            if (this.changes === 0) {
                return res.status(404).json({ error: 'Chat not found' });
            }

            res.json({ message: 'Chat deleted successfully' });
        });
    });
});

app.get('/chats/all', (req, res) => {
    db.all(`SELECT id, name FROM chats ORDER BY id DESC`, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});


const loadModel = async () => {
    const form = new FormData();
    form.append('model', fs.createReadStream('/home/danila/Desktop/whisper.cpp/models/ggml-base.en.bin'));

    try {
        await axios.post('http://127.0.0.1:8080/load', form, {
            headers: form.getHeaders()
        });
        console.log('✅ Whisper model loaded');
    } catch (err) {
        console.error('❌ Failed to load Whisper model:', err.message);
    }
};



loadModel(); // Call this at startup


https.createServer(options, app).listen(PORT, HOST, () => {
    console.log(`✅ Secure server running at https://${HOST}:${PORT}`);
});
