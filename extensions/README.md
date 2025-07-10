# Bot Extensions System

This folder contains extension files for the Discord bot. Each extension is a separate command that gets automatically loaded by the bot.

## Creating Extensions

Each extension file should export an object with the following structure:

```javascript
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    // Required: Command definition
    data: new SlashCommandBuilder()
        .setName('commandname')
        .setDescription('Command description')
        .addStringOption(option =>
            option.setName('parameter')
                .setDescription('Parameter description')
                .setRequired(false)),

    // Required: Command execution function
    async execute(interaction) {
        // Your command logic here
        await interaction.reply('Hello from extension!');
    },

    // Optional: Command category for organization
    category: 'general',
    
    // Optional: Required permissions (array of permission names)
    permissions: ['Administrator'],
    
    // Optional: Cooldown in seconds
    cooldown: 5
};
```

## Available Extensions

- **hi.js** - Friendly greeting command with optional custom message
- **joke.js** - Random joke generator with different categories
- **userinfo.js** - Display detailed information about a user
- **extensions.js** - Manage and reload extensions

## Extension Management Commands

Use `/extensions` command to manage extensions:

- `/extensions list` - List all loaded extensions
- `/extensions reload` - Reload all extensions without restarting bot
- `/extensions info <name>` - Get detailed info about a specific extension

## File Naming

- File names should be lowercase and match the command name
- Use `.js` extension
- Example: For `/hi` command, create `hi.js`

## Best Practices

1. **Error Handling**: Always wrap your code in try-catch blocks
2. **Validation**: Validate user inputs before processing
3. **Permissions**: Set appropriate permissions for sensitive commands
4. **Cooldowns**: Add cooldowns to prevent spam
5. **Categories**: Group related commands with categories
6. **Documentation**: Add clear descriptions and parameter explanations

## Hot Reloading

Extensions support hot reloading! You can:
1. Edit any extension file
2. Use `/extensions reload` command
3. Changes take effect immediately without restarting the bot

## Examples

Check the existing extension files for examples of:
- Simple text responses (hi.js)
- Random content generation (joke.js)
- User data fetching (userinfo.js)
- Advanced subcommands (extensions.js)
