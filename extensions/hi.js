const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    // Command definition
    data: new SlashCommandBuilder()
        .setName('hi')
        .setDescription('A friendly greeting command')
        .addStringOption(option =>
            option.setName('message')
                .setDescription('Optional message to include with the greeting')
                .setRequired(false)),

    // Command execution
    async execute(interaction) {
        const customMessage = interaction.options.getString('message');
        
        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('👋 Hello there!')
            .setDescription(customMessage ? 
                `Hi ${interaction.user.displayName}! ${customMessage}` : 
                `Hi ${interaction.user.displayName}! How are you doing today?`)
            .setThumbnail(interaction.user.displayAvatarURL())
            .setFooter({ text: 'Extension System Test' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },

    // Optional: Command category for organization
    category: 'general',
    
    // Optional: Permission requirements
    permissions: [],
    
    // Optional: Cooldown in seconds
    cooldown: 3
};
