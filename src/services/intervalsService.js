// src/services/intervalsService.js
// Service for integrating with Intervals.icu API
// Provides access to training data, fitness metrics, and wellness data

import axios from 'axios';

const INTERVALS_BASE_URL = 'https://intervals.icu/api/v1';

class IntervalsService {
  constructor() {
    // Cache to reduce API calls
    this.cache = new Map();
    this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

    console.log('IntervalsService initialized');
  }

  /**
   * Get credentials from localStorage (user-specific)
   * Falls back to environment variables for backwards compatibility
   */
  getCredentials() {
    const stored = localStorage.getItem('intervals_credentials');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse stored credentials:', e);
      }
    }

    // Fallback to environment variables
    return {
      apiKey: process.env.REACT_APP_INTERVALS_API_KEY,
      athleteId: process.env.REACT_APP_INTERVALS_ATHLETE_ID
    };
  }

  /**
   * Set credentials in localStorage
   */
  setCredentials(apiKey, athleteId) {
    const credentials = { apiKey, athleteId };
    localStorage.setItem('intervals_credentials', JSON.stringify(credentials));
    this.clearCache(); // Clear cache when credentials change
    console.log('Intervals.icu credentials saved');
  }

  /**
   * Clear stored credentials
   */
  clearCredentials() {
    localStorage.removeItem('intervals_credentials');
    localStorage.removeItem('intervals_athlete_profile');
    this.clearCache();
    console.log('Intervals.icu credentials cleared');
  }

  /**
   * Check if service is configured
   */
  isConfigured() {
    const { apiKey, athleteId } = this.getCredentials();
    return !!(apiKey && athleteId);
  }

  /**
   * Get authentication headers for API requests
   */
  getAuthHeaders() {
    const { apiKey } = this.getCredentials();
    if (!apiKey) {
      throw new Error('Intervals.icu API key not configured');
    }

    return {
      'Authorization': `Basic ${btoa(`API_KEY:${apiKey}`)}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Make authenticated request to Intervals.icu API
   */
  async makeRequest(endpoint, options = {}) {
    if (!this.isConfigured()) {
      throw new Error('Intervals.icu not configured. Add API key and athlete ID to .env');
    }

    // Check cache first
    const cacheKey = `${endpoint}_${JSON.stringify(options)}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log('Returning cached data for:', endpoint);
      return cached.data;
    }

    try {
      const url = `${INTERVALS_BASE_URL}${endpoint}`;
      console.log('Intervals.icu API request:', url);

      const response = await axios.get(url, {
        headers: this.getAuthHeaders(),
        ...options
      });

      // Cache the response
      this.cache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now()
      });

      return response.data;
    } catch (error) {
      console.error('Intervals.icu API error:', error.response?.data || error.message);

      if (error.response?.status === 401) {
        throw new Error('Invalid Intervals.icu API key. Check your .env file.');
      }

      throw error;
    }
  }

  /**
   * Get athlete profile
   */
  async getAthlete() {
    const { athleteId } = this.getCredentials();
    return this.makeRequest(`/athlete/${athleteId}`);
  }

  /**
   * Get and cache athlete profile with extended data
   */
  async getAthleteProfile() {
    const profile = await this.getAthlete();

    // Cache the profile for app use
    localStorage.setItem('intervals_athlete_profile', JSON.stringify(profile));

    return {
      // Personal info
      id: profile.id,
      name: profile.name,
      email: profile.email,

      // Physical stats
      weight: profile.weight,
      weightInLbs: profile.weight ? Math.round(profile.weight * 2.20462) : null,

      // Training thresholds
      ftp: profile.ftp,
      ftpWatts: profile.ftpWatts,
      maxHR: profile.maxHR,
      restingHR: profile.restingHR,
      ltHR: profile.ltHR,

      // Zones
      powerZones: profile.power_zones,
      hrZones: profile.hr_zones,
      paceZones: profile.pace_zones,

      // Other useful data
      sex: profile.sex,
      dob: profile.dob, // Date of birth
      tss_per_hour: profile.tss_per_hour,

      // Raw profile for future use
      raw: profile
    };
  }

  /**
   * Get activities for a date range
   * @param {string} oldest - ISO date string (e.g., '2024-11-01')
   * @param {string} newest - ISO date string (e.g., '2024-12-02')
   */
  async getActivities(oldest, newest) {
    const { athleteId } = this.getCredentials();

    if (!oldest || !newest) {
      // Default to last 30 days
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);

      oldest = start.toISOString().split('T')[0];
      newest = end.toISOString().split('T')[0];
    }

    return this.makeRequest(`/athlete/${athleteId}/activities`, {
      params: { oldest, newest }
    });
  }

  /**
   * Get recent activities (last 30 days)
   */
  async getRecentActivities() {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);

    return this.getActivities(
      start.toISOString().split('T')[0],
      end.toISOString().split('T')[0]
    );
  }

  /**
   * Get today's activities
   */
  async getTodaysActivities() {
    const today = new Date().toISOString().split('T')[0];
    return this.getActivities(today, today);
  }

  /**
   * Get specific activity by ID
   */
  async getActivity(activityId) {
    return this.makeRequest(`/activity/${activityId}`);
  }

  /**
   * Get fitness data (CTL/ATL/TSB)
   * @param {string} oldest - ISO date string
   * @param {string} newest - ISO date string
   */

  /**
   * Get current fitness metrics (CTL/ATL/TSB) from wellness data
   */
  async getCurrentFitness() {
    const today = new Date().toISOString().split('T')[0];

    // Get last 7 days to ensure we have data
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    try {
      const wellness = await this.getWellness(
        weekAgo.toISOString().split('T')[0],
        today
      );

      // Wellness is an array of daily records
      if (wellness && wellness.length > 0) {
        // Sort by date (newest first)
        const sorted = wellness.sort((a, b) =>
          new Date(b.id) - new Date(a.id)
        );

        // Find first record with fitness data
        const latestWithFitness = sorted.find(w =>
          w.ctl !== undefined && w.ctl !== null
        );

        if (latestWithFitness) {
          return {
            ctl: latestWithFitness.ctl,
            atl: latestWithFitness.atl,
            tsb: latestWithFitness.ctl - latestWithFitness.atl, // Calculate TSB
            load: latestWithFitness.load,
            date: latestWithFitness.id
          };
        }
      }

      console.warn('No fitness data in wellness records');
      return null;
    } catch (error) {
      console.warn('Could not fetch fitness data:', error.message);
      return null;
    }
  }

  /**
   * Get wellness data (weight, sleep, HRV, etc.)
   * @param {string} oldest - ISO date string
   * @param {string} newest - ISO date string
   */
  async getWellness(oldest, newest) {
    const { athleteId } = this.getCredentials();

    if (!oldest || !newest) {
      // Default to last 90 days
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 90);

      oldest = start.toISOString().split('T')[0];
      newest = end.toISOString().split('T')[0];
    }

    return this.makeRequest(`/athlete/${athleteId}/wellness`, {
      params: { oldest, newest }
    });
  }

  /**
   * Get athlete's power zones
   */
  async getPowerZones() {
    const athlete = await this.getAthlete();
    return {
      ftp: athlete.ftp || 250,
      ftpWatts: athlete.ftpWatts || 250,
      zones: athlete.power_zones || null
    };
  }

  /**
   * Get athlete's heart rate zones
   */
  async getHeartRateZones() {
    const athlete = await this.getAthlete();
    return {
      maxHR: athlete.maxHR || 190,
      restingHR: athlete.restingHR || 60,
      zones: athlete.hr_zones || null
    };
  }

  /**
   * Convert Intervals.icu activity to TrainFuel format
   * This makes it compatible with your existing workoutAnalyzer
   */
  convertActivity(intervalsActivity) {
    return {
      // Basic info
      id: intervalsActivity.id,
      name: intervalsActivity.name || intervalsActivity.type,
      type: this.mapActivityType(intervalsActivity.type),
      start_date: intervalsActivity.start_date_local,
      start_date_local: intervalsActivity.start_date_local,

      // Duration and distance
      moving_time: intervalsActivity.moving_time || intervalsActivity.elapsed_time,
      elapsed_time: intervalsActivity.elapsed_time,
      distance: intervalsActivity.distance,

      // Performance metrics
      average_speed: intervalsActivity.average_speed,
      max_speed: intervalsActivity.max_speed,
      average_heartrate: intervalsActivity.average_hr,
      max_heartrate: intervalsActivity.max_hr,
      average_cadence: intervalsActivity.average_cadence,

      // Power data (cycling)
      average_watts: intervalsActivity.average_watts,
      weighted_average_watts: intervalsActivity.np, // Normalized Power
      max_watts: intervalsActivity.max_watts,

      // Training metrics - THIS IS THE GOLD!
      suffer_score: intervalsActivity.tss, // Real TSS from Intervals.icu!
      intensity: intervalsActivity.intensity, // Intensity Factor

      // Additional Intervals.icu specific data
      intervals_data: {
        tss: intervalsActivity.tss,
        intensity_factor: intervalsActivity.intensity,
        normalized_power: intervalsActivity.np,
        variability_index: intervalsActivity.variability_index,
        efficiency_factor: intervalsActivity.efficiency_factor,
        decoupling: intervalsActivity.decoupling,
        training_load: intervalsActivity.training_load,
        avg_power_hr_ratio: intervalsActivity.avg_power_hr_ratio
      },

      // Metadata
      source: 'intervals.icu',
      hasRealTSS: !!intervalsActivity.tss,
      hasPowerData: !!intervalsActivity.np
    };
  }

  /**
   * Map Intervals.icu activity types to Strava-like types
   */
  mapActivityType(intervalsType) {
    const typeMap = {
      'Ride': 'Ride',
      'Run': 'Run',
      'Swim': 'Swim',
      'Walk': 'Walk',
      'Hike': 'Hike',
      'VirtualRide': 'VirtualRide',
      'VirtualRun': 'VirtualRun',
      'WeightTraining': 'WeightTraining',
      'Yoga': 'Yoga',
      'Workout': 'Workout',
      'Other': 'Workout'
    };

    return typeMap[intervalsType] || 'Workout';
  }

  /**
   * Get comprehensive training data for TrainFuel
   * Returns activities + fitness metrics + wellness data
   * Fitness and wellness are optional (won't break if unavailable)
   */
  async getTrainingData() {
    try {
      // Fetch activities (this is the important part!)
      console.log('Fetching activities from Intervals.icu...');
      const activities = await this.getRecentActivities();

      // Convert activities to TrainFuel format
      const convertedActivities = activities.map(a => this.convertActivity(a));
      console.log(`Converted ${convertedActivities.length} activities from Intervals.icu`);

      // Try to fetch fitness data (optional - gracefully handle failure)
      let fitness = null;
      try {
        fitness = await this.getCurrentFitness();
        console.log('Fitness data loaded:', fitness);
      } catch (fitnessError) {
        console.warn('Fitness data not available:', fitnessError.message);
        console.log('This is normal if you have less than 42 days of training data');
        // Don't throw - continue without fitness data
      }

      // Try to fetch wellness data (optional)
      let wellness = [];
      try {
        wellness = await this.getWellness();
        console.log('Wellness data loaded');
      } catch (wellnessError) {
        console.warn('Wellness data not available:', wellnessError.message);
        // Don't throw - continue without wellness data
      }

      // Return what we have (activities are guaranteed, fitness/wellness optional)
      return {
        activities: convertedActivities,
        fitness: fitness ? {
          ctl: fitness?.ctl || 0,
          atl: fitness?.atl || 0,
          tsb: fitness?.tsb || 0,
          rampRate: fitness?.ramp_rate || 0,
          load: fitness?.load || 0
        } : null,
        wellness: wellness || [],
        source: 'intervals.icu',
        hasFitnessData: !!fitness
      };
    } catch (error) {
      console.error('Error fetching Intervals.icu training data:', error);
      throw error; // Only throw if activities fetch fails
    }
  }

  /**
   * Clear cache (useful for forcing refresh)
   */
  clearCache() {
    this.cache.clear();
    console.log('Intervals.icu cache cleared');
  }

  /**
   * Test API connection
   */
  async testConnection() {
    try {
      const athlete = await this.getAthlete();
      console.log('Intervals.icu connection successful:', {
        name: athlete.name,
        athleteId: athlete.id
      });
      return true;
    } catch (error) {
      console.error('Intervals.icu connection failed:', error);
      return false;
    }
  }
}

export default new IntervalsService();
