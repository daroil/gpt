const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();

const corsOptions = { // Frontend URL
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
  credentials: true,  // If you need cookies, headers, or credentials
};

app.use(cors(corsOptions));

app.use('/api', (req, res, next) => {
    console.log(`Proxy request: ${req.method} ${req.url}`);
    next();
}, createProxyMiddleware({
    target: 'http://localhost:11434/api',
    changeOrigin: true,
    onError(err, req, res) {
        console.error('Proxy error:', err);
        res.status(500).send('Proxy Error');
    }
}));

app.get('/', (req, res) => {
    res.send('Proxy server is running');
});

app.listen(5000, () => {
    console.log('Proxy server running on http://localhost:5000');
});
