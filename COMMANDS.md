# Latesh Analysis Bot - Command Reference

## 🔗 Webhook Commands

### `/webhook-send`
Send a custom message through a webhook.

**Options:**
- `message` (required) - The message content to send
- `webhook-url` (optional) - Custom webhook URL (uses default if not provided)
- `username` (optional) - Custom username for the webhook message
- `avatar` (optional) - Custom avatar URL for the webhook

**Example:**
```
/webhook-send message:"Hello everyone!" username:"Announcement Bot" avatar:"https://example.com/bot-avatar.png"
```

### `/webhook-embed`
Send a rich embed through a webhook.

**Options:**
- `title` (required) - Embed title
- `description` (required) - Embed description
- `color` (optional) - Embed color in hex format (without #)
- `webhook-url` (optional) - Custom webhook URL
- `username` (optional) - Custom username for the webhook

**Example:**
```
/webhook-embed title:"Server Update" description:"New features have been added!" color:"00ff00"
```

### `/webhook-create`
Create a new webhook for the current channel.

**Options:**
- `name` (required) - Name for the webhook
- `avatar` (optional) - Avatar URL for the webhook

**Example:**
```
/webhook-create name:"Announcements Bot" avatar:"https://example.com/announcement-avatar.png"
```

### `/webhook-list`
List all webhooks in the current server.

**Example:**
```
/webhook-list
```

## 📡 Message Forwarding Commands

### `/forward-setup`
Setup automatic message forwarding from a channel to a webhook.

**Options:**
- `source` (required) - Source channel to forward messages from
- `webhook-url` (required) - Webhook URL to forward messages to
- `filter` (optional) - Regular expression to filter messages

**Example:**
```
/forward-setup source:#announcements webhook-url:"https://discord.com/api/webhooks/..." filter:"announcement|update"
```

## 🤖 FRC Commands

### `/frc-match`
Get FRC match predictions and analysis.

**Options:**
- `event` (required) - Event key (e.g., "2024casd")
- `match-number` (optional) - Specific match number

**Example:**
```
/frc-match event:"2024casd" match-number:15
```

## ⚙️ Utility Commands

### `/ping`
Check bot latency and connection status.

**Example:**
```
/ping
```

### `/help`
Display bot help information and available commands.

**Example:**
```
/help
```

## 🔧 Advanced Usage Tips

### Message Filtering
When setting up message forwarding, you can use regular expressions to filter messages:
- `announcement|update` - Forward messages containing "announcement" OR "update"
- `^!important` - Forward messages starting with "!important"
- `@everyone|@here` - Forward messages containing mentions

### Webhook URL Format
Discord webhook URLs follow this format:
```
https://discord.com/api/webhooks/{webhook_id}/{webhook_token}
```

### Color Codes
For embed colors, use hex color codes without the # symbol:
- `ff0000` - Red
- `00ff00` - Green
- `0099ff` - Blue
- `ffff00` - Yellow
- `ff00ff` - Purple

### Permissions Required
Most webhook commands require the "Manage Webhooks" permission. Make sure your role has this permission to use these commands.

## 🚨 Troubleshooting

### Common Issues

**"No webhook URL provided"**
- Solution: Either provide a webhook URL in the command or set a default webhook URL in the bot configuration.

**"Failed to send message through webhook"**
- Solution: Check that the webhook URL is valid and the webhook still exists.

**"Missing permissions"**
- Solution: Ensure you have the "Manage Webhooks" permission for webhook-related commands.

**"Invalid regex pattern"**
- Solution: Check your filter pattern syntax when setting up message forwarding.

### Getting Help
If you need additional help:
1. Use the `/help` command for basic information
2. Check the bot's GitHub repository for documentation
3. Contact the bot administrators in your server
