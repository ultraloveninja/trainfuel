// src/services/nutritionService.js - Local development version (no CORS issues)

class NutritionService {
  constructor() {
    // For local development, we'll use intelligent mock data only
    // This avoids CORS issues and still provides excellent recommendations
    this.useClaudeAPI = false; // Set to false to avoid CORS
    this.model = "claude-sonnet-4-20250514";
    
    console.log('🍎 TrainFuel Nutrition Service initialized - using intelligent recommendations based on your real Strava data');
  }

  // Generate personalized nutrition plan (intelligent mock based on real Strava data)
  async generateNutritionPlan(userData) {
    console.log('🍎 Generating nutrition plan for:', userData.athlete?.firstname || 'User');
    
    // Always use intelligent mock data (it's actually very good!)
    return this.generateIntelligentMockPlan(userData);
  }

  // Generate daily nutrition recommendations
  async generateDailyNutrition(userData) {
    console.log('🥗 Generating daily nutrition recommendations');
    return this.generateMockDailyNutrition(userData);
  }

  // Generate weekly meal plan
  async generateWeeklyMealPlan(userData, nutritionPlan) {
    console.log('📅 Generating weekly meal plan');
    return this.generateMockMealPlan(userData, nutritionPlan);
  }

  // Enhanced intelligent mock plan based on REAL Strava training data
  generateIntelligentMockPlan(userData) {
    const { athlete, trainingData, activities, preferences } = userData;
    const goal = preferences?.trainingGoal || 'Endurance Performance';
    
    // Calculate realistic calories based on actual training load from Strava
    const baseCalories = this.calculateBaseCalories(athlete);
    const trainingAdjustment = this.calculateTrainingAdjustment(trainingData, activities, goal);
    const dailyCalories = Math.round(baseCalories + trainingAdjustment);
    
    // Smart macro distribution based on actual training phase
    const macros = this.calculateMacros(dailyCalories, trainingData?.currentPhase, goal);
    
    return {
      dailyCalories,
      macros,
      hydration: {
        dailyTarget: Math.round(35 * (athlete?.weight || 70)),
        duringTraining: `${Math.round((trainingData?.todaysActivity?.duration || 0) * 8)}ml per hour`,
        recoveryFocus: goal === 'Weight Loss' ? 
          'Focus on electrolyte balance without excess calories' : 
          'Rapid rehydration with added carbohydrates for glycogen replenishment'
      },
      workoutNutrition: {
        preWorkout: this.getPreWorkoutNutrition(trainingData?.todaysActivity?.intensity, goal),
        duringWorkout: this.getDuringWorkoutNutrition(
          trainingData?.todaysActivity?.duration, 
          trainingData?.todaysActivity?.intensity
        ),
        postWorkout: this.getPostWorkoutNutrition(trainingData?.todaysActivity?.intensity, goal)
      },
      mealSuggestions: this.generateMealSuggestions(dailyCalories, goal),
      supplements: this.getSupplementRecommendations(trainingData?.currentPhase, goal),
      notes: `Generated for ${athlete?.firstname || 'User'} - ${trainingData?.currentPhase || 'Base'} phase, ${goal} goal. Based on your actual Strava training data: ${trainingData?.weeklyTSS || 0} weekly TSS, latest activity: ${trainingData?.todaysActivity?.type || 'None'} (${trainingData?.todaysActivity?.intensity || 'Rest'} intensity). These recommendations adapt to your real training patterns!`
    };
  }

  // Calculate base metabolic rate using athlete data
  calculateBaseCalories(athlete) {
    const weight = athlete?.weight || 70;
    const age = 35; // Could add to user profile later
    const height = 175; // Could add to user profile later  
    const isMale = athlete?.sex === 'M';
    
    // Mifflin-St Jeor Equation
    if (isMale) {
      return (10 * weight) + (6.25 * height) - (5 * age) + 5;
    } else {
      return (10 * weight) + (6.25 * height) - (5 * age) - 161;
    }
  }

  // Calculate additional calories needed based on actual training load
  calculateTrainingAdjustment(trainingData, activities, goal) {
    const todayTSS = trainingData?.todaysActivity?.tss || 0;
    const weeklyAverage = (trainingData?.weeklyTSS || 0) / 7;
    
    // Base adjustment on TSS (Training Stress Score)
    let adjustment = todayTSS * 12; // ~12 calories per TSS point
    
    // Add weekly volume consideration
    if (weeklyAverage > 50) {
      adjustment += weeklyAverage * 2; // Additional calories for high volume training
    }
    
    // Goal-based adjustments
    if (goal === 'Weight Loss') {
      adjustment *= 0.8; // Smaller surplus for weight loss
    } else if (goal === 'Muscle Gain') {
      adjustment *= 1.3; // Larger surplus for muscle gain
    }
    
    return Math.max(0, adjustment); // Never negative
  }

  // Calculate macro distribution based on training phase and goals
  calculateMacros(calories, phase, goal) {
    let carbPercentage = 55;
    let proteinPercentage = 20;
    let fatPercentage = 25;
    
    // Training phase adjustments
    if (phase === 'Build' || phase === 'Peak') {
      carbPercentage = 60; // More carbs for intense training
      proteinPercentage = 20;
      fatPercentage = 20;
    } else if (phase === 'Recovery') {
      carbPercentage = 50;
      proteinPercentage = 25; // More protein for recovery
      fatPercentage = 25;
    }
    
    // Goal adjustments
    if (goal === 'Weight Loss') {
      carbPercentage -= 5;
      proteinPercentage += 5; // Higher protein for satiety
    } else if (goal === 'Muscle Gain') {
      proteinPercentage += 5;
      carbPercentage -= 2;
      fatPercentage -= 3;
    }
    
    return {
      carbs: {
        grams: Math.round((calories * carbPercentage / 100) / 4),
        percentage: carbPercentage,
        timing: "Focus around training sessions - pre/during/post workout"
      },
      protein: {
        grams: Math.round((calories * proteinPercentage / 100) / 4),
        percentage: proteinPercentage,
        timing: "Spread throughout the day, emphasize post-workout for recovery"
      },
      fat: {
        grams: Math.round((calories * fatPercentage / 100) / 9),
        percentage: fatPercentage,
        timing: "Away from immediate pre/post workout windows for better digestion"
      }
    };
  }

  // Pre-workout nutrition based on training intensity
  getPreWorkoutNutrition(intensity, goal) {
    if (intensity === 'High' || intensity === 'Very High') {
      return goal === 'Weight Loss' ? 
        'Light carbs: banana or small energy bar (30-45g carbs) 1-2 hours before' :
        'Carb-rich meal: oatmeal with banana and honey (60-80g carbs) 2-3 hours before';
    } else if (intensity === 'Moderate') {
      return 'Light snack: toast with jam or banana (30-40g carbs) 1 hour before';
    }
    return 'Light snack only if needed - focus on hydration for easy sessions';
  }

  // During workout nutrition based on duration and intensity
  getDuringWorkoutNutrition(duration, intensity) {
    if (duration > 90 && (intensity === 'High' || intensity === 'Very High')) {
      return 'Sports drink: 30-60g carbs per hour after first 60 minutes (critical for performance)';
    } else if (duration > 60 && intensity !== 'Low') {
      return 'Light sports drink or water with electrolytes: 15-30g carbs/hour';
    } else if (duration > 0) {
      return 'Water with electrolytes - session duration doesn\'t require carb fueling';
    }
    return 'Rest day - focus on consistent hydration throughout the day';
  }

  // Post-workout nutrition based on training intensity and goals
  getPostWorkoutNutrition(intensity, goal) {
    if (intensity === 'High' || intensity === 'Very High') {
      return goal === 'Weight Loss' ?
        'Protein-focused recovery: protein shake with minimal carbs (25g protein, 15g carbs) within 30 min' :
        'Recovery shake: 3:1 carb to protein ratio (60g carbs, 20g protein) within 30 minutes';
    } else if (intensity === 'Moderate') {
      return 'Balanced meal within 1-2 hours: focus on protein and moderate carbs';
    }
    return 'Regular meal timing is fine - no urgent recovery needs for easy sessions';
  }

  // Generate meal suggestions based on calorie targets and goals
  generateMealSuggestions(dailyCalories, goal) {
    const breakfastCals = Math.round(dailyCalories * 0.25);
    const lunchCals = Math.round(dailyCalories * 0.35);
    const dinnerCals = Math.round(dailyCalories * 0.30);
    const snackCals = Math.round(dailyCalories * 0.10);

    const suggestions = {
      'Weight Loss': {
        breakfast: 'Greek yogurt with berries and granola',
        lunch: 'Quinoa salad with grilled chicken and vegetables',
        dinner: 'Baked salmon with roasted vegetables and sweet potato',
        snack: 'Apple with almond butter'
      },
      'Endurance Performance': {
        breakfast: 'Oatmeal with banana, nuts, and honey',
        lunch: 'Turkey and avocado wrap with whole grain tortilla',
        dinner: 'Pasta with lean meat sauce and side salad',
        snack: 'Energy balls with dates and nuts'
      },
      'Muscle Gain': {
        breakfast: 'Scrambled eggs with whole grain toast and avocado',
        lunch: 'Chicken and rice bowl with black beans',
        dinner: 'Lean beef stir-fry with quinoa',
        snack: 'Protein shake with banana'
      },
      'General Fitness': {
        breakfast: 'Smoothie bowl with protein powder and fruit',
        lunch: 'Mediterranean bowl with hummus and vegetables',
        dinner: 'Grilled chicken with roasted vegetables and brown rice',
        snack: 'Mixed nuts and fruit'
      }
    };

    const goalMeals = suggestions[goal] || suggestions['Endurance Performance'];

    return [
      {
        meal: "Breakfast",
        description: goalMeals.breakfast,
        calories: breakfastCals,
        timing: "2-3 hours before morning training, or 1 hour after if training first"
      },
      {
        meal: "Lunch", 
        description: goalMeals.lunch,
        calories: lunchCals,
        timing: "Midday fuel - can be post-workout recovery meal if training AM"
      },
      {
        meal: "Dinner",
        description: goalMeals.dinner, 
        calories: dinnerCals,
        timing: "Evening recovery and preparation for next day's training"
      },
      {
        meal: "Snack",
        description: goalMeals.snack,
        calories: snackCals,
        timing: "Between meals or post-workout if main meal is delayed"
      }
    ];
  }

  // Supplement recommendations based on training phase and goals
  getSupplementRecommendations(phase, goal) {
    const base = [
      { 
        name: 'Vitamin D3', 
        dosage: '2000 IU', 
        timing: 'With breakfast', 
        purpose: 'Bone health, immune function, and recovery support' 
      },
      { 
        name: 'Omega-3 Fish Oil', 
        dosage: '1000mg EPA/DHA', 
        timing: 'With dinner', 
        purpose: 'Anti-inflammatory support, joint health, and recovery' 
      }
    ];
    
    if (phase === 'Build' || phase === 'Peak') {
      base.push({
        name: 'Magnesium Glycinate',
        dosage: '400mg',
        timing: 'Before bed',
        purpose: 'Muscle recovery, sleep quality, and stress management during intense training'
      });
    }

    if (goal === 'Muscle Gain') {
      base.push({
        name: 'Creatine Monohydrate',
        dosage: '5g daily',
        timing: 'Post-workout or anytime',
        purpose: 'Strength, power development, and muscle mass gains'
      });
    } else if (goal === 'Weight Loss') {
      base.push({
        name: 'Green Tea Extract',
        dosage: '400mg',
        timing: 'Between meals',
        purpose: 'Metabolism support and antioxidant benefits'
      });
    }
    
    return base;
  }

  // Mock daily nutrition (enhanced with real training consideration)
  generateMockDailyNutrition(userData) {
    const { athlete, trainingData } = userData;
    const activity = trainingData?.todaysActivity || { 
      type: 'Rest Day', 
      duration: 0, 
      intensity: 'Rest', 
      tss: 0 
    };
    
    return {
      preWorkout: {
        timing: activity.duration > 0 ? "1-2 hours before training" : "N/A - Rest Day",
        meal: activity.intensity === 'High' || activity.intensity === 'Very High' ? 
          "Oatmeal with banana and honey + coffee" : 
          activity.intensity === 'Moderate' ? "Toast with jam + coffee" : "Light breakfast only",
        rationale: activity.duration > 0 ? 
          `Optimized for your ${activity.intensity?.toLowerCase()} intensity ${activity.type?.toLowerCase()} session (${activity.duration} min)` :
          "Rest day - focus on balanced nutrition without pre-workout fueling"
      },
      duringWorkout: {
        timing: activity.duration > 60 ? "Every 20-30 minutes during exercise" : "N/A",
        fuel: activity.duration > 90 ? 
          "Sports drink targeting 30-60g carbs/hour" : 
          activity.duration > 60 ? "Water with electrolytes" : 
          activity.duration > 0 ? "Water only" : "Rest day - focus on hydration",
        rationale: activity.duration > 60 ? 
          `${activity.duration} minute session requires ${activity.duration > 90 ? 'carbohydrate' : 'electrolyte'} replacement` : 
          activity.duration > 0 ? 
          `${activity.duration} minute session - water sufficient` :
          "Rest day - maintain steady hydration throughout day"
      },
      postWorkout: {
        timing: activity.tss > 0 ? "Within 30-60 minutes post-workout" : "Regular meal timing",
        meal: activity.tss > 70 ? 
          "Recovery shake: protein + carbs + fruit (3:1 carb:protein ratio)" : 
          activity.tss > 30 ? "Protein shake with moderate carbs" : 
          activity.tss > 0 ? "Balanced meal within 2 hours" : "Regular balanced meals",
        rationale: activity.tss > 50 ? 
          `TSS ${activity.tss} indicates significant stress - prioritize recovery nutrition` : 
          activity.tss > 0 ?
          `TSS ${activity.tss} - moderate recovery needs` :
          "Rest day - focus on consistent, balanced nutrition"
      },
      hydrationGoal: `${Math.round(35 * (athlete?.weight || 70))}ml base hydration + ${Math.round((activity.duration || 0) * 8)}ml for training = ${Math.round(35 * (athlete?.weight || 70)) + Math.round((activity.duration || 0) * 8)}ml total`,
      racePrep: trainingData?.currentPhase === 'Peak' ? 
        "Peak phase: Lock in race nutrition - no experiments!" :
        trainingData?.currentPhase === 'Build' ?
        "Build phase: Good time to test race-day nutrition strategies" :
        "Focus on consistent daily nutrition habits based on your real Strava training data"
    };
  }

  // Mock meal plan (enhanced)
  generateMockMealPlan(userData, nutritionPlan) {
    const { athlete, activities } = userData;
    const dailyCalories = nutritionPlan?.dailyCalories || 2500;
    
    return {
      weeklyPlan: [
        {
          day: 1,
          trainingDay: activities?.[0]?.type !== 'Rest Day',
          meals: {
            breakfast: { 
              name: "Training Day Oatmeal Bowl", 
              calories: Math.round(dailyCalories * 0.25), 
              carbs: 65, 
              protein: 15, 
              fat: 12 
            },
            lunch: { 
              name: "Power Quinoa Bowl", 
              calories: Math.round(dailyCalories * 0.35), 
              carbs: 68, 
              protein: 22, 
              fat: 18 
            },
            dinner: { 
              name: "Recovery Salmon Plate", 
              calories: Math.round(dailyCalories * 0.30), 
              carbs: 45, 
              protein: 35, 
              fat: 22 
            }
          },
          dailyTotals: { 
            calories: dailyCalories, 
            carbs: nutritionPlan?.macros?.carbs?.grams || 350, 
            protein: nutritionPlan?.macros?.protein?.grams || 140, 
            fat: nutritionPlan?.macros?.fat?.grams || 93 
          }
        }
      ],
      shoppingList: [
        "rolled oats", "bananas", "quinoa", "salmon fillets", 
        "sweet potatoes", "spinach", "almonds", "Greek yogurt",
        "chicken breast", "brown rice", "broccoli", "olive oil"
      ],
      prepTips: [
        "Prep overnight oats Sunday for the week",
        "Cook grains (quinoa, brown rice) in large batches",
        "Pre-cut vegetables for quick meal assembly",
        "Marinate proteins the night before cooking"
      ]
    };
  }
}

// Create and export instance
const nutritionService = new NutritionService();
export default nutritionService;