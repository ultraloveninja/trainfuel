// src/services/workoutAnalyzer.js
// ENHANCED VERSION - Now uses real TSS from Intervals.icu when available!
// This replaces your existing workoutAnalyzer.js

import workoutAnalyzerOriginal from './workoutAnalyzer';

class EnhancedWorkoutAnalyzer {
  /**
   * Analyze activity with preference for Intervals.icu data
   * Falls back to estimation if Intervals.icu data not available
   */
  analyzeActivity(activity) {
    if (!activity) return null;

    // Check if this activity has real Intervals.icu data
    const hasIntervalsData = activity.has_intervals_data || activity.intervals_data?.tss;
    
    if (hasIntervalsData) {
      console.log('Using real Intervals.icu data for:', activity.name);
      return this.analyzeWithIntervalsData(activity);
    } else {
      console.log('Using estimated data for:', activity.name);
      return this.analyzeWithEstimation(activity);
    }
  }

  /**
   * Analyze activity using real Intervals.icu metrics
   * This is THE GOLD - real TSS, real IF, real NP!
   */
  analyzeWithIntervalsData(activity) {
    const duration = activity.moving_time / 3600;
    const distance = activity.distance / 1000;
    const type = activity.type.toLowerCase();
    
    // Use REAL TSS from Intervals.icu
    const tss = activity.intervals_data.tss || activity.suffer_score;
    
    // Use REAL Intensity Factor from Intervals.icu
    const intensityFactor = activity.intervals_data.intensity_factor || activity.intensity;
    
    // Determine intensity from IF (more accurate than HR or pace!)
    let intensity = 'moderate';
    if (intensityFactor >= 1.05) intensity = 'very_high';
    else if (intensityFactor >= 0.95) intensity = 'high';
    else if (intensityFactor >= 0.85) intensity = 'moderate';
    else intensity = 'low';

    // Use real normalized power if available
    const normalizedPower = activity.intervals_data.normalized_power || 
                           activity.weighted_average_watts;

    // Calculate nutrition needs based on real TSS
    const carbsDuringWorkout = this.calculateWorkoutCarbs(duration, intensity);
    const recoveryCarbs = this.calculateRecoveryCarbs(tss, type);
    const proteinNeeds = this.calculateProteinNeeds(type, duration);
    
    // Estimate calories if not provided
    const caloriesBurned = activity.calories || this.estimateCaloriesFromTSS(tss, type);
    
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
      intensityFactor,
      normalizedPower,
      caloriesBurned,
      carbsDuringWorkout,
      recoveryCarbs,
      proteinNeeds,
      hydrationNeeds,
      dataSource: 'intervals.icu',
      dataQuality: 'high', // Real measured data
      rawActivity: {
        id: activity.id,
        name: activity.name,
        startDate: activity.start_date_local,
        source: activity.source
      },
      intervalsMetrics: {
        variabilityIndex: activity.intervals_data.variability_index,
        efficiencyFactor: activity.intervals_data.efficiency_factor,
        decoupling: activity.intervals_data.decoupling,
        avgPowerHrRatio: activity.intervals_data.avg_power_hr_ratio
      }
    };
  }

  /**
   * Analyze activity using estimation (fallback)
   * Uses the original workoutAnalyzer logic
   */
  analyzeWithEstimation(activity) {
    // Use original analyzer for estimation
    const analysis = workoutAnalyzerOriginal.analyzeActivity(activity);
    
    if (analysis) {
      analysis.dataSource = 'estimated';
      analysis.dataQuality = 'medium'; // Estimated data
    }
    
    return analysis;
  }

  /**
   * Estimate calories from TSS (when not provided)
   */
  estimateCaloriesFromTSS(tss, type) {
    // General rule: 1 TSS ≈ 3-5 calories depending on activity
    const calPerTSS = {
      'ride': 4,
      'run': 5,
      'swim': 4.5
    };
    
    const multiplier = calPerTSS[type.toLowerCase()] || 4;
    return Math.round(tss * multiplier);
  }

  /**
   * Calculate carb needs during workout based on intensity
   */
  calculateWorkoutCarbs(duration, intensity) {
    if (duration < 0.75) return 0;
    
    const carbRates = {
      'low': 0,
      'moderate': 30,
      'high': 60,
      'very_high': 90
    };
    
    return Math.round((carbRates[intensity] || 30) * duration);
  }

  /**
   * Calculate recovery carbs from TSS
   */
  calculateRecoveryCarbs(tss, type) {
    const carbsPerTSS = type.toLowerCase().includes('ride') ? 0.7 : 0.5;
    return Math.round(tss * carbsPerTSS);
  }

  /**
   * Calculate protein needs
   */
  calculateProteinNeeds(type, duration) {
    const proteinPerHour = type.toLowerCase().includes('strength') ? 15 : 10;
    return Math.round(Math.min(proteinPerHour * duration, 40));
  }

  /**
   * Calculate hydration needs
   */
  calculateHydration(duration, temp = 20) {
    const baseRate = 500;
    let tempAdjustment = 1.0;
    if (temp > 25) tempAdjustment = 1.3;
    else if (temp > 20) tempAdjustment = 1.15;
    else if (temp < 10) tempAdjustment = 0.9;
    
    const totalMl = Math.round(baseRate * duration * tempAdjustment);
    
    return {
      total: totalMl,
      oz: Math.round(totalMl * 0.033814),
      perHour: Math.round(totalMl / duration),
      guideline: `${Math.round(totalMl * 0.033814)}oz total (${Math.round((totalMl / duration) * 0.033814)}oz/hour)`
    };
  }

  /**
   * Analyze weekly load - now with better accuracy from Intervals.icu
   */
  analyzeWeeklyLoad(activities) {
    if (!activities) return this.getEmptyWeeklyAnalysis();
    
    const activitiesArray = Array.isArray(activities) ? activities : [activities];
    
    if (activitiesArray.length === 0) {
      return this.getEmptyWeeklyAnalysis();
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const weekActivities = activitiesArray.filter(a => 
      a && a.start_date && new Date(a.start_date) > sevenDaysAgo
    );

    const analyzed = weekActivities.map(a => this.analyzeActivity(a));

    const weeklyTSS = analyzed.reduce((sum, a) => sum + (a?.tss || 0), 0);
    const weeklyDuration = analyzed.reduce((sum, a) => sum + (a?.duration || 0), 0);
    const weeklyCalories = analyzed.reduce((sum, a) => sum + (a?.caloriesBurned || 0), 0);

    // Count how many activities have real Intervals.icu data
    const realDataCount = analyzed.filter(a => a?.dataSource === 'intervals.icu').length;
    const estimatedCount = analyzed.filter(a => a?.dataSource === 'estimated').length;

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
      activities: analyzed,
      dataQuality: {
        realData: realDataCount,
        estimated: estimatedCount,
        percentReal: Math.round((realDataCount / weekActivities.length) * 100)
      }
    };
  }

  getEmptyWeeklyAnalysis() {
    return {
      weeklyTSS: 0,
      weeklyDuration: 0,
      weeklyCalories: 0,
      avgIntensity: 'rest',
      workoutCount: 0,
      activities: [],
      dataQuality: {
        realData: 0,
        estimated: 0,
        percentReal: 0
      }
    };
  }

  /**
   * Get data quality summary
   * Useful for showing users how accurate their training data is
   */
  getDataQualitySummary(activities) {
    if (!activities || activities.length === 0) {
      return {
        quality: 'no_data',
        message: 'No activities to analyze'
      };
    }

    const analyzed = activities.map(a => this.analyzeActivity(a));
    const realDataCount = analyzed.filter(a => a?.dataSource === 'intervals.icu').length;
    const percentReal = Math.round((realDataCount / activities.length) * 100);

    let quality = 'low';
    let message = 'Most data is estimated. Connect Intervals.icu for better accuracy.';

    if (percentReal >= 80) {
      quality = 'high';
      message = 'Great! Most of your training data is from Intervals.icu.';
    } else if (percentReal >= 50) {
      quality = 'medium';
      message = 'Good mix of real and estimated data.';
    }

    return {
      quality,
      message,
      percentReal,
      realDataCount,
      totalCount: activities.length
    };
  }
}

export default new EnhancedWorkoutAnalyzer();
