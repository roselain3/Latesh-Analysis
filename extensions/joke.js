const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('joke')
        .setDescription('Get a random programming joke')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Type of joke')
                .setRequired(false)
                .addChoices(
                    { name: 'Programming', value: 'programming' },
                    { name: 'Dad Joke', value: 'dad' },
                    { name: 'Random', value: 'random' }
                )),

    async execute(interaction) {
        const type = interaction.options.getString('type') || 'random';
        
        const jokes = {
            programming: [
                "Why do programmers prefer dark mode? Because light attracts bugs! 🐛",
                "How many programmers does it take to change a light bulb? None, that's a hardware problem! 💡",
                "Why do Java developers wear glasses? Because they can't C# 👓",
                "A SQL query goes into a bar, walks up to two tables and asks... 'Can I join you?' 🍺"
            ],
            dad: [
                "I'm reading a book about anti-gravity. It's impossible to put down! 📚",
                "Why don't scientists trust atoms? Because they make up everything! ⚛️",
                "Did you hear about the mathematician who's afraid of negative numbers? He'll stop at nothing to avoid them! ➖",
                "Why did the scarecrow win an award? He was outstanding in his field! 🌾"
            ],
            random: [
                "Why do programmers prefer dark mode? Because light attracts bugs! 🐛",
                "I'm reading a book about anti-gravity. It's impossible to put down! 📚",
                "Why don't scientists trust atoms? Because they make up everything! ⚛️",
                "How many programmers does it take to change a light bulb? None, that's a hardware problem! 💡"
            ]
        };

        const selectedJokes = jokes[type] || jokes.random;
        const randomJoke = selectedJokes[Math.floor(Math.random() * selectedJokes.length)];

        const embed = new EmbedBuilder()
            .setColor('#ffaa00')
            .setTitle('😄 Here\'s a joke for you!')
            .setDescription(randomJoke)
            .addFields([
                { name: 'Type', value: type.charAt(0).toUpperCase() + type.slice(1), inline: true },
                { name: 'Requested by', value: interaction.user.displayName, inline: true }
            ])
            .setFooter({ text: 'Hope that made you smile! 😊' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },

    category: 'fun',
    permissions: [],
    cooldown: 5
};
