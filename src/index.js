/**
 * COCS Discord Bot - Cloudflare Worker Entry Point
 * Receives Cloudflare Pages webhook events and posts build notifications to Discord
 */

import { parseDeploymentEvent, isValidPayload, getCommitUrl } from './cloudflare.js';
import { DiscordBot } from './discord.js';

/**
 * Main request handler for Cloudflare Worker
 */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Health check endpoint
    if (url.pathname === '/health') {
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        return jsonResponse({ error: 'Method not allowed' }, 405);
      }
      return jsonResponse({ status: 'ok', service: 'cocs-bot' }, 200);
    }

    // Webhook endpoint (and default root) - POST only
    if (url.pathname === '/webhook' || url.pathname === '/') {
      // Handle CORS preflight requests
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Webhook-Secret',
          },
        });
      }

      if (request.method !== 'POST') {
        return jsonResponse({ error: 'Method not allowed' }, 405);
      }

      return handleWebhook(request, env);
    }

    return jsonResponse({ error: 'Not found' }, 404);
  },
};

/**
 * Handle Cloudflare Pages webhook requests
 */
async function handleWebhook(request, env) {
  try {
    // Validate required environment variables
    if (!env.DISCORD_BOT_TOKEN) {
      console.error('DISCORD_BOT_TOKEN not configured');
      return jsonResponse({ error: 'Bot token not configured' }, 500);
    }

    if (!env.DISCORD_CHANNEL_ID) {
      console.error('DISCORD_CHANNEL_ID not configured');
      return jsonResponse({ error: 'Discord channel ID not configured' }, 500);
    }

    // Optional webhook secret validation
    if (env.WEBHOOK_SECRET) {
      const providedSecret = request.headers.get('X-Webhook-Secret');
      if (!secureCompare(providedSecret, env.WEBHOOK_SECRET)) {
        console.warn('Invalid webhook secret');
        return jsonResponse({ error: 'Unauthorized' }, 401);
      }
    }

    // Parse request body
    let payload;
    try {
      payload = await request.json();
    } catch (error) {
      console.error('Failed to parse JSON:', error);
      return jsonResponse({ error: 'Invalid JSON payload' }, 400);
    }

    // Validate payload structure
    if (!isValidPayload(payload)) {
      console.warn('Invalid payload structure:', JSON.stringify(payload).substring(0, 200));
      return jsonResponse({ error: 'Invalid payload structure' }, 400);
    }

    // Parse deployment event
    const deploymentInfo = parseDeploymentEvent(payload);

    // Generate GitHub commit URL if we have commit hash
    // Prefer env vars, fall back to payload-derived repo, then sensible defaults
    const repoOwner =
      env.GITHUB_REPO_OWNER ||
      deploymentInfo.repoOwner ||
      'TLC-Community-Survey';
    const repoName =
      env.GITHUB_REPO_NAME ||
      deploymentInfo.repoName ||
      'Survey';
    
    if (deploymentInfo.commitHash && !deploymentInfo.commitUrl) {
      deploymentInfo.commitUrl = getCommitUrl(repoOwner, repoName, deploymentInfo.commitHash);
    }

    // Only process success/failure events (skip in-progress builds)
    if (!deploymentInfo.isSuccess && !deploymentInfo.isFailure) {
      console.log('Skipping non-terminal build status:', deploymentInfo.status);
      return jsonResponse({ message: 'Build still in progress, skipping notification' }, 200);
    }

    // Initialize Discord bot
    const bot = new DiscordBot(env.DISCORD_BOT_TOKEN);

    // Send notification to Discord
    await bot.sendBuildNotification(env.DISCORD_CHANNEL_ID, deploymentInfo);

    console.log(`Build notification sent for deployment ${deploymentInfo.id}: ${deploymentInfo.status}`);

    return jsonResponse({
      success: true,
      deploymentId: deploymentInfo.id,
      status: deploymentInfo.status
    }, 200);

  } catch (error) {
    console.error('Error processing webhook:', error);
    
    // Return error response but don't expose internal details
    return jsonResponse({
      error: 'Internal server error',
    }, 500);
  }
}

/**
 * Create JSON response
 */
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

/**
 * Constant-time-ish string comparison (avoids early exit).
 * Good enough for shared-secret header checks in a Worker.
 */
function secureCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
