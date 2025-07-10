const { SlashCommandBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const PROFILES_FILE = path.join(__dirname, '..', 'data', 'user_profiles.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remember')
        .setDescription('Create or update your personal profile')
        .addSubcommand(subcommand =>
            subcommand
                .setName('me')
                .setDescription('Create/update your personal profile'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View a user\'s profile')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to view profile of')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all saved profiles'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Delete your profile')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        // Ensure data directory exists
        ensureDataDirectory();

        switch (subcommand) {
            case 'me':
                await handleCreateProfile(interaction);
                break;
            case 'view':
                await handleViewProfile(interaction);
                break;
            case 'list':
                await handleListProfiles(interaction);
                break;
            case 'delete':
                await handleDeleteProfile(interaction);
                break;
        }
    },

    category: 'profile',
    permissions: [],
    cooldown: 5
};

function ensureDataDirectory() {
    const dataDir = path.dirname(PROFILES_FILE);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    
    if (!fs.existsSync(PROFILES_FILE)) {
        fs.writeFileSync(PROFILES_FILE, JSON.stringify({}));
    }
}

function loadProfiles() {
    try {
        const data = fs.readFileSync(PROFILES_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return {};
    }
}

function saveProfiles(profiles) {
    fs.writeFileSync(PROFILES_FILE, JSON.stringify(profiles, null, 2));
}

async function handleCreateProfile(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('profile_modal')
        .setTitle('Create Your Personal Profile');

    const nameInput = new TextInputBuilder()
        .setCustomId('profile_name')
        .setLabel('Your Name')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Enter your real name or preferred name')
        .setRequired(true)
        .setMaxLength(50);

    const descriptionInput = new TextInputBuilder()
        .setCustomId('profile_description')
        .setLabel('About You')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Tell us about yourself, your interests, your role in FRC, etc.')
        .setRequired(true)
        .setMaxLength(1000);

    const teamInput = new TextInputBuilder()
        .setCustomId('profile_team')
        .setLabel('FRC Team Number (Optional)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g., 254')
        .setRequired(false)
        .setMaxLength(4);

    const roleInput = new TextInputBuilder()
        .setCustomId('profile_role')
        .setLabel('Role/Position (Optional)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g., Mentor, Student, Alumni, Parent')
        .setRequired(false)
        .setMaxLength(50);

    const locationInput = new TextInputBuilder()
        .setCustomId('profile_location')
        .setLabel('Location (Optional)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g., California, USA')
        .setRequired(false)
        .setMaxLength(100);

    const firstActionRow = new ActionRowBuilder().addComponents(nameInput);
    const secondActionRow = new ActionRowBuilder().addComponents(descriptionInput);
    const thirdActionRow = new ActionRowBuilder().addComponents(teamInput);
    const fourthActionRow = new ActionRowBuilder().addComponents(roleInput);
    const fifthActionRow = new ActionRowBuilder().addComponents(locationInput);

    modal.addComponents(firstActionRow, secondActionRow, thirdActionRow, fourthActionRow, fifthActionRow);

    await interaction.showModal(modal);
}

async function handleViewProfile(interaction) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const profiles = loadProfiles();
    const profile = profiles[targetUser.id];

    if (!profile) {
        return await interaction.reply({
            content: `❌ ${targetUser.id === interaction.user.id ? 'You don\'t' : `${targetUser.displayName} doesn't`} have a profile saved. Use \`/remember me\` to create one!`,
            ephemeral: true
        });
    }

    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`👤 Profile: ${profile.name}`)
        .setDescription(profile.description)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields([
            { name: '🆔 Discord User', value: `${targetUser.displayName} (${targetUser.username})`, inline: true },
            { name: '📅 Profile Created', value: new Date(profile.created_at).toLocaleDateString(), inline: true },
            { name: '🔄 Last Updated', value: new Date(profile.updated_at).toLocaleDateString(), inline: true }
        ])
        .setTimestamp();

    if (profile.team) {
        embed.addFields([{ name: '🤖 FRC Team', value: `Team ${profile.team}`, inline: true }]);
    }

    if (profile.role) {
        embed.addFields([{ name: '🏷️ Role', value: profile.role, inline: true }]);
    }

    if (profile.location) {
        embed.addFields([{ name: '📍 Location', value: profile.location, inline: true }]);
    }

    await interaction.reply({ embeds: [embed] });
}

async function handleListProfiles(interaction) {
    const profiles = loadProfiles();
    const profileEntries = Object.entries(profiles);

    if (profileEntries.length === 0) {
        return await interaction.reply({
            content: '❌ No profiles have been saved yet. Use `/remember me` to create the first one!',
            ephemeral: true
        });
    }

    const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('📋 Saved User Profiles')
        .setDescription(`Found ${profileEntries.length} saved profile(s)`)
        .setTimestamp();

    for (const [userId, profile] of profileEntries.slice(0, 10)) { // Show up to 10 profiles
        try {
            const user = await interaction.client.users.fetch(userId);
            embed.addFields([{
                name: `${profile.name}`,
                value: `**Discord:** ${user.displayName}\n**Role:** ${profile.role || 'Not specified'}\n**Team:** ${profile.team ? `Team ${profile.team}` : 'Not specified'}`,
                inline: true
            }]);
        } catch (error) {
            embed.addFields([{
                name: `${profile.name}`,
                value: `**Discord:** Unknown User\n**Role:** ${profile.role || 'Not specified'}\n**Team:** ${profile.team ? `Team ${profile.team}` : 'Not specified'}`,
                inline: true
            }]);
        }
    }

    if (profileEntries.length > 10) {
        embed.setFooter({ text: `... and ${profileEntries.length - 10} more profiles` });
    }

    await interaction.reply({ embeds: [embed] });
}

async function handleDeleteProfile(interaction) {
    const profiles = loadProfiles();
    
    if (!profiles[interaction.user.id]) {
        return await interaction.reply({
            content: '❌ You don\'t have a profile to delete.',
            ephemeral: true
        });
    }

    delete profiles[interaction.user.id];
    saveProfiles(profiles);

    await interaction.reply({
        content: '✅ Your profile has been deleted successfully.',
        ephemeral: true
    });
}

// Handle modal submission
module.exports.handleModal = async (interaction) => {
    if (!interaction.isModalSubmit() || interaction.customId !== 'profile_modal') return;

    const name = interaction.fields.getTextInputValue('profile_name');
    const description = interaction.fields.getTextInputValue('profile_description');
    const team = interaction.fields.getTextInputValue('profile_team') || null;
    const role = interaction.fields.getTextInputValue('profile_role') || null;
    const location = interaction.fields.getTextInputValue('profile_location') || null;

    const profiles = loadProfiles();
    const isUpdate = !!profiles[interaction.user.id];

    const profile = {
        name: name.trim(),
        description: description.trim(),
        team: team ? team.trim() : null,
        role: role ? role.trim() : null,
        location: location ? location.trim() : null,
        discord_id: interaction.user.id,
        discord_username: interaction.user.username,
        discord_display_name: interaction.user.displayName,
        created_at: profiles[interaction.user.id]?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    profiles[interaction.user.id] = profile;
    saveProfiles(profiles);

    const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle(`✅ Profile ${isUpdate ? 'Updated' : 'Created'} Successfully!`)
        .setDescription(`Your profile has been ${isUpdate ? 'updated' : 'saved'} and can now be used by the AI system for personalized responses.`)
        .addFields([
            { name: '👤 Name', value: profile.name, inline: true },
            { name: '📝 Description', value: profile.description.substring(0, 100) + (profile.description.length > 100 ? '...' : ''), inline: false }
        ])
        .setTimestamp();

    if (profile.team) {
        embed.addFields([{ name: '🤖 FRC Team', value: `Team ${profile.team}`, inline: true }]);
    }

    if (profile.role) {
        embed.addFields([{ name: '🏷️ Role', value: profile.role, inline: true }]);
    }

    if (profile.location) {
        embed.addFields([{ name: '📍 Location', value: profile.location, inline: true }]);
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
};

// Export function to get user profile (for AI integration)
module.exports.getUserProfile = (userId) => {
    const profiles = loadProfiles();
    return profiles[userId] || null;
};

// Export function to get all profiles (for AI integration)
module.exports.getAllProfiles = () => {
    return loadProfiles();
};
