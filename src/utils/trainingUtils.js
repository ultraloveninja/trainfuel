// src/utils/trainingUtils.js
// Enhanced training utilities that calculate adaptive nutrition based on workout data
// This creates the "traffic light" system like Fuelin

import workoutAnalyzer from '../services/workoutAnalyzer';

/**
 * Process Strava activities and calculate nutrition needs
 * This is the main function that drives adaptive nutrition
 */
export const processStravaActivities = (activities, userSettings = {}) => {
  if (!activities || activities.length === 0) {
    return {
      recent: [],
      today: [],
      weeklyTSS: 0,
      weeklyDuration: 0,
      trainingPhase: 'rest',
      todaysNutrition: getRestDayNutrition(userSettings),
      trafficLight: 'red'
    };
  }

  // Analyze each activity
  const analyzedActivities = activities.map(activity => ({
    ...activity,
    analysis: workoutAnalyzer.analyzeActivity(activity)
  }));

  // Get today's workouts
  const today = new Date().toISOString().split('T')[0];
  const todaysWorkouts = analyzedActivities.filter(a => 
    a.start_date_local.startsWith(today)
  );

  // Calculate weekly training load
  const weeklyAnalysis = workoutAnalyzer.analyzeWeeklyLoad(activities);

  // Determine training phase based on weekly load
  const trainingPhase = determineTrainingPhase(
    weeklyAnalysis.weeklyTSS, 
    weeklyAnalysis.weeklyDuration
  );

  // Calculate nutritional needs for today
  const todaysNutrition = calculateDailyNutrition(
    todaysWorkouts, 
    trainingPhase,
    userSettings
  );

  // Determine traffic light color (Fuelin-style)
  const trafficLight = getTrafficLightColor(todaysNutrition.carbs);

  return {
    recent: analyzedActivities.slice(0, 30),
    today: todaysWorkouts,
    weeklyTSS: weeklyAnalysis.weeklyTSS,
    weeklyDuration: weeklyAnalysis.weeklyDuration,
    weeklyCalories: weeklyAnalysis.weeklyCalories,
    workoutCount: weeklyAnalysis.workoutCount,
    trainingPhase,
    todaysNutrition,
    trafficLight,
    weeklyAnalysis
  };
};

/**
 * Calculate daily nutrition based on today's workouts
 * Implements adaptive macro calculations like Fuelin
 */
function calculateDailyNutrition(todaysWorkouts, phase, userSettings = {}) {
  // Get user's base metrics
  const weight = userSettings?.weight || 204;
  const goal = userSettings?.primaryGoal || 'weight_loss';
  const age = userSettings?.age || 46;
  const gender = userSettings?.gender || 'male';

  // Calculate BMR (Mifflin-St Jeor equation)
  const heightCm = 188; // 6'2" = 188cm
  let bmr;
  if (gender === 'male') {
    bmr = 10 * (weight * 0.453592) + 6.25 * heightCm - 5 * age + 5;
  } else {
    bmr = 10 * (weight * 0.453592) + 6.25 * heightCm - 5 * age - 161;
  }

  // Base macros (rest day)
  const baseMacros = {
    protein: Math.round(weight * 0.8), // 0.8g per lb for endurance athletes
    carbs: 150,
    fat: 60
  };

  const baseCalories = bmr * 1.2; // Sedentary multiplier

  if (todaysWorkouts.length === 0) {
    // Rest day nutrition
    const restCalories = goal === 'weight_loss' 
      ? baseCalories - 300 
      : baseCalories;

    return {
      calories: Math.round(restCalories),
      protein: baseMacros.protein,
      carbs: Math.round(baseMacros.carbs * 0.7), // Reduce carbs on rest day
      fat: Math.round(baseMacros.fat * 1.1),
      trainingLoad: 'rest',
      workouts: [],
      breakdown: {
        base: Math.round(restCalories),
        workout: 0
      }
    };
  }

  // Calculate workout demands
  const totalTSS = todaysWorkouts.reduce((sum, w) => 
    sum + (w.analysis?.tss || 0), 0
  );
  
  const totalDuration = todaysWorkouts.reduce((sum, w) => 
    sum + (w.analysis?.duration || 0), 0
  );
  
  const totalCarbsNeeded = todaysWorkouts.reduce((sum, w) => 
    sum + (w.analysis?.carbsDuringWorkout || 0) + 
        (w.analysis?.recoveryCarbs || 0), 0
  );
  
  const workoutCalories = todaysWorkouts.reduce((sum, w) => 
    sum + (w.analysis?.caloriesBurned || 0), 0
  );

  // Calculate additional calories needed
  // For weight loss: replace 50% of burned calories
  // For maintenance: replace 70% of burned calories
  // For gain: replace 100% of burned calories
  const replacementRate = goal === 'weight_loss' ? 0.5 : 
                          goal === 'weight_gain' ? 1.0 : 0.7;
  
  const additionalCalories = workoutCalories * replacementRate;

  // Calculate total daily macros
  const totalCalories = Math.round(baseCalories + additionalCalories);
  
  // Carbs: base + workout needs + recovery
  const totalCarbs = Math.round(baseMacros.carbs + totalCarbsNeeded);
  
  // Protein: base + additional for recovery (10g per hour of training, max 30g)
  const additionalProtein = Math.min(totalDuration * 10, 30);
  const totalProtein = Math.round(baseMacros.protein + additionalProtein);
  
  // Fat: fill remaining calories after protein and carbs
  const remainingCalories = totalCalories - (totalCarbs * 4) - (totalProtein * 4);
  const totalFat = Math.max(Math.round(remainingCalories / 9), 50);

  // Determine training load category
  let trainingLoad = 'light';
  if (totalTSS > 150) trainingLoad = 'high';
  else if (totalTSS > 80) trainingLoad = 'moderate';

  return {
    calories: totalCalories,
    protein: totalProtein,
    carbs: totalCarbs,
    fat: totalFat,
    trainingLoad,
    workouts: todaysWorkouts.map(w => ({
      name: w.name,
      type: w.type,
      duration: w.analysis?.duration,
      tss: w.analysis?.tss,
      intensity: w.analysis?.intensity,
      carbsNeeded: (w.analysis?.carbsDuringWorkout || 0) + 
                   (w.analysis?.recoveryCarbs || 0)
    })),
    breakdown: {
      base: Math.round(baseCalories),
      workout: Math.round(additionalCalories),
      totalBurned: Math.round(workoutCalories)
    }
  };
}

/**
 * Get rest day nutrition
 */
function getRestDayNutrition(userSettings = {}) {
  const weight = userSettings?.weight || 204;
  const goal = userSettings?.primaryGoal || 'weight_loss';

  const baseCalories = goal === 'weight_loss' ? 1800 : 2000;

  return {
    calories: baseCalories,
    protein: Math.round(weight * 0.8),
    carbs: 150,
    fat: 65,
    trainingLoad: 'rest',
    workouts: [],
    breakdown: {
      base: baseCalories,
      workout: 0
    }
  };
}

/**
 * Determine training phase based on weekly load
 */
function determineTrainingPhase(weeklyTSS, weeklyDuration) {
  if (weeklyTSS === 0) return 'rest';
  if (weeklyTSS > 600) return 'peak'; // Peak training
  if (weeklyTSS > 450) return 'build'; // Build phase
  if (weeklyTSS > 300) return 'base'; // Base building
  return 'recovery'; // Recovery/easy week
}

/**
 * Get traffic light color based on carb needs
 * 🔴 Red = Low carb day (rest/recovery)
 * 🟡 Yellow = Moderate carb day (base training)
 * 🟢 Green = High carb day (hard training)
 */
function getTrafficLightColor(carbs) {
  if (carbs >= 250) return 'green'; // High carb day (hard training)
  if (carbs >= 180) return 'yellow'; // Moderate carb day (moderate training)
  return 'red'; // Low carb day (rest/easy)
}

/**
 * Calculate weekly TSS (Training Stress Score)
 * Legacy function for backward compatibility
 */
export const calculateWeeklyTSS = (activities) => {
  if (!activities || activities.length === 0) return 0;
  
  const analysis = workoutAnalyzer.analyzeWeeklyLoad(activities);
  return analysis.weeklyTSS;
};

/**
 * Analyze training phase
 * Legacy function for backward compatibility
 */
export const analyzeTrainingPhase = (activities) => {
  if (!activities || activities.length === 0) return 'rest';
  
  const analysis = workoutAnalyzer.analyzeWeeklyLoad(activities);
  return determineTrainingPhase(analysis.weeklyTSS, analysis.weeklyDuration);
};

/**
 * Get meal timing recommendations based on workout schedule
 */
export const getMealTiming = (todaysWorkouts) => {
  if (!todaysWorkouts || todaysWorkouts.length === 0) {
    return {
      breakfast: '7:00 AM',
      snack: '10:00 AM',
      lunch: '12:30 PM',
      dinner: '6:30 PM',
      notes: 'Rest day - standard meal timing'
    };
  }

  // Analyze workout times
  const workoutTimes = todaysWorkouts.map(w => {
    const startTime = new Date(w.start_date_local);
    return {
      hour: startTime.getHours(),
      type: w.type,
      duration: w.analysis?.duration || 0
    };
  });

  const morningWorkout = workoutTimes.some(w => w.hour < 10);
  const afternoonWorkout = workoutTimes.some(w => w.hour >= 14 && w.hour < 18);

  if (morningWorkout) {
    return {
      breakfast: 'Post-workout (within 30 min)',
      snack: '10:00 AM',
      lunch: '12:30 PM',
      dinner: '6:30 PM',
      notes: 'Morning workout - prioritize post-workout breakfast with protein'
    };
  }

  if (afternoonWorkout) {
    return {
      breakfast: '7:00 AM',
      snack: '10:00 AM',
      lunch: '12:00 PM (90 min before workout)',
      dinner: 'Post-workout (within 1 hour)',
      notes: 'Afternoon workout - light pre-workout lunch, recovery dinner'
    };
  }

  return {
    breakfast: '7:00 AM',
    snack: '10:00 AM',
    lunch: '12:30 PM',
    dinner: '6:30 PM',
    notes: 'Midday workout - adjust meal timing around workout'
  };
};

/**
 * Get hydration targets for the day
 */
export const getHydrationTarget = (todaysWorkouts, weight = 204) => {
  const baseOz = Math.round(weight / 2); // Half body weight in oz
  
  if (!todaysWorkouts || todaysWorkouts.length === 0) {
    return {
      base: baseOz,
      workout: 0,
      total: baseOz,
      guideline: `${baseOz}oz throughout the day`
    };
  }

  const workoutHydration = todaysWorkouts.reduce((sum, w) => 
    sum + (w.analysis?.hydrationNeeds?.oz || 0), 0
  );

  return {
    base: baseOz,
    workout: workoutHydration,
    total: baseOz + workoutHydration,
    guideline: `${baseOz}oz base + ${workoutHydration}oz during training`
  };
};
