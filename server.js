const express = require('express');
const path = require('path');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = 3000; // Serve on this port
const HOSTNAME = "0.0.0.0";

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

// Serve static frontend files
app.use(express.static(path.join(__dirname)));

// Handle fallback (SPA routing)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, HOSTNAME,() => {
    console.log(`✅ Museum Guide app running at: http://${HOSTNAME}:${PORT}`);
});