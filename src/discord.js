/**
 * Discord bot client and message formatting
 * Uses Discord.js for full bot functionality with future expansion capabilities
 */

/**
 * Format a rich embed message for Discord with build details
 * @param {Object} deploymentInfo - Parsed deployment information from cloudflare.js
 * @returns {Object} Discord embed object
 */
export function createBuildEmbed(deploymentInfo) {
  const {
    projectName,
    status,
    isSuccess,
    isFailure,
    branch,
    commitHash,
    commitMessage,
    commitAuthor,
    deploymentUrl,
    buildLogsUrl,
    commitUrl,
    buildTime,
    error,
    errorMessage,
    createdAt
  } = deploymentInfo;

  // Color coding: green for success, red for failure, yellow for other
  const color = isSuccess ? 0x00ff00 : isFailure ? 0xff0000 : 0xffff00;
  const statusEmoji = isSuccess ? '✅' : isFailure ? '❌' : '⚠️';
  const statusText = isSuccess ? 'Success' : isFailure ? 'Failure' : 'Unknown';

  // Build description
  const description = isFailure && errorMessage
    ? `**Error:** ${errorMessage}`
    : isSuccess
    ? `Build completed successfully`
    : `Build status: ${status}`;

  // Create embed object
  const embed = {
    title: `${statusEmoji} Build ${statusText} - ${projectName}`,
    description: description,
    color: color,
    timestamp: createdAt,
    fields: [],
    footer: {
      text: `Deployment ID: ${deploymentInfo.id || 'unknown'}`
    }
  };

  // Add branch field
  if (branch) {
    embed.fields.push({
      name: 'Branch',
      value: `\`${branch}\``,
      inline: true
    });
  }

  // Add commit information
  if (commitHash) {
    const shortHash = commitHash.substring(0, 7);
    const commitText = commitUrl
      ? `[\`${shortHash}\`](${commitUrl})`
      : `\`${shortHash}\``;
    
    embed.fields.push({
      name: 'Commit',
      value: commitText,
      inline: true
    });
  }

  // Add build time
  if (buildTime !== null) {
    embed.fields.push({
      name: 'Build Time',
      value: formatBuildTime(buildTime),
      inline: true
    });
  }

  // Add commit author
  if (commitAuthor) {
    embed.fields.push({
      name: 'Author',
      value: commitAuthor,
      inline: true
    });
  }

  // Add commit message (truncated if too long)
  if (commitMessage) {
    const truncatedMessage = commitMessage.length > 200
      ? commitMessage.substring(0, 197) + '...'
      : commitMessage;
    embed.fields.push({
      name: 'Commit Message',
      value: truncatedMessage,
      inline: false
    });
  }

  // Add deployment URL
  if (deploymentUrl) {
    embed.fields.push({
      name: 'Deployment',
      value: `[View Deployment](${deploymentUrl})`,
      inline: true
    });
  }

  // Add build logs URL
  if (buildLogsUrl) {
    embed.fields.push({
      name: 'Build Logs',
      value: `[View Logs](${buildLogsUrl})`,
      inline: true
    });
  }

  // Add error details if failed
  if (isFailure && error) {
    const errorText = typeof error === 'string'
      ? error.substring(0, 1000) // Discord field limit
      : JSON.stringify(error).substring(0, 1000);
    
    embed.fields.push({
      name: 'Error Details',
      value: `\`\`\`${errorText}\`\`\``,
      inline: false
    });
  }

  return embed;
}

/**
 * Format build time for display
 * @param {number|null} seconds - Build duration in seconds
 * @returns {string} Formatted duration string
 */
function formatBuildTime(seconds) {
  if (!seconds) return 'N/A';
  
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  
  if (remainingSeconds === 0) {
    return `${minutes}m`;
  }
  
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Send build notification to Discord channel
 * @param {string} channelId - Discord channel ID to send message to
 * @param {Object} deploymentInfo - Parsed deployment information
 * @param {Object} client - Discord.js client instance
 * @returns {Promise<Object>} Sent message object
 */
export async function sendBuildNotification(channelId, deploymentInfo, client) {
  try {
    const channel = await client.channels.fetch(channelId);
    
    if (!channel) {
      throw new Error(`Channel ${channelId} not found`);
    }

    if (!channel.isTextBased()) {
      throw new Error(`Channel ${channelId} is not a text channel`);
    }

    const embed = createBuildEmbed(deploymentInfo);
    
    const message = await channel.send({
      embeds: [embed]
    });

    return message;
  } catch (error) {
    console.error('Error sending Discord notification:', error);
    throw error;
  }
}

/**
 * Initialize Discord bot client
 * @param {string} token - Discord bot token
 * @returns {Promise<Object>} Discord.js client instance
 */
export async function initializeBot(token) {
  // Dynamic import of discord.js (since it's not installed yet, but will be)
  // For now, we'll use fetch API directly, but structure for discord.js
  const { Client, GatewayIntentBits } = await import('discord.js');
  
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent
    ]
  });

  await client.login(token);
  
  return new Promise((resolve, reject) => {
    client.once('ready', () => {
      console.log(`Discord bot logged in as ${client.user.tag}`);
      resolve(client);
    });

    client.once('error', reject);
  });
}
