// src/utils/storageUtils.js

// Events storage utilities
export const loadEventsFromStorage = () => {
  try {
    const stored = localStorage.getItem('trainfuel_upcoming_events');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading events from storage:', error);
    return [];
  }
};

export const saveEventsToStorage = (events) => {
  try {
    localStorage.setItem('trainfuel_upcoming_events', JSON.stringify(events));
  } catch (error) {
    console.error('Error saving events to storage:', error);
  }
};

// Food preferences storage utilities
export const loadFoodPreferencesFromStorage = () => {
  try {
    const stored = localStorage.getItem('trainfuel_food_preferences');
    return stored ? JSON.parse(stored) : { likedFoods: [], dislikedFoods: [] };
  } catch (error) {
    console.error('Error loading food preferences from storage:', error);
    return { likedFoods: [], dislikedFoods: [] };
  }
};

export const saveFoodPreferencesToStorage = (preferences) => {
  try {
    localStorage.setItem('trainfuel_food_preferences', JSON.stringify(preferences));
  } catch (error) {
    console.error('Error saving food preferences to storage:', error);
  }
};

// Daily food log storage utilities
export const loadDailyFoodLogFromStorage = () => {
  try {
    const stored = localStorage.getItem('trainfuel_daily_food_log');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading daily food log from storage:', error);
    return [];
  }
};

export const saveDailyFoodLogToStorage = (foodLog) => {
  try {
    localStorage.setItem('trainfuel_daily_food_log', JSON.stringify(foodLog));
  } catch (error) {
    console.error('Error saving daily food log to storage:', error);
  }
};

// Generic storage utilities
export const clearAllAppData = () => {
  try {
    localStorage.removeItem('trainfuel_upcoming_events');
    localStorage.removeItem('trainfuel_food_preferences');
    localStorage.removeItem('trainfuel_daily_food_log');
    localStorage.removeItem('strava_access_token');
    localStorage.removeItem('strava_refresh_token');
    localStorage.removeItem('strava_athlete');
    console.log('All app data cleared from storage');
  } catch (error) {
    console.error('Error clearing app data:', error);
  }
};

export const getStorageSize = () => {
  try {
    let totalSize = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key) && key.startsWith('trainfuel_')) {
        totalSize += localStorage[key].length + key.length;
      }
    }
    return `${(totalSize / 1024).toFixed(2)} KB`;
  } catch (error) {
    console.error('Error calculating storage size:', error);
    return 'Unknown';
  }
};