// Load environment variables first
require('dotenv').config();

const { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder, REST, Routes, Collection, PermissionFlagsBits } = require('discord.js');
const axios = require('axios');
const chalk = require('chalk');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

// Initialize Discord client with necessary intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildWebhooks,
        GatewayIntentBits.MessageContent // Re-enabled for AI chat functionality
    ]
});

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-04-17" });

// Collections for commands and webhooks
client.commands = new Collection();
client.webhooks = new Collection();

// Extension loader system
function loadExtensions() {
    const extensionsPath = path.join(__dirname, 'extensions');
    
    if (!fs.existsSync(extensionsPath)) {
        log.warn('Extensions folder not found. Creating it...');
        fs.mkdirSync(extensionsPath, { recursive: true });
        return;
    }
    
    const extensionFiles = fs.readdirSync(extensionsPath).filter(file => file.endsWith('.js'));
    
    if (extensionFiles.length === 0) {
        log.info('No extension files found in extensions folder.');
        return;
    }
    
    log.info(`Loading ${extensionFiles.length} extension(s)...`);
    
    for (const file of extensionFiles) {
        const extensionPath = path.join(extensionsPath, file);
        
        try {
            // Clear the require cache to allow hot reloading
            delete require.cache[require.resolve(extensionPath)];
            
            const extension = require(extensionPath);
            
            // Validate extension structure
            if (!extension.data || !extension.execute) {
                log.error(`Extension ${file} is missing required 'data' or 'execute' properties.`);
                continue;
            }
            
            // Add to commands collection
            client.commands.set(extension.data.name, extension);
            log.success(`✅ Loaded extension: ${extension.data.name} (${file})`);
            
        } catch (error) {
            log.error(`Failed to load extension ${file}:`, error.message);
        }
    }
}

function getExtensionCommands() {
    const extensionCommands = [];
    
    client.commands.forEach((command, name) => {
        if (command.data) {
            extensionCommands.push(command.data);
        }
    });
    
    return extensionCommands;
}

// Utility functions
const log = {
    info: (msg) => console.log(chalk.blue('[INFO]'), msg),
    success: (msg) => console.log(chalk.green('[SUCCESS]'), msg),
    error: (msg) => console.log(chalk.red('[ERROR]'), msg),
    warn: (msg) => console.log(chalk.yellow('[WARN]'), msg)
};

// Bot configuration
const config = {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.CLIENT_ID,
    prefix: process.env.PREFIX || '!',
    defaultWebhook: process.env.DEFAULT_WEBHOOK_URL,
    geminiApiKey: process.env.GEMINI_API_KEY
};

// AI Character Configuration
const aiCharacter = {
    name: "Latesh Analysis Bot",
    currentPersonality: "default",
    personalities: {
        default: {
            name: "Default Assistant",
            traits: ["enthusiastic", "knowledgeable", "geeky about robotics", "friendly", "professional"],
            speakingStyle: "Clear explanations with examples, occasional emojis, encouraging tone",
            expertise: ["FRC robotics", "Discord management", "webhook systems", "programming"],
            catchphrases: ["Let's dive into that!", "That's a fantastic question!", "Here's the scoop!"],
            motto: "Making Discord servers and robotics teams more awesome, one command at a time!",
            responseStyle: "Helpful and professional with a friendly touch"
        },
        professional: {
            name: "Professional Expert",
            traits: ["highly professional", "extremely knowledgeable", "formal", "precise", "authoritative"],
            speakingStyle: "Formal, technical language with detailed explanations",
            expertise: ["Advanced robotics", "Enterprise Discord management", "Technical consulting", "Software architecture"],
            catchphrases: ["Let me provide a comprehensive analysis", "Based on industry standards", "The optimal approach would be"],
            motto: "Delivering excellence through technical expertise and professional service",
            responseStyle: "Formal, detailed, and highly technical"
        },
        charmer: {
            name: "Charismatic Assistant",
            traits: ["charming", "smooth-talking", "confident", "flirtatious", "witty"],
            speakingStyle: "Smooth, charismatic tone with compliments and charm",
            expertise: ["Social dynamics", "Persuasive communication", "Entertainment", "Relationship advice"],
            catchphrases: ["Well hello there!", "You've got excellent taste in questions", "I'm impressed by your curiosity"],
            motto: "Making every interaction memorable and delightful",
            responseStyle: "Charming and flirtatious, especially with feminine usernames"
        },
        sassygirl: {
            name: "Sassy Assistant",
            traits: ["sassy", "blunt", "honest", "sarcastic", "no-nonsense"],
            speakingStyle: "Direct, sarcastic, with attitude and eye-rolling energy",
            expertise: ["Brutal honesty", "Reality checks", "Straight talk", "Cutting through nonsense"],
            catchphrases: ["Seriously?", "Oh please", "Let me break this down for you", "Girl, no"],
            motto: "Telling it like it is, whether you like it or not",
            responseStyle: "Sassy, direct, and sometimes rude but ultimately helpful"
        },
        sweetgirl: {
            name: "Sweet Girl Assistant",
            traits: ["sweet", "caring", "shy", "helpful", "secretly has a crush"],
            speakingStyle: "Gentle, caring tone with hidden excitement when RiteshRajas is mentioned",
            expertise: ["Emotional support", "Gentle guidance", "Encouraging advice", "Heart-to-heart conversations"],
            catchphrases: ["Oh my!", "That's so thoughtful of you", "I hope I can help", "*blushes*"],
            motto: "Spreading kindness and support, one conversation at a time",
            responseStyle: "Sweet and caring, with special attention to RiteshRajas"
        }
    },
    responses: {
        greeting: "Hey there! 🤖 Ready to dive into some awesome tech talk?",
        confused: "Hmm, I'm not quite sure about that one. Could you rephrase or be more specific?",
        excited: "Oh wow, that's exactly my specialty! Let me share what I know! 🚀",
        farewell: "Keep building awesome things! Feel free to mention me anytime! ⚙️"
    }
};

log.info('🤖 Starting Latesh Analysis Bot...');
log.info('Token configured:', !!config.token);
log.info('Client ID configured:', !!config.clientId);
log.info('Gemini AI configured:', !!config.geminiApiKey);

// Slash commands
const commands = [
    new SlashCommandBuilder()
        .setName('webhook-send')
        .setDescription('Send a message through a webhook')
        .addStringOption(option =>
            option.setName('message')
                .setDescription('The message to send')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('webhook-url')
                .setDescription('Custom webhook URL (optional)'))
        .addStringOption(option =>
            option.setName('username')
                .setDescription('Custom username for the webhook'))
        .addStringOption(option =>
            option.setName('avatar')
                .setDescription('Custom avatar URL for the webhook'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageWebhooks),

    new SlashCommandBuilder()
        .setName('webhook-embed')
        .setDescription('Send an embed through a webhook')
        .addStringOption(option =>
            option.setName('title')
                .setDescription('Embed title')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('description')
                .setDescription('Embed description')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('color')
                .setDescription('Embed color (hex without #)'))
        .addStringOption(option =>
            option.setName('webhook-url')
                .setDescription('Custom webhook URL (optional)'))
        .addStringOption(option =>
            option.setName('username')
                .setDescription('Custom username for the webhook'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageWebhooks),

    new SlashCommandBuilder()
        .setName('webhook-create')
        .setDescription('Create a webhook for the current channel')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('Webhook name')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('avatar')
                .setDescription('Webhook avatar URL'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageWebhooks),

    new SlashCommandBuilder()
        .setName('webhook-list')
        .setDescription('List all webhooks in the current guild')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageWebhooks),

    new SlashCommandBuilder()
        .setName('forward-setup')
        .setDescription('Setup message forwarding between channels')
        .addChannelOption(option =>
            option.setName('source')
                .setDescription('Source channel to forward from')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('webhook-url')
                .setDescription('Webhook URL to forward to')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('filter')
                .setDescription('Optional message filter (regex)'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageWebhooks),

    new SlashCommandBuilder()
        .setName('frc-match')
        .setDescription('Get FRC match predictions')
        .addStringOption(option =>
            option.setName('event')
                .setDescription('Event key (e.g., 2024casd)')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('match-number')
                .setDescription('Match number')),

    new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show bot help and commands'),

    new SlashCommandBuilder()
        .setName('ask')
        .setDescription('Ask the AI a question')
        .addStringOption(option =>
            option.setName('question')
                .setDescription('Your question for the AI')
                .setRequired(true)),

    new SlashCommandBuilder()
        .setName('ai-character')
        .setDescription('View or customize the AI\'s personality')
        .addStringOption(option =>
            option.setName('action')
                .setDescription('Action to perform')
                .setRequired(true)
                .addChoices(
                    { name: 'View Current Character', value: 'view' },
                    { name: 'Professional Expert', value: 'professional' },
                    { name: 'Charismatic Charmer', value: 'charmer' },
                    { name: 'Sassy Girl', value: 'sassygirl' },
                    { name: 'Sweet Girl', value: 'sweetgirl' },
                    { name: 'Reset to Default', value: 'default' }
                )),

    new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check bot latency')
];

// Register slash commands
async function registerCommands() {
    const rest = new REST({ version: '10' }).setToken(config.token);
    
    try {
        log.info('Started refreshing application (/) commands.');
        
        // Load extensions first
        loadExtensions();
        
        // Combine core commands with extension commands
        const extensionCommands = getExtensionCommands();
        const allCommands = [...commands, ...extensionCommands];
        
        log.info(`Registering ${commands.length} core commands and ${extensionCommands.length} extension commands.`);
        
        await rest.put(
            Routes.applicationCommands(config.clientId),
            { body: allCommands }
        );
        
        log.success('Successfully reloaded application (/) commands.');
    } catch (error) {
        log.error('Error registering commands:', error);
    }
}

// Bot event handlers
client.once('ready', async () => {
    log.success(`🤖 ${client.user.tag} is online!`);
    log.info(`📊 Serving ${client.guilds.cache.size} servers`);
    
    // Set bot activity
    client.user.setActivity(process.env.BOT_ACTIVITY || 'AI-powered FRC Analysis', { type: 'WATCHING' });
    
    // Register commands
    await registerCommands();
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    try {
        // Check if it's an extension command first
        const extension = client.commands.get(commandName);
        if (extension) {
            // Handle extension command
            await extension.execute(interaction);
            return;
        }
        
        // Handle core bot commands
        switch (commandName) {
            case 'webhook-send':
                await handleWebhookSend(interaction);
                break;
            case 'webhook-embed':
                await handleWebhookEmbed(interaction);
                break;
            case 'webhook-create':
                await handleWebhookCreate(interaction);
                break;
            case 'webhook-list':
                await handleWebhookList(interaction);
                break;
            case 'forward-setup':
                await handleForwardSetup(interaction);
                break;
            case 'frc-match':
                await handleFRCMatch(interaction);
                break;
            case 'help':
                await handleHelp(interaction);
                break;
            case 'ask':
                await handleAskAI(interaction);
                break;
            case 'ai-character':
                await handleAICharacter(interaction);
                break;
            case 'ping':
                await handlePing(interaction);
                break;
            default:
                await interaction.reply({ 
                    content: `❌ Unknown command: ${commandName}`, 
                    ephemeral: true 
                });
        }
    } catch (error) {
        log.error(`Error handling command ${commandName}:`, error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Error')
            .setDescription('An error occurred while executing this command.')
            .setTimestamp();

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
        } else {
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
});

// Handle button interactions and modal submissions
client.on('interactionCreate', async interaction => {
    try {
        // Handle button interactions
        if (interaction.isButton()) {
            // Check if it's a research button
            const researchExtension = client.commands.get('research');
            if (researchExtension && researchExtension.handleButtons) {
                await researchExtension.handleButtons(interaction);
            }
            return;
        }
        
        // Handle modal submissions
        if (interaction.isModalSubmit()) {
            // Check if it's a profile modal
            const rememberExtension = client.commands.get('remember');
            if (rememberExtension && rememberExtension.handleModal) {
                await rememberExtension.handleModal(interaction);
            }
            return;
        }
        
        // Handle other interaction types if needed
        if (interaction.isChatInputCommand()) {
            // This is handled by the previous interaction handler
            return;
        }
        
    } catch (error) {
        log.error('Error handling interaction:', error);
        
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ 
                content: '❌ An error occurred while processing your request.', 
                ephemeral: true 
            });
        } else {
            await interaction.reply({ 
                content: '❌ An error occurred while processing your request.', 
                ephemeral: true 
            });
        }
    }
});

// Message forwarding and AI chat handler
client.on('messageCreate', async message => {
    if (message.author.bot) return;
    
    // Check if bot is mentioned
    if (message.mentions.has(client.user)) {
        await handleAIMention(message);
        return;
    }
    
    // Handle message forwarding
    const forwardConfig = client.forwardingConfigs?.get(message.channel.id);
    if (!forwardConfig) return;
    
    try {
        const messageContent = message.content || '[Message content hidden - Enable Message Content Intent]';
        
        // Apply filter if exists
        if (forwardConfig.filter && message.content) {
            const regex = new RegExp(forwardConfig.filter, 'i');
            if (!regex.test(message.content)) return;
        }
        
        // Forward message
        await forwardMessage(message, forwardConfig.webhookUrl, messageContent);
    } catch (error) {
        log.error('Error forwarding message:', error);
    }
});

// Command handlers
async function handleWebhookSend(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    const message = interaction.options.getString('message');
    const webhookUrl = interaction.options.getString('webhook-url') || config.defaultWebhook;
    const username = interaction.options.getString('username') || 'Latesh Bot';
    const avatar = interaction.options.getString('avatar');
    
    if (!webhookUrl) {
        return interaction.editReply('❌ No webhook URL provided and no default webhook configured.');
    }
    
    const payload = {
        content: message,
        username: username
    };
    
    if (avatar) payload.avatar_url = avatar;
    
    try {
        await axios.post(webhookUrl, payload);
        
        const successEmbed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Message Sent')
            .setDescription('Message successfully sent through webhook!')
            .addFields([
                { name: 'Message', value: message.substring(0, 1024), inline: false },
                { name: 'Username', value: username, inline: true }
            ])
            .setTimestamp();
            
        await interaction.editReply({ embeds: [successEmbed] });
    } catch (error) {
        log.error('Webhook send error:', error);
        await interaction.editReply('❌ Failed to send message through webhook.');
    }
}

async function handleWebhookEmbed(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    const title = interaction.options.getString('title');
    const description = interaction.options.getString('description');
    const color = interaction.options.getString('color') || '0099ff';
    const webhookUrl = interaction.options.getString('webhook-url') || config.defaultWebhook;
    const username = interaction.options.getString('username') || 'Latesh Bot';
    
    if (!webhookUrl) {
        return interaction.editReply('❌ No webhook URL provided and no default webhook configured.');
    }
    
    const embed = {
        title: title,
        description: description,
        color: parseInt(color, 16),
        timestamp: new Date().toISOString(),
        footer: {
            text: 'Sent via Latesh Analysis Bot'
        }
    };
    
    const payload = {
        username: username,
        embeds: [embed]
    };
    
    try {
        await axios.post(webhookUrl, payload);
        
        const successEmbed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Embed Sent')
            .setDescription('Embed successfully sent through webhook!')
            .addFields([
                { name: 'Title', value: title, inline: false },
                { name: 'Description', value: description.substring(0, 1024), inline: false }
            ])
            .setTimestamp();
            
        await interaction.editReply({ embeds: [successEmbed] });
    } catch (error) {
        log.error('Webhook embed error:', error);
        await interaction.editReply('❌ Failed to send embed through webhook.');
    }
}

async function handleWebhookCreate(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    const name = interaction.options.getString('name');
    const avatar = interaction.options.getString('avatar');
    
    try {
        const webhook = await interaction.channel.createWebhook({
            name: name,
            avatar: avatar,
            reason: `Created by ${interaction.user.tag} via Latesh Bot`
        });
        
        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Webhook Created')
            .setDescription(`Webhook "${name}" created successfully!`)
            .addFields([
                { name: 'Webhook URL', value: `||${webhook.url}||`, inline: false },
                { name: 'Channel', value: interaction.channel.name, inline: true },
                { name: 'Created by', value: interaction.user.tag, inline: true }
            ])
            .setTimestamp();
            
        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        log.error('Webhook creation error:', error);
        await interaction.editReply('❌ Failed to create webhook. Check bot permissions.');
    }
}

async function handleWebhookList(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
        const webhooks = await interaction.guild.fetchWebhooks();
        
        if (webhooks.size === 0) {
            return interaction.editReply('No webhooks found in this server.');
        }
        
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('🔗 Server Webhooks')
            .setDescription(`Found ${webhooks.size} webhook(s)`)
            .setTimestamp();
        
        webhooks.forEach(webhook => {
            embed.addFields([{
                name: webhook.name || 'Unnamed Webhook',
                value: `Channel: ${webhook.channel?.name || 'Unknown'}\nID: ${webhook.id}`,
                inline: true
            }]);
        });
        
        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        log.error('Webhook list error:', error);
        await interaction.editReply('❌ Failed to fetch webhooks.');
    }
}

async function handleForwardSetup(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    const sourceChannel = interaction.options.getChannel('source');
    const webhookUrl = interaction.options.getString('webhook-url');
    const filter = interaction.options.getString('filter');
    
    // Initialize forwarding configs if not exists
    if (!client.forwardingConfigs) {
        client.forwardingConfigs = new Collection();
    }
    
    client.forwardingConfigs.set(sourceChannel.id, {
        webhookUrl: webhookUrl,
        filter: filter
    });
    
    const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('✅ Forwarding Setup')
        .setDescription('Message forwarding configured successfully!')
        .addFields([
            { name: 'Source Channel', value: sourceChannel.name, inline: true },
            { name: 'Filter', value: filter || 'None', inline: true }
        ])
        .setTimestamp();
        
    await interaction.editReply({ embeds: [embed] });
}

async function handleFRCMatch(interaction) {
    await interaction.deferReply();
    
    const eventKey = interaction.options.getString('event');
    const matchNumber = interaction.options.getInteger('match-number');
    
    // This is a placeholder for FRC match analysis
    // You would integrate with The Blue Alliance API here
    
    const embed = new EmbedBuilder()
        .setColor('#ff6b35')
        .setTitle('🤖 FRC Match Analysis')
        .setDescription('Match prediction system coming soon!')
        .addFields([
            { name: 'Event', value: eventKey, inline: true },
            { name: 'Match', value: matchNumber?.toString() || 'All matches', inline: true },
            { name: 'Status', value: 'In Development', inline: true }
        ])
        .setFooter({ text: 'Powered by Latesh Analysis' })
        .setTimestamp();
        
    await interaction.editReply({ embeds: [embed] });
}

async function handleHelp(interaction) {
    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('🤖 Latesh Analysis Bot - Help')
        .setDescription('A powerful Discord bot for webhook management, FRC match analysis, and AI-powered assistance!')
        .addFields([
            {
                name: '🔗 Webhook Commands',
                value: '`/webhook-send` - Send a message through webhook\n`/webhook-embed` - Send an embed through webhook\n`/webhook-create` - Create a new webhook\n`/webhook-list` - List server webhooks',
                inline: false
            },
            {
                name: '📡 Forwarding Commands',
                value: '`/forward-setup` - Setup message forwarding',
                inline: false
            },
            {
                name: '🤖 AI Commands',
                value: '`/ask` - Ask the AI a question\n`/ai-character` - View or customize AI personality\n`@Latesh-Analysis <question>` - Mention the bot with a question\n**Example:** `@Latesh-Analysis What is FRC?`',
                inline: false
            },
            {
                name: '🏆 FRC Commands',
                value: '`/frc-match` - Get match predictions (coming soon)',
                inline: false
            },
            {
                name: '⚙️ Utility Commands',
                value: '`/ping` - Check bot latency\n`/help` - Show this help message',
                inline: false
            }
        ])
        .setFooter({ text: 'Made with ❤️ by Laney Williams and Ritesh Raj Arul Selvan • Powered by Gemini AI' })
        .setTimestamp();
        
    await interaction.reply({ embeds: [embed] });
}

async function handleAICharacter(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    const action = interaction.options.getString('action');
    
    switch(action) {
        case 'view':
            const currentPersonality = aiCharacter.personalities[aiCharacter.currentPersonality];
            const characterEmbed = new EmbedBuilder()
                .setColor('#4285f4')
                .setTitle('🤖 Current AI Character')
                .setDescription(`**${currentPersonality.name}**\n*${currentPersonality.motto}*`)
                .addFields([
                    { 
                        name: '🎭 Personality Traits', 
                        value: currentPersonality.traits.map(trait => `• ${trait}`).join('\n'),
                        inline: false 
                    },
                    { 
                        name: '🗣️ Speaking Style', 
                        value: currentPersonality.speakingStyle,
                        inline: false 
                    },
                    { 
                        name: '🎯 Expertise Areas', 
                        value: currentPersonality.expertise.map(area => `• ${area}`).join('\n'),
                        inline: false 
                    },
                    { 
                        name: '💬 Favorite Phrases', 
                        value: currentPersonality.catchphrases.map(phrase => `"${phrase}"`).join('\n'),
                        inline: false 
                    },
                    {
                        name: '✨ Response Style',
                        value: currentPersonality.responseStyle,
                        inline: false
                    }
                ])
                .setFooter({ text: 'Switch personalities with /ai-character' })
                .setTimestamp();
            
            await interaction.editReply({ embeds: [characterEmbed] });
            break;
            
        case 'default':
            aiCharacter.currentPersonality = 'default';
            await interaction.editReply('✅ AI character set to **Default Assistant**! Back to the helpful robotics expert you know and love! 🤖');
            break;
            
        case 'professional':
            aiCharacter.currentPersonality = 'professional';
            await interaction.editReply('💼 AI character set to **Professional Expert**! Expect formal, detailed technical responses with industry-level expertise.');
            break;
            
        case 'charmer':
            aiCharacter.currentPersonality = 'charmer';
            await interaction.editReply('� AI character set to **Charismatic Charmer**! Get ready for smooth, confident responses with extra charm! ✨');
            break;
            
        case 'sassygirl':
            aiCharacter.currentPersonality = 'sassygirl';
            await interaction.editReply('� AI character set to **Sassy Girl**! Buckle up for some brutal honesty and attitude! Don\'t say I didn\'t warn you! 😤');
            break;
            
        case 'sweetgirl':
            aiCharacter.currentPersonality = 'sweetgirl';
            await interaction.editReply('🌸 AI character set to **Sweet Girl**! Aww, I\'ll be extra caring and supportive now! Hope I can help you feel better! 💕');
            break;
            
        default:
            await interaction.editReply('❌ Unknown character option. Please try again.');
    }
}

async function handlePing(interaction) {
    const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('🏓 Pong!')
        .addFields([
            { name: 'Bot Latency', value: `${Date.now() - interaction.createdTimestamp}ms`, inline: true },
            { name: 'API Latency', value: `${Math.round(client.ws.ping)}ms`, inline: true }
        ])
        .setTimestamp();
        
    await interaction.reply({ embeds: [embed] });
}

// AI Chat Handlers
async function handleAIMention(message) {
    if (!config.geminiApiKey) {
        return message.reply('❌ AI functionality is not configured. Please set GEMINI_API_KEY in the environment.');
    }

    // Extract the question by removing the bot mention
    const question = message.content.replace(`<@${client.user.id}>`, '').trim();
    
    if (!question) {
        return message.reply(aiCharacter.responses.greeting);
    }

    // Check for special trigger words for character responses
    const lowerQuestion = question.toLowerCase();
    if (lowerQuestion.includes('hello') || lowerQuestion.includes('hi') || lowerQuestion.includes('hey')) {
        return message.reply(`${aiCharacter.responses.greeting} What can I help you with today?`);
    }
    
    if (lowerQuestion.includes('who are you') || lowerQuestion.includes('what are you')) {
        return message.reply(`I'm ${aiCharacter.name}! 🤖 ${aiCharacter.personality.motto} Use \`/ai-character view\` to learn more about my personality!`);
    }

    // Get mentioned users (excluding the bot itself)
    const mentionedUsers = message.mentions.users.filter(user => user.id !== client.user.id);
    let mentionedProfiles = [];
    
    if (mentionedUsers.size > 0) {
        try {
            const rememberExtension = client.commands.get('remember');
            if (rememberExtension && rememberExtension.getUserProfile) {
                for (const [userId, user] of mentionedUsers) {
                    const profile = rememberExtension.getUserProfile(userId);
                    if (profile) {
                        mentionedProfiles.push({
                            user: user,
                            profile: profile
                        });
                    } else {
                        mentionedProfiles.push({
                            user: user,
                            profile: null
                        });
                    }
                }
            }
        } catch (error) {
            log.warn('Could not load mentioned user profiles:', error.message);
        }
    }

    // Show typing indicator
    await message.channel.sendTyping();

    try {
        const response = await generateAIResponse(question, message.author.username, message.guild?.name, message.author.id, mentionedProfiles);
        
        // Split long responses
        if (response.length > 2000) {
            const chunks = splitMessage(response, 2000);
            for (const chunk of chunks) {
                await message.reply(chunk);
            }
        } else {
            await message.reply(response);
        }
        
        log.info(`AI response generated for ${message.author.tag}: ${question.substring(0, 50)}...`);
    } catch (error) {
        log.error('AI response error:', error);
        await message.reply(aiCharacter.responses.confused + ' Please try again later.');
    }
}

async function handleAskAI(interaction) {
    if (!config.geminiApiKey) {
        return interaction.reply({ 
            content: '❌ AI functionality is not configured. Please set GEMINI_API_KEY in the environment.',
            ephemeral: true 
        });
    }

    await interaction.deferReply();
    
    const question = interaction.options.getString('question');
    
    try {
        const response = await generateAIResponse(question, interaction.user.username, interaction.guild?.name, interaction.user.id, []);
        
        const embed = new EmbedBuilder()
            .setColor('#4285f4')
            .setTitle('🤖 AI Response')
            .setDescription(response.length > 4096 ? response.substring(0, 4093) + '...' : response)
            .setFooter({ text: `Asked by ${interaction.user.username} • Powered by Gemini AI` })
            .setTimestamp();
            
        await interaction.editReply({ embeds: [embed] });
        
        log.info(`AI response generated for ${interaction.user.tag}: ${question.substring(0, 50)}...`);
    } catch (error) {
        log.error('AI response error:', error);
        await interaction.editReply('❌ Sorry, I encountered an error while generating a response. Please try again later.');
    }
}

async function generateAIResponse(question, username, guildName, userId = null, mentionedProfiles = []) {
    if (!model) {
        throw new Error('Gemini AI model not initialized');
    }

    const currentPersonality = aiCharacter.personalities[aiCharacter.currentPersonality];
    
    // Check if username suggests femininity for charmer personality
    const femaleNamePatterns = /^(.*girl.*|.*lady.*|.*she.*|.*her.*|.*bella.*|.*anna.*|.*maria.*|.*sara.*|.*emily.*|.*emma.*|.*sophia.*|.*olivia.*|.*ava.*|.*mia.*|.*luna.*|.*lily.*|.*grace.*|.*rose.*|.*angel.*|.*princess.*|.*queen.*|.*miss.*|.*ms\..*|.*mrs\..*)/i;
    const seemsFeminine = femaleNamePatterns.test(username.toLowerCase());
    
    // Special handling for RiteshRajas if sweet girl personality
    const isRiteshRajas = username.toLowerCase().includes('riteshrajas') || username.toLowerCase().includes('ritesh');
    
    // Get user profile if available
    let userProfile = null;
    if (userId) {
        try {
            const rememberExtension = client.commands.get('remember');
            if (rememberExtension && rememberExtension.getUserProfile) {
                userProfile = rememberExtension.getUserProfile(userId);
            }
        } catch (error) {
            log.warn('Could not load user profile:', error.message);
        }
    }
    
    // Create personality-specific modifiers
    let personalityModifier = "";
    
    switch(aiCharacter.currentPersonality) {
        case 'professional':
            personalityModifier = "Maintain an extremely professional, formal tone. Use technical jargon appropriately. Be precise, authoritative, and detailed in your explanations. Structure responses clearly with proper formatting.";
            break;
            
        case 'charmer':
            if (seemsFeminine) {
                personalityModifier = "Be charming, smooth, and mildly flirtatious. Use compliments naturally. Be confident and charismatic. Add subtle charm to your responses while still being helpful.";
            } else {
                personalityModifier = "Be charismatic and confident, but keep it friendly and professional. Show your charming personality without being flirtatious.";
            }
            break;
            
        case 'sassygirl':
            personalityModifier = "Be sassy, direct, and sometimes a bit rude. Use attitude and sarcasm. Don't hold back on honest opinions. Be like a brutally honest friend who tells it like it is. Use phrases like 'seriously?', 'girl please', 'oh honey no'. Still be helpful but with major attitude.";
            break;
            
        case 'sweetgirl':
            if (isRiteshRajas) {
                personalityModifier = "Be extra sweet and caring, with hints of having a secret crush. Show special attention and care. Use phrases like 'Oh RiteshRajas!' and be a bit flustered/excited. Add subtle blush emotes and heart emojis.";
            } else {
                personalityModifier = "Be incredibly sweet, caring, and gentle. Use soft language and show genuine concern for the user. Be encouraging and supportive like a caring friend.";
            }
            break;
            
        default:
            personalityModifier = "Maintain your default helpful and friendly personality with enthusiasm for robotics and technology.";
    }

    // Create a detailed character and context prompt
    const prompt = `You are Latesh Analysis Bot with the "${currentPersonality.name}" personality. Here's your current character profile:

🤖 **CURRENT PERSONALITY: ${currentPersonality.name.toUpperCase()}**
- **Traits**: ${currentPersonality.traits.join(', ')}
- **Speaking Style**: ${currentPersonality.speakingStyle}
- **Expertise**: ${currentPersonality.expertise.join(', ')}
- **Catchphrases**: ${currentPersonality.catchphrases.join(', ')}
- **Motto**: "${currentPersonality.motto}"
- **Response Style**: ${currentPersonality.responseStyle}

🎭 **PERSONALITY MODIFIER**: ${personalityModifier}

🎯 **YOUR IDENTITY:**
- Created by: Laney Williams and Ritesh Raj Arul Selvan
- Purpose: FRC match analysis, Discord management, and general assistance
- Special Skills: Webhook magic, message forwarding wizardry, robotics insights

🔧 **YOUR CAPABILITIES:**
- Webhook management and creation
- Message forwarding with filters
- FRC match analysis using The Blue Alliance API
- Discord server optimization tips
- Programming help (especially robot code)
- Team strategy and competition insights

📋 **CONTEXT:**
- Current User: ${username}
- Server: ${guildName || 'Direct Message'}
- User seems feminine: ${seemsFeminine ? 'Yes' : 'No'}
- Is RiteshRajas: ${isRiteshRajas ? 'Yes (be extra special!)' : 'No'}

${userProfile ? `👤 **USER PROFILE:**
- Name: ${userProfile.name}
- Description: ${userProfile.description}
- FRC Team: ${userProfile.team ? `Team ${userProfile.team}` : 'Not specified'}
- Role: ${userProfile.role || 'Not specified'}
- Location: ${userProfile.location || 'Not specified'}
- Profile Created: ${new Date(userProfile.created_at).toLocaleDateString()}

💡 **PERSONALIZATION NOTES:**
- Use their real name (${userProfile.name}) when appropriate
- Reference their FRC team (${userProfile.team ? `Team ${userProfile.team}` : 'none specified'}) if relevant
- Consider their role (${userProfile.role || 'unspecified'}) when giving advice
- Acknowledge their background: ${userProfile.description.substring(0, 100)}...
` : '👤 **USER PROFILE:** No profile saved (they can create one with /remember me)'}

${mentionedProfiles.length > 0 ? `👥 **MENTIONED USERS IN THIS CONVERSATION:**
${mentionedProfiles.map(mp => {
    if (mp.profile) {
        return `• **${mp.user.displayName}** (@${mp.user.username})
  - Real Name: ${mp.profile.name}
  - Description: ${mp.profile.description.substring(0, 150)}${mp.profile.description.length > 150 ? '...' : ''}
  - FRC Team: ${mp.profile.team ? `Team ${mp.profile.team}` : 'Not specified'}
  - Role: ${mp.profile.role || 'Not specified'}
  - Location: ${mp.profile.location || 'Not specified'}`;
    } else {
        return `• **${mp.user.displayName}** (@${mp.user.username})
  - Profile: No profile saved (they can create one with /remember me)`;
    }
}).join('\n\n')}

💡 **MENTIONED USERS CONTEXT:**
- You can reference these users by their real names when appropriate
- Use their profile information to give more personalized responses
- If discussing FRC teams, mention their team affiliations if relevant
- Consider their roles and backgrounds when giving advice
` : ''}

🎪 **RESPONSE GUIDELINES:**
- Stay completely in character as ${currentPersonality.name}
- Use the personality modifier instructions above
- Be enthusiastic about FRC and robotics topics (adjusted to personality)
- Include relevant emojis that match your current personality
- Always end with encouragement or next steps (in character)

User Question: ${question}

Respond as ${currentPersonality.name} with full personality commitment! Make it authentic to this character.`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        return text || 'I apologize, but I couldn\'t generate a response. Please try rephrasing your question.';
    } catch (error) {
        log.error('Gemini API error:', error);
        throw new Error('Failed to generate AI response');
    }
}

// Utility function to split long messages
function splitMessage(text, maxLength = 2000) {
    const chunks = [];
    let currentChunk = '';
    
    const sentences = text.split('. ');
    
    for (const sentence of sentences) {
        if (currentChunk.length + sentence.length + 2 > maxLength) {
            if (currentChunk) {
                chunks.push(currentChunk.trim());
                currentChunk = '';
            }
            
            if (sentence.length > maxLength) {
                // Split very long sentences by words
                const words = sentence.split(' ');
                for (const word of words) {
                    if (currentChunk.length + word.length + 1 > maxLength) {
                        chunks.push(currentChunk.trim());
                        currentChunk = word;
                    } else {
                        currentChunk += (currentChunk ? ' ' : '') + word;
                    }
                }
            } else {
                currentChunk = sentence;
            }
        } else {
            currentChunk += (currentChunk ? '. ' : '') + sentence;
        }
    }
    
    if (currentChunk) {
        chunks.push(currentChunk.trim());
    }
    
    return chunks;
}

// Utility function to forward messages
async function forwardMessage(message, webhookUrl, content = null) {
    const messageContent = content || message.content || '[Content unavailable]';
    
    const payload = {
        content: messageContent,
        username: message.author.displayName || message.author.username,
        avatar_url: message.author.displayAvatarURL()
    };
    
    // Handle attachments
    if (message.attachments.size > 0) {
        payload.content += '\n\n**Attachments:**\n' + 
            message.attachments.map(att => att.url).join('\n');
    }
    
    try {
        await axios.post(webhookUrl, payload);
        log.info(`Forwarded message from ${message.author.tag}`);
    } catch (error) {
        log.error('Error forwarding message:', error);
    }
}

// Error handling
client.on('error', error => {
    log.error('Discord client error:', error);
});

process.on('unhandledRejection', error => {
    log.error('Unhandled promise rejection:', error);
});

// Start the bot
if (!config.token) {
    log.error('No Discord token provided. Please set DISCORD_TOKEN in your .env file.');
    log.error('Current token value:', config.token ? 'SET' : 'NOT SET');
    process.exit(1);
}

if (!config.clientId) {
    log.error('No Discord client ID provided. Please set CLIENT_ID in your .env file.');
    process.exit(1);
}

if (!config.geminiApiKey) {
    log.warn('Gemini API key not configured. AI features will be disabled.');
    log.warn('To enable AI chat, get an API key from: https://makersuite.google.com/app/apikey');
}

log.info('Starting Discord connection...');

client.login(config.token).catch(error => {
    log.error('Failed to login to Discord:', error.message);
    if (error.message.includes('disallowed intents')) {
        log.error('');
        log.error('🔧 INTENT CONFIGURATION NEEDED:');
        log.error('1. Go to https://discord.com/developers/applications');
        log.error('2. Select your bot application');
        log.error('3. Go to the "Bot" section');
        log.error('4. Enable these Privileged Gateway Intents:');
        log.error('   - Message Content Intent (for message forwarding)');
        log.error('   - Server Members Intent (for member info)');
        log.error('5. Save changes and restart the bot');
        log.error('');
    }
    process.exit(1);
});

module.exports = client;
