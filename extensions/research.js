const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('research')
        .setDescription('Research an FRC team using The Blue Alliance API')
        .addIntegerOption(option =>
            option.setName('team')
                .setDescription('FRC team number (e.g., 254)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(9999)),

    async execute(interaction) {
        const teamNumber = interaction.options.getInteger('team');
        await interaction.deferReply();

        try {
            // Fetch team basic info
            const teamInfo = await getTeamInfo(teamNumber);
            
            if (!teamInfo) {
                return await interaction.editReply({
                    content: `❌ Team ${teamNumber} not found in The Blue Alliance database.`
                });
            }

            // Create main embed
            const embed = new EmbedBuilder()
                .setColor('#ff6b35')
                .setTitle(`🤖 FRC Team ${teamNumber} - ${teamInfo.nickname || 'Unknown'}`)
                .setDescription(`**${teamInfo.name || 'Team Name Unknown'}**\n${teamInfo.city || 'Unknown'}, ${teamInfo.state_prov || 'Unknown'}, ${teamInfo.country || 'Unknown'}`)
                .addFields([
                    { name: '📅 Rookie Year', value: teamInfo.rookie_year?.toString() || 'Unknown', inline: true },
                    { name: '🌐 Website', value: teamInfo.website || 'Not provided', inline: true },
                    { name: '📊 Status', value: 'Researching...', inline: true }
                ])
                .setFooter({ text: 'Click buttons below for detailed information' })
                .setTimestamp();

            // Create action buttons
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`team_matches_${teamNumber}`)
                        .setLabel('📈 Recent Matches')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId(`team_awards_${teamNumber}`)
                        .setLabel('🏆 Awards')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`team_events_${teamNumber}`)
                        .setLabel('📅 Events')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId(`team_stats_${teamNumber}`)
                        .setLabel('📊 Statistics')
                        .setStyle(ButtonStyle.Danger)
                );

            await interaction.editReply({
                content: `🔍 **Researching Team ${teamNumber} via The Blue Alliance API...**`,
                embeds: [embed],
                components: [row]
            });

            // Store team data for button interactions
            if (!interaction.client.teamData) {
                interaction.client.teamData = new Map();
            }
            interaction.client.teamData.set(teamNumber, teamInfo);

        } catch (error) {
            console.error('Research command error:', error);
            await interaction.editReply({
                content: `❌ Error researching team ${teamNumber}: ${error.message}`
            });
        }
    },

    category: 'frc',
    permissions: [],
    cooldown: 10
};

async function getTeamInfo(teamNumber) {
    try {
        const response = await axios.get(`https://www.thebluealliance.com/api/v3/team/frc${teamNumber}`, {
            headers: {
                'X-TBA-Auth-Key': process.env.TBA_API_KEY
            }
        });
        return response.data;
    } catch (error) {
        if (error.response?.status === 404) {
            return null;
        }
        throw error;
    }
}

async function getTeamMatches(teamNumber, year = new Date().getFullYear()) {
    try {
        const response = await axios.get(`https://www.thebluealliance.com/api/v3/team/frc${teamNumber}/matches/${year}`, {
            headers: {
                'X-TBA-Auth-Key': process.env.TBA_API_KEY
            }
        });
        return response.data.slice(0, 5); // Get last 5 matches
    } catch (error) {
        return [];
    }
}

async function getTeamAwards(teamNumber, year = new Date().getFullYear()) {
    try {
        const response = await axios.get(`https://www.thebluealliance.com/api/v3/team/frc${teamNumber}/awards/${year}`, {
            headers: {
                'X-TBA-Auth-Key': process.env.TBA_API_KEY
            }
        });
        return response.data.slice(0, 10); // Get top 10 awards
    } catch (error) {
        return [];
    }
}

async function getTeamEvents(teamNumber, year = new Date().getFullYear()) {
    try {
        const response = await axios.get(`https://www.thebluealliance.com/api/v3/team/frc${teamNumber}/events/${year}`, {
            headers: {
                'X-TBA-Auth-Key': process.env.TBA_API_KEY
            }
        });
        return response.data.slice(0, 8); // Get up to 8 events
    } catch (error) {
        return [];
    }
}

// Handle button interactions
module.exports.handleButtons = async (interaction) => {
    if (!interaction.isButton()) return;

    const [action, type, teamNumber] = interaction.customId.split('_');
    
    if (action !== 'team') return;

    await interaction.deferReply({ ephemeral: true });

    try {
        switch (type) {
            case 'matches':
                await handleMatchesButton(interaction, teamNumber);
                break;
            case 'awards':
                await handleAwardsButton(interaction, teamNumber);
                break;
            case 'events':
                await handleEventsButton(interaction, teamNumber);
                break;
            case 'stats':
                await handleStatsButton(interaction, teamNumber);
                break;
        }
    } catch (error) {
        console.error('Button interaction error:', error);
        await interaction.editReply({
            content: `❌ Error fetching ${type} data: ${error.message}`
        });
    }
};

async function handleMatchesButton(interaction, teamNumber) {
    const matches = await getTeamMatches(teamNumber);
    
    if (matches.length === 0) {
        return await interaction.editReply({
            content: `❌ No recent matches found for team ${teamNumber} in ${new Date().getFullYear()}.`
        });
    }

    const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle(`📈 Recent Matches - Team ${teamNumber}`)
        .setDescription(`Showing ${matches.length} most recent matches from ${new Date().getFullYear()}`)
        .setTimestamp();

    for (const match of matches) {
        const redTeams = match.alliances?.red?.team_keys?.map(key => key.replace('frc', '')) || [];
        const blueTeams = match.alliances?.blue?.team_keys?.map(key => key.replace('frc', '')) || [];
        const redScore = match.alliances?.red?.score || 0;
        const blueScore = match.alliances?.blue?.score || 0;
        
        const isOnRed = redTeams.includes(teamNumber);
        const isOnBlue = blueTeams.includes(teamNumber);
        const won = (isOnRed && redScore > blueScore) || (isOnBlue && blueScore > redScore);
        
        embed.addFields([{
            name: `${match.comp_level.toUpperCase()} Match ${match.match_number} ${won ? '🏆' : '❌'}`,
            value: `**Red Alliance:** ${redTeams.join(', ')} (${redScore})\n**Blue Alliance:** ${blueTeams.join(', ')} (${blueScore})\n**Event:** ${match.event_key}`,
            inline: false
        }]);
    }

    await interaction.editReply({ embeds: [embed] });
}

async function handleAwardsButton(interaction, teamNumber) {
    const awards = await getTeamAwards(teamNumber);
    
    if (awards.length === 0) {
        return await interaction.editReply({
            content: `❌ No awards found for team ${teamNumber} in ${new Date().getFullYear()}.`
        });
    }

    const embed = new EmbedBuilder()
        .setColor('#ffd700')
        .setTitle(`🏆 Awards - Team ${teamNumber}`)
        .setDescription(`Awards won in ${new Date().getFullYear()}`)
        .setTimestamp();

    for (const award of awards) {
        embed.addFields([{
            name: `${award.name}`,
            value: `**Event:** ${award.event_key}\n**Year:** ${award.year}`,
            inline: true
        }]);
    }

    await interaction.editReply({ embeds: [embed] });
}

async function handleEventsButton(interaction, teamNumber) {
    const events = await getTeamEvents(teamNumber);
    
    if (events.length === 0) {
        return await interaction.editReply({
            content: `❌ No events found for team ${teamNumber} in ${new Date().getFullYear()}.`
        });
    }

    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`📅 Events - Team ${teamNumber}`)
        .setDescription(`Events participated in ${new Date().getFullYear()}`)
        .setTimestamp();

    for (const event of events) {
        const startDate = event.start_date ? new Date(event.start_date).toLocaleDateString() : 'TBD';
        const endDate = event.end_date ? new Date(event.end_date).toLocaleDateString() : 'TBD';
        
        embed.addFields([{
            name: `${event.name}`,
            value: `**Key:** ${event.key}\n**Location:** ${event.city}, ${event.state_prov}\n**Date:** ${startDate} - ${endDate}`,
            inline: true
        }]);
    }

    await interaction.editReply({ embeds: [embed] });
}

async function handleStatsButton(interaction, teamNumber) {
    const teamData = interaction.client.teamData?.get(parseInt(teamNumber));
    
    if (!teamData) {
        return await interaction.editReply({
            content: `❌ Team data not found. Please run /research ${teamNumber} again.`
        });
    }

    const embed = new EmbedBuilder()
        .setColor('#ff6b35')
        .setTitle(`📊 Statistics - Team ${teamNumber}`)
        .setDescription('Comprehensive team statistics and information')
        .addFields([
            { name: '🏢 Team Name', value: teamData.name || 'Unknown', inline: false },
            { name: '🏷️ Nickname', value: teamData.nickname || 'Unknown', inline: true },
            { name: '📅 Rookie Year', value: teamData.rookie_year?.toString() || 'Unknown', inline: true },
            { name: '🌍 Location', value: `${teamData.city || 'Unknown'}, ${teamData.state_prov || 'Unknown'}, ${teamData.country || 'Unknown'}`, inline: false },
            { name: '🌐 Website', value: teamData.website || 'Not provided', inline: true },
            { name: '📧 School Name', value: teamData.school_name || 'Not provided', inline: true },
            { name: '📊 Data Source', value: 'The Blue Alliance API', inline: true },
            { name: '🔄 Last Updated', value: new Date().toLocaleString(), inline: true }
        ])
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}
