// src/services/workoutAnalyzer.js
// Analyzes Strava activities to extract nutrition-relevant metrics
// This is the foundation for adaptive nutrition like Fuelin

class WorkoutAnalyzer {
  /**
   * Analyze a Strava activity and extract nutrition-relevant metrics
   * @param {Object} activity - Strava activity object
   * @returns {Object} Analyzed metrics including TSS, intensity, carb needs, etc.
   */
  analyzeActivity(activity) {
    if (!activity) return null;

    const duration = activity.moving_time / 3600; // Convert to hours
    const distance = activity.distance / 1000; // Convert to km
    const type = activity.type.toLowerCase();
    
    // Calculate training stress score (simplified TSS)
    const tss = this.calculateTSS(activity);
    
    // Determine intensity zone (low, moderate, high, very_high)
    const intensity = this.determineIntensity(activity);
    
    // Estimate calories burned
    const caloriesBurned = this.estimateCalories(activity);
    
    // Calculate carbohydrate needs during workout
    const carbsDuringWorkout = this.calculateWorkoutCarbs(duration, intensity);
    
    // Calculate post-workout recovery carbs
    const recoveryCarbs = this.calculateRecoveryCarbs(tss, type);
    
    // Calculate protein needs for recovery
    const proteinNeeds = this.calculateProteinNeeds(type, duration);
    
    // Calculate hydration needs
    const hydrationNeeds = this.calculateHydration(
      duration, 
      activity.average_temp || 20
    );

    return {
      duration,
      distance,
      type,
      tss,
      intensity,
      caloriesBurned,
      carbsDuringWorkout,
      recoveryCarbs,
      proteinNeeds,
      hydrationNeeds,
      rawActivity: {
        id: activity.id,
        name: activity.name,
        startDate: activity.start_date_local
      }
    };
  }

  /**
   * Calculate Training Stress Score (TSS)
   * Power-based if available, otherwise duration/effort-based estimation
   */
  calculateTSS(activity) {
    // Method 1: Power-based TSS (if cycling with power meter)
    if (activity.weighted_average_watts && activity.weighted_average_watts > 0) {
      const np = activity.weighted_average_watts;
      const ftp = 250; // TODO: Get from user settings
      const duration = activity.moving_time / 3600;
      const intensity = np / ftp;
      return Math.round((duration * 3600 * np * intensity) / (ftp * 3600) * 100);
    }
    
    // Method 2: Suffer Score (if available from Strava)
    if (activity.suffer_score) {
      return activity.suffer_score;
    }
    
    // Method 3: Duration and effort-based estimation
    const duration = activity.moving_time / 3600;
    const effortMultiplier = this.getEffortMultiplier(activity);
    return Math.round(duration * 100 * effortMultiplier);
  }

  /**
   * Determine workout intensity level
   * Uses HR zones if available, otherwise speed/pace/power
   */
  determineIntensity(activity) {
    // Method 1: Heart rate zones (most accurate)
    if (activity.average_heartrate && activity.max_heartrate) {
      const hrPercent = activity.average_heartrate / activity.max_heartrate;
      
      if (hrPercent >= 0.90) return 'very_high'; // Z5+ (threshold+)
      if (hrPercent >= 0.80) return 'high';      // Z4 (threshold)
      if (hrPercent >= 0.70) return 'moderate';  // Z3 (tempo)
      return 'low';                               // Z1-Z2 (easy)
    }
    
    // Method 2: Activity-specific metrics
    const type = activity.type.toLowerCase();
    const avgSpeed = activity.average_speed; // m/s
    
    if (type.includes('run')) {
      // Convert speed to pace (min/km)
      const paceMinPerKm = avgSpeed > 0 ? 1000 / (avgSpeed * 60) : 10;
      
      if (paceMinPerKm < 4.5) return 'very_high'; // < 4:30/km
      if (paceMinPerKm < 5.0) return 'high';      // 4:30-5:00/km
      if (paceMinPerKm < 6.0) return 'moderate';  // 5:00-6:00/km
      return 'low';                                // > 6:00/km
    }
    
    if (type.includes('ride')) {
      const speedKmh = avgSpeed * 3.6;
      
      if (speedKmh > 35) return 'very_high';
      if (speedKmh > 30) return 'high';
      if (speedKmh > 25) return 'moderate';
      return 'low';
    }
    
    if (type.includes('swim')) {
      const speedMs = avgSpeed;
      
      if (speedMs > 1.4) return 'high';      // Fast swimming
      if (speedMs > 1.2) return 'moderate';  // Moderate pace
      return 'low';                          // Easy/technique
    }
    
    // Method 3: Strava workout type flag
    if (activity.workout_type) {
      // 0=default, 1=race, 2=long run, 3=intervals
      const workoutIntensity = [null, 'very_high', 'moderate', 'high'];
      return workoutIntensity[activity.workout_type] || 'moderate';
    }
    
    // Default to moderate if we can't determine
    return 'moderate';
  }

  /**
   * Estimate calories burned during workout
   */
  estimateCalories(activity) {
    // Use Strava's calorie calculation if available
    if (activity.calories && activity.calories > 0) {
      return Math.round(activity.calories);
    }
    
    const duration = activity.moving_time / 3600;
    const type = activity.type.toLowerCase();
    
    // Base calories per hour by activity type
    const calPerHour = {
      'run': 600,
      'ride': 500,
      'virtualride': 500,
      'swim': 550,
      'walk': 250,
      'hike': 400,
      'alpineski': 500,
      'nordicski': 700,
      'rowing': 600
    };
    
    const baseCalories = (calPerHour[type] || 400) * duration;
    const intensityMultiplier = this.getIntensityMultiplier(activity);
    
    return Math.round(baseCalories * intensityMultiplier);
  }

  /**
   * Calculate carbohydrate needs during workout
   * Based on Nick Chase's principle of 200-300 cal/hour for 60+ min workouts
   */
  calculateWorkoutCarbs(duration, intensity) {
    // No carbs needed for short workouts
    if (duration < 0.75) return 0; // Less than 45 minutes
    
    // Carb intake rates (g/hour) based on intensity
    // Following sports nutrition guidelines: 30-90g/hour
    const carbRates = {
      'low': 0,         // Easy workouts - fat burning zone
      'moderate': 30,   // Tempo - start fueling
      'high': 60,       // Threshold - significant fueling
      'very_high': 90   // Hard efforts - max fueling
    };
    
    const carbsPerHour = carbRates[intensity] || 30;
    return Math.round(carbsPerHour * duration);
  }

  /**
   * Calculate post-workout recovery carbohydrates
   * Based on training stress and activity type
   */
  calculateRecoveryCarbs(tss, type) {
    // Recovery carbs formula based on TSS
    // More carb-intensive activities (cycling) need more recovery carbs
    const carbsPerTSS = type.toLowerCase().includes('ride') ? 0.7 : 0.5;
    
    return Math.round(tss * carbsPerTSS);
  }

  /**
   * Calculate protein needs for recovery
   * Based on Nick Chase's principle of protein within 30 min post-workout
   */
  calculateProteinNeeds(type, duration) {
    // Different activities have different protein needs
    const proteinPerHour = type.toLowerCase().includes('strength') ? 15 : 10;
    
    // Cap at 40g per workout (more isn't absorbed efficiently)
    return Math.round(Math.min(proteinPerHour * duration, 40));
  }

  /**
   * Calculate hydration needs
   * Based on Nick Chase's principle: 16-20oz before, 6-8oz every 15-20min during
   */
  calculateHydration(duration, temp = 20) {
    // Base hydration rate: 500ml per hour
    const baseRate = 500;
    
    // Adjust for temperature
    let tempAdjustment = 1.0;
    if (temp > 25) tempAdjustment = 1.3;       // Hot weather
    else if (temp > 20) tempAdjustment = 1.15; // Warm weather
    else if (temp < 10) tempAdjustment = 0.9;  // Cold weather
    
    const totalMl = Math.round(baseRate * duration * tempAdjustment);
    
    return {
      total: totalMl,
      oz: Math.round(totalMl * 0.033814), // Convert to oz
      perHour: Math.round(totalMl / duration),
      guideline: `${Math.round(totalMl * 0.033814)}oz total (${Math.round((totalMl / duration) * 0.033814)}oz/hour)`
    };
  }

  /**
   * Get effort multiplier for TSS calculation when power/HR not available
   */
  getEffortMultiplier(activity) {
    // Use average heartrate as proxy for effort
    const hr = activity.average_heartrate;
    
    if (!hr) return 0.7; // Default to moderate-low if no HR data
    
    if (hr > 170) return 1.2;  // Very hard
    if (hr > 150) return 1.0;  // Hard
    if (hr > 130) return 0.8;  // Moderate
    return 0.6;                 // Easy
  }

  /**
   * Get intensity multiplier for calorie estimation
   */
  getIntensityMultiplier(activity) {
    const intensity = this.determineIntensity(activity);
    
    const multipliers = {
      'very_high': 1.3,
      'high': 1.15,
      'moderate': 1.0,
      'low': 0.85
    };
    
    return multipliers[intensity] || 1.0;
  }

  /**
   * Analyze multiple activities to determine weekly training load
   */
  analyzeWeeklyLoad(activities) {
    if (!activities || activities.length === 0) {
      return {
        weeklyTSS: 0,
        weeklyDuration: 0,
        weeklyCalories: 0,
        avgIntensity: 'rest',
        workoutCount: 0
      };
    }

    // Get last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const weekActivities = activities.filter(a => 
      new Date(a.start_date) > sevenDaysAgo
    );

    const analyzed = weekActivities.map(a => this.analyzeActivity(a));

    const weeklyTSS = analyzed.reduce((sum, a) => sum + (a?.tss || 0), 0);
    const weeklyDuration = analyzed.reduce((sum, a) => sum + (a?.duration || 0), 0);
    const weeklyCalories = analyzed.reduce((sum, a) => sum + (a?.caloriesBurned || 0), 0);

    // Determine average intensity
    let avgIntensity = 'low';
    if (weeklyTSS > 500) avgIntensity = 'very_high';
    else if (weeklyTSS > 350) avgIntensity = 'high';
    else if (weeklyTSS > 200) avgIntensity = 'moderate';

    return {
      weeklyTSS: Math.round(weeklyTSS),
      weeklyDuration: Math.round(weeklyDuration * 10) / 10,
      weeklyCalories: Math.round(weeklyCalories),
      avgIntensity,
      workoutCount: weekActivities.length,
      activities: analyzed
    };
  }
}

export default new WorkoutAnalyzer();
