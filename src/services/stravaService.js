// src/services/stravaService.js
import axios from 'axios';

const STRAVA_BASE_URL = 'https://www.strava.com/api/v3';
const CLIENT_ID = process.env.REACT_APP_STRAVA_CLIENT_ID;
const CLIENT_SECRET = process.env.REACT_APP_STRAVA_CLIENT_SECRET;
const REDIRECT_URI = process.env.REACT_APP_STRAVA_REDIRECT_URI || 'http://localhost:3000';

class StravaService {
  constructor() {
    this.accessToken = localStorage.getItem('strava_access_token');
    this.refreshToken = localStorage.getItem('strava_refresh_token');
    this.tokenExpiry = localStorage.getItem('strava_token_expiry');
    
    console.log('StravaService initialized:', {
      hasAccessToken: !!this.accessToken,
      hasRefreshToken: !!this.refreshToken,
      clientId: CLIENT_ID,
      redirectUri: REDIRECT_URI
    });
  }

  // Check if authenticated
  isAuthenticated() {
    const hasToken = !!this.accessToken;
    const isExpired = this.tokenExpiry && Date.now() > parseInt(this.tokenExpiry);
    
    console.log('Auth check:', { hasToken, isExpired });
    
    if (hasToken && isExpired && this.refreshToken) {
      console.log('Token expired, attempting refresh...');
      this.refreshTokens();
    }
    
    return hasToken && !isExpired;
  }

  // Generate authorization URL
  getAuthUrl() {
    const scope = 'read,activity:read_all,profile:read_all';
    const authUrl = `https://www.strava.com/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=${scope}`;
    console.log('Auth URL generated:', authUrl);
    return authUrl;
  }

  // Exchange authorization code for tokens
  async exchangeToken(code) {
    console.log('Exchanging code for token...');
    try {
      const response = await axios.post('https://www.strava.com/oauth/token', {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code'
      });

      console.log('Token exchange successful:', response.data);
      const { access_token, refresh_token, expires_at, athlete } = response.data;

      // Store tokens
      localStorage.setItem('strava_access_token', access_token);
      localStorage.setItem('strava_refresh_token', refresh_token);
      localStorage.setItem('strava_token_expiry', (expires_at * 1000).toString());
      localStorage.setItem('strava_athlete', JSON.stringify(athlete));

      this.accessToken = access_token;
      this.refreshToken = refresh_token;
      this.tokenExpiry = (expires_at * 1000).toString();

      return { access_token, refresh_token, athlete };
    } catch (error) {
      console.error('Error exchanging token:', error.response?.data || error);
      throw error;
    }
  }

  // Refresh access token
  async refreshTokens() {
    console.log('Refreshing token...');
    if (!this.refreshToken) {
      console.error('No refresh token available');
      return false;
    }

    try {
      const response = await axios.post('https://www.strava.com/oauth/token', {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: this.refreshToken,
        grant_type: 'refresh_token'
      });

      console.log('Token refresh successful');
      const { access_token, refresh_token, expires_at } = response.data;

      localStorage.setItem('strava_access_token', access_token);
      localStorage.setItem('strava_refresh_token', refresh_token);
      localStorage.setItem('strava_token_expiry', (expires_at * 1000).toString());

      this.accessToken = access_token;
      this.refreshToken = refresh_token;
      this.tokenExpiry = (expires_at * 1000).toString();

      return true;
    } catch (error) {
      console.error('Error refreshing token:', error.response?.data || error);
      // Clear invalid tokens
      this.clearTokens();
      return false;
    }
  }

  // Clear tokens (logout)
  clearTokens() {
    localStorage.removeItem('strava_access_token');
    localStorage.removeItem('strava_refresh_token');
    localStorage.removeItem('strava_token_expiry');
    localStorage.removeItem('strava_athlete');
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
  }

  // Get authenticated athlete
  async getAthlete() {
    console.log('Fetching athlete data...');
    return this.makeRequest('/athlete');
  }

  // Get recent activities
  async getActivities(page = 1, perPage = 30) {
    console.log(`Fetching activities (page ${page}, perPage ${perPage})...`);
    const activities = await this.makeRequest(`/athlete/activities?page=${page}&per_page=${perPage}`);
    console.log(`Fetched ${activities?.length || 0} activities`);
    return activities;
  }

  // Get specific activity
  async getActivity(id) {
    console.log(`Fetching activity ${id}...`);
    return this.makeRequest(`/activities/${id}`);
  }

  // Get athlete stats
  async getAthleteStats(athleteId) {
    console.log(`Fetching stats for athlete ${athleteId}...`);
    return this.makeRequest(`/athletes/${athleteId}/stats`);
  }

  // Generic request handler
  async makeRequest(endpoint) {
    if (!this.accessToken) {
      console.error('No access token available');
      throw new Error('Not authenticated with Strava');
    }

    // Check if token is expired
    if (this.tokenExpiry && Date.now() > parseInt(this.tokenExpiry)) {
      console.log('Token expired, refreshing...');
      const refreshed = await this.refreshTokens();
      if (!refreshed) {
        throw new Error('Failed to refresh token');
      }
    }

    try {
      console.log(`Making request to: ${endpoint}`);
      const response = await axios.get(`${STRAVA_BASE_URL}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });
      console.log(`Request successful for ${endpoint}`);
      return response.data;
    } catch (error) {
      console.error(`Request failed for ${endpoint}:`, error.response?.data || error);
      
      if (error.response?.status === 401) {
        // Try to refresh token
        const refreshed = await this.refreshTokens();
        if (refreshed) {
          // Retry request with new token
          console.log('Retrying request with new token...');
          const response = await axios.get(`${STRAVA_BASE_URL}${endpoint}`, {
            headers: {
              'Authorization': `Bearer ${this.accessToken}`
            }
          });
          return response.data;
        }
      }
      throw error;
    }
  }
}

export default new StravaService();