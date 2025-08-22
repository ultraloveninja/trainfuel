// src/data/workouts.js

export const WORKOUT_TEMPLATES = {
  easy: [
    {
      title: "Recovery Run",
      discipline: "Run",
      type: "Recovery",
      description: "Easy pace run focusing on recovery and form",
      duration: "30-45 min",
      intensity: "Easy",
      zones: "Zone 1-2",
      mainSet: "Steady easy pace throughout",
      nutrition: "Water only, no fuel needed"
    },
    {
      title: "Easy Swim",
      discipline: "Swim",
      type: "Recovery",
      description: "Technique-focused swim with drill sets",
      duration: "45 min",
      intensity: "Easy",
      zones: "Zone 1-2",
      mainSet: "200m warm-up, 6x50m drills, 200m cool-down",
      nutrition: "Water only"
    },
    {
      title: "Recovery Spin",
      discipline: "Bike",
      type: "Recovery",
      description: "Light spinning to promote recovery",
      duration: "45-60 min",
      intensity: "Easy",
      zones: "Zone 1",
      mainSet: "Steady easy spin, cadence 85-95rpm",
      nutrition: "Electrolytes only"
    }
  ],
  moderate: [
    {
      title: "Tempo Run",
      discipline: "Run",
      type: "Tempo",
      description: "Sustained effort at threshold pace",
      duration: "60 min",
      intensity: "Moderate",
      zones: "Zone 3-4",
      mainSet: "20min warm-up, 20min tempo, 20min cool-down",
      nutrition: "30g carbs before, water during"
    },
    {
      title: "Bike Intervals",
      discipline: "Bike",
      type: "Intervals",
      description: "Sweet spot intervals for FTP building",
      duration: "90 min",
      intensity: "Moderate",
      zones: "Zone 3-4",
      mainSet: "20min warm-up, 3x15min at 88-93% FTP, 10min cool-down",
      nutrition: "60g carbs/hour, electrolytes"
    },
    {
      title: "CSS Swim",
      discipline: "Swim",
      type: "Threshold",
      description: "Critical swim speed training",
      duration: "60 min",
      intensity: "Moderate",
      zones: "Zone 3-4",
      mainSet: "400m warm-up, 8x200m at CSS pace, 200m cool-down",
      nutrition: "Sports drink poolside"
    }
  ],
  hard: [
    {
      title: "VO2 Max Intervals",
      discipline: "Run",
      type: "VO2Max",
      description: "High intensity intervals to build VO2 max",
      duration: "60 min",
      intensity: "Hard",
      zones: "Zone 5",
      mainSet: "20min warm-up, 6x3min at 5K pace with 90s recovery, 15min cool-down",
      nutrition: "30g carbs before, sports drink during"
    },
    {
      title: "FTP Test",
      discipline: "Bike",
      type: "Test",
      description: "20-minute FTP test",
      duration: "75 min",
      intensity: "Hard",
      zones: "Zone 4-5",
      mainSet: "20min warm-up, 5min all-out, 10min easy, 20min test, 20min cool-down",
      nutrition: "Full carb load 2hrs before, 60g/hour during"
    },
    {
      title: "Race Pace Swim",
      discipline: "Swim",
      type: "Race Pace",
      description: "Race pace interval training",
      duration: "75 min",
      intensity: "Hard",
      zones: "Zone 4-5",
      mainSet: "500m warm-up, 10x100m at race pace, 200m cool-down",
      nutrition: "Energy gel before main set"
    }
  ],
  recovery: [
    {
      title: "Yoga Flow",
      discipline: "Cross-Training",
      type: "Recovery",
      description: "Gentle yoga for flexibility and recovery",
      duration: "45 min",
      intensity: "Very Easy",
      zones: "Recovery",
      mainSet: "Full body flow focusing on hips and shoulders",
      nutrition: "Hydrate well before and after"
    },
    {
      title: "Pool Recovery",
      discipline: "Swim",
      type: "Recovery",
      description: "Easy swimming and water jogging",
      duration: "30 min",
      intensity: "Very Easy",
      zones: "Recovery",
      mainSet: "Mix of easy swimming and aqua jogging",
      nutrition: "Water only"
    },
    {
      title: "Walk",
      discipline: "Cross-Training",
      type: "Recovery",
      description: "Active recovery walk",
      duration: "30-45 min",
      intensity: "Very Easy",
      zones: "Recovery",
      mainSet: "Steady walking pace, nasal breathing only",
      nutrition: "None needed"
    }
  ],
  race: [
    {
      title: "Race Simulation",
      discipline: "Brick",
      type: "Race Prep",
      description: "Mini race simulation at race pace",
      duration: "120 min",
      intensity: "Race Pace",
      zones: "Zone 3-4",
      mainSet: "45min bike at race pace, immediate 30min run at race pace",
      nutrition: "Full race nutrition strategy practice"
    },
    {
      title: "Sharpener",
      discipline: "All",
      type: "Race Prep",
      description: "Short efforts to maintain sharpness during taper",
      duration: "45 min",
      intensity: "Moderate",
      zones: "Zone 3-4",
      mainSet: "15min warm-up, 3x3min at race pace, 15min cool-down",
      nutrition: "Light carbs, practice race morning nutrition"
    },
    {
      title: "Openers",
      discipline: "All",
      type: "Race Prep",
      description: "Pre-race activation workout",
      duration: "30 min",
      intensity: "Easy-Moderate",
      zones: "Zone 2-3",
      mainSet: "10min easy, 3x1min builds to race pace, 10min easy",
      nutrition: "Hydrate well, light carbs"
    }
  ]
};

export const NICK_CHASE_PRINCIPLES = {
  training: {
    philosophy: "Quality over quantity - every workout has a purpose",
    keyPrinciples: [
      "Consistency beats intensity",
      "Recovery is when adaptation happens",
      "Fuel the work required",
      "Mental preparation is as important as physical",
      "Practice race execution in training"
    ],
    periodization: {
      base: "Build aerobic foundation with consistent volume",
      build: "Add intensity while maintaining volume",
      peak: "Sharpen with race-specific efforts",
      taper: "Reduce volume, maintain intensity",
      recovery: "Active recovery and adaptation"
    }
  },
  recovery: {
    daily: "8+ hours sleep, proper hydration, quality nutrition",
    weekly: "At least one full rest day or active recovery",
    postWorkout: "Protein within 30min, rehydrate, stretch/mobilize",
    betweenSessions: "Minimum 8 hours between quality sessions"
  },
  nutrition: {
    daily: "Whole foods focus, adequate protein, carbs to fuel training",
    training: "30-60g carbs/hour for efforts over 90min",
    recovery: "0.8-1g protein per lb bodyweight, replenish glycogen",
    race: "Practice nutrition strategy, nothing new on race day"
  },
  mental: {
    visualization: "Visualize successful execution daily",
    mantras: "Develop personal mantras for tough moments",
    processGoals: "Focus on process, not outcomes",
    raceStrategy: "Have A, B, and C goals for race day"
  }
};

export const TRAINING_ZONES = {
  run: {
    zone1: "Recovery - Easy conversation pace",
    zone2: "Aerobic - Comfortable, can maintain for hours",
    zone3: "Threshold - Comfortably hard, 1-hour race pace",
    zone4: "VO2 Max - Hard, 10K race pace",
    zone5: "Neuromuscular - Very hard, 5K pace or faster"
  },
  bike: {
    zone1: "Recovery - <55% FTP",
    zone2: "Endurance - 56-75% FTP",
    zone3: "Tempo - 76-90% FTP",
    zone4: "Threshold - 91-105% FTP",
    zone5: "VO2 Max - 106-120% FTP",
    zone6: "Neuromuscular - >120% FTP"
  },
  swim: {
    zone1: "Recovery - Very easy technique focus",
    zone2: "Aerobic - Steady, sustainable pace",
    zone3: "Threshold - CSS pace",
    zone4: "VO2 Max - 400m pace",
    zone5: "Sprint - Maximum effort"
  }
};

export const generateWorkoutRecommendations = (userData) => {
  const { fatigue, phase, recentWorkouts, upcomingRace } = userData;
  
  // Logic to generate personalized recommendations
  let recommendations = [];
  
  if (fatigue === 'high') {
    recommendations = WORKOUT_TEMPLATES.recovery;
  } else if (upcomingRace && upcomingRace.daysUntil < 14) {
    recommendations = WORKOUT_TEMPLATES.race;
  } else if (phase === 'base') {
    recommendations = [...WORKOUT_TEMPLATES.easy, ...WORKOUT_TEMPLATES.moderate.slice(0, 1)];
  } else if (phase === 'build') {
    recommendations = [...WORKOUT_TEMPLATES.moderate, ...WORKOUT_TEMPLATES.hard.slice(0, 1)];
  } else if (phase === 'peak') {
    recommendations = WORKOUT_TEMPLATES.hard;
  } else {
    recommendations = WORKOUT_TEMPLATES.moderate;
  }
  
  return recommendations.slice(0, 3);
};