const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Get information about a user')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user to get info about')
                .setRequired(false)),

    async execute(interaction) {
        const target = interaction.options.getUser('target') || interaction.user;
        const member = await interaction.guild.members.fetch(target.id).catch(() => null);

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`👤 User Information: ${target.username}`)
            .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 256 }))
            .addFields([
                { name: 'Username', value: target.username, inline: true },
                { name: 'Discriminator', value: `#${target.discriminator}`, inline: true },
                { name: 'ID', value: target.id, inline: true },
                { name: 'Account Created', value: `<t:${Math.floor(target.createdTimestamp / 1000)}:F>`, inline: false },
                { name: 'Bot Account', value: target.bot ? 'Yes' : 'No', inline: true }
            ])
            .setTimestamp();

        if (member) {
            embed.addFields([
                { name: 'Joined Server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`, inline: false },
                { name: 'Nickname', value: member.nickname || 'None', inline: true },
                { name: 'Roles', value: member.roles.cache.map(role => role.toString()).join(' ') || 'None', inline: false }
            ]);
        }

        await interaction.reply({ embeds: [embed] });
    },

    category: 'utility',
    permissions: [],
    cooldown: 3
};
