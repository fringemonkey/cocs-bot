/**
 * Cloudflare Pages webhook payload parser
 * Extracts deployment information from Cloudflare Pages webhook events
 */

/**
 * Parse Cloudflare Pages deployment webhook payload
 * @param {Object} payload - Raw webhook payload from Cloudflare Pages
 * @returns {Object} Parsed deployment information
 */
export function parseDeploymentEvent(payload) {
  // Cloudflare Pages webhook payload structure
  // Based on common webhook patterns and Cloudflare API documentation
  const deployment = payload.deployment || payload;
  
  return {
    // Deployment metadata
    id: deployment.id || deployment.deployment_id,
    projectName: deployment.project_name || payload.project_name || 'tlc-survey',
    environment: deployment.environment || 'production',
    
    // Build status
    status: deployment.latest_stage?.status || deployment.status || 'unknown',
    isSuccess: (deployment.latest_stage?.status || deployment.status) === 'success',
    isFailure: (deployment.latest_stage?.status || deployment.status) === 'failure',
    
    // Git information
    branch: deployment.branch || deployment.git_branch || 'main',
    commitHash: deployment.commit_hash || deployment.git_commit_hash || '',
    commitMessage: deployment.commit_message || '',
    commitAuthor: deployment.commit_author || deployment.author || '',
    
    // URLs
    deploymentUrl: deployment.url || deployment.deployment_url || '',
    buildLogsUrl: deployment.build_logs_url || deployment.logs_url || '',
    commitUrl: deployment.commit_url || '',
    
    // Timing
    buildTime: deployment.build_time || deployment.duration || null,
    createdAt: deployment.created_at || deployment.created_on || new Date().toISOString(),
    
    // Error information (if failed)
    error: deployment.error || deployment.build_error || null,
    errorMessage: deployment.error_message || deployment.message || null,
    
    // Stage information
    stages: deployment.stages || [],
    latestStage: deployment.latest_stage || null,
    
    // Raw payload for debugging
    raw: payload
  };
}

/**
 * Validate webhook payload structure
 * @param {Object} payload - Webhook payload to validate
 * @returns {boolean} True if payload appears valid
 */
export function isValidPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return false;
  }
  
  // Check for deployment-related fields
  const hasDeployment = payload.deployment || payload.deployment_id || payload.id;
  const hasStatus = payload.status || payload.deployment?.status || payload.latest_stage?.status;
  
  return !!(hasDeployment || hasStatus);
}

/**
 * Get short commit hash (first 7 characters)
 * @param {string} commitHash - Full commit hash
 * @returns {string} Short commit hash
 */
export function getShortCommitHash(commitHash) {
  if (!commitHash) return 'unknown';
  return commitHash.substring(0, 7);
}

/**
 * Format build duration
 * @param {number|null} seconds - Build duration in seconds
 * @returns {string} Formatted duration string
 */
export function formatBuildTime(seconds) {
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
 * Generate GitHub commit URL
 * @param {string} repoOwner - Repository owner (e.g., 'TLC-Community-Survey')
 * @param {string} repoName - Repository name (e.g., 'Survey')
 * @param {string} commitHash - Commit hash
 * @returns {string} GitHub commit URL
 */
export function getCommitUrl(repoOwner, repoName, commitHash) {
  if (!commitHash) return '';
  return `https://github.com/${repoOwner}/${repoName}/commit/${commitHash}`;
}
