const axios = require('axios');

class WebhookManager {
    constructor() {
        this.webhooks = new Map();
    }

    // Store webhook configuration
    addWebhook(id, config) {
        this.webhooks.set(id, {
            url: config.url,
            username: config.username || 'Latesh Bot',
            avatar: config.avatar,
            channel: config.channel,
            createdAt: new Date()
        });
    }

    // Remove webhook configuration
    removeWebhook(id) {
        return this.webhooks.delete(id);
    }

    // Get webhook configuration
    getWebhook(id) {
        return this.webhooks.get(id);
    }

    // Get all webhooks
    getAllWebhooks() {
        return Array.from(this.webhooks.entries()).map(([id, config]) => ({
            id,
            ...config
        }));
    }

    // Send message through webhook
    async sendMessage(webhookUrl, message, options = {}) {
        const payload = {
            content: message,
            username: options.username || 'Latesh Bot',
            avatar_url: options.avatar
        };

        try {
            const response = await axios.post(webhookUrl, payload);
            return { success: true, data: response.data };
        } catch (error) {
            console.error('Webhook send error:', error.response?.data || error.message);
            return { success: false, error: error.message };
        }
    }

    // Send embed through webhook
    async sendEmbed(webhookUrl, embed, options = {}) {
        const payload = {
            username: options.username || 'Latesh Bot',
            avatar_url: options.avatar,
            embeds: [embed]
        };

        try {
            const response = await axios.post(webhookUrl, payload);
            return { success: true, data: response.data };
        } catch (error) {
            console.error('Webhook embed error:', error.response?.data || error.message);
            return { success: false, error: error.message };
        }
    }

    // Send file through webhook
    async sendFile(webhookUrl, fileUrl, message = '', options = {}) {
        const payload = {
            content: message,
            username: options.username || 'Latesh Bot',
            avatar_url: options.avatar
        };

        // For file attachments, you might need to handle FormData
        // This is a simplified version
        if (fileUrl) {
            payload.content += `\n${fileUrl}`;
        }

        try {
            const response = await axios.post(webhookUrl, payload);
            return { success: true, data: response.data };
        } catch (error) {
            console.error('Webhook file error:', error.response?.data || error.message);
            return { success: false, error: error.message };
        }
    }

    // Validate webhook URL
    async validateWebhook(webhookUrl) {
        try {
            // Send a test payload to check if webhook is valid
            const testPayload = {
                content: 'Webhook validation test - please ignore',
                username: 'Latesh Bot Validator'
            };

            const response = await axios.post(webhookUrl, testPayload);
            return { valid: true, status: response.status };
        } catch (error) {
            return { 
                valid: false, 
                error: error.response?.status || error.message 
            };
        }
    }

    // Format message for webhook
    formatMessage(content, author, options = {}) {
        let formattedContent = content;

        // Add author mention if requested
        if (options.includeAuthor && author) {
            formattedContent = `**${author.displayName || author.username}**: ${formattedContent}`;
        }

        // Add timestamp if requested
        if (options.includeTimestamp) {
            const timestamp = new Date().toLocaleString();
            formattedContent += `\n*${timestamp}*`;
        }

        // Add server info if requested
        if (options.includeServer && options.guildName) {
            formattedContent += `\n*From: ${options.guildName}*`;
        }

        return formattedContent;
    }

    // Create embed from message
    createEmbedFromMessage(message, options = {}) {
        const embed = {
            description: message.content || 'No content',
            color: options.color || 0x0099ff,
            timestamp: new Date().toISOString(),
            author: {
                name: message.author.displayName || message.author.username,
                icon_url: message.author.displayAvatarURL()
            }
        };

        // Add fields if provided
        if (options.fields) {
            embed.fields = options.fields;
        }

        // Add footer
        if (options.footer) {
            embed.footer = options.footer;
        } else {
            embed.footer = {
                text: 'Forwarded by Latesh Analysis Bot'
            };
        }

        // Add thumbnail if message has attachments
        if (message.attachments && message.attachments.size > 0) {
            const firstAttachment = message.attachments.first();
            if (firstAttachment.contentType?.startsWith('image/')) {
                embed.image = { url: firstAttachment.url };
            }
        }

        return embed;
    }
}

module.exports = WebhookManager;
