// functions/index.js
const { setGlobalOptions } = require("firebase-functions");
const { onCall } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const axios = require("axios");

// Initialize admin
admin.initializeApp();

// Set global options for cost control
setGlobalOptions({ maxInstances: 10 });

// Secure Claude API call
exports.callClaudeAPI = onCall(async (request) => {
  // Check authentication
  if (!request.auth) {
    throw new Error("User must be authenticated");
  }

  const { prompt, type } = request.data;

  try {
    // Use process.env directly (new method)
    const claudeApiKey = process.env.CLAUDE_API_KEY;
    
    if (!claudeApiKey) {
      throw new Error("Claude API key not configured");
    }

    // Call Claude API
    const response = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: "claude-3-sonnet-20241022",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }]
      },
      {
        headers: {
          "x-api-key": claudeApiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json"
        }
      }
    );

    // Log usage for tracking
    await admin.firestore().collection("apiUsage").add({
      userId: request.auth.uid,
      type: type || "general",
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      tokens: response.data.usage?.output_tokens || 0
    });

    return {
      success: true,
      response: response.data.content[0].text
    };
  } catch (error) {
    logger.error("Claude API error:", error);
    throw new Error("Failed to call Claude API");
  }
});

// Secure Strava token refresh
exports.refreshStravaToken = onCall(async (request) => {
  if (!request.auth) {
    throw new Error("User must be authenticated");
  }

  const { refreshToken } = request.data;

  try {
    // Use process.env directly (new method)
    const stravaClientId = process.env.STRAVA_CLIENT_ID;
    const stravaClientSecret = process.env.STRAVA_CLIENT_SECRET;

    const response = await axios.post(
      "https://www.strava.com/oauth/token",
      {
        client_id: stravaClientId,
        client_secret: stravaClientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token"
      }
    );

    // Update user's tokens in Firestore
    await admin.firestore().collection("users").doc(request.auth.uid).update({
      "stravaTokens.access_token": response.data.access_token,
      "stravaTokens.refresh_token": response.data.refresh_token,
      "stravaTokens.expires_at": response.data.expires_at,
      "lastTokenRefresh": admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      success: true,
      tokens: response.data
    };
  } catch (error) {
    logger.error("Strava refresh error:", error);
    throw new Error("Failed to refresh Strava token");
  }
});