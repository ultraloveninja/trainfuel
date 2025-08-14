// Convert Strava activities to our training data format
export const processStravaActivities = (activities) => {
  const processedActivities = activities.map(activity => ({
    id: activity.id,
    date: activity.start_date.split('T')[0],
    type: mapActivityType(activity.type, activity.name),
    duration: Math.round(activity.moving_time / 60), // Convert to minutes
    intensity: calculateIntensity(activity),
    distance: activity.distance,
    elevationGain: activity.total_elevation_gain,
    averageHeartRate: activity.average_heartrate,
    maxHeartRate: activity.max_heartrate,
    averagePower: activity.average_watts,
    maxPower: activity.max_watts,
    tss: calculateTSS(activity),
    calories: activity.calories || estimateCalories(activity)
  }));

  return processedActivities;
};

// Map Strava activity types to our categories
const mapActivityType = (stravaType, name) => {
  const typeMapping = {
    'Ride': 'Cycling',
    'VirtualRide': 'Indoor Cycling',
    'Run': 'Running',
    'Swim': 'Swimming',
    'WeightTraining': 'Strength Training',
    'Yoga': 'Recovery',
    'Walk': 'Recovery Walk'
  };

  // Check for specific workout types in the name
  if (name.toLowerCase().includes('interval')) return 'Interval Training';
  if (name.toLowerCase().includes('recovery')) return 'Recovery Ride';
  if (name.toLowerCase().includes('tempo')) return 'Tempo';
  if (name.toLowerCase().includes('endurance')) return 'Endurance';

  return typeMapping[stravaType] || stravaType;
};

// Calculate training intensity based on heart rate zones
const calculateIntensity = (activity) => {
  if (!activity.average_heartrate) return 'Unknown';
  
  // These should be personalized based on user's HR zones
  const maxHR = 190; // Should come from user profile
  const hrZones = {
    zone1: maxHR * 0.6,
    zone2: maxHR * 0.7,
    zone3: maxHR * 0.8,
    zone4: maxHR * 0.9
  };

  const avgHR = activity.average_heartrate;
  
  if (avgHR < hrZones.zone1) return 'Very Low';
  if (avgHR < hrZones.zone2) return 'Low';
  if (avgHR < hrZones.zone3) return 'Moderate';
  if (avgHR < hrZones.zone4) return 'High';
  return 'Very High';
};

// Calculate Training Stress Score (TSS)
const calculateTSS = (activity) => {
  // Simplified TSS calculation
  // Real TSS requires FTP (Functional Threshold Power)
  const duration = activity.moving_time / 3600; // hours
  const avgPower = activity.average_watts;
  const ftp = 250; // Should come from user profile

  if (avgPower && ftp) {
    const intensity = avgPower / ftp;
    return Math.round(duration * intensity * intensity * 100);
  }

  // Fallback: estimate based on heart rate and duration
  const intensityFactor = calculateIntensityFactor(activity);
  return Math.round(duration * intensityFactor * 100);
};

const calculateIntensityFactor = (activity) => {
  const intensity = calculateIntensity(activity);
  const factors = {
    'Very Low': 0.3,
    'Low': 0.5,
    'Moderate': 0.7,
    'High': 0.85,
    'Very High': 1.0
  };
  return factors[intensity] || 0.6;
};

// Estimate calories if not provided
const estimateCalories = (activity) => {
  const duration = activity.moving_time / 3600; // hours
  const type = activity.type;
  
  // Rough estimates per hour by activity type
  const caloriesPerHour = {
    'Ride': 600,
    'VirtualRide': 650,
    'Run': 700,
    'Swim': 500,
    'WeightTraining': 400
  };

  return Math.round(duration * (caloriesPerHour[type] || 500));
};

// Calculate weekly training load
export const calculateWeeklyTSS = (activities) => {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const recentActivities = activities.filter(activity => 
    new Date(activity.date) >= oneWeekAgo
  );

  return recentActivities.reduce((total, activity) => total + activity.tss, 0);
};

// Analyze training phase based on recent activities
export const analyzeTrainingPhase = (activities) => {
  const recentActivities = activities.slice(0, 10); // Last 10 activities
  const avgIntensityScore = recentActivities.reduce((sum, activity) => {
    const intensityScores = {
      'Very Low': 1,
      'Low': 2,
      'Moderate': 3,
      'High': 4,
      'Very High': 5
    };
    return sum + (intensityScores[activity.intensity] || 3);
  }, 0) / recentActivities.length;

  const weeklyTSS = calculateWeeklyTSS(activities);

  if (weeklyTSS > 600 && avgIntensityScore > 3.5) return 'Peak';
  if (weeklyTSS > 400 && avgIntensityScore > 3) return 'Build';
  if (weeklyTSS > 200) return 'Base';
  return 'Recovery';
};