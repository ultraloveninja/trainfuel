// src/services/activityMerger.js
// Intelligently merges activities from Strava and Intervals.icu
// Prefers Intervals.icu data (more accurate TSS) but keeps Strava social features

class ActivityMerger {
  /**
   * Merge activities from Strava and Intervals.icu
   * @param {Array} stravaActivities - Activities from Strava
   * @param {Array} intervalsActivities - Activities from Intervals.icu
   * @returns {Array} Merged activities with best data from each source
   */
  mergeActivities(stravaActivities = [], intervalsActivities = []) {
    console.log('Merging activities:', {
      strava: stravaActivities.length,
      intervals: intervalsActivities.length
    });

    // If only one source has data, return that
    if (intervalsActivities.length === 0) return stravaActivities;
    if (stravaActivities.length === 0) return intervalsActivities;

    // Create a map of Intervals.icu activities by date/time for quick lookup
    const intervalsMap = new Map();
    intervalsActivities.forEach(activity => {
      const key = this.generateActivityKey(activity);
      intervalsMap.set(key, activity);
    });

    // Merge activities, preferring Intervals.icu data
    const merged = [];
    const processedKeys = new Set();

    // First pass: Match Strava activities with Intervals.icu
    stravaActivities.forEach(stravaActivity => {
      const key = this.generateActivityKey(stravaActivity);
      const intervalsActivity = intervalsMap.get(key);

      if (intervalsActivity) {
        // Found a match! Merge the two
        merged.push(this.mergeActivityPair(stravaActivity, intervalsActivity));
        processedKeys.add(key);
      } else {
        // No match, keep Strava activity as-is
        merged.push({
          ...stravaActivity,
          source: 'strava',
          merged: false
        });
      }
    });

    // Second pass: Add Intervals.icu activities that weren't matched
    intervalsActivities.forEach(intervalsActivity => {
      const key = this.generateActivityKey(intervalsActivity);
      if (!processedKeys.has(key)) {
        merged.push({
          ...intervalsActivity,
          source: 'intervals.icu',
          merged: false
        });
      }
    });

    // Sort by date (newest first)
    merged.sort((a, b) => {
      const dateA = new Date(a.start_date_local || a.start_date);
      const dateB = new Date(b.start_date_local || b.start_date);
      return dateB - dateA;
    });

    console.log('Merge complete:', {
      total: merged.length,
      merged: merged.filter(a => a.merged).length,
      stravaOnly: merged.filter(a => a.source === 'strava').length,
      intervalsOnly: merged.filter(a => a.source === 'intervals.icu').length
    });

    return merged;
  }

  /**
   * Generate a unique key for matching activities across sources
   * Activities are considered the same if they start within 5 minutes and are the same type
   */
  generateActivityKey(activity) {
    const startDate = new Date(activity.start_date_local || activity.start_date);
    
    // Round to nearest 5 minutes to handle slight time differences
    const roundedTime = new Date(
      Math.round(startDate.getTime() / (5 * 60 * 1000)) * (5 * 60 * 1000)
    );

    const type = (activity.type || '').toLowerCase();
    const dateKey = roundedTime.toISOString();

    return `${type}_${dateKey}`;
  }

  /**
   * Merge a matched pair of activities
   * Prefers Intervals.icu metrics but keeps Strava social data
   */
  mergeActivityPair(stravaActivity, intervalsActivity) {
    console.log('Merging pair:', {
      name: stravaActivity.name,
      stravaTSS: stravaActivity.suffer_score,
      intervalsTSS: intervalsActivity.intervals_data?.tss
    });

    return {
      // Use Strava ID and basic info (for links back to Strava)
      id: stravaActivity.id,
      name: stravaActivity.name || intervalsActivity.name,
      type: stravaActivity.type,
      start_date: stravaActivity.start_date,
      start_date_local: stravaActivity.start_date_local,

      // Duration and distance - prefer Intervals.icu if available
      moving_time: intervalsActivity.moving_time || stravaActivity.moving_time,
      elapsed_time: intervalsActivity.elapsed_time || stravaActivity.elapsed_time,
      distance: intervalsActivity.distance || stravaActivity.distance,

      // Speed metrics
      average_speed: intervalsActivity.average_speed || stravaActivity.average_speed,
      max_speed: intervalsActivity.max_speed || stravaActivity.max_speed,

      // Heart rate - prefer Intervals.icu
      average_heartrate: intervalsActivity.average_heartrate || stravaActivity.average_heartrate,
      max_heartrate: intervalsActivity.max_heartrate || stravaActivity.max_heartrate,

      // Power - DEFINITELY prefer Intervals.icu (more accurate)
      average_watts: intervalsActivity.average_watts || stravaActivity.average_watts,
      weighted_average_watts: intervalsActivity.weighted_average_watts || stravaActivity.weighted_average_watts,
      max_watts: intervalsActivity.max_watts || stravaActivity.max_watts,

      // CRITICAL: Use real TSS from Intervals.icu
      suffer_score: intervalsActivity.intervals_data?.tss || stravaActivity.suffer_score,
      
      // Store both TSS values for comparison/debugging
      tss_comparison: {
        intervals: intervalsActivity.intervals_data?.tss,
        strava: stravaActivity.suffer_score,
        source: intervalsActivity.intervals_data?.tss ? 'intervals.icu' : 'strava'
      },

      // Intervals.icu specific metrics (THE GOOD STUFF!)
      intervals_data: intervalsActivity.intervals_data,
      intensity_factor: intervalsActivity.intervals_data?.intensity_factor,
      normalized_power: intervalsActivity.intervals_data?.normalized_power,
      
      // Strava social data
      strava_data: {
        kudos_count: stravaActivity.kudos_count,
        comment_count: stravaActivity.comment_count,
        achievement_count: stravaActivity.achievement_count,
        athlete_count: stravaActivity.athlete_count,
        trainer: stravaActivity.trainer,
        commute: stravaActivity.commute,
        manual: stravaActivity.manual,
        private: stravaActivity.private,
        flagged: stravaActivity.flagged
      },

      // Metadata
      source: 'merged',
      merged: true,
      has_intervals_data: !!intervalsActivity.intervals_data?.tss,
      has_strava_data: true,
      
      // Store both IDs for reference
      strava_id: stravaActivity.id,
      intervals_id: intervalsActivity.id
    };
  }

  /**
   * Get statistics about the merge
   */
  getMergeStats(activities) {
    const stats = {
      total: activities.length,
      merged: 0,
      stravaOnly: 0,
      intervalsOnly: 0,
      withRealTSS: 0,
      withPowerData: 0,
      avgTSSDifference: 0
    };

    let tssDiffSum = 0;
    let tssDiffCount = 0;

    activities.forEach(activity => {
      if (activity.merged) {
        stats.merged++;
        
        // Calculate TSS difference if both sources have data
        if (activity.tss_comparison?.intervals && activity.tss_comparison?.strava) {
          const diff = Math.abs(
            activity.tss_comparison.intervals - activity.tss_comparison.strava
          );
          tssDiffSum += diff;
          tssDiffCount++;
        }
      } else if (activity.source === 'strava') {
        stats.stravaOnly++;
      } else if (activity.source === 'intervals.icu') {
        stats.intervalsOnly++;
      }

      if (activity.has_intervals_data || activity.intervals_data?.tss) {
        stats.withRealTSS++;
      }

      if (activity.weighted_average_watts || activity.normalized_power) {
        stats.withPowerData++;
      }
    });

    if (tssDiffCount > 0) {
      stats.avgTSSDifference = Math.round(tssDiffSum / tssDiffCount);
    }

    return stats;
  }

  /**
   * Filter activities to only those with real Intervals.icu TSS data
   * Useful for ensuring accurate training load calculations
   */
  filterToRealTSS(activities) {
    return activities.filter(activity => 
      activity.has_intervals_data || 
      activity.intervals_data?.tss ||
      activity.source === 'intervals.icu'
    );
  }

  /**
   * Get activities for a specific date range
   */
  filterByDateRange(activities, startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    return activities.filter(activity => {
      const activityDate = new Date(activity.start_date_local || activity.start_date);
      return activityDate >= start && activityDate <= end;
    });
  }

  /**
   * Get today's activities
   */
  getTodaysActivities(activities) {
    const today = new Date().toISOString().split('T')[0];
    return activities.filter(activity => {
      const activityDate = (activity.start_date_local || activity.start_date).split('T')[0];
      return activityDate === today;
    });
  }

  /**
   * Get activities from the last N days
   */
  getRecentActivities(activities, days = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return activities.filter(activity => {
      const activityDate = new Date(activity.start_date_local || activity.start_date);
      return activityDate > cutoffDate;
    });
  }
}

export default new ActivityMerger();
