const { SlashCommandBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, GuildScheduledEventPrivacyLevel, GuildScheduledEventEntityType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('event')
        .setDescription('Create and manage Discord events')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a new Discord event')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Type of event')
                        .setRequired(true)
                        .addChoices(
                            { name: '🤖 Team Meeting', value: 'meeting' },
                            { name: '🏆 Competition', value: 'competition' },
                            { name: '🔧 Build Session', value: 'build' },
                            { name: '📚 Training/Workshop', value: 'training' },
                            { name: '🎉 Social Event', value: 'social' },
                            { name: '📋 Outreach', value: 'outreach' },
                            { name: '⚙️ Custom Event', value: 'custom' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List upcoming events'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('templates')
                .setDescription('Show event templates')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'create':
                await handleCreateEvent(interaction);
                break;
            case 'list':
                await handleListEvents(interaction);
                break;
            case 'templates':
                await handleShowTemplates(interaction);
                break;
        }
    },

    category: 'events',
    permissions: ['ManageEvents'],
    cooldown: 10
};

async function handleCreateEvent(interaction) {
    const eventType = interaction.options.getString('type');
    
    // Create a modal for event details
    const modal = new ModalBuilder()
        .setCustomId(`event_modal_${eventType}`)
        .setTitle(`Create ${getEventTypeName(eventType)}`);

    const nameInput = new TextInputBuilder()
        .setCustomId('event_name')
        .setLabel('Event Name')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder(getEventPlaceholder(eventType, 'name'))
        .setRequired(true)
        .setMaxLength(100);

    const descriptionInput = new TextInputBuilder()
        .setCustomId('event_description')
        .setLabel('Event Description')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder(getEventPlaceholder(eventType, 'description'))
        .setRequired(true)
        .setMaxLength(1000);

    const dateInput = new TextInputBuilder()
        .setCustomId('event_date')
        .setLabel('Date and Time')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('YYYY-MM-DD HH:MM (24-hour format, e.g., 2025-01-15 14:30)')
        .setRequired(true)
        .setMaxLength(50);

    const durationInput = new TextInputBuilder()
        .setCustomId('event_duration')
        .setLabel('Duration (in hours)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g., 2 or 1.5')
        .setRequired(true)
        .setMaxLength(10);

    const locationInput = new TextInputBuilder()
        .setCustomId('event_location')
        .setLabel('Location (optional)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g., Team Workshop, Competition Venue, Online')
        .setRequired(false)
        .setMaxLength(100);

    const firstActionRow = new ActionRowBuilder().addComponents(nameInput);
    const secondActionRow = new ActionRowBuilder().addComponents(descriptionInput);
    const thirdActionRow = new ActionRowBuilder().addComponents(dateInput);
    const fourthActionRow = new ActionRowBuilder().addComponents(durationInput);
    const fifthActionRow = new ActionRowBuilder().addComponents(locationInput);

    modal.addComponents(firstActionRow, secondActionRow, thirdActionRow, fourthActionRow, fifthActionRow);

    await interaction.showModal(modal);
}

async function handleListEvents(interaction) {
    await interaction.deferReply();

    try {
        const events = await interaction.guild.scheduledEvents.fetch();
        
        if (events.size === 0) {
            return await interaction.editReply({
                content: '📅 No upcoming events found. Use `/event create` to create one!'
            });
        }

        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('📅 Upcoming Discord Events')
            .setDescription(`Found ${events.size} upcoming event(s)`)
            .setTimestamp();

        const sortedEvents = events.sort((a, b) => a.scheduledStartAt - b.scheduledStartAt);

        sortedEvents.forEach(event => {
            const startTime = `<t:${Math.floor(event.scheduledStartAt.getTime() / 1000)}:F>`;
            const relativeTime = `<t:${Math.floor(event.scheduledStartAt.getTime() / 1000)}:R>`;
            
            embed.addFields([{
                name: `${getEventEmoji(event.name)} ${event.name}`,
                value: `**When:** ${startTime} (${relativeTime})\n**Location:** ${event.entityMetadata?.location || 'Not specified'}\n**Interested:** ${event.userCount || 0} users`,
                inline: false
            }]);
        });

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Error fetching events:', error);
        await interaction.editReply({
            content: '❌ Error fetching events. Make sure the bot has permission to view events.'
        });
    }
}

async function handleShowTemplates(interaction) {
    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('📋 Event Templates')
        .setDescription('Quick templates for common FRC events. Use `/event create` and select a type!')
        .addFields([
            {
                name: '🤖 Team Meeting',
                value: 'Regular team meetings, planning sessions, and status updates',
                inline: true
            },
            {
                name: '🏆 Competition',
                value: 'FRC competitions, scrimmages, and tournaments',
                inline: true
            },
            {
                name: '🔧 Build Session',
                value: 'Robot building, prototyping, and hands-on work sessions',
                inline: true
            },
            {
                name: '📚 Training/Workshop',
                value: 'Skill development, technical training, and learning sessions',
                inline: true
            },
            {
                name: '🎉 Social Event',
                value: 'Team bonding, celebrations, and social activities',
                inline: true
            },
            {
                name: '📋 Outreach',
                value: 'Community outreach, demos, and public events',
                inline: true
            }
        ])
        .setFooter({ text: 'Each template provides suggested content for faster event creation' })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

// Handle modal submission for event creation
module.exports.handleModal = async (interaction) => {
    if (!interaction.isModalSubmit() || !interaction.customId.startsWith('event_modal_')) return;

    await interaction.deferReply({ ephemeral: true });

    const eventType = interaction.customId.split('_')[2];
    const name = interaction.fields.getTextInputValue('event_name');
    const description = interaction.fields.getTextInputValue('event_description');
    const dateStr = interaction.fields.getTextInputValue('event_date');
    const durationStr = interaction.fields.getTextInputValue('event_duration');
    const location = interaction.fields.getTextInputValue('event_location') || null;

    try {
        // Parse date and time
        const eventDate = parseDateTime(dateStr);
        if (!eventDate) {
            return await interaction.editReply({
                content: '❌ Invalid date format. Please use YYYY-MM-DD HH:MM (e.g., 2025-01-15 14:30)'
            });
        }

        // Parse duration
        const duration = parseFloat(durationStr);
        if (isNaN(duration) || duration <= 0 || duration > 24) {
            return await interaction.editReply({
                content: '❌ Invalid duration. Please enter a number between 0.1 and 24 hours.'
            });
        }

        // Calculate end time
        const endDate = new Date(eventDate.getTime() + (duration * 60 * 60 * 1000));

        // Check if date is in the future
        if (eventDate <= new Date()) {
            return await interaction.editReply({
                content: '❌ Event date must be in the future.'
            });
        }

        // Create the Discord event
        const eventOptions = {
            name: `${getEventTypeEmoji(eventType)} ${name}`,
            description: `${description}\n\n📋 Event Type: ${getEventTypeName(eventType)}\n⏱️ Duration: ${duration} hour(s)\n🤖 Created by: ${interaction.user.displayName}`,
            scheduledStartTime: eventDate,
            scheduledEndTime: endDate,
            privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
            entityType: location ? GuildScheduledEventEntityType.External : GuildScheduledEventEntityType.Voice,
            reason: `Event created by ${interaction.user.tag} via Latesh Analysis Bot`
        };

        // Add location if specified
        if (location) {
            eventOptions.entityMetadata = { location: location };
        } else {
            // Use a default voice channel if available
            const voiceChannels = interaction.guild.channels.cache.filter(c => c.type === 2); // Voice channels
            if (voiceChannels.size > 0) {
                eventOptions.channel = voiceChannels.first();
                eventOptions.entityType = GuildScheduledEventEntityType.Voice;
            }
        }

        const createdEvent = await interaction.guild.scheduledEvents.create(eventOptions);

        // Create success embed
        const successEmbed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Event Created Successfully!')
            .setDescription(`Your ${getEventTypeName(eventType).toLowerCase()} has been created and published.`)
            .addFields([
                { name: '📅 Event Name', value: createdEvent.name, inline: false },
                { name: '📝 Description', value: description.substring(0, 200) + (description.length > 200 ? '...' : ''), inline: false },
                { name: '🕒 Start Time', value: `<t:${Math.floor(eventDate.getTime() / 1000)}:F>`, inline: true },
                { name: '⏱️ Duration', value: `${duration} hour(s)`, inline: true },
                { name: '📍 Location', value: location || 'Voice Channel', inline: true },
                { name: '🔗 Event Link', value: `[View Event](https://discord.com/events/${interaction.guild.id}/${createdEvent.id})`, inline: false }
            ])
            .setFooter({ text: 'Event will appear in the Events section of the server' })
            .setTimestamp();

        await interaction.editReply({ embeds: [successEmbed] });

        // Send notification to the channel (optional)
        const notificationEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('📢 New Event Created!')
            .setDescription(`${interaction.user.displayName} just created a new event: **${createdEvent.name}**`)
            .addFields([
                { name: '🕒 When', value: `<t:${Math.floor(eventDate.getTime() / 1000)}:F>`, inline: true },
                { name: '⏱️ Duration', value: `${duration} hour(s)`, inline: true }
            ])
            .setTimestamp();

        // Send to current channel or a designated events channel
        await interaction.followUp({ embeds: [notificationEmbed] });

    } catch (error) {
        console.error('Error creating event:', error);
        await interaction.editReply({
            content: `❌ Failed to create event: ${error.message}\n\nMake sure the bot has "Manage Events" permission.`
        });
    }
};

// Utility functions
function getEventTypeName(type) {
    const types = {
        meeting: 'Team Meeting',
        competition: 'Competition',
        build: 'Build Session',
        training: 'Training/Workshop',
        social: 'Social Event',
        outreach: 'Outreach Event',
        custom: 'Custom Event'
    };
    return types[type] || 'Event';
}

function getEventTypeEmoji(type) {
    const emojis = {
        meeting: '🤖',
        competition: '🏆',
        build: '🔧',
        training: '📚',
        social: '🎉',
        outreach: '📋',
        custom: '⚙️'
    };
    return emojis[type] || '📅';
}

function getEventEmoji(eventName) {
    const name = eventName.toLowerCase();
    if (name.includes('🤖') || name.includes('meeting')) return '🤖';
    if (name.includes('🏆') || name.includes('competition')) return '🏆';
    if (name.includes('🔧') || name.includes('build')) return '🔧';
    if (name.includes('📚') || name.includes('training') || name.includes('workshop')) return '📚';
    if (name.includes('🎉') || name.includes('social') || name.includes('party')) return '🎉';
    if (name.includes('📋') || name.includes('outreach')) return '📋';
    return '📅';
}

function getEventPlaceholder(type, field) {
    const placeholders = {
        meeting: {
            name: 'Weekly Team Meeting #12',
            description: 'Review progress, plan upcoming tasks, and coordinate team activities. We\'ll discuss robot design updates and prepare for the next competition.'
        },
        competition: {
            name: 'FRC District Competition - San Diego',
            description: 'Official FRC competition at San Diego Sports Arena. Arrive 2 hours early for setup. Bring all competition gear and paperwork.'
        },
        build: {
            name: 'Robot Build Session - Drivetrain',
            description: 'Focus on assembling the robot drivetrain. Bring safety equipment. All team members welcome, mentors will provide guidance.'
        },
        training: {
            name: 'CAD Workshop - SolidWorks Basics',
            description: 'Learn fundamentals of SolidWorks for robot design. Laptops provided, bring notebook for taking notes.'
        },
        social: {
            name: 'End of Season Pizza Party',
            description: 'Celebrate the end of build season! Pizza, games, and team bonding. Family members welcome.'
        },
        outreach: {
            name: 'Elementary School Robot Demo',
            description: 'Demonstrate our robot to elementary students. Inspire the next generation of engineers and scientists.'
        },
        custom: {
            name: 'Custom Team Event',
            description: 'Describe your custom event here...'
        }
    };
    
    return placeholders[type]?.[field] || 'Enter details here...';
}

function parseDateTime(dateTimeStr) {
    // Expected format: YYYY-MM-DD HH:MM
    const regex = /^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})$/;
    const match = dateTimeStr.trim().match(regex);
    
    if (!match) return null;
    
    const [, year, month, day, hour, minute] = match;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
    
    // Validate the date
    if (isNaN(date.getTime())) return null;
    
    return date;
}
