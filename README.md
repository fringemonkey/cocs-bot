# COCS Discord Bot

Discord bot for the COCS server that reports Cloudflare Pages build completion/failure notifications to the `dev/builds` channel.

## Features

- ✅ Receives Cloudflare Pages webhook events
- ✅ Posts detailed build notifications to Discord with rich embeds
- ✅ Includes build status, commit info, deployment URLs, and error details
- ✅ Structured for future expansion with commands and interactions
- ✅ Runs as a Cloudflare Worker for low latency and cost efficiency

## Architecture

The bot is implemented as a Cloudflare Worker that:
1. Receives POST requests from Cloudflare Pages webhooks
2. Parses deployment event payloads
3. Formats detailed Discord embed messages
4. Sends notifications to the configured Discord channel

The bot uses Discord's REST API directly (compatible with Cloudflare Workers) and is structured as a class-based bot for easy future expansion.

## Prerequisites

- Node.js 18+ and npm
- Cloudflare account with Workers enabled
- Discord Developer Portal access
- Access to the COCS Discord server

## Setup

### 1. Create Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and name it `COCS Bot` (or similar)
3. Go to the "Bot" section
4. Click "Add Bot" and confirm
5. Under "Token", click "Reset Token" and copy the token (save it securely)
6. Under "Privileged Gateway Intents", enable:
   - ✅ Server Members Intent (if needed for future features)
   - ✅ Message Content Intent (if needed for future commands)
7. Go to "OAuth2" → "URL Generator"
8. Select scopes:
   - ✅ `bot`
   - ✅ `applications.commands` (for future slash commands)
9. Select bot permissions:
   - ✅ Send Messages
   - ✅ Embed Links
   - ✅ Read Message History
10. Copy the generated URL and open it in your browser
11. Select the COCS Discord server and authorize the bot

### 2. Get Discord Channel ID

1. Enable Developer Mode in Discord:
   - User Settings → Advanced → Developer Mode
2. Navigate to the `dev/builds` channel (or create it)
3. Right-click the channel → "Copy ID"
4. Save the channel ID

### 3. Clone and Install

```bash
git clone https://github.com/fringemonkey/cocs-bot.git
cd cocs-bot
npm install
```

### 4. Configure Environment Variables

Set secrets in Cloudflare Workers (these will be used when deployed):

```bash
# Login to Cloudflare (if not already)
npx wrangler login

# Set Discord bot token
npx wrangler secret put DISCORD_BOT_TOKEN
# Paste your bot token when prompted

# Set Discord channel ID
npx wrangler secret put DISCORD_CHANNEL_ID
# Paste the channel ID when prompted

# Optional: Set webhook secret for additional security
npx wrangler secret put WEBHOOK_SECRET
# Enter a random secret string

# Optional: Set GitHub repo info (defaults to fringemonkey/cocs-bot)
npx wrangler secret put GITHUB_REPO_OWNER
# Enter: fringemonkey

npx wrangler secret put GITHUB_REPO_NAME
# Enter: cocs-bot
```

### 5. Deploy

```bash
npm run deploy
```

After deployment, note your Worker URL (e.g., `https://cocs-bot.your-subdomain.workers.dev`)

### 6. Configure Cloudflare Pages Webhook

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to your Pages project (`tlc-survey`)
3. Go to **Settings** → **Builds & deployments**
4. Scroll to **Deployment webhooks**
5. Click **Create webhook**
6. Configure:
   - **Name**: `Discord Build Notifications`
   - **URL**: `https://cocs-bot.your-subdomain.workers.dev/webhook`
   - **Events**: 
     - ✅ `deployment.success`
     - ✅ `deployment.failure`
   - **Secret** (optional): If you set `WEBHOOK_SECRET`, enter it here
7. Click **Save**

### 7. Test

1. Make a small change to your repository and push
2. Wait for Cloudflare Pages to build
3. Check the `dev/builds` channel in Discord for the notification

## Local Development

```bash
# Start local development server
npm run dev

# The worker will be available at http://localhost:8787
# Test the webhook endpoint:
curl -X POST http://localhost:8787/webhook \
  -H "Content-Type: application/json" \
  -d '{"deployment": {"id": "test", "status": "success", "branch": "main"}}'
```

For local testing, create a `.dev.vars` file (not committed to git):

```bash
DISCORD_BOT_TOKEN=your_token_here
DISCORD_CHANNEL_ID=your_channel_id_here
WEBHOOK_SECRET=your_secret_here
```

## Project Structure

```
cocs-bot/
├── src/
│   ├── index.js          # Main Worker entry point and webhook handler
│   ├── cloudflare.js     # Cloudflare Pages webhook payload parser
│   └── discord.js        # Discord bot client and message formatting
├── wrangler.toml         # Cloudflare Worker configuration
├── package.json          # Dependencies and scripts
└── README.md            # This file
```

## Message Format

Build notifications include:

- **Status**: ✅ Success or ❌ Failure with color coding
- **Project**: Project name (e.g., `tlc-survey`)
- **Branch**: Git branch name
- **Commit**: Short commit hash with link to GitHub
- **Author**: Commit author
- **Build Time**: Duration of the build
- **Commit Message**: Full commit message (truncated if long)
- **Deployment URL**: Link to live deployment
- **Build Logs**: Link to build logs (if available)
- **Error Details**: Error message and stack trace (on failure)

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DISCORD_BOT_TOKEN` | Yes | Discord bot token from Developer Portal |
| `DISCORD_CHANNEL_ID` | Yes | Discord channel ID for notifications |
| `WEBHOOK_SECRET` | No | Secret for validating webhook requests |
| `GITHUB_REPO_OWNER` | No | GitHub repo owner (default: `fringemonkey`) |
| `GITHUB_REPO_NAME` | No | GitHub repo name (default: `cocs-bot`) |

## Future Expansion

The bot is structured to easily add:

- Slash commands (`/build-status`, `/deploy-info`, etc.)
- Message interactions (buttons, select menus)
- Additional notification types
- Command handling system
- Database integration for tracking deployments

## Troubleshooting

### Bot not receiving webhooks

1. Check that the webhook URL in Cloudflare Pages matches your Worker URL
2. Verify the webhook secret matches (if configured)
3. Check Worker logs: `npm run tail`
4. Test the health endpoint: `curl https://your-worker.workers.dev/health`

### Messages not appearing in Discord

1. Verify the bot is in the server and has permission to send messages
2. Check the channel ID is correct
3. Verify the bot token is valid
4. Check Worker logs for errors

### Build notifications missing information

Cloudflare Pages webhook payloads may vary. Check the Worker logs to see the actual payload structure and update `src/cloudflare.js` if needed.

## License

MIT

## Contributing

This is a personal project, but suggestions and improvements are welcome!
