import axios from 'axios';

const STRAVA_BASE_URL = 'https://www.strava.com/api/v3';
const CLIENT_ID = process.env.REACT_APP_STRAVA_CLIENT_ID;
const CLIENT_SECRET = process.env.REACT_APP_STRAVA_CLIENT_SECRET;
const REDIRECT_URI = process.env.REACT_APP_STRAVA_REDIRECT_URI;

class StravaService {
  constructor() {
    this.accessToken = localStorage.getItem('strava_access_token');
    this.refreshToken = localStorage.getItem('strava_refresh_token');
  }

  // Generate authorization URL
  getAuthUrl() {
    const scope = 'read,activity:read_all,profile:read_all';
    return `https://www.strava.com/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=${scope}`;
  }

  // Exchange authorization code for tokens
  async exchangeToken(code) {
    try {
      const response = await axios.post('https://www.strava.com/oauth/token', {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code'
      });

      const { access_token, refresh_token, athlete } = response.data;

      localStorage.setItem('strava_access_token', access_token);
      localStorage.setItem('strava_refresh_token', refresh_token);
      localStorage.setItem('strava_athlete', JSON.stringify(athlete));

      this.accessToken = access_token;
      this.refreshToken = refresh_token;

      return { access_token, refresh_token, athlete };
    } catch (error) {
      console.error('Error exchanging token:', error);
      throw error;
    }
  }

  // Get authenticated athlete
  async getAthlete() {
    return this.makeRequest('/athlete');
  }

  // Get recent activities
  async getActivities(page = 1, perPage = 30) {
    return this.makeRequest(`/athlete/activities?page=${page}&per_page=${perPage}`);
  }

  // Get specific activity
  async getActivity(id) {
    return this.makeRequest(`/activities/${id}`);
  }

  // Get athlete stats
  async getAthleteStats(athleteId) {
    return this.makeRequest(`/athletes/${athleteId}/stats`);
  }

  // Generic request handler
  async makeRequest(endpoint) {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }

    try {
      const response = await axios.get(`${STRAVA_BASE_URL}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        // Token expired, try refresh
        await this.refreshTokens();
        // Retry request with new token
        const response = await axios.get(`${STRAVA_BASE_URL}${endpoint}`, {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        });
        return response.data;
      }
      throw error;
    }
  }

  // Refresh expired tokens
  async refreshTokens() {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await axios.post('https://www.strava.com/oauth/token', {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken
      });

      const { access_token, refresh_token } = response.data;

      localStorage.setItem('strava_access_token', access_token);
      localStorage.setItem('strava_refresh_token', refresh_token);

      this.accessToken = access_token;
      this.refreshToken = refresh_token;

      return access_token;
    } catch (error) {
      console.error('Error refreshing token:', error);
      // Clear invalid tokens
      localStorage.removeItem('strava_access_token');
      localStorage.removeItem('strava_refresh_token');
      localStorage.removeItem('strava_athlete');
      throw error;
    }
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.accessToken;
  }

  // Logout
  logout() {
    localStorage.removeItem('strava_access_token');
    localStorage.removeItem('strava_refresh_token');
    localStorage.removeItem('strava_athlete');
    this.accessToken = null;
    this.refreshToken = null;
  }
}

// Create instance and export it
const stravaServiceInstance = new StravaService();
export default stravaServiceInstance;