# Latesh Analysis Bot 🤖

An amazing Discord bot that provides webhook management, message forwarding, and FRC (FIRST Robotics Competition) match analysis capabilities.

## ✨ Features

- 🔗 **Advanced Webhook Management**: Create, manage, and send messages through Discord webhooks
- 📡 **Message Forwarding**: Forward messages between channels using webhooks with filtering
- 🤖 **AI-Powered Chat**: Ask questions by mentioning the bot - powered by Google Gemini AI
- 🏆 **FRC Match Analysis**: Get predictions and analysis for FRC matches (powered by The Blue Alliance)
- 🎨 **Rich Embeds**: Send beautiful embedded messages through webhooks
- 🛡️ **Permission System**: Role-based command access for security
- 🌐 **Web Dashboard**: Health monitoring and webhook endpoints
- ⚡ **Real-time Processing**: Lightning-fast message handling and forwarding

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- Discord Developer Account
- Discord Bot Token
- The Blue Alliance API Key (optional, for FRC features)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/roselain3/Latesh-Analysis.git
   cd Latesh-Analysis
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   copy .env.example .env
   ```
   
   Edit `.env` and add your configuration:
   ```env
   DISCORD_TOKEN=your_discord_bot_token_here
   CLIENT_ID=your_discord_client_id_here
   GEMINI_API_KEY=your_gemini_api_key_here
   PORT=3000
   TBA_API_KEY=your_the_blue_alliance_api_key_here
   PREFIX=!
   BOT_ACTIVITY=AI-powered FRC Analysis
   BOT_STATUS=online
   ```

4. **Get API Keys:**
   - **Discord**: Create bot at [Discord Developer Portal](https://discord.com/developers/applications)
   - **Gemini AI**: Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
   - **The Blue Alliance** (optional): Get key from [TBA](https://www.thebluealliance.com/account)

5. **Create a Discord Application and Bot:**
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Create a new application
   - Go to the "Bot" section and create a bot
   - Copy the bot token and client ID
   - Enable the following intents:
     - ✅ Message Content Intent
     - ✅ Server Members Intent
     - ✅ Presence Intent

5. **Invite the bot to your server:**
   ```
   https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=536870912&scope=bot%20applications.commands
   ```
   Replace `YOUR_CLIENT_ID` with your actual client ID.

6. **Start the bot:**
   ```bash
   npm start
   ```

## 🎯 Commands

### 🔗 Webhook Commands

| Command | Description | Permissions Required |
|---------|-------------|---------------------|
| `/webhook-send` | Send a message through a webhook | Manage Webhooks |
| `/webhook-embed` | Send a rich embed through a webhook | Manage Webhooks |
| `/webhook-create` | Create a new webhook for the current channel | Manage Webhooks |
| `/webhook-list` | List all webhooks in the server | Manage Webhooks |

### 📡 Forwarding Commands

| Command | Description | Permissions Required |
|---------|-------------|---------------------|
| `/forward-setup` | Setup message forwarding between channels | Manage Webhooks |

### 🤖 FRC Commands

| Command | Description | Permissions Required |
|---------|-------------|---------------------|
| `/frc-match` | Get FRC match predictions and analysis | None |

### ⚙️ Utility Commands

| Command | Description | Permissions Required |
|---------|-------------|---------------------|
| `/ping` | Check bot latency and status | None |
| `/help` | Display help information | None |

## 🔧 Advanced Usage

### Webhook Message Forwarding

Set up automatic message forwarding from one channel to another using webhooks:

```
/forward-setup source:#source-channel webhook-url:https://discord.com/api/webhooks/... filter:regex_pattern
```

### Custom Webhook Messages

Send messages with custom usernames and avatars:

```
/webhook-send message:"Hello World!" username:"Custom Bot" avatar:https://example.com/avatar.png
```

### Rich Embeds

Create beautiful embeds with custom colors and content:

```
/webhook-embed title:"Important Announcement" description:"This is a test embed" color:ff0000
```

## 🎨 Web Dashboard

The bot includes a web server that provides:

- **Health Check**: `GET /health` - Check bot status
- **Webhook Endpoint**: `POST /webhook` - Receive external webhooks
- **API Info**: `GET /` - Bot information and available endpoints

Access the dashboard at `http://localhost:3000` (or your configured port).

## 🏗️ Project Structure

```
Latesh-Analysis/
├── bot.js              # Main Discord bot file
├── server.js           # Web server for health checks and webhooks
├── start.js            # Launcher script for both bot and server
├── package.json        # Dependencies and scripts
├── .env.example        # Environment variables template
├── README.md           # This file
└── utils/
    ├── WebhookManager.js  # Webhook management utilities
    └── FRCAnalyzer.js     # FRC match analysis utilities
```

## 🔑 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DISCORD_TOKEN` | Your Discord bot token | ✅ Yes |
| `CLIENT_ID` | Your Discord application client ID | ✅ Yes |
| `PORT` | Web server port (default: 3000) | ❌ No |
| `DEFAULT_WEBHOOK_URL` | Default webhook URL for commands | ❌ No |
| `TBA_API_KEY` | The Blue Alliance API key for FRC features | ❌ No |
| `PREFIX` | Command prefix for legacy commands | ❌ No |
| `BOT_ACTIVITY` | Bot's activity status | ❌ No |
| `BOT_STATUS` | Bot's online status | ❌ No |

## 🤝 Contributing

We welcome contributions! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

### Development Setup

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit your changes (`git commit -m 'Add some amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Discord.js](https://discord.js.org/) - The Discord API library
- [The Blue Alliance](https://www.thebluealliance.com/) - FRC match data
- [Express.js](https://expressjs.com/) - Web server framework

## 📞 Support

If you need help or have questions:

1. Check the [Issues](https://github.com/roselain3/Latesh-Analysis/issues) page
2. Create a new issue if your problem isn't already reported
3. Join our Discord server for community support

## 👥 Authors

- **Laney Williams** - [@roselain3](https://github.com/roselain3)
- **Ritesh Raj Arul Selvan** - Co-developer

Made with ❤️ for the FRC community!
   - Go to OAuth2 > URL Generator
   - Select "bot" scope
   - Select necessary permissions (Send Messages, Read Messages, etc.)
   - Use the generated URL to invite the bot

### Running the Bot

Development mode:
```bash
npm run dev
```

The bot will start and log in to Discord. You can also access the web interface at `http://localhost:3000`.

## Commands

- `!help` - Show available commands
- `!predict` - Get FRC match predictions (coming soon)
- `!status` - Check bot status

## Development

### Project Structure

```
├── server.js          # Main bot and server file
├── package.json       # Dependencies and scripts
├── .env.example       # Environment variables template
└── README.md          # This file
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Future Features

- 🔍 Real-time FRC match data integration
- 📈 Advanced prediction algorithms
- 📱 Match alerts and notifications
- 🏆 Team performance analytics
- 📊 Historical match data analysis

## License

MIT License - see LICENSE file for details.

## Authors

- Laney Williams
- Ritesh Raj Arul Selvan
