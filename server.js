const express = require('express');
const path = require('path');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const multer = require('multer');
const { spawn } = require('child_process');
const fs = require('fs');

const https = require('https');

const app = express();
const PORT = 3000;
const HOST = '0.0.0.0';

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
// Log incoming requests
app.use((req, res, next) => {
    console.log(`Incoming request: ${req.method} ${req.url}`);
    next();
});

app.use('/api', proxyMiddleware);

const options = {
    key: fs.readFileSync('./certs/key.pem'),
    cert: fs.readFileSync('./certs/cert.pem')
};


const upload = multer({ dest: 'uploads/' });
const { exec } = require('child_process');

const axios = require('axios');
const FormData = require('form-data');

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
        // const whisper = spawn('whisper-cli', ['-m', '/home/danila/Desktop/whisper.cpp/models/ggml-base.en.bin', '-f', wavPath]);
        //
        // let output = '';
        // whisper.stdout.on('data', data => output += data.toString());
        // whisper.on('close', () => {
        //     fs.unlink(inputPath, () => {});
        //     fs.unlink(wavPath, () => {});
        //     res.json({ text: output.trim() });
        // });
        try {
            const form = new FormData();
            form.append('file', fs.createReadStream(wavPath));
            form.append('temperature', '0.0');
            form.append('temperature_inc', '0.2');
            form.append('response_format', 'json');

            const whisperRes = await axios.post('http://127.0.0.1:8080/inference', form, {
                headers: form.getHeaders()
            });

            fs.unlink(inputPath, () => {});
            fs.unlink(wavPath, () => {});

            const resultText = whisperRes.data?.text || '[No transcription result]';
            res.json({ text: resultText });
        } catch (error) {
            console.error('Whisper server error:', error.response?.data || error.message);
            res.status(500).send('Error during Whisper inference');
        }
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
