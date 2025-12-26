// src/services/tridotStylePlanner.js
// TriDot-inspired training plan generator with AI-powered adjustments
// Uses Intervals.icu fitness metrics and Nick Chase principles

class TriDotStylePlanner {
  constructor() {
    // Training phases based on periodization principles
    this.phases = {
      BASE_1: {
        name: 'Base 1',
        duration: 4, // weeks
        intensity: 'low',
        focus: 'Building aerobic foundation',
        tssTarget: 250, // weekly TSS
        workoutDistribution: {
          easy: 0.7,
          moderate: 0.2,
          hard: 0.1
        }
      },
      BASE_2: {
        name: 'Base 2',
        duration: 4,
        intensity: 'low-moderate',
        focus: 'Increasing volume',
        tssTarget: 350,
        workoutDistribution: {
          easy: 0.6,
          moderate: 0.3,
          hard: 0.1
        }
      },
      BUILD_1: {
        name: 'Build 1',
        duration: 4,
        intensity: 'moderate',
        focus: 'Adding intensity',
        tssTarget: 400,
        workoutDistribution: {
          easy: 0.5,
          moderate: 0.3,
          hard: 0.2
        }
      },
      BUILD_2: {
        name: 'Build 2',
        duration: 4,
        intensity: 'moderate-high',
        focus: 'Race-specific work',
        tssTarget: 450,
        workoutDistribution: {
          easy: 0.4,
          moderate: 0.3,
          hard: 0.3
        }
      },
      PEAK: {
        name: 'Peak',
        duration: 2,
        intensity: 'high',
        focus: 'High intensity, lower volume',
        tssTarget: 350,
        workoutDistribution: {
          easy: 0.3,
          moderate: 0.3,
          hard: 0.4
        }
      },
      TAPER: {
        name: 'Taper',
        duration: 2,
        intensity: 'low',
        focus: 'Recovery for race day',
        tssTarget: 150,
        workoutDistribution: {
          easy: 0.7,
          moderate: 0.2,
          hard: 0.1
        }
      }
    };

    // Workout templates for different intensities
    this.workoutTemplates = this.initializeWorkoutTemplates();
  }

  initializeWorkoutTemplates() {
    return {
      swim: {
        easy: [
          {
            name: 'Aerobic Swim',
            duration: 45,
            description: 'Easy aerobic swim - 2000m continuous',
            intensity: 'Easy',
            tss: 45,
            structure: 'Warmup 400m, Main 1200m Z2, Cooldown 400m',
            nutrition: 'Water only'
          },
          {
            name: 'Technique Focus',
            duration: 50,
            description: 'Drill-focused session - 2200m',
            intensity: 'Easy',
            tss: 50,
            structure: 'Warmup 300m, 6x200m drills, Cooldown 400m',
            nutrition: 'Water only'
          }
        ],
        moderate: [
          {
            name: 'Threshold Intervals',
            duration: 60,
            description: 'CSS intervals - 2800m',
            intensity: 'Moderate',
            tss: 70,
            structure: 'Warmup 400m, 6x300m @ CSS (30s rest), Cooldown 400m',
            nutrition: 'Sports drink post-workout'
          }
        ],
        hard: [
          {
            name: 'VO2 Max Swim',
            duration: 50,
            description: 'High intensity intervals - 2400m',
            intensity: 'Hard',
            tss: 85,
            structure: 'Warmup 500m, 10x100m @ 95% (20s rest), Cooldown 400m',
            nutrition: 'Recovery shake within 30min'
          }
        ]
      },
      bike: {
        easy: [
          {
            name: 'Zone 2 Endurance',
            duration: 90,
            description: 'Nick Chase-style endurance ride',
            intensity: 'Easy',
            tss: 80,
            structure: '90min @ 65-75% FTP, flat terrain',
            nutrition: 'Liquid only - 200cal/hour Tailwind',
            nickChase: true
          },
          {
            name: 'Recovery Spin',
            duration: 60,
            description: 'Active recovery',
            intensity: 'Easy',
            tss: 40,
            structure: '60min @ 55-65% FTP, easy spinning',
            nutrition: 'Water + electrolytes'
          }
        ],
        moderate: [
          {
            name: 'Tempo Ride',
            duration: 75,
            description: 'Sweet spot intervals',
            intensity: 'Moderate',
            tss: 90,
            structure: 'Warmup 15min, 3x15min @ 85-90% FTP (5min rest), Cooldown 15min',
            nutrition: 'Liquid nutrition - 250cal/hour',
            nickChase: true
          },
          {
            name: 'Hilly Endurance',
            duration: 120,
            description: 'Rolling terrain endurance',
            intensity: 'Moderate',
            tss: 110,
            structure: '2 hours rolling terrain, 70-85% FTP on climbs',
            nutrition: 'Liquid + 1 gel/hour'
          }
        ],
        hard: [
          {
            name: 'VO2 Max Intervals',
            duration: 60,
            description: 'High intensity power intervals',
            intensity: 'Hard',
            tss: 95,
            structure: 'Warmup 15min, 5x5min @ 105% FTP (5min rest), Cooldown 10min',
            nutrition: 'Pre-load carbs, recovery within 30min'
          },
          {
            name: 'Race Simulation',
            duration: 90,
            description: 'Race-pace effort',
            intensity: 'Hard',
            tss: 115,
            structure: '15min warmup, 60min @ race pace, 15min cooldown',
            nutrition: 'Race day nutrition practice'
          }
        ]
      },
      run: {
        easy: [
          {
            name: 'Easy Aerobic Run',
            duration: 45,
            description: 'Conversational pace',
            intensity: 'Easy',
            tss: 40,
            structure: '45min @ Z2 heart rate, flat terrain',
            nutrition: 'Water only'
          },
          {
            name: 'Long Run',
            duration: 90,
            description: 'Weekly long run',
            intensity: 'Easy',
            tss: 70,
            structure: '90min @ easy pace, include strides',
            nutrition: 'Liquid nutrition if >60min',
            nickChase: true
          }
        ],
        moderate: [
          {
            name: 'Tempo Run',
            duration: 50,
            description: 'Lactate threshold work',
            intensity: 'Moderate',
            tss: 65,
            structure: 'Warmup 15min, 20min @ threshold, Cooldown 15min',
            nutrition: 'Gel at 30min if needed'
          },
          {
            name: 'Progression Run',
            duration: 60,
            description: 'Building pace run',
            intensity: 'Moderate',
            tss: 70,
            structure: '60min starting easy, finishing at tempo',
            nutrition: 'Sports drink post-run'
          }
        ],
        hard: [
          {
            name: 'Interval Run',
            duration: 50,
            description: 'VO2 max intervals',
            intensity: 'Hard',
            tss: 80,
            structure: 'Warmup 15min, 6x800m @ 5K pace (2min rest), Cooldown 10min',
            nutrition: 'Pre-load carbs, recovery shake'
          },
          {
            name: 'Race Pace Run',
            duration: 60,
            description: 'Race simulation',
            intensity: 'Hard',
            tss: 85,
            structure: 'Warmup 10min, 40min @ race pace, Cooldown 10min',
            nutrition: 'Practice race nutrition'
          }
        ]
      },
      brick: {
        moderate: [
          {
            name: 'Standard Brick',
            duration: 90,
            description: 'Bike-to-run transition practice',
            intensity: 'Moderate',
            tss: 85,
            structure: '60min bike @ 75% FTP, then 30min run @ easy-moderate pace',
            nutrition: 'Liquid on bike, practice T2 fueling',
            nickChase: true
          }
        ],
        hard: [
          {
            name: 'Race Simulation Brick',
            duration: 120,
            description: 'Full race intensity',
            intensity: 'Hard',
            tss: 125,
            structure: '90min bike @ race pace, then 30min run @ race pace',
            nutrition: 'Full race day nutrition practice',
            nickChase: true
          }
        ]
      },
      strength: {
        moderate: [
          {
            name: 'Functional Strength',
            duration: 45,
            description: 'Tri-specific strength training',
            intensity: 'Moderate',
            tss: 35,
            structure: '3 sets: squats, lunges, planks, pull-ups, core work',
            nutrition: 'Protein within 30min'
          }
        ]
      }
    };
  }

  /**
   * Generate a complete season training plan based on race date
   * @param {Date} raceDate - Target race date
   * @param {Object} currentFitness - Current CTL/ATL/TSB from Intervals.icu
   * @param {Object} raceDetails - Race type and distance
   * @returns {Object} Complete training plan
   */
  generateSeasonPlan(raceDate, currentFitness = {}, raceDetails = {}) {
    const today = new Date();
    const weeksUntilRace = Math.floor((raceDate - today) / (7 * 24 * 60 * 60 * 1000));

    console.log('Generating plan:', {
      weeksUntilRace,
      raceDate: raceDate.toDateString(),
      currentFitness
    });

    // Determine appropriate plan length (12, 16, or 20 weeks)
    const planLength = this.determinePlanLength(weeksUntilRace);
    const phases = this.buildPhaseSchedule(planLength);

    // Generate weekly plan for each phase
    const weeklyPlan = [];
    let currentDate = new Date(today);
    let weekNumber = 1;

    phases.forEach(phase => {
      for (let i = 0; i < phase.duration; i++) {
        const week = this.generateWeeklyPlan(
          phase,
          weekNumber,
          currentFitness,
          weeksUntilRace - weekNumber + 1
        );

        weeklyPlan.push({
          weekNumber,
          phase: phase.name,
          startDate: new Date(currentDate),
          ...week
        });

        currentDate.setDate(currentDate.getDate() + 7);
        weekNumber++;
      }
    });

    return {
      raceDate,
      planLength,
      phases,
      weeklyPlan,
      principles: this.getNickChasePrinciples(),
      nutritionGuidance: this.getNutritionGuidance()
    };
  }

  /**
   * Determine optimal plan length based on weeks available
   */
  determinePlanLength(weeksAvailable) {
    if (weeksAvailable >= 20) return 20;
    if (weeksAvailable >= 16) return 16;
    if (weeksAvailable >= 12) return 12;
    return Math.max(8, weeksAvailable); // Minimum 8-week plan
  }

  /**
   * Build phase schedule based on plan length
   */
  buildPhaseSchedule(planLength) {
    if (planLength === 20) {
      return [
        this.phases.BASE_1,
        this.phases.BASE_2,
        this.phases.BUILD_1,
        this.phases.BUILD_2,
        this.phases.PEAK,
        this.phases.TAPER
      ];
    } else if (planLength === 16) {
      return [
        this.phases.BASE_1,
        { ...this.phases.BUILD_1, duration: 6 }, // Extended build
        this.phases.PEAK,
        this.phases.TAPER
      ];
    } else {
      return [
        { ...this.phases.BASE_1, duration: planLength - 6 },
        { ...this.phases.BUILD_1, duration: 4 },
        this.phases.TAPER
      ];
    }
  }

  /**
   * Generate workouts for a specific week
   */
  generateWeeklyPlan(phase, weekNumber, currentFitness, weeksToRace) {
    const { tssTarget, workoutDistribution } = phase;

    // Calculate adjusted TSS based on fitness
    const adjustedTSS = this.adjustTSSForFitness(tssTarget, currentFitness);

    // Distribute workouts across the week
    const workouts = [];

    // Monday - Swim (easy)
    workouts.push({
      day: 'Monday',
      ...this.selectWorkout('swim', 'easy', adjustedTSS * 0.15)
    });

    // Tuesday - Bike (varies by phase)
    const tuesdayIntensity = this.getIntensityForDay('bike', workoutDistribution, weekNumber);
    workouts.push({
      day: 'Tuesday',
      ...this.selectWorkout('bike', tuesdayIntensity, adjustedTSS * 0.25)
    });

    // Wednesday - Run (easy to moderate)
    workouts.push({
      day: 'Wednesday',
      ...this.selectWorkout('run', 'easy', adjustedTSS * 0.15)
    });

    // Thursday - Swim (moderate)
    workouts.push({
      day: 'Thursday',
      ...this.selectWorkout('swim', 'moderate', adjustedTSS * 0.20)
    });

    // Friday - Rest or strength
    if (weekNumber % 2 === 0) {
      workouts.push({
        day: 'Friday',
        type: 'Strength',
        discipline: 'strength',
        ...this.selectWorkout('strength', 'moderate', adjustedTSS * 0.10)
      });
    } else {
      workouts.push({
        day: 'Friday',
        type: 'Rest',
        discipline: 'rest',
        name: 'Active Recovery',
        description: 'Complete rest or very light activity',
        duration: '0-30min',
        intensity: 'Rest',
        tss: 0
      });
    }

    // Saturday - Long workout (key session)
    const saturdayWorkout = weeksToRace > 3 
      ? this.selectWorkout('bike', 'moderate', adjustedTSS * 0.30)
      : this.selectWorkout('brick', 'moderate', adjustedTSS * 0.35);
    
    workouts.push({
      day: 'Saturday',
      ...saturdayWorkout,
      keyWorkout: true
    });

    // Sunday - Long run or recovery
    const sundayIntensity = phase.intensity === 'high' ? 'moderate' : 'easy';
    workouts.push({
      day: 'Sunday',
      ...this.selectWorkout('run', sundayIntensity, adjustedTSS * 0.25),
      keyWorkout: phase.intensity !== 'low'
    });

    // Calculate weekly totals
    const weeklyTSS = workouts.reduce((sum, w) => sum + (w.tss || 0), 0);
    const weeklyDuration = workouts.reduce((sum, w) => {
      const duration = parseInt(w.duration) || 0;
      return sum + duration;
    }, 0);

    return {
      workouts,
      weeklyTSS: Math.round(weeklyTSS),
      weeklyDuration,
      targetTSS: adjustedTSS,
      focus: phase.focus,
      intensity: phase.intensity
    };
  }

  /**
   * Select appropriate workout based on discipline and intensity
   */
  selectWorkout(discipline, intensity, targetTSS) {
    const templates = this.workoutTemplates[discipline]?.[intensity] || [];
    
    if (templates.length === 0) {
      return {
        name: 'Custom Workout',
        duration: 60,
        description: `${intensity} ${discipline} session`,
        intensity: intensity,
        tss: targetTSS
      };
    }

    // Find workout closest to target TSS
    const selected = templates.reduce((best, current) => {
      const currentDiff = Math.abs(current.tss - targetTSS);
      const bestDiff = Math.abs(best.tss - targetTSS);
      return currentDiff < bestDiff ? current : best;
    });

    return {
      type: discipline.charAt(0).toUpperCase() + discipline.slice(1),
      discipline,
      ...selected
    };
  }

  /**
   * Get intensity for a specific day based on workout distribution
   */
  getIntensityForDay(discipline, distribution, weekNumber) {
    const rand = (weekNumber * 7) % 100 / 100; // Pseudo-random but consistent
    
    if (rand < distribution.easy) return 'easy';
    if (rand < distribution.easy + distribution.moderate) return 'moderate';
    return 'hard';
  }

  /**
   * Adjust TSS target based on current fitness
   */
  adjustTSSForFitness(baseTSS, fitness) {
    if (!fitness || !fitness.ctl) return baseTSS;

    const { ctl, tsb } = fitness;

    // If CTL is high, athlete can handle more load
    const ctlMultiplier = Math.min(Math.max(ctl / 50, 0.8), 1.3);

    // If TSB is negative (fatigued), reduce load
    const tsbAdjustment = tsb < -20 ? 0.8 : tsb > 10 ? 1.1 : 1.0;

    return Math.round(baseTSS * ctlMultiplier * tsbAdjustment);
  }

  /**
   * Get today's workout with AI-powered adjustments
   */
  getTodaysWorkout(plan, fitnessMetrics = {}) {
    const today = new Date();
    const todayStr = today.toDateString();

    // Find today's week in the plan
    const thisWeek = plan.weeklyPlan.find(week => {
      const weekStart = new Date(week.startDate);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      return today >= weekStart && today < weekEnd;
    });

    if (!thisWeek) return null;

    // Get today's day of week
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayName = dayNames[today.getDay()];

    // Find today's workout
    let workout = thisWeek.workouts.find(w => w.day === todayName);

    if (!workout) return null;

    // Adjust workout based on current fatigue (TSB)
    workout = this.adjustWorkoutForFatigue(workout, fitnessMetrics);

    return {
      ...workout,
      date: todayStr,
      week: thisWeek.weekNumber,
      phase: thisWeek.phase,
      weeklyProgress: {
        targetTSS: thisWeek.targetTSS,
        currentTSS: thisWeek.weeklyTSS,
        remainingTSS: Math.max(0, thisWeek.targetTSS - thisWeek.weeklyTSS)
      }
    };
  }

  /**
   * Adjust workout intensity based on fatigue
   */
  adjustWorkoutForFatigue(workout, fitness) {
    if (!fitness || !fitness.tsb) return workout;

    const { tsb } = fitness;

    // If very fatigued (TSB < -30), suggest recovery
    if (tsb < -30) {
      return {
        ...workout,
        modified: true,
        originalIntensity: workout.intensity,
        intensity: 'Easy',
        duration: Math.round(parseInt(workout.duration) * 0.7) + 'min',
        description: `Modified for recovery - ${workout.description}`,
        reason: `High fatigue detected (TSB: ${tsb}). Workout reduced to aid recovery.`,
        tss: Math.round(workout.tss * 0.6)
      };
    }

    // If moderately fatigued (TSB < -15), reduce intensity
    if (tsb < -15 && workout.intensity === 'Hard') {
      return {
        ...workout,
        modified: true,
        originalIntensity: workout.intensity,
        intensity: 'Moderate',
        description: `Modified - ${workout.description}`,
        reason: `Moderate fatigue (TSB: ${tsb}). Intensity reduced slightly.`,
        tss: Math.round(workout.tss * 0.85)
      };
    }

    // If well-rested (TSB > 15), can handle more
    if (tsb > 15 && workout.intensity === 'Easy') {
      return {
        ...workout,
        suggestion: 'Well rested - consider adding intensity if feeling good',
        tsb: tsb
      };
    }

    return workout;
  }

  /**
   * Get Nick Chase training principles
   */
  getNickChasePrinciples() {
    return [
      {
        principle: 'Liquid Nutrition',
        description: 'Focus on liquid calories during training - easier to digest, consistent energy',
        application: 'Use Tailwind or similar for workouts >60min'
      },
      {
        principle: 'Data-Driven Training',
        description: 'Track everything - data drives improvement',
        application: 'Use Intervals.icu for accurate TSS and fitness tracking'
      },
      {
        principle: 'Protein Timing',
        description: 'Protein within 30 minutes post-workout',
        application: 'Recovery shake immediately after hard sessions'
      },
      {
        principle: 'Sports Psychology',
        description: 'Mental preparation is as important as physical',
        application: 'Visualize races, practice mental strategies during training'
      },
      {
        principle: 'Gradual Adaptation',
        description: 'Avoid huge jumps in training load',
        application: 'Increase weekly TSS by no more than 10% per week'
      }
    ];
  }

  /**
   * Get nutrition guidance for each phase
   */
  getNutritionGuidance() {
    return {
      base: {
        focus: 'Building aerobic efficiency',
        nutrition: 'Lower carb on easy days, practice fat adaptation',
        timing: 'Protein after workouts, moderate carbs throughout day'
      },
      build: {
        focus: 'Supporting higher intensity',
        nutrition: 'Increase carbs on hard days, maintain protein',
        timing: 'Carbs before/during hard sessions, protein within 30min after'
      },
      peak: {
        focus: 'Maximum performance',
        nutrition: 'Higher overall carbs, optimize timing',
        timing: 'Pre-load carbs before hard sessions, immediate recovery nutrition'
      },
      taper: {
        focus: 'Race preparation',
        nutrition: 'Maintain carbs, reduce overall calories to match volume',
        timing: 'Practice exact race day nutrition plan'
      }
    };
  }
}

export default new TriDotStylePlanner();
