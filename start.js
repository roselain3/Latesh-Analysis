const { spawn } = require('child_process');
const chalk = require('chalk');
const path = require('path');
require('dotenv').config();

const log = {
    info: (msg) => console.log(chalk.blue('[LAUNCHER]'), msg),
    success: (msg) => console.log(chalk.green('[LAUNCHER]'), msg),
    error: (msg) => console.log(chalk.red('[LAUNCHER]'), msg),
    warn: (msg) => console.log(chalk.yellow('[LAUNCHER]'), msg)
};

// Function to start a process
function startProcess(name, script, color) {
    const childProcess = spawn('node', [script], {
        stdio: 'pipe',
        cwd: __dirname,
        env: process.env  // Properly inherit environment variables
    });

    // Handle stdout
    childProcess.stdout.on('data', (data) => {
        const lines = data.toString().split('\n').filter(line => line.trim());
        lines.forEach(line => {
            console.log(chalk.hex(color)(`[${name}]`), line);
        });
    });

    // Handle stderr
    childProcess.stderr.on('data', (data) => {
        const lines = data.toString().split('\n').filter(line => line.trim());
        lines.forEach(line => {
            console.log(chalk.red(`[${name}-ERROR]`), line);
        });
    });

    // Handle process exit
    childProcess.on('close', (code) => {
        if (code !== 0) {
            log.error(`${name} process exited with code ${code}`);
        } else {
            log.info(`${name} process exited normally`);
        }
    });

    return childProcess;
}

// Check if required files exist
const requiredFiles = ['bot.js', 'server.js'];
const missingFiles = requiredFiles.filter(file => {
    try {
        require.resolve(path.join(__dirname, file));
        return false;
    } catch {
        return true;
    }
});

if (missingFiles.length > 0) {
    log.error(`Missing required files: ${missingFiles.join(', ')}`);
    process.exit(1);
}

// Check environment variables
if (!process.env.DISCORD_TOKEN) {
    log.warn('DISCORD_TOKEN not found in environment variables');
    log.warn('Make sure your .env file is properly configured');
} else {
    log.success('Discord token found in environment');
}

log.info('Starting Latesh Analysis Bot System...');
log.info('Press Ctrl+C to stop all processes');

// Start both processes
const botProcess = startProcess('BOT', 'bot.js', '#7289da');
const serverProcess = startProcess('WEB', 'server.js', '#00d1ff');

// Handle graceful shutdown
process.on('SIGINT', () => {
    log.info('Shutting down all processes...');
    
    botProcess.kill('SIGTERM');
    serverProcess.kill('SIGTERM');
    
    setTimeout(() => {
        log.info('Goodbye! 👋');
        process.exit(0);
    }, 2000);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    log.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    log.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

log.success('✨ Latesh Analysis Bot System started successfully!');
