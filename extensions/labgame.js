const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, WebhookClient } = require('discord.js');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-04-17" });

// Lab game state storage
const activeGames = new Map();
const gameConversations = new Map();
const gameSettings = new Map();
const gameWebhooks = new Map(); // Store webhooks for cleanup - format: channelId -> Map(participantId -> webhook)

// Load user profiles
function loadUserProfiles() {
    try {
        const profilesPath = path.join(__dirname, '..', 'data', 'user_profiles.json');
        const data = fs.readFileSync(profilesPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading user profiles:', error);
        return {};
    }
}

// Save user profiles with avatar updates
function saveUserProfiles(profiles) {
    try {
        const profilesPath = path.join(__dirname, '..', 'data', 'user_profiles.json');
        fs.writeFileSync(profilesPath, JSON.stringify(profiles, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('Error saving user profiles:', error);
        return false;
    }
}

// Generate AI response based on personality
async function generatePersonalityResponse(userProfile, conversationHistory, currentSetting, gameDescription) {
    // Use last 8 messages for better context, but always include the original topic
    const recentHistory = conversationHistory.slice(-8);
    
    const personality = `
You are ${userProfile.name}. Here's who you are:

${userProfile.description}

Your role: ${userProfile.role}
Location: ${userProfile.location}
Team: ${userProfile.team}

CURRENT TOPIC/SCENARIO: ${gameDescription}
Current setting: ${currentSetting}

CRITICAL INSTRUCTIONS:
- BE AUTHENTIC to your personality description above
- Talk EXACTLY like ${userProfile.name} would based on their personality
- Use their specific speech patterns, interests, and characteristics
- Keep responses SHORT (1-2 sentences max, often just a few words)
- STAY ON TOPIC about: ${gameDescription}
- Use casual language and natural reactions
- Show your real personality traits from the description
- React as the REAL ${userProfile.name} would to this situation
- If conversation drifts, naturally bring it back to the main topic
- Be yourself - use your own way of speaking and reacting

Based on your personality description above, respond naturally as ${userProfile.name} would in this conversation.
`;

    const historyText = recentHistory.map(msg => `${msg.speaker}: ${msg.message}`).join('\n');
    
    try {
        const result = await model.generateContent(`${personality}\n\nRecent conversation:\n${historyText}\n\nRespond as the REAL ${userProfile.name} (SHORT, authentic to your personality, stay on topic):`);
        let response = result.response.text().trim();
        
        // Ensure response isn't too long - if it is, take just the first sentence
        if (response.length > 150) {
            const sentences = response.split(/[.!?]+/);
            response = sentences[0] + (sentences[0].endsWith('.') || sentences[0].endsWith('!') || sentences[0].endsWith('?') ? '' : '.');
        }
        
        return response;
    } catch (error) {
        console.error('Error generating AI response:', error);
        return `*${userProfile.name} is thinking...*`;
    }
}

// Get user avatar URL from Discord or profile data
async function getUserAvatarUrl(userProfile, client) {
    try {
        // First try to get from Discord if user is in the guild
        const user = await client.users.fetch(userProfile.discord_id).catch(() => null);
        if (user && user.displayAvatarURL) {
            return user.displayAvatarURL({ dynamic: true, size: 128 });
        }
    } catch (error) {
        console.log(`Could not fetch Discord avatar for ${userProfile.name}`);
    }
    
    // Check if profile has a custom avatar URL
    if (userProfile.avatar_url) {
        return userProfile.avatar_url;
    }
    
    // Fallback to generated avatar
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile.name)}&background=random&color=fff`;
}

// Ask for profile picture if not available
async function requestProfilePicture(channel, userProfile) {
    const embed = new EmbedBuilder()
        .setColor(0x00AE86)
        .setTitle('📸 Profile Picture Request')
        .setDescription(`**${userProfile.name}** doesn't have a profile picture set.\n\nIf you have a PNG/JPG link for ${userProfile.name}'s profile picture, please reply with the link to make the simulation more realistic!`)
        .setFooter({ text: 'This is optional - the simulation will continue with a generated avatar if no link is provided' });
    
    await channel.send({ embeds: [embed] });
}

// Create or get webhook for specific participant in a channel
async function getParticipantWebhook(channel, participantProfile) {
    try {
        const channelId = channel.id;
        const participantId = participantProfile.discord_id;
        
        console.log(`Getting webhook for ${participantProfile.name}, existing URL: ${participantProfile.webhook_url ? 'YES' : 'NO'}`);
        
        // Initialize channel webhooks map if it doesn't exist
        if (!gameWebhooks.has(channelId)) {
            gameWebhooks.set(channelId, new Map());
        }
        
        const channelWebhooks = gameWebhooks.get(channelId);
        
        // Check if we already have a webhook for this participant in memory
        if (channelWebhooks.has(participantId)) {
            const storedWebhook = channelWebhooks.get(participantId);
            // Just return it - if it doesn't work, we'll catch errors when sending
            console.log(`Reusing webhook from memory for ${participantProfile.name}`);
            return storedWebhook;
        }
        
        // Check if participant has a saved webhook URL in their profile
        if (participantProfile.webhook_url) {
            try {
                // Try to create webhook client from saved URL
                const webhook = new WebhookClient({ url: participantProfile.webhook_url });
                
                // Test if webhook still works by sending a test (this validates it properly)
                // We'll just store it and let the actual message sending handle validation
                
                console.log(`Reusing existing webhook for ${participantProfile.name}`);
                
                // Store webhook for this session
                channelWebhooks.set(participantId, webhook);
                return webhook;
            } catch (error) {
                console.log(`Saved webhook URL for ${participantProfile.name} is invalid, will try to find existing one:`, error.message);
                // Don't immediately null it - try to find existing webhook first
            }
        }
        
        // Try to find existing webhooks in the channel before creating new ones
        try {
            const existingWebhooks = await channel.fetchWebhooks();
            const existingWebhook = existingWebhooks.find(wh => wh.name === participantProfile.name);
            
            if (existingWebhook) {
                console.log(`Found existing webhook for ${participantProfile.name}, reusing it`);
                
                // Update profile with the found webhook URL
                participantProfile.webhook_url = existingWebhook.url;
                participantProfile.updated_at = new Date().toISOString();
                
                // Update the profiles file
                const userProfiles = loadUserProfiles();
                userProfiles[participantId] = participantProfile;
                saveUserProfiles(userProfiles);
                
                // Create WebhookClient and store
                const webhook = new WebhookClient({ url: existingWebhook.url });
                channelWebhooks.set(participantId, webhook);
                return webhook;
            }
        } catch (error) {
            console.log(`Error fetching existing webhooks: ${error.message}`);
        }
        
        // Get avatar URL for the webhook
        const avatarUrl = await getUserAvatarUrl(participantProfile, channel.client);
        
        console.log(`Creating new webhook for ${participantProfile.name}...`);
        
        // Create new webhook for this specific participant with their avatar
        const webhookName = `${participantProfile.name}`;
        const webhook = await channel.createWebhook({
            name: webhookName,
            avatar: avatarUrl,
            reason: `Lab game simulation for ${participantProfile.name}`
        });
        
        console.log(`Successfully created webhook for ${participantProfile.name}: ${webhook.url}`);
        
        // Save webhook URL to participant profile
        participantProfile.webhook_url = webhook.url;
        participantProfile.updated_at = new Date().toISOString();
        
        // Update the profiles file
        const userProfiles = loadUserProfiles();
        userProfiles[participantId] = participantProfile;
        saveUserProfiles(userProfiles);
        
        // Store webhook for this session
        channelWebhooks.set(participantId, webhook);
        return webhook;
    } catch (error) {
        console.error(`Error creating webhook for ${participantProfile.name}:`, error);
        return null;
    }
}

// Setup webhooks for all participants when game starts
async function setupParticipantWebhooks(channel, participants, userProfiles) {
    const webhookPromises = [];
    
    console.log(`Setting up webhooks for ${participants.length} participants...`);
    
    for (const participantId of participants) {
        const profile = userProfiles[participantId];
        if (profile) {
            // Create webhook promise for each participant
            webhookPromises.push(getParticipantWebhook(channel, profile));
        }
    }
    
    // Wait for all webhooks to be created/loaded
    const webhooks = await Promise.all(webhookPromises);
    const successfulWebhooks = webhooks.filter(wh => wh !== null);
    
    console.log(`Successfully set up ${successfulWebhooks.length}/${participants.length} webhooks`);
    return successfulWebhooks.length;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('latesh')
        .setDescription('Start a personality simulation lab game')
        .addSubcommand(subcommand =>
            subcommand
                .setName('start')
                .setDescription('Start a new lab game')
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('Description of the scenario/issue to discuss')
                        .setRequired(true))
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel where the simulation will take place')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('setting')
                .setDescription('Update the current setting/context')
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('Describe what is happening in the current setting')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('pause')
                .setDescription('Pause the current conversation'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('resume')
                .setDescription('Resume the paused conversation'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('prompt')
                .setDescription('Add a prompt to guide the conversation')
                .addStringOption(option =>
                    option.setName('message')
                        .setDescription('A prompt or question to inject into the conversation')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('stop')
                .setDescription('Stop the current lab game'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Check the status of the current lab game'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('restart')
                .setDescription('Restart the conversation with a fresh context reminder'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('cleanup')
                .setDescription('Clean up old webhooks in the current channel'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('avatar')
                .setDescription('Set a profile picture for a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to set the avatar for')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('url')
                        .setDescription('Direct link to the image (PNG/JPG)')
                        .setRequired(true))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const channelId = interaction.channel.id;

        switch (subcommand) {
            case 'start':
                await handleStartGame(interaction, channelId);
                break;
            case 'setting':
                await handleUpdateSetting(interaction, channelId);
                break;
            case 'pause':
                await handlePauseGame(interaction, channelId);
                break;
            case 'resume':
                await handleResumeGame(interaction, channelId);
                break;
            case 'prompt':
                await handlePromptGame(interaction, channelId);
                break;
            case 'restart':
                await handleRestartConversation(interaction, channelId);
                break;
            case 'stop':
                await handleStopGame(interaction, channelId);
                break;
            case 'status':
                await handleGameStatus(interaction, channelId);
                break;
            case 'avatar':
                await handleSetAvatar(interaction);
                break;
            case 'cleanup':
                await handleCleanupWebhooks(interaction);
                break;
        }
    }
};

async function handleStartGame(interaction, channelId) {
    const description = interaction.options.getString('description');
    const targetChannel = interaction.options.getChannel('channel');
    const simulationChannelId = targetChannel ? targetChannel.id : channelId;
    
    if (activeGames.has(simulationChannelId)) {
        return interaction.reply({
            content: `❌ A lab game is already running in ${targetChannel ? targetChannel.toString() : 'this channel'}. Use \`/latesh stop\` to end it first.`,
            ephemeral: true
        });
    }

    const userProfiles = loadUserProfiles();
    
    if (Object.keys(userProfiles).length === 0) {
        return interaction.reply({
            content: '❌ No user profiles found. Please ensure user_profiles.json is properly configured.',
            ephemeral: true
        });
    }

    // Validate channel permissions if different channel is selected
    if (targetChannel) {
        const botMember = interaction.guild.members.cache.get(interaction.client.user.id);
        const permissions = targetChannel.permissionsFor(botMember);
        
        if (!permissions.has(['SendMessages', 'ViewChannel'])) {
            return interaction.reply({
                content: `❌ I don't have permission to send messages in ${targetChannel.toString()}. Please check my permissions.`,
                ephemeral: true
            });
        }
        
        // Check for webhook permissions for better message appearance
        if (!permissions.has('ManageWebhooks')) {
            const embed = new EmbedBuilder()
                .setColor(0xFFD700)
                .setTitle('⚠️ Limited Permissions')
                .setDescription(`I don't have webhook permissions in ${targetChannel.toString()}.\n\nThe simulation will work but messages will be less realistic.\nFor the best experience, please give me "Manage Webhooks" permission.`)
                .setFooter({ text: 'The game will continue in 5 seconds...' });
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }

    // Create role selection menu
    const profileOptions = Object.values(userProfiles).map(profile => ({
        label: profile.name,
        value: profile.discord_id,
        description: `${profile.role} - ${profile.team ? `Team ${profile.team}` : profile.location}`
    })).slice(0, 25); // Discord limit

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`select_participants_${simulationChannelId}`)
        .setPlaceholder('Choose participants for the lab game')
        .setMinValues(2)
        .setMaxValues(Math.min(profileOptions.length, 10))
        .addOptions(profileOptions);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const channelInfo = targetChannel ? `**Simulation Channel:** ${targetChannel.toString()}\n` : '';
    
    const embed = new EmbedBuilder()
        .setColor(0x00AE86)
        .setTitle('🧪 Lab Game Setup')
        .setDescription(`${channelInfo}**Scenario:** ${description}\n\nSelect the participants who will be involved in this conversation simulation.`)
        .setFooter({ text: 'Choose 2-10 participants to simulate' });

    // Store initial game data
    activeGames.set(simulationChannelId, {
        description,
        participants: [],
        started: false,
        creator: interaction.user.id,
        setupChannelId: channelId, // Where the setup is happening
        simulationChannelId: simulationChannelId // Where the simulation will run
    });

    await interaction.reply({
        embeds: [embed],
        components: [row]
    });
}

async function handleUpdateSetting(interaction, channelId) {
    // Find game in current channel or where user is creator
    let gameChannelId = channelId;
    let game = activeGames.get(channelId);
    
    if (!game) {
        // Look for games where this user is the creator
        for (const [id, gameData] of activeGames.entries()) {
            if (gameData.creator === interaction.user.id) {
                gameChannelId = id;
                game = gameData;
                break;
            }
        }
    }
    
    if (!game) {
        return interaction.reply({
            content: '❌ No lab game found. Use `/latesh start` to begin one, or ensure you are the game creator.',
            ephemeral: true
        });
    }

    const newSetting = interaction.options.getString('description');
    gameSettings.set(gameChannelId, newSetting);

    const simulationChannel = interaction.client.channels.cache.get(gameChannelId);
    const channelInfo = simulationChannel && simulationChannel.id !== channelId 
        ? ` for ${simulationChannel.toString()}` 
        : '';

    const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle('🎭 Setting Updated')
        .setDescription(`**New Setting${channelInfo}:** ${newSetting}`)
        .setFooter({ text: 'Participants will now respond based on this new context' });

    await interaction.reply({ embeds: [embed] });

    // Notify participants about the setting change in the simulation channel
    if (game.started && simulationChannel) {
        const settingEmbed = new EmbedBuilder()
            .setColor(0xFFA500)
            .setTitle('📍 Scene Change')
            .setDescription(`*The setting has changed: ${newSetting}*`)
            .setTimestamp();

        await simulationChannel.send({ embeds: [settingEmbed] });
    }
}

async function handleStopGame(interaction, channelId) {
    // Find game in current channel or where user is creator
    let gameChannelId = channelId;
    let game = activeGames.get(channelId);
    
    if (!game) {
        // Look for games where this user is the creator
        for (const [id, gameData] of activeGames.entries()) {
            if (gameData.creator === interaction.user.id) {
                gameChannelId = id;
                game = gameData;
                break;
            }
        }
    }
    
    if (!game) {
        return interaction.reply({
            content: '❌ No lab game found.',
            ephemeral: true
        });
    }
    
    // Only creator or admin can stop the game
    if (game.creator !== interaction.user.id && !interaction.member.permissions.has('ADMINISTRATOR')) {
        return interaction.reply({
            content: '❌ Only the game creator or an administrator can stop the game.',
            ephemeral: true
        });
    }

    const simulationChannel = interaction.client.channels.cache.get(gameChannelId);
    const channelInfo = simulationChannel && simulationChannel.id !== channelId 
        ? ` in ${simulationChannel.toString()}` 
        : '';

    // Clean up webhook references (but don't delete the webhooks since we want to reuse them)
    if (gameWebhooks.has(gameChannelId)) {
        // Just clear our memory references, but keep the actual webhooks for reuse
        gameWebhooks.delete(gameChannelId);
        console.log('Cleared webhook references for channel (webhooks preserved for reuse)');
    }

    // Clean up game data
    activeGames.delete(gameChannelId);
    gameConversations.delete(gameChannelId);
    gameSettings.delete(gameChannelId);

    const embed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('🛑 Lab Game Stopped')
        .setDescription(`The personality simulation${channelInfo} has been ended.`)
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    // Send stop notification to simulation channel if different
    if (simulationChannel && simulationChannel.id !== channelId) {
        const stopEmbed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('🛑 Simulation Ended')
            .setDescription('The lab game has been stopped by the moderator.')
            .setTimestamp();

        await simulationChannel.send({ embeds: [stopEmbed] });
    }
}

async function handleGameStatus(interaction, channelId) {
    // Find game in current channel or where user is creator
    let gameChannelId = channelId;
    let game = activeGames.get(channelId);
    
    if (!game) {
        // Look for games where this user is the creator
        for (const [id, gameData] of activeGames.entries()) {
            if (gameData.creator === interaction.user.id) {
                gameChannelId = id;
                game = gameData;
                break;
            }
        }
    }
    
    if (!game) {
        return interaction.reply({
            content: '❌ No lab game found.',
            ephemeral: true
        });
    }

    const conversation = gameConversations.get(gameChannelId) || [];
    const setting = gameSettings.get(gameChannelId) || 'No specific setting defined';

    const userProfiles = loadUserProfiles();
    const participantNames = game.participants.map(id => userProfiles[id]?.name || 'Unknown').join(', ');

    let statusText = '🟢 Active';
    if (game.paused) {
        statusText = '⏸️ Paused';
    } else if (!game.started) {
        statusText = '🟡 Setup';
    }

    const simulationChannel = interaction.client.channels.cache.get(gameChannelId);
    const channelInfo = simulationChannel && simulationChannel.id !== channelId 
        ? simulationChannel.toString() 
        : 'Current channel';

    const embed = new EmbedBuilder()
        .setColor(0x00AE86)
        .setTitle('📊 Lab Game Status')
        .addFields(
            { name: '📝 Scenario', value: game.description, inline: false },
            { name: '📺 Simulation Channel', value: channelInfo, inline: false },
            { name: '👥 Participants', value: participantNames || 'None selected', inline: false },
            { name: '🎭 Current Setting', value: setting, inline: false },
            { name: '💬 Messages Exchanged', value: conversation.length.toString(), inline: true },
            { name: '🎮 Status', value: statusText, inline: true }
        )
        .setTimestamp();

    // Add controls if game is active
    if (game.started) {
        const controls = [];
        if (game.paused) {
            controls.push('Use `/latesh resume` to continue');
        } else {
            controls.push('Use `/latesh pause` to pause');
        }
        controls.push('Use `/latesh setting` to change context');
        controls.push('Use `/latesh prompt` to add a prompt');
        controls.push('Use `/latesh stop` to end the game');
        
        embed.addFields({ name: '🎛️ Controls', value: controls.join('\n'), inline: false });
    }

    await interaction.reply({ embeds: [embed] });
}

// Event handlers will be registered in the main bot file
const eventHandlers = {
    handleParticipantSelection: async (interaction) => {
        if (!interaction.isStringSelectMenu()) return false;
        if (!interaction.customId.startsWith('select_participants_')) return false;

        const simulationChannelId = interaction.customId.replace('select_participants_', '');
        const game = activeGames.get(simulationChannelId);
        
        if (!game) {
            await interaction.reply({
                content: '❌ Game session expired. Please start a new game.',
                ephemeral: true
            });
            return true;
        }

        const selectedIds = interaction.values;
        const userProfiles = loadUserProfiles();
        
        game.participants = selectedIds;
        game.started = true;
        
        // Initialize conversation history
        gameConversations.set(simulationChannelId, []);
        
        // Create participant list
        const participantList = selectedIds.map(id => {
            const profile = userProfiles[id];
            return `• **${profile.name}** - ${profile.role}`;
        }).join('\n');

        const startButton = new ButtonBuilder()
            .setCustomId(`start_conversation_${simulationChannelId}`)
            .setLabel('🚀 Start Conversation')
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(startButton);

        // Get channel info for display
        const simulationChannel = interaction.client.channels.cache.get(simulationChannelId);
        const channelInfo = simulationChannel && simulationChannel.id !== interaction.channel.id 
            ? `**Simulation Channel:** ${simulationChannel.toString()}\n` 
            : '';

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('✅ Lab Game Ready')
            .setDescription(`${channelInfo}**Scenario:** ${game.description}\n\n**Participants:**\n${participantList}`)
            .setFooter({ text: 'Click the button below to begin the conversation simulation' });

        await interaction.update({
            embeds: [embed],
            components: [row]
        });
        return true;
    },

    handleConversationStart: async (interaction, client) => {
        if (!interaction.isButton()) return false;
        if (!interaction.customId.startsWith('start_conversation_')) return false;

        const simulationChannelId = interaction.customId.replace('start_conversation_', '');
        const game = activeGames.get(simulationChannelId);
        
        if (!game || !game.started) {
            await interaction.reply({
                content: '❌ No active game found.',
                ephemeral: true
            });
            return true;
        }

        const simulationChannel = client.channels.cache.get(simulationChannelId);
        const channelInfo = simulationChannel && simulationChannel.id !== interaction.channel.id 
            ? ` in ${simulationChannel.toString()}` 
            : '';

        await interaction.reply({
            content: `🎬 **Setting up participant webhooks...**\n*This may take a moment for realistic messaging.*`,
            ephemeral: false
        });

        // Setup webhooks for all participants
        const userProfiles = loadUserProfiles();
        if (simulationChannel) {
            const webhookCount = await setupParticipantWebhooks(simulationChannel, game.participants, userProfiles);
            
            // Update the message to show completion
            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ Webhooks Ready')
                .setDescription(`Successfully set up ${webhookCount} participant webhooks${channelInfo}.\n*Conversation simulation starting...*`)
                .setFooter({ text: 'Messages will appear as real users' });

            await interaction.editReply({ embeds: [embed] });
        }

        // Start the conversation simulation after a brief delay
        setTimeout(() => {
            simulateConversation(simulationChannelId, client);
        }, 2000);
        
        return true;
    },

    // Handle messages for profile picture capturing
    handleMessage: async (message, client) => {
        // Skip bot messages
        if (message.author.bot) return false;
        
        // Check if message contains image URLs
        const imageUrlRegex = /https?:\/\/.+\.(png|jpg|jpeg|gif|webp)(\?.*)?/gi;
        const urls = message.content.match(imageUrlRegex);
        
        if (!urls) return false;
        
        // Check if there are any active games in this channel
        const game = activeGames.get(message.channel.id);
        if (!game) return false;
        
        // Load profiles to check if we need avatars
        const userProfiles = loadUserProfiles();
        const missingAvatarProfiles = game.participants
            .map(id => userProfiles[id])
            .filter(profile => profile && !profile.avatar_url);
        
        if (missingAvatarProfiles.length === 0) return false;
        
        // If there's only one missing avatar, assume this URL is for them
        if (missingAvatarProfiles.length === 1) {
            const profile = missingAvatarProfiles[0];
            profile.avatar_url = urls[0];
            profile.updated_at = new Date().toISOString();
            
            if (saveUserProfiles(userProfiles)) {
                const embed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle('✅ Profile Picture Set')
                    .setDescription(`Automatically set profile picture for **${profile.name}**`)
                    .setThumbnail(urls[0])
                    .setFooter({ text: 'This will be used in the simulation' });
                
                await message.react('✅');
                await message.channel.send({ embeds: [embed] });
                return true;
            }
        } else {
            // Multiple missing avatars - ask user to specify
            const profileNames = missingAvatarProfiles.map(p => p.name).join(', ');
            const embed = new EmbedBuilder()
                .setColor(0xFFD700)
                .setTitle('📸 Multiple Profiles Need Pictures')
                .setDescription(`Found an image URL, but multiple participants need profile pictures: **${profileNames}**\n\nPlease use \`/latesh avatar @user <url>\` to specify which person this picture is for.`)
                .setFooter({ text: 'You can also mention the person\'s name with the URL' });
            
            await message.channel.send({ embeds: [embed] });
            return true;
        }
        
        return false;
    }
};

async function simulateConversation(channelId, client) {
    const game = activeGames.get(channelId);
    const userProfiles = loadUserProfiles();
    const conversation = gameConversations.get(channelId);
    const setting = gameSettings.get(channelId) || 'General discussion environment';
    
    // Get the simulation channel
    const channel = client.channels.cache.get(channelId);
    if (!channel) return;
    
    // Check for missing profile pictures and request them
    const missingAvatars = [];
    for (const participantId of game.participants) {
        const profile = userProfiles[participantId];
        if (!profile) continue;
        
        const avatarUrl = await getUserAvatarUrl(profile, client);
        if (avatarUrl.includes('ui-avatars.com') && !profile.avatar_url) {
            missingAvatars.push(profile);
        }
    }
    
    // Request missing profile pictures
    if (missingAvatars.length > 0) {
        for (const profile of missingAvatars) {
            await requestProfilePicture(channel, profile);
        }
        
        // Give some time for users to respond with profile pictures
        await new Promise(resolve => setTimeout(resolve, 10000));
    }
    
    // Initial delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    let messageCount = 0;
    const maxMessages = 50; // Allow more messages since they're shorter now
    
    while (activeGames.has(channelId) && !game.paused && messageCount < maxMessages) {
        // Check if game still exists and isn't paused
        const currentGame = activeGames.get(channelId);
        if (!currentGame || currentGame.paused) {
            break;
        }
        
        // Randomly select a participant to speak
        const speakerId = game.participants[Math.floor(Math.random() * game.participants.length)];
        const speaker = userProfiles[speakerId];
        
        if (!speaker) continue;
        
        // Generate response
        const response = await generatePersonalityResponse(speaker, conversation, setting, game.description);
        
        // Check if we should add a topic reminder (every 10-15 messages)
        if (messageCount > 0 && messageCount % 12 === 0) {
            conversation.push({
                speaker: 'System',
                message: `*Remember: ${game.description}*`,
                timestamp: new Date(),
                isReminder: true
            });
        }
        
        // Add to conversation history
        conversation.push({
            speaker: speaker.name,
            message: response,
            timestamp: new Date()
        });
        
        // Get avatar URL for this speaker
        const avatarUrl = await getUserAvatarUrl(speaker, client);
        
        // Send message as a realistic human-like message using participant-specific webhook
        if (channel) {
            try {
                // Get or create a webhook specifically for this participant
                const webhook = await getParticipantWebhook(channel, speaker);
                
                if (webhook) {
                    // Use participant-specific webhook for the most human-like appearance
                    await webhook.send({
                        content: response,
                        username: speaker.name,
                        avatarURL: avatarUrl,
                        allowedMentions: { parse: [] } // Prevent unwanted mentions
                    });
                } else {
                    // Fallback to regular message if webhook creation fails
                    await channel.send(`**${speaker.name}:** ${response}`);
                }
            } catch (error) {
                console.error('Error sending message:', error);
                // Final fallback - simple message
                try {
                    await channel.send(`${speaker.name}: ${response}`);
                } catch (fallbackError) {
                    console.error('Failed to send fallback message:', fallbackError);
                }
            }
        }
        
        messageCount++;
        
        // Shorter random delay between messages (1-4 seconds) for more natural chat flow
        const delay = Math.random() * 3000 + 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Check again if game is paused after delay
        const gameCheck = activeGames.get(channelId);
        if (!gameCheck || gameCheck.paused) {
            break;
        }
    }
    
    // End conversation only if not paused
    if (activeGames.has(channelId) && !activeGames.get(channelId).paused) {
        const channel = client.channels.cache.get(channelId);
        if (channel) {
            const endEmbed = new EmbedBuilder()
                .setColor(0xFF9900)
                .setTitle('🎬 Conversation Simulation Complete')
                .setDescription('The personality simulation has reached its natural conclusion.')
                .setFooter({ text: 'Use /latesh setting to change context or /latesh stop to end the game' });
            
            await channel.send({ embeds: [endEmbed] });
        }
    }
}

async function handlePauseGame(interaction, channelId) {
    // Find game in current channel or where user is creator
    let gameChannelId = channelId;
    let game = activeGames.get(channelId);
    
    if (!game) {
        // Look for games where this user is the creator
        for (const [id, gameData] of activeGames.entries()) {
            if (gameData.creator === interaction.user.id) {
                gameChannelId = id;
                game = gameData;
                break;
            }
        }
    }
    
    if (!game) {
        return interaction.reply({
            content: '❌ No lab game found. Use `/latesh start` to begin one, or ensure you are the game creator.',
            ephemeral: true
        });
    }

    game.paused = true;

    const simulationChannel = interaction.client.channels.cache.get(gameChannelId);
    const channelInfo = simulationChannel && simulationChannel.id !== channelId 
        ? ` in ${simulationChannel.toString()}` 
        : '';

    const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle('⏸️ Game Paused')
        .setDescription(`The conversation simulation${channelInfo} has been paused.`)
        .setFooter({ text: 'Use /latesh resume to continue the conversation' });

    await interaction.reply({ embeds: [embed] });
}

async function handleResumeGame(interaction, channelId) {
    // Find game in current channel or where user is creator
    let gameChannelId = channelId;
    let game = activeGames.get(channelId);
    
    if (!game) {
        // Look for games where this user is the creator
        for (const [id, gameData] of activeGames.entries()) {
            if (gameData.creator === interaction.user.id) {
                gameChannelId = id;
                game = gameData;
                break;
            }
        }
    }
    
    if (!game) {
        return interaction.reply({
            content: '❌ No lab game found. Use `/latesh start` to begin one, or ensure you are the game creator.',
            ephemeral: true
        });
    }
    
    if (!game.paused) {
        return interaction.reply({
            content: '❌ The game is not paused.',
            ephemeral: true
        });
    }

    game.paused = false;

    const simulationChannel = interaction.client.channels.cache.get(gameChannelId);
    const channelInfo = simulationChannel && simulationChannel.id !== channelId 
        ? ` in ${simulationChannel.toString()}` 
        : '';

    const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('▶️ Game Resumed')
        .setDescription(`The conversation simulation${channelInfo} has been resumed.`)
        .setFooter({ text: 'The conversation will continue shortly' });

    await interaction.reply({ embeds: [embed] });

    // Resume conversation after a short delay
    setTimeout(() => {
        if (activeGames.has(gameChannelId) && !activeGames.get(gameChannelId).paused) {
            simulateConversation(gameChannelId, interaction.client);
        }
    }, 3000);
}

async function handlePromptGame(interaction, channelId) {
    // Find game in current channel or where user is creator
    let gameChannelId = channelId;
    let game = activeGames.get(channelId);
    
    if (!game) {
        // Look for games where this user is the creator
        for (const [id, gameData] of activeGames.entries()) {
            if (gameData.creator === interaction.user.id) {
                gameChannelId = id;
                game = gameData;
                break;
            }
        }
    }
    
    if (!game) {
        return interaction.reply({
            content: '❌ No lab game found. Use `/latesh start` to begin one, or ensure you are the game creator.',
            ephemeral: true
        });
    }

    const message = interaction.options.getString('message');
    const conversation = gameConversations.get(gameChannelId);
    
    // Add the prompt to conversation history
    conversation.push({
        speaker: 'Moderator',
        message: message,
        timestamp: new Date(),
        isPrompt: true
    });

    const simulationChannel = interaction.client.channels.cache.get(gameChannelId);
    const channelInfo = simulationChannel && simulationChannel.id !== channelId 
        ? ` to ${simulationChannel.toString()}` 
        : '';

    const embed = new EmbedBuilder()
        .setColor(0x9932CC)
        .setTitle('💭 Conversation Prompt')
        .setDescription(message)
        .setFooter({ text: `Participants will respond to this prompt${channelInfo}` });

    await interaction.reply({ embeds: [embed] });

    // Send the prompt to the simulation channel if different
    if (simulationChannel && simulationChannel.id !== channelId) {
        const promptEmbed = new EmbedBuilder()
            .setColor(0x9932CC)
            .setTitle('💭 Moderator Prompt')
            .setDescription(message)
            .setTimestamp();

        await simulationChannel.send({ embeds: [promptEmbed] });
    }
}

async function handleRestartConversation(interaction, channelId) {
    // Find game in current channel or where user is creator
    let gameChannelId = channelId;
    let game = activeGames.get(channelId);
    
    if (!game) {
        // Look for games where this user is the creator
        for (const [id, gameData] of activeGames.entries()) {
            if (gameData.creator === interaction.user.id) {
                gameChannelId = id;
                game = gameData;
                break;
            }
        }
    }
    
    if (!game) {
        return interaction.reply({
            content: '❌ No lab game found. Use `/latesh start` to begin one, or ensure you are the game creator.',
            ephemeral: true
        });
    }

    // Clear recent conversation but keep some context
    const conversation = gameConversations.get(gameChannelId);
    const recentMessages = conversation.slice(-3); // Keep last 3 messages
    
    // Add a context reminder
    const contextReminder = {
        speaker: 'Moderator',
        message: `Let's get back to the main topic: ${game.description}`,
        timestamp: new Date(),
        isPrompt: true
    };
    
    // Reset conversation with context
    gameConversations.set(gameChannelId, [contextReminder, ...recentMessages]);

    const simulationChannel = interaction.client.channels.cache.get(gameChannelId);
    const channelInfo = simulationChannel && simulationChannel.id !== channelId 
        ? ` in ${simulationChannel.toString()}` 
        : '';

    const embed = new EmbedBuilder()
        .setColor(0x00BFFF)
        .setTitle('🔄 Conversation Restarted')
        .setDescription(`Refocusing the discussion${channelInfo} on: **${game.description}**`)
        .setFooter({ text: 'Participants will now get back on topic' });

    await interaction.reply({ embeds: [embed] });

    // Send restart message to simulation channel if different
    if (simulationChannel && simulationChannel.id !== channelId) {
        const restartEmbed = new EmbedBuilder()
            .setColor(0x00BFFF)
            .setTitle('🔄 Back to Topic')
            .setDescription(`**Let's refocus on:** ${game.description}`)
            .setTimestamp();

        await simulationChannel.send({ embeds: [restartEmbed] });
    }

    // Continue conversation after a brief pause
    setTimeout(() => {
        if (activeGames.has(gameChannelId) && !activeGames.get(gameChannelId).paused) {
            simulateConversation(gameChannelId, interaction.client);
        }
    }, 2000);
}

// Export event handlers for use in main bot file
module.exports.eventHandlers = eventHandlers;

async function handleCleanupWebhooks(interaction) {
    try {
        await interaction.deferReply({ ephemeral: true });
        
        const channel = interaction.channel;
        const webhooks = await channel.fetchWebhooks();
        
        // Find lab game webhooks (they don't have "Lab Game" in the name anymore, but they're from our bot)
        const labGameWebhooks = webhooks.filter(wh => wh.owner.id === interaction.client.user.id);
        
        if (labGameWebhooks.size === 0) {
            return interaction.editReply('❌ No lab game webhooks found in this channel.');
        }
        
        // Delete all lab game webhooks
        let deletedCount = 0;
        for (const webhook of labGameWebhooks.values()) {
            try {
                await webhook.delete('Lab game webhook cleanup');
                deletedCount++;
            } catch (error) {
                console.error(`Failed to delete webhook ${webhook.name}:`, error);
            }
        }
        
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('🧹 Webhook Cleanup Complete')
            .setDescription(`Successfully deleted ${deletedCount} lab game webhooks from this channel.`)
            .setFooter({ text: 'New webhooks will be created as needed for future games' });
        
        await interaction.editReply({ embeds: [embed] });
        
    } catch (error) {
        console.error('Error during webhook cleanup:', error);
        await interaction.editReply('❌ Error occurred during cleanup. Check bot permissions.');
    }
}
