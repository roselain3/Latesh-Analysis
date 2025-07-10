const express = require('express');
const path = require('path');
const chalk = require('chalk');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Utility logging
const log = {
    info: (msg) => console.log(chalk.blue('[WEB]'), msg),
    success: (msg) => console.log(chalk.green('[WEB]'), msg),
    error: (msg) => console.log(chalk.red('[WEB]'), msg)
};

// Routes
app.get('/', (req, res) => {
    res.json({
        name: 'Latesh Analysis',
        description: 'Discord bot for FRC match analysis and webhook management',
        version: '1.0.0',
        status: 'online',
        endpoints: {
            health: '/health',
            webhook: '/webhook'
        }
    });
});

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Webhook endpoint for external integrations
app.post('/webhook', (req, res) => {
    log.info('Webhook received:', req.body);
    
    // Process webhook data here
    // You can integrate this with your Discord bot
    
    res.json({
        success: true,
        message: 'Webhook received',
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: 'The requested endpoint does not exist'
    });
});

// Error handler
app.use((err, req, res, next) => {
    log.error('Server error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: 'Something went wrong on the server'
    });
});

// Start server
app.listen(PORT, () => {
    log.success(`🌐 Web server running on port ${PORT}`);
    log.info(`📊 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;