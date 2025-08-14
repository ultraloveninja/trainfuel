// Helper pure functions for workout logic
export const determineWorkoutType = (activities = [], seasonType = 'in-season') => {
  const daysSinceHard = activities.findIndex(a => a.intensity === 'High' || a.intensity === 'Very High');

  if (daysSinceHard >= 2 || activities.length === 0) {
    return seasonType === 'in-season' ? 'Quality Session' : 'Interval Training';
  } else if (daysSinceHard === 1) {
    return 'Active Recovery';
  } else {
    return 'Base Endurance';
  }
};

export const getPrimaryFocus = (upcomingEvents = []) => {
  if (upcomingEvents.length > 0) {
    const nextEvent = upcomingEvents[0];
    if (nextEvent.weeksOut <= 2) return 'Race Prep';
    if (nextEvent.weeksOut <= 8) return 'Build Phase';
  }
  return 'General Fitness';
};

export const getMainWorkout = (activities = [], seasonType = 'in-season', upcomingEvents = []) => {
  const workoutType = determineWorkoutType(activities, seasonType);
  const focus = getPrimaryFocus(upcomingEvents);

  if (workoutType === 'Quality Session') {
    if (focus === 'Race Prep') {
      return "3x8min at race pace with 3min recovery";
    }
    return "4x5min at threshold with 2:30 recovery";
  } else if (workoutType === 'Active Recovery') {
    return "30-45min easy with 5x30sec form drills";
  }
  return "60-90min aerobic base with negative split final 20min";
};

export const calculateTargetRPE = (activities = [], seasonType = 'in-season') => {
  const workoutType = determineWorkoutType(activities, seasonType);
  if (workoutType === 'Quality Session') return '7-8/10';
  if (workoutType === 'Active Recovery') return '3-4/10';
  return '5-6/10';
};

export const getWorkoutRationale = (activities = [], upcomingEvents = [], trainingData = {}) => {
  const daysSinceHard = activities.findIndex(a => a.intensity === 'High' || a.intensity === 'Very High');
  const upcomingRace = upcomingEvents.length > 0 ? upcomingEvents[0] : null;

  if (upcomingRace && upcomingRace.weeksOut <= 12) {
    let buildPhase = "";
    if (upcomingRace.weeksOut <= 3) {
      buildPhase = " Taper phase - maintain intensity while reducing volume.";
    } else if (upcomingRace.details?.distance) {
      buildPhase = ` Build towards ${upcomingRace.details.distance} race distance with progressive overload.`;
    }

    return `Building towards ${upcomingRace.name} in ${upcomingRace.weeksOut} weeks.${buildPhase} Focus on event-specific fitness.`;

  } else if (daysSinceHard >= 3 || activities.length === 0) {
    return activities.length === 0 
      ? "No recent activity data available. Starting with quality work to build fitness foundation."
      : `You haven't had a hard session in ${daysSinceHard} days. Time for some quality work to maintain/build fitness.`;
  } else if (daysSinceHard === 1) {
    return `Yesterday was a hard effort (TSS: ${activities[0]?.tss || 'unknown'}). Today should focus on active recovery to promote adaptation.`;
  } else {
    return `Based on your recent training load (Weekly TSS: ${trainingData?.weeklyTSS || 'calculating...'}), continuing aerobic development while managing fatigue.`;
  }
};
