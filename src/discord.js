/**
 * Discord bot client and message formatting
 * Uses Discord REST API for Cloudflare Workers compatibility
 * Structured for future expansion with commands and interactions
 */

// Discord API base URL
const DISCORD_API_BASE = 'https://discord.com/api/v10';

/**
 * Discord bot client class
 * Handles authentication and message sending via Discord REST API
 */
export class DiscordBot {
  constructor(token) {
    this.token = token;
    this.apiBase = DISCORD_API_BASE;
  }

  /**
   * Get authorization headers for Discord API requests
   * @returns {Object} Headers object
   */
  getHeaders() {
    return {
      'Authorization': `Bot ${this.token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'COCS-Bot/1.0'
    };
  }

  /**
   * Send a message to a Discord channel
   * @param {string} channelId - Discord channel ID
   * @param {Object} messageData - Message data (content, embeds, etc.)
   * @returns {Promise<Object>} Sent message object
   */
  async sendMessage(channelId, messageData) {
    const url = `${this.apiBase}/channels/${channelId}/messages`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(messageData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Discord API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.json();
  }

  /**
   * Send build notification to Discord channel
   * @param {string} channelId - Discord channel ID to send message to
   * @param {Object} deploymentInfo - Parsed deployment information
   * @returns {Promise<Object>} Sent message object
   */
  async sendBuildNotification(channelId, deploymentInfo) {
    const embed = createBuildEmbed(deploymentInfo);
    
    return await this.sendMessage(channelId, {
      embeds: [embed]
    });
  }

  /**
   * Get bot user information
   * @returns {Promise<Object>} Bot user object
   */
  async getBotUser() {
    const url = `${this.apiBase}/users/@me`;
    
    const response = await fetch(url, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to get bot user: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Get channel information
   * @param {string} channelId - Channel ID
   * @returns {Promise<Object>} Channel object
   */
  async getChannel(channelId) {
    const url = `${this.apiBase}/channels/${channelId}`;
    
    const response = await fetch(url, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to get channel: ${response.status}`);
    }

    return await response.json();
  }
}

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
