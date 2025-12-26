// src/utils/swimConverter.js
// Converts swim distances from meters to yards and calculates laps

/**
 * Convert meters to yards/meters based on pool type and calculate laps
 * @param {number} meters - Distance in meters
 * @param {string} poolType - '25-yards', '25-meters', or '50-meters'
 * @returns {object} - { distance, unit, laps, poolLength }
 */
export const convertSwimDistance = (meters, poolType = '25-yards') => {
  let distance, unit, poolLength, laps;

  switch (poolType) {
    case '25-yards':
      // Convert meters to yards (1m = 1.09361 yards)
      // But for swimming, we typically use 1:1 conversion for training purposes
      distance = Math.round(meters); // Keep same number, just change unit
      unit = 'yards';
      poolLength = 25;
      laps = Math.ceil(distance / poolLength);
      break;

    case '25-meters':
      distance = meters;
      unit = 'meters';
      poolLength = 25;
      laps = Math.ceil(distance / poolLength);
      break;

    case '50-meters':
      distance = meters;
      unit = 'meters';
      poolLength = 50;
      laps = Math.ceil(distance / poolLength);
      break;

    default:
      distance = meters;
      unit = 'yards';
      poolLength = 25;
      laps = Math.ceil(distance / poolLength);
  }

  return {
    distance,
    unit,
    laps,
    poolLength,
    formatted: `${distance} ${unit} (${laps} laps)`
  };
};

/**
 * Parse swim workout description and convert all distances
 * @param {string} description - Workout description with meter distances
 * @param {string} poolType - Pool type setting
 * @returns {string} - Updated description with converted distances
 */
export const convertSwimWorkoutDescription = (description, poolType = '25-yards') => {
  if (!description) return description;

  // Find all meter distances (e.g., "2000m", "400m", "6x300m")
  const meterPattern = /(\d+)m\b/g;
  
  return description.replace(meterPattern, (match, meters) => {
    const converted = convertSwimDistance(parseInt(meters), poolType);
    return `${converted.distance}${converted.unit}`;
  });
};

/**
 * Parse swim structure and add lap counts
 * @param {string} structure - Workout structure (e.g., "Warmup 400m, Main 1200m Z2, Cooldown 400m")
 * @param {string} poolType - Pool type setting
 * @returns {string} - Structure with lap counts
 */
export const convertSwimStructure = (structure, poolType = '25-yards') => {
  if (!structure) return structure;

  const meterPattern = /(\d+)m\b/g;
  
  return structure.replace(meterPattern, (match, meters) => {
    const converted = convertSwimDistance(parseInt(meters), poolType);
    return `${converted.distance}${converted.unit} (${converted.laps} laps)`;
  });
};

export default {
  convertSwimDistance,
  convertSwimWorkoutDescription,
  convertSwimStructure
};