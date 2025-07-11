# Linode Deployment Guide for Latesh Analysis Bot

This guide provides step-by-step instructions for deploying the Latesh Analysis Bot on a Linode server.

## Prerequisites

- A Linode server running Ubuntu 20.04 or later
- SSH access to your server
- Domain name (optional, for custom URL)
- Discord Bot Token and API keys

## Step 1: Server Setup

1. **Connect to your Linode server:**
   ```bash
   ssh root@your-server-ip
   ```

2. **Update the system:**
   ```bash
   apt update && apt upgrade -y
   ```

3. **Create a non-root user (recommended):**
   ```bash
   adduser botuser
   usermod -aG sudo botuser
   su - botuser
   ```

## Step 2: Install Dependencies

1. **Install Node.js:**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

2. **Install Git:**
   ```bash
   sudo apt install git -y
   ```

3. **Install PM2:**
   ```bash
   sudo npm install -g pm2
   ```

## Step 3: Deploy the Bot

1. **Clone the repository:**
   ```bash
   git clone https://github.com/roselain3/Latesh-Analysis.git
   cd Latesh-Analysis
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   nano .env
   ```
   
   Fill in your actual values:
   ```env
   DISCORD_TOKEN=your_actual_discord_token
   CLIENT_ID=your_actual_client_id
   GEMINI_API_KEY=your_actual_gemini_key
   TBA_API_KEY=your_actual_tba_key
   PORT=3000
   ```

3. **Run the deployment script:**
   ```bash
   chmod +x deploy/linode-deploy.sh
   ./deploy/linode-deploy.sh
   ```

## Step 4: Configure Firewall

1. **Allow SSH and HTTP traffic:**
   ```bash
   sudo ufw allow OpenSSH
   sudo ufw allow 3000
   sudo ufw enable
   ```

## Step 5: Set up SSL (Optional)

1. **Install Nginx:**
   ```bash
   sudo apt install nginx -y
   ```

2. **Configure Nginx as a reverse proxy:**
   ```bash
   sudo nano /etc/nginx/sites-available/latesh-bot
   ```
   
   Add this configuration:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

3. **Enable the site:**
   ```bash
   sudo ln -s /etc/nginx/sites-available/latesh-bot /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

4. **Install SSL certificate with Let's Encrypt:**
   ```bash
   sudo apt install certbot python3-certbot-nginx -y
   sudo certbot --nginx -d your-domain.com
   ```

## Step 6: Monitoring and Maintenance

1. **Check bot status:**
   ```bash
   pm2 status
   pm2 logs latesh-bot
   ```

2. **Set up log rotation:**
   ```bash
   pm2 install pm2-logrotate
   ```

3. **Set up automatic updates:**
   ```bash
   # Add to crontab
   crontab -e
   # Add this line to check for updates weekly
   0 2 * * 0 cd /home/botuser/Latesh-Analysis && git pull && npm install && pm2 restart latesh-bot
   ```

## Troubleshooting

### Bot Not Starting
- Check PM2 logs: `pm2 logs latesh-bot`
- Verify environment variables in `.env`
- Ensure Discord token is valid

### Permission Denied Errors
- Check file permissions: `ls -la`
- Ensure PM2 is running as the correct user

### Memory Issues
- Monitor with: `pm2 monit`
- Increase server RAM if needed
- Configure PM2 memory limits in `ecosystem.config.js`

### Network Issues
- Check firewall: `sudo ufw status`
- Verify port 3000 is open
- Check Nginx configuration if using reverse proxy

## Security Best Practices

1. **Keep the system updated:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Use fail2ban for SSH protection:**
   ```bash
   sudo apt install fail2ban -y
   ```

3. **Regular backups:**
   ```bash
   # Backup user data
   tar -czf backup-$(date +%Y%m%d).tar.gz data/
   ```

4. **Monitor logs regularly:**
   ```bash
   pm2 logs latesh-bot --lines 50
   ```

## Support

If you encounter issues:
1. Check the bot logs with `pm2 logs latesh-bot`
2. Review the GitHub issues page
3. Ensure all API keys are correctly configured
4. Verify network connectivity and firewall settings

For additional help, create an issue on the [GitHub repository](https://github.com/roselain3/Latesh-Analysis/issues).
