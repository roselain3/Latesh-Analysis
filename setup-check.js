const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const log = {
    info: (msg) => console.log(chalk.blue('[SETUP]'), msg),
    success: (msg) => console.log(chalk.green('[SETUP]'), msg),
    error: (msg) => console.log(chalk.red('[SETUP]'), msg),
    warn: (msg) => console.log(chalk.yellow('[SETUP]'), msg)
};

function checkSetup() {
    log.info('🔍 Checking Latesh Analysis Bot setup...\n');

    let allGood = true;

    // Check if .env file exists
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) {
        log.error('❌ .env file not found');
        log.info('   Create one by copying .env.example:');
        log.info('   copy .env.example .env');
        allGood = false;
    } else {
        log.success('✅ .env file found');
        
        // Check environment variables
        require('dotenv').config();
        
        const requiredVars = ['DISCORD_TOKEN', 'CLIENT_ID'];
        const optionalVars = ['PORT', 'DEFAULT_WEBHOOK_URL', 'TBA_API_KEY', 'GEMINI_API_KEY'];
        
        log.info('\n📋 Checking environment variables:');
        
        requiredVars.forEach(varName => {
            if (process.env[varName]) {
                log.success(`   ✅ ${varName}: Set`);
            } else {
                log.error(`   ❌ ${varName}: Missing (Required)`);
                allGood = false;
            }
        });
        
        optionalVars.forEach(varName => {
            if (process.env[varName]) {
                log.success(`   ✅ ${varName}: Set`);
            } else {
                log.warn(`   ⚠️  ${varName}: Not set (Optional)`);
            }
        });
    }

    // Check required files
    log.info('\n📁 Checking required files:');
    const requiredFiles = ['bot.js', 'server.js', 'start.js', 'package.json'];
    
    requiredFiles.forEach(file => {
        if (fs.existsSync(path.join(__dirname, file))) {
            log.success(`   ✅ ${file}: Found`);
        } else {
            log.error(`   ❌ ${file}: Missing`);
            allGood = false;
        }
    });

    // Check utils directory
    log.info('\n🛠️  Checking utility files:');
    const utilsPath = path.join(__dirname, 'utils');
    if (fs.existsSync(utilsPath)) {
        log.success('   ✅ utils directory: Found');
        
        const utilFiles = ['WebhookManager.js', 'FRCAnalyzer.js'];
        utilFiles.forEach(file => {
            if (fs.existsSync(path.join(utilsPath, file))) {
                log.success(`   ✅ utils/${file}: Found`);
            } else {
                log.error(`   ❌ utils/${file}: Missing`);
                allGood = false;
            }
        });
    } else {
        log.error('   ❌ utils directory: Missing');
        allGood = false;
    }

    // Check public directory
    log.info('\n🌐 Checking web files:');
    const publicPath = path.join(__dirname, 'public');
    if (fs.existsSync(publicPath)) {
        log.success('   ✅ public directory: Found');
        
        if (fs.existsSync(path.join(publicPath, 'index.html'))) {
            log.success('   ✅ public/index.html: Found');
        } else {
            log.warn('   ⚠️  public/index.html: Missing (Dashboard won\'t work)');
        }
    } else {
        log.warn('   ⚠️  public directory: Missing (Dashboard won\'t work)');
    }

    // Check node_modules
    log.info('\n📦 Checking dependencies:');
    if (fs.existsSync(path.join(__dirname, 'node_modules'))) {
        log.success('   ✅ node_modules: Found');
        
        // Check if main dependencies exist
        const mainDeps = ['discord.js', 'express', 'axios', 'dotenv', 'chalk'];
        mainDeps.forEach(dep => {
            try {
                require.resolve(dep);
                log.success(`   ✅ ${dep}: Installed`);
            } catch {
                log.error(`   ❌ ${dep}: Missing - run npm install`);
                allGood = false;
            }
        });
    } else {
        log.error('   ❌ node_modules: Missing');
        log.info('   Run: npm install');
        allGood = false;
    }

    log.info('\n' + '='.repeat(50));
    
    if (allGood) {
        log.success('🎉 Setup looks good! You can start the bot with:');
        log.info('   npm start    (starts both bot and web server)');
        log.info('   npm run bot  (starts only the Discord bot)');
        log.info('   npm run server (starts only the web server)');
        log.info('\n💡 Don\'t forget to:');
        log.info('   1. Invite your bot to Discord servers');
        log.info('   2. Set up your Discord bot permissions');
        log.info('   3. Configure webhooks if needed');
    } else {
        log.error('❌ Setup incomplete. Please fix the issues above.');
        log.info('\n📚 Need help? Check the README.md file for detailed setup instructions.');
    }
    
    log.info('\n🔗 Useful links:');
    log.info('   Discord Developer Portal: https://discord.com/developers/applications');
    log.info('   The Blue Alliance API: https://www.thebluealliance.com/apidocs');
    log.info('   Bot Documentation: https://github.com/roselain3/Latesh-Analysis');
}

// Run the setup check
checkSetup();
