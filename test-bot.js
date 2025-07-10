require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

console.log('Testing Discord connection...');
console.log('Token exists:', !!process.env.DISCORD_TOKEN);
console.log('Token length:', process.env.DISCORD_TOKEN ? process.env.DISCORD_TOKEN.length : 0);
console.log('Client ID exists:', !!process.env.CLIENT_ID);

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

client.once('ready', () => {
    console.log('✅ Bot connected successfully!');
    console.log('Bot tag:', client.user.tag);
    process.exit(0);
});

client.on('error', error => {
    console.error('❌ Discord client error:', error);
    process.exit(1);
});

console.log('Attempting to login...');
client.login(process.env.DISCORD_TOKEN).catch(error => {
    console.error('❌ Login failed:', error.message);
    console.error('Error code:', error.code);
    process.exit(1);
});
