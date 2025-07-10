const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('extensions')
        .setDescription('Manage bot extensions')
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all loaded extensions'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('reload')
                .setDescription('Reload all extensions'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('Get info about a specific extension')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Extension name')
                        .setRequired(true))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'list':
                await handleList(interaction);
                break;
            case 'reload':
                await handleReload(interaction);
                break;
            case 'info':
                await handleInfo(interaction);
                break;
        }
    },

    category: 'admin',
    permissions: ['Administrator'],
    cooldown: 5
};

async function handleList(interaction) {
    const extensions = interaction.client.commands;
    
    if (extensions.size === 0) {
        return interaction.reply({
            content: '❌ No extensions are currently loaded.',
            ephemeral: true
        });
    }

    const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('🔌 Loaded Extensions')
        .setDescription(`Found ${extensions.size} loaded extension(s)`)
        .setTimestamp();

    const extensionList = [];
    extensions.forEach((extension, name) => {
        const category = extension.category || 'uncategorized';
        const permissions = extension.permissions?.length > 0 ? 
            `🔒 ${extension.permissions.join(', ')}` : '🔓 None';
        
        extensionList.push({
            name: `/${name}`,
            value: `**Category:** ${category}\n**Permissions:** ${permissions}`,
            inline: true
        });
    });

    embed.addFields(extensionList);
    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleReload(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
        // Clear existing extensions
        interaction.client.commands.clear();
        
        // Load extensions
        const extensionsPath = path.join(__dirname, '.');
        const extensionFiles = fs.readdirSync(extensionsPath).filter(file => 
            file.endsWith('.js') && file !== 'extensions.js'
        );
        
        let loadedCount = 0;
        const errors = [];
        
        for (const file of extensionFiles) {
            const extensionPath = path.join(extensionsPath, file);
            
            try {
                delete require.cache[require.resolve(extensionPath)];
                const extension = require(extensionPath);
                
                if (extension.data && extension.execute) {
                    interaction.client.commands.set(extension.data.name, extension);
                    loadedCount++;
                } else {
                    errors.push(`${file}: Missing required properties`);
                }
            } catch (error) {
                errors.push(`${file}: ${error.message}`);
            }
        }
        
        const embed = new EmbedBuilder()
            .setColor(errors.length > 0 ? '#ffaa00' : '#00ff00')
            .setTitle('🔄 Extension Reload Complete')
            .addFields([
                { name: 'Successfully Loaded', value: `${loadedCount} extensions`, inline: true },
                { name: 'Errors', value: errors.length > 0 ? errors.join('\n') : 'None', inline: true }
            ])
            .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        
    } catch (error) {
        await interaction.editReply({
            content: `❌ Failed to reload extensions: ${error.message}`
        });
    }
}

async function handleInfo(interaction) {
    const extensionName = interaction.options.getString('name');
    const extension = interaction.client.commands.get(extensionName);
    
    if (!extension) {
        return interaction.reply({
            content: `❌ Extension '${extensionName}' not found.`,
            ephemeral: true
        });
    }

    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`🔌 Extension: /${extensionName}`)
        .setDescription(extension.data.description || 'No description available')
        .addFields([
            { name: 'Category', value: extension.category || 'uncategorized', inline: true },
            { name: 'Cooldown', value: `${extension.cooldown || 0}s`, inline: true },
            { name: 'Permissions', value: extension.permissions?.join(', ') || 'None', inline: true }
        ])
        .setTimestamp();

    // Add options if they exist
    if (extension.data.options && extension.data.options.length > 0) {
        const options = extension.data.options.map(opt => 
            `**${opt.name}**: ${opt.description} ${opt.required ? '(Required)' : '(Optional)'}`
        ).join('\n');
        
        embed.addFields([{ name: 'Options', value: options, inline: false }]);
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
}
