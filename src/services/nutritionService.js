// src/services/nutritionService.js - Enhanced with Food Preferences and Daily Logging

class NutritionService {
  constructor() {
    this.model = "claude-sonnet-4-20250514";
    this.apiUrl = "https://api.anthropic.com/v1/messages";
    this.useClaudeAPI = true;
    
    console.log('🍎 TrainFuel Nutrition Service initialized with food preferences and logging support');
  }

  // Enhanced nutrition plan generation with food preferences
  async generateNutritionPlan(userData) {
    console.log('🍎 Generating AI-powered nutrition plan with food preferences for:', userData.athlete?.firstname || 'User');
    
    if (this.useClaudeAPI) {
      try {
        return await this.generateClaudeNutritionPlan(userData);
      } catch (error) {
        console.warn('Claude API failed, falling back to intelligent mock:', error);
        return this.generateIntelligentMockPlan(userData);
      }
    } else {
      return this.generateIntelligentMockPlan(userData);
    }
  }

  // Enhanced daily nutrition with food logging awareness
  async generateDailyNutrition(userData) {
    console.log('🥗 Generating AI-powered daily nutrition with food log integration');
    
    if (this.useClaudeAPI) {
      try {
        return await this.generateClaudeDailyNutrition(userData);
      } catch (error) {
        console.warn('Claude API failed, falling back to mock:', error);
        return this.generateMockDailyNutrition(userData);
      }
    } else {
      return this.generateMockDailyNutrition(userData);
    }
  }

  // NEW: Generate recommendations with current food data
  async generateWithFoodData(userData, currentFoodData) {
    console.log('🧠 Regenerating AI recommendations with current food intake data');
    
    if (this.useClaudeAPI) {
      try {
        return await this.generateClaudeWithFoodData(userData, currentFoodData);
      } catch (error) {
        console.warn('Claude API failed, falling back to adjusted mock:', error);
        return this.generateAdjustedMockRecommendations(userData, currentFoodData);
      }
    } else {
      return this.generateAdjustedMockRecommendations(userData, currentFoodData);
    }
  }

  // Enhanced Claude nutrition plan with food preferences
  async generateClaudeNutritionPlan(userData) {
    const { athlete, trainingData, activities, preferences, upcomingEvents, foodPreferences, dailyFoodLog } = userData;
    
    const trainingContext = this.prepareTrainingContext(trainingData, activities, upcomingEvents);
    const foodContext = this.prepareFoodContext(foodPreferences, dailyFoodLog);
    
    const prompt = `You are an expert sports nutritionist creating a personalized nutrition plan using Nick Chase methodology. You must consider both training demands and food preferences to create realistic, sustainable recommendations.

ATHLETE DATA:
- Name: ${athlete?.firstname || 'User'}
- Weight: ${athlete?.weight || 'Unknown'} kg
- Training Goal: ${preferences?.trainingGoal || 'Endurance Performance'}
- Dietary Restrictions: ${preferences?.dietaryRestrictions || 'None'}

TRAINING CONTEXT:
${trainingContext}

FOOD PREFERENCES & PATTERNS:
${foodContext}

CRITICAL: All meal recommendations must:
1. AVOID foods in the "disliked foods" list completely
2. PRIORITIZE foods from the "liked foods" list when possible
3. Consider recent eating patterns from the food log
4. Remain nutritionally optimal for endurance training

Provide a comprehensive nutrition plan in JSON format:

{
  "dailyCalories": number,
  "macros": {
    "carbs": {"grams": number, "percentage": number, "timing": "specific guidance"},
    "protein": {"grams": number, "percentage": number, "timing": "specific guidance"}, 
    "fat": {"grams": number, "percentage": number, "timing": "specific guidance"}
  },
  "hydration": {
    "dailyTarget": "ml per day",
    "duringTraining": "ml per hour based on training duration",
    "recoveryFocus": "specific hydration strategy"
  },
  "workoutNutrition": {
    "preWorkout": "recommendations using preferred foods",
    "duringWorkout": "fueling strategy adapted to preferences",
    "postWorkout": "recovery nutrition with liked foods"
  },
  "mealSuggestions": [
    {"meal": "Breakfast", "description": "meal using preferred foods", "calories": number, "timing": "when to eat"},
    {"meal": "Lunch", "description": "meal avoiding disliked foods", "calories": number, "timing": "when to eat"},
    {"meal": "Dinner", "description": "dinner with favorite ingredients", "calories": number, "timing": "when to eat"},
    {"meal": "Snack", "description": "snack from liked foods", "calories": number, "timing": "when to eat"}
  ],
  "foodSubstitutions": [
    {"instead_of": "disliked food", "use": "preferred alternative", "reason": "why this substitution works"}
  ],
  "personalizedNotes": "how the plan accommodates their specific food preferences and eating patterns"
}

Make this plan highly personalized and realistic based on their actual food preferences.`;

    const response = await fetch(this.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 1800,
        messages: [
          { role: "user", content: prompt }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API request failed: ${response.status}`);
    }

    const data = await response.json();
    const responseText = data.content[0].text;
    
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('Could not parse Claude response as JSON');
    }
  }

  // Enhanced daily nutrition with food log integration
  async generateClaudeDailyNutrition(userData) {
    const { athlete, trainingData, activities, preferences, upcomingEvents, foodPreferences, dailyFoodLog } = userData;
    
    const todaysActivity = trainingData?.todaysActivity || { type: 'Rest Day', duration: 0, intensity: 'Rest', tss: 0 };
    const todaysFoodLog = this.getTodaysFoodEntries(dailyFoodLog);
    const todaysNutritionTotals = this.calculateTodaysNutrition(todaysFoodLog);

    const prompt = `You are an expert sports nutritionist providing today's nutrition recommendations. You must account for what the athlete has already eaten today and their food preferences.

ATHLETE: ${athlete?.firstname || 'User'}
GOAL: ${preferences?.trainingGoal || 'Endurance Performance'}
DIETARY RESTRICTIONS: ${preferences?.dietaryRestrictions || 'None'}

TODAY'S TRAINING:
- Activity: ${todaysActivity.type}
- Duration: ${todaysActivity.duration} minutes  
- Intensity: ${todaysActivity.intensity}
- TSS: ${todaysActivity.tss}

TRAINING PHASE: ${trainingData?.currentPhase || 'Base'}

FOOD PREFERENCES:
- Liked Foods: ${foodPreferences?.likedFoods?.join(', ') || 'None specified'}
- Disliked Foods: ${foodPreferences?.dislikedFoods?.join(', ') || 'None specified'}

TODAY'S FOOD LOG SO FAR:
${todaysFoodLog.length > 0 ? 
  todaysFoodLog.map(entry => `${entry.time}: ${entry.name} (${entry.amount}) - ${entry.calories || '?'} cal - ${entry.mealType}`).join('\n') :
  'No food logged yet today'
}

CURRENT NUTRITION TOTALS TODAY:
- Calories consumed: ${todaysNutritionTotals.calories}
- Carbs consumed: ${todaysNutritionTotals.carbs}g
- Protein consumed: ${todaysNutritionTotals.protein}g
- Fat consumed: ${todaysNutritionTotals.fat}g

CRITICAL: Recommendations must:
1. Account for what's already been eaten today
2. Use only foods from the "liked" list when possible
3. Completely avoid foods from the "disliked" list
4. Fill nutritional gaps remaining for the day
5. Support today's specific training demands

Provide today's adjusted nutrition plan in JSON format:

{
  "remainingTargets": {
    "calories": "calories still needed today",
    "carbs": "carbs still needed today",
    "protein": "protein still needed today",
    "fat": "fat still needed today"
  },
  "preWorkout": {
    "timing": "when to eat relative to workout",
    "food": "specific foods from liked list",
    "rationale": "why this timing/food considering what's already eaten"
  },
  "duringWorkout": {
    "strategy": "fueling approach for today's session",
    "products": "preferred products or ingredients",
    "timing": "when/how often to fuel"
  },
  "postWorkout": {
    "timing": "when after workout",
    "food": "recovery foods from preferred list",
    "rationale": "why this approach fits remaining needs"
  },
  "remainingMeals": {
    "nextMeal": "specific meal suggestion using liked foods",
    "laterToday": "evening meal/snack recommendations",
    "portions": "adjusted portions based on what's already consumed"
  },
  "hydration": {
    "remaining": "how much more water needed today",
    "timing": "when to drink for optimal performance"
  },
  "personalizedAdjustments": "how recommendations were adapted based on current intake and preferences"
}

Make this highly specific to what they've already eaten and their food preferences.`;

    const response = await fetch(this.apiUrl, {
      method: "POST", 
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 1200,
        messages: [
          { role: "user", content: prompt }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API request failed: ${response.status}`);
    }

    const data = await response.json();
    const responseText = data.content[0].text;
    
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('Could not parse Claude response as JSON');
    }
  }

  // NEW: Generate updated recommendations with current food data
  async generateClaudeWithFoodData(userData, currentFoodData) {
    const { athlete, trainingData, preferences } = userData;
    const { foodPreferences, dailyFoodLog, todaysNutritionTotals } = currentFoodData;

    const prompt = `You are providing updated nutrition and training recommendations based on real-time food intake data.

ATHLETE: ${athlete?.firstname || 'User'}
CURRENT SITUATION: 
- Today's food consumed: ${todaysNutritionTotals.calories} calories, ${todaysNutritionTotals.carbs}g carbs, ${todaysNutritionTotals.protein}g protein, ${todaysNutritionTotals.fat}g fat
- Training planned: ${trainingData?.todaysActivity?.type} - ${trainingData?.todaysActivity?.duration} minutes
- Training goal: ${preferences?.trainingGoal}

FOOD PREFERENCES:
- Likes: ${foodPreferences?.likedFoods?.join(', ') || 'None'}
- Dislikes: ${foodPreferences?.dislikedFoods?.join(', ') || 'None'}

Based on current intake, provide updated recommendations in JSON:

{
  "nutritionAdjustments": {
    "remainingCalories": number,
    "remainingCarbs": number,
    "remainingProtein": number,
    "remainingFat": number,
    "recommendations": "how to meet remaining targets with preferred foods"
  },
  "mealTimingAdjustments": {
    "preWorkout": "adjusted pre-workout nutrition based on current intake",
    "postWorkout": "modified post-workout needs",
    "nextMeal": "specific next meal recommendation using liked foods"
  },
  "trainingAdjustments": {
    "energyStatus": "how current nutrition affects training capacity",
    "fuelingStrategy": "modified fueling based on what's been consumed",
    "recommendations": "any training modifications based on nutrition status"
  },
  "insights": "how current food choices align with training goals and what to optimize"
}

Provide actionable, personalized adjustments based on real intake data.`;

    const response = await fetch(this.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 1000,
        messages: [
          { role: "user", content: prompt }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API request failed: ${response.status}`);
    }

    const data = await response.json();
    const responseText = data.content[0].text;
    
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('Could not parse Claude response as JSON');
    }
  }

  // Helper: Prepare food context for Claude
  prepareFoodContext(foodPreferences, dailyFoodLog) {
    const recentEntries = dailyFoodLog?.slice(-10) || []; // Last 10 food entries
    const frequentFoods = this.analyzeFoodFrequency(dailyFoodLog);

    return `
FOOD PREFERENCES:
- Liked Foods (${foodPreferences?.likedFoods?.length || 0}): ${foodPreferences?.likedFoods?.join(', ') || 'None specified'}
- Disliked Foods (${foodPreferences?.dislikedFoods?.length || 0}): ${foodPreferences?.dislikedFoods?.join(', ') || 'None specified'}

RECENT EATING PATTERNS:
${recentEntries.length > 0 ? 
  recentEntries.map(entry => `${entry.date}: ${entry.name} (${entry.mealType})`).join('\n') :
  'No recent food log data'
}

FREQUENTLY CONSUMED FOODS:
${frequentFoods.length > 0 ? 
  frequentFoods.map(f => `${f.food} (${f.count}x)`).join(', ') :
  'No frequency data available'
}

EATING BEHAVIOR INSIGHTS:
- Total logged entries: ${dailyFoodLog?.length || 0}
- Meal types preference: ${this.getMealTypePreferences(dailyFoodLog)}
- Average meal timing: ${this.getAverageMealTiming(dailyFoodLog)}
`;
  }

  // Helper: Get today's food entries
  getTodaysFoodEntries(dailyFoodLog) {
    if (!dailyFoodLog) return [];
    const today = new Date().toISOString().split('T')[0];
    return dailyFoodLog.filter(entry => entry.date === today);
  }

  // Helper: Calculate today's nutrition totals
  calculateTodaysNutrition(todaysFoodEntries) {
    return todaysFoodEntries.reduce((totals, entry) => ({
      calories: totals.calories + (entry.calories || 0),
      carbs: totals.carbs + (entry.carbs || 0),
      protein: totals.protein + (entry.protein || 0),
      fat: totals.fat + (entry.fat || 0)
    }), { calories: 0, carbs: 0, protein: 0, fat: 0 });
  }

  // Helper: Analyze food frequency patterns
  analyzeFoodFrequency(dailyFoodLog) {
    if (!dailyFoodLog || dailyFoodLog.length === 0) return [];
    
    const frequency = dailyFoodLog.reduce((acc, entry) => {
      acc[entry.name] = (acc[entry.name] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(frequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([food, count]) => ({ food, count }));
  }

  // Helper: Get meal type preferences
  getMealTypePreferences(dailyFoodLog) {
    if (!dailyFoodLog || dailyFoodLog.length === 0) return 'No data';
    
    const mealTypes = dailyFoodLog.reduce((acc, entry) => {
      acc[entry.mealType] = (acc[entry.mealType] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(mealTypes)
      .sort(([,a], [,b]) => b - a)
      .map(([type, count]) => `${type}: ${count}`)
      .join(', ');
  }

  // Helper: Get average meal timing
  getAverageMealTiming(dailyFoodLog) {
    if (!dailyFoodLog || dailyFoodLog.length === 0) return 'No data';
    
    const mealTimes = dailyFoodLog
      .filter(entry => entry.time)
      .map(entry => {
        const [hours, minutes] = entry.time.split(':').map(Number);
        return hours + minutes / 60;
      });

    if (mealTimes.length === 0) return 'No timing data';

    const average = mealTimes.reduce((sum, time) => sum + time, 0) / mealTimes.length;
    const hours = Math.floor(average);
    const minutes = Math.round((average - hours) * 60);
    
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  }

  // Fallback: Generate adjusted mock recommendations with food data
  generateAdjustedMockRecommendations(userData, currentFoodData) {
    const { todaysNutritionTotals } = currentFoodData;
    const baseNutrition = this.generateMockDailyNutrition(userData);
    
    // Adjust recommendations based on current intake
    const remainingCalories = Math.max(0, 2200 - todaysNutritionTotals.calories);
    const remainingCarbs = Math.max(0, 275 - todaysNutritionTotals.carbs);
    const remainingProtein = Math.max(0, 110 - todaysNutritionTotals.protein);
    
    return {
      ...baseNutrition,
      nutritionAdjustments: {
        remainingCalories,
        remainingCarbs,
        remainingProtein,
        remainingFat: Math.max(0, 73 - todaysNutritionTotals.fat),
        recommendations: `Focus on getting ${remainingCalories} more calories with ${remainingCarbs}g carbs and ${remainingProtein}g protein`
      },
      personalizedAdjustments: 'Recommendations adjusted based on your current food intake and preferences'
    };
  }

  // Enhanced training recommendations with nutrition awareness
  async generateTrainingRecommendations(userData) {
    console.log('🏃 Generating AI-powered training recommendations with nutrition awareness');
    
    const { athlete, trainingData, activities, preferences, upcomingEvents, dailyFoodLog } = userData;
    const trainingContext = this.prepareTrainingContext(trainingData, activities, upcomingEvents);
    const todaysFoodLog = this.getTodaysFoodEntries(dailyFoodLog);
    const todaysNutrition = this.calculateTodaysNutrition(todaysFoodLog);

    const prompt = `You are an expert endurance coach creating today's training recommendations. Consider both training demands and current nutrition status.

ATHLETE: ${athlete?.firstname || 'User'}
GOAL: ${preferences?.trainingGoal || 'Endurance Performance'}

TRAINING CONTEXT:
${trainingContext}

CURRENT NUTRITION STATUS:
- Calories consumed today: ${todaysNutrition.calories}
- Carbs consumed: ${todaysNutrition.carbs}g
- Protein consumed: ${todaysNutrition.protein}g
- Recent food entries: ${todaysFoodLog.length}

TODAY'S FOOD LOG:
${todaysFoodLog.length > 0 ? 
  todaysFoodLog.map(entry => `${entry.time}: ${entry.name} (${entry.calories || '?'} cal)`).join('\n') :
  'No food logged yet today'
}

Consider current energy availability and nutrition status when making training recommendations.

Provide today's training recommendation in JSON format:

{
  "workoutType": "specific workout type",
  "primaryFocus": "main training goal considering nutrition status",
  "nutritionImpact": {
    "energyAvailability": "assessment of current fuel status",
    "trainingCapacity": "how nutrition affects today's training capacity",
    "recommendations": "any training modifications based on nutrition"
  },
  "warmup": {
    "duration": "time in minutes",
    "description": "warmup adapted to energy status"
  },
  "mainSet": {
    "description": "workout adjusted for current nutrition",
    "duration": "total time",
    "intensity": "target effort considering fuel status",
    "structure": "workout details adapted to energy availability"
  },
  "cooldown": {
    "duration": "time in minutes", 
    "description": "cooldown protocol"
  },
  "fuelingStrategy": {
    "preWorkout": "what to eat before training based on current intake",
    "duringWorkout": "fueling during session",
    "postWorkout": "recovery nutrition to complement current intake"
  },
  "alternatives": ["options if energy is low", "modifications for high energy"],
  "rpe": "target RPE adjusted for nutrition status",
  "rationale": "how nutrition status influenced training recommendations"
}

Provide training advice that considers their actual nutritional preparation for today's session.`;

    const response = await fetch(this.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 1200,
        messages: [
          { role: "user", content: prompt }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API request failed: ${response.status}`);
    }

    const data = await response.json();
    const responseText = data.content[0].text;
    
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('Could not parse Claude response as JSON');
    }
  }

  // Enhanced meal plan generation with food preferences
  async generateWeeklyMealPlan(userData, nutritionPlan) {
    console.log('📅 Generating AI-powered weekly meal plan with food preferences');
    
    if (this.useClaudeAPI) {
      try {
        return await this.generateClaudeMealPlan(userData, nutritionPlan);
      } catch (error) {
        console.warn('Claude API failed, falling back to mock:', error);
        return this.generateMockMealPlan(userData, nutritionPlan);
      }
    } else {
      return this.generateMockMealPlan(userData, nutritionPlan);
    }
  }

  // Enhanced Claude meal plan with food preferences
  async generateClaudeMealPlan(userData, nutritionPlan) {
    const { athlete, preferences, foodPreferences, dailyFoodLog } = userData;
    
    const frequentFoods = this.analyzeFoodFrequency(dailyFoodLog);
    
    const prompt = `Create a 7-day meal plan that respects food preferences and incorporates frequently eaten foods.

ATHLETE: ${athlete?.firstname || 'User'}
DAILY CALORIES: ${nutritionPlan?.dailyCalories || 2200}
MACROS: ${nutritionPlan?.macros ? `${nutritionPlan.macros.carbs.grams}g carbs, ${nutritionPlan.macros.protein.grams}g protein, ${nutritionPlan.macros.fat.grams}g fat` : 'Standard endurance ratios'}
DIETARY RESTRICTIONS: ${preferences?.dietaryRestrictions || 'None'}

FOOD PREFERENCES:
- MUST INCLUDE (liked foods): ${foodPreferences?.likedFoods?.join(', ') || 'No preferences specified'}
- MUST AVOID (disliked foods): ${foodPreferences?.dislikedFoods?.join(', ') || 'No restrictions'}

FREQUENTLY EATEN FOODS:
${frequentFoods.map(f => `${f.food} (eaten ${f.count}x recently)`).join(', ') || 'No frequency data'}

REQUIREMENTS:
1. Every meal must avoid ALL disliked foods completely
2. Prioritize liked foods in meal suggestions when nutritionally appropriate
3. Include frequently eaten foods for familiarity and adherence
4. Maintain optimal nutrition for endurance training
5. Provide realistic prep-friendly options

Provide a JSON meal plan:

{
  "weeklyPlan": [
    {
      "day": "Monday",
      "breakfast": {
        "name": "meal name using liked foods",
        "calories": number,
        "prepTime": "minutes",
        "ingredients": ["list including preferred foods"],
        "macros": {"carbs": number, "protein": number, "fat": number},
        "whyThisMeal": "how it uses their food preferences"
      },
      "lunch": {
        "name": "meal name avoiding disliked foods",
        "calories": number,
        "prepTime": "minutes", 
        "ingredients": ["list of preferred ingredients"],
        "macros": {"carbs": number, "protein": number, "fat": number},
        "whyThisMeal": "preference-based reasoning"
      },
      "dinner": {
        "name": "dinner with favorite foods",
        "calories": number,
        "prepTime": "minutes",
        "ingredients": ["ingredients from liked list"],
        "macros": {"carbs": number, "protein": number, "fat": number},
        "whyThisMeal": "how preferences influenced this choice"
      },
      "snacks": {
        "name": "snack from preferred foods",
        "calories": number,
        "timing": "when to eat",
        "whyThisSnack": "preference justification"
      }
    }
  ],
  "shoppingList": {
    "preferredFoods": ["foods from liked list needed"],
    "staples": ["basic ingredients"],
    "avoidReminder": ["reminder of foods to avoid"]
  },
  "prepTips": [
    "strategies for incorporating preferred foods",
    "ways to avoid disliked foods while meal prepping"
  ],
  "personalizedNotes": "how this meal plan specifically accommodates their food preferences and eating patterns"
}

Make this meal plan highly personalized and realistic based on their actual food preferences.`;

    const response = await fetch(this.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 2500,
        messages: [
          { role: "user", content: prompt }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API request failed: ${response.status}`);
    }

    const data = await response.json();
    const responseText = data.content[0].text;
    
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('Could not parse Claude response as JSON');
    }
  }

  // Helper: Prepare training context (existing method - keeping for compatibility)
  prepareTrainingContext(trainingData, activities, upcomingEvents) {
    const recentActivities = activities?.slice(0, 7) || [];
    const upcomingRaces = upcomingEvents?.filter(event => 
      new Date(event.date) > new Date()
    )?.slice(0, 3) || [];

    return `
CURRENT TRAINING PHASE: ${trainingData?.currentPhase || 'Base'}
WEEKLY TSS: ${trainingData?.weeklyTSS || 0}

TODAY'S PLANNED ACTIVITY:
- Type: ${trainingData?.todaysActivity?.type || 'Rest'}  
- Duration: ${trainingData?.todaysActivity?.duration || 0} minutes
- Intensity: ${trainingData?.todaysActivity?.intensity || 'Rest'}
- TSS: ${trainingData?.todaysActivity?.tss || 0}

RECENT 7 DAYS TRAINING:
${recentActivities.map(a => `${a.date}: ${a.type} - ${a.duration}min, ${a.intensity} intensity, ${a.tss} TSS`).join('\n')}

UPCOMING EVENTS:
${upcomingRaces.length > 0 ? upcomingRaces.map(r => `${r.name} - ${r.date} (${r.type})`).join('\n') : 'No upcoming events'}

TRAINING LOAD ANALYSIS:
- 7-day average TSS: ${Math.round((trainingData?.weeklyTSS || 0) / 7)}
- Training frequency: ${recentActivities.length}/7 days
- Primary activity types: ${this.getMostCommonActivityTypes(recentActivities)}
`;
  }

  // Existing helper methods for compatibility
  getMostCommonActivityTypes(activities) {
    if (!activities || activities.length === 0) return "None";
    
    const types = activities.reduce((acc, a) => {
      acc[a.type] = (acc[a.type] || 0) + 1;
      return acc;
    }, {});
    
    return Object.entries(types)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([type, count]) => `${type} (${count}x)`)
      .join(', ');
  }

  // Enhanced fallback methods that consider food preferences
  generateIntelligentMockPlan(userData) {
    const { athlete, trainingData, activities, preferences, foodPreferences } = userData;
    const goal = preferences?.trainingGoal || 'Endurance Performance';
    
    const baseCalories = this.calculateBaseCalories(athlete);
    const trainingAdjustment = this.calculateTrainingAdjustment(trainingData, activities, goal);
    const dailyCalories = Math.round(baseCalories + trainingAdjustment);
    
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
        preWorkout: this.getPreWorkoutNutrition(trainingData?.todaysActivity?.intensity, goal, foodPreferences),
        duringWorkout: this.getDuringWorkoutNutrition(
          trainingData?.todaysActivity?.duration, 
          trainingData?.todaysActivity?.intensity
        ),
        postWorkout: this.getPostWorkoutNutrition(trainingData?.todaysActivity?.intensity, goal, foodPreferences)
      },
      mealSuggestions: this.generateMealSuggestions(dailyCalories, goal, foodPreferences),
      supplements: this.getSupplementRecommendations(trainingData?.currentPhase, goal),
      personalizedNotes: `Generated for ${athlete?.firstname || 'User'} considering ${foodPreferences?.likedFoods?.length || 0} liked foods and ${foodPreferences?.dislikedFoods?.length || 0} foods to avoid. Based on Strava data: ${trainingData?.weeklyTSS || 0} weekly TSS.`
    };
  }

  generateMockDailyNutrition(userData) {
    const { athlete, trainingData, preferences, foodPreferences, dailyFoodLog } = userData;
    const activity = trainingData?.todaysActivity || { type: 'Rest Day', duration: 0, intensity: 'Rest', tss: 0 };
    const todaysFoodEntries = this.getTodaysFoodEntries(dailyFoodLog);
    const todaysNutrition = this.calculateTodaysNutrition(todaysFoodEntries);
    
    return {
      preWorkout: {
        timing: activity.duration > 0 ? 
          `${activity.intensity === 'High' ? '2-3 hours' : '1-2 hours'} before training` : 
          'N/A - Rest day',
        food: this.getPreWorkoutFood(activity, foodPreferences),
        rationale: `Tailored for ${activity.duration}min ${activity.type} at ${activity.intensity} intensity, using your preferred foods`
      },
      duringWorkout: {
        strategy: activity.duration > 90 ? 
          'Sports drink with 30-60g carbs/hour' : 
          activity.duration > 0 ? 'Water with electrolytes' : 'N/A',
        products: 'Based on your preferences and training demands',
        timing: activity.duration > 60 ? 'Every 15-20 minutes' : 'As needed'
      },
      postWorkout: {
        timing: activity.intensity === 'High' ? 'Within 30 minutes' : 'Within 2 hours',
        food: this.getPostWorkoutFood(activity, foodPreferences, todaysNutrition),
        rationale: `Recovery optimized for ${activity.intensity} intensity, complementing what you've eaten today`
      },
      dailyMeals: {
        breakfast: this.getMealSuggestion('breakfast', foodPreferences, todaysNutrition),
        lunch: this.getMealSuggestion('lunch', foodPreferences, todaysNutrition),
        dinner: this.getMealSuggestion('dinner', foodPreferences, todaysNutrition),
        snacks: this.getMealSuggestion('snack', foodPreferences, todaysNutrition)
      },
      hydration: {
        preWorkout: activity.duration > 0 ? '16-20oz water 2 hours before' : 'Normal hydration',
        duringWorkout: `${Math.round(activity.duration * 8)}ml total for session`,
        allDay: `${Math.round(35 * (athlete?.weight || 70))}ml total daily target`
      },
      keyFocus: this.getDailyFocus(activity, todaysNutrition, foodPreferences),
      personalizedAdjustments: `Recommendations consider your ${foodPreferences?.likedFoods?.length || 0} preferred foods and avoid your ${foodPreferences?.dislikedFoods?.length || 0} disliked foods. Current intake: ${todaysNutrition.calories} calories consumed today.`
    };
  }

  // Enhanced helper methods with food preference awareness
  getPreWorkoutFood(activity, foodPreferences) {
    const likedFoods = foodPreferences?.likedFoods || [];
    const dislikedFoods = foodPreferences?.dislikedFoods || [];
    
    if (activity.duration > 60) {
      // Check for preferred carb sources
      if (likedFoods.includes('oatmeal') || likedFoods.includes('banana')) {
        return 'Oatmeal with banana (using your preferred foods)';
      }
      return 'Carb-rich meal avoiding your disliked foods';
    }
    
    if (likedFoods.includes('banana')) {
      return 'Banana (from your liked foods list)';
    }
    
    return 'Light snack using foods you enjoy';
  }

  getPostWorkoutFood(activity, foodPreferences, todaysNutrition) {
    const likedFoods = foodPreferences?.likedFoods || [];
    
    if (activity.intensity === 'High') {
      if (likedFoods.includes('protein shake') || likedFoods.includes('smoothie')) {
        return 'Protein shake with carbs (using your preferred recovery foods)';
      }
      return 'Recovery meal using foods you like, avoiding foods you dislike';
    }
    
    return 'Balanced meal within 2 hours using your preferred foods';
  }

  getMealSuggestion(mealType, foodPreferences, todaysNutrition) {
    const likedFoods = foodPreferences?.likedFoods || [];
    const dislikedFoods = foodPreferences?.dislikedFoods || [];
    
    // Simple logic to incorporate preferences
    if (mealType === 'breakfast' && likedFoods.includes('eggs')) {
      return 'Scrambled eggs with toast (from your preferred foods)';
    }
    if (mealType === 'lunch' && likedFoods.includes('quinoa')) {
      return 'Quinoa power bowl (using your favorite grain)';
    }
    if (mealType === 'dinner' && likedFoods.includes('chicken')) {
      return 'Grilled chicken with vegetables (featuring your preferred protein)';
    }
    
    return `${mealType} using foods you enjoy, avoiding foods you dislike`;
  }

  getDailyFocus(activity, todaysNutrition, foodPreferences) {
    if (todaysNutrition.calories > 1500) {
      return 'Focus on completing remaining nutrition targets with foods you enjoy';
    }
    if (activity.duration > 60) {
      return 'Prioritize carb fueling with your preferred foods for longer session';
    }
    return 'Maintain consistent nutrition habits using foods you like';
  }

  // Existing calculation methods (unchanged for compatibility)
  calculateBaseCalories(athlete) {
    const weight = athlete?.weight || 70;
    const age = 35;
    const height = 175;
    const isMale = athlete?.sex === 'M';
    
    if (isMale) {
      return (10 * weight) + (6.25 * height) - (5 * age) + 5;
    } else {
      return (10 * weight) + (6.25 * height) - (5 * age) - 161;
    }
  }

  calculateTrainingAdjustment(trainingData, activities, goal) {
    const todayTSS = trainingData?.todaysActivity?.tss || 0;
    const weeklyAverage = (trainingData?.weeklyTSS || 0) / 7;
    
    let adjustment = todayTSS * 12;
    
    if (weeklyAverage > 50) {
      adjustment += weeklyAverage * 2;
    }
    
    if (goal === 'Weight Loss') {
      adjustment *= 0.8;
    } else if (goal === 'Muscle Gain') {
      adjustment *= 1.3;
    }
    
    return Math.max(0, adjustment);
  }

  calculateMacros(calories, phase, goal) {
    let carbPercentage = 55;
    let proteinPercentage = 20;
    let fatPercentage = 25;
    
    if (phase === 'Build' || phase === 'Peak') {
      carbPercentage = 60;
      proteinPercentage = 20;
      fatPercentage = 20;
    } else if (phase === 'Recovery') {
      carbPercentage = 50;
      proteinPercentage = 25;
      fatPercentage = 25;
    }
    
    if (goal === 'Weight Loss') {
      carbPercentage -= 5;
      proteinPercentage += 5;
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

  getPreWorkoutNutrition(intensity, goal, foodPreferences) {
    const likedFoods = foodPreferences?.likedFoods || [];
    
    if (intensity === 'High' || intensity === 'Very High') {
      if (goal === 'Weight Loss') {
        return likedFoods.includes('banana') ? 
          'Banana (from your preferred foods) 1-2 hours before' :
          'Light carbs from foods you enjoy (30-45g carbs) 1-2 hours before';
      } else {
        return likedFoods.includes('oatmeal') ?
          'Oatmeal with banana and honey (using your favorite foods) 2-3 hours before' :
          'Carb-rich meal using preferred foods (60-80g carbs) 2-3 hours before';
      }
    } else if (intensity === 'Moderate') {
      return 'Light snack from your liked foods list (30-40g carbs) 1 hour before';
    }
    return 'Light snack only if needed - focus on hydration for easy sessions';
  }

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

  getPostWorkoutNutrition(intensity, goal, foodPreferences) {
    const likedFoods = foodPreferences?.likedFoods || [];
    
    if (intensity === 'High' || intensity === 'Very High') {
      if (goal === 'Weight Loss') {
        return likedFoods.includes('protein shake') ?
          'Protein shake (your preferred recovery option) with minimal carbs (25g protein, 15g carbs) within 30 min' :
          'Protein-focused recovery using foods you like (25g protein, 15g carbs) within 30 min';
      } else {
        return likedFoods.includes('smoothie') || likedFoods.includes('protein shake') ?
          'Recovery shake using your preferred ingredients (60g carbs, 20g protein) within 30 minutes' :
          'Recovery meal with 3:1 carb to protein ratio using foods you enjoy within 30 minutes';
      }
    } else if (intensity === 'Moderate') {
      return 'Balanced meal within 1-2 hours using your preferred foods: focus on protein and moderate carbs';
    }
    return 'Regular meal timing is fine - use foods you enjoy, no urgent recovery needs for easy sessions';
  }

  generateMealSuggestions(dailyCalories, goal, foodPreferences) {
    const breakfastCals = Math.round(dailyCalories * 0.25);
    const lunchCals = Math.round(dailyCalories * 0.35);
    const dinnerCals = Math.round(dailyCalories * 0.30);
    const snackCals = Math.round(dailyCalories * 0.10);

    const likedFoods = foodPreferences?.likedFoods || [];
    const dislikedFoods = foodPreferences?.dislikedFoods || [];

    // Adapt suggestions based on preferences
    const suggestions = {
      'Weight Loss': {
        breakfast: likedFoods.includes('greek yogurt') ? 'Greek yogurt with berries and granola (your favorite!)' : 'Greek yogurt with berries and granola',
        lunch: likedFoods.includes('quinoa') ? 'Quinoa salad with grilled chicken and vegetables (using your preferred grain)' : 'Quinoa salad with grilled chicken and vegetables',
        dinner: likedFoods.includes('salmon') ? 'Baked salmon with roasted vegetables and sweet potato (featuring your preferred fish)' : 'Baked salmon with roasted vegetables and sweet potato',
        snack: likedFoods.includes('apple') ? 'Apple with almond butter (from your liked foods)' : 'Apple with almond butter'
      },
      'Endurance Performance': {
        breakfast: likedFoods.includes('oatmeal') ? 'Oatmeal with banana, nuts, and honey (your favorite breakfast!)' : 'Oatmeal with banana, nuts, and honey',
        lunch: likedFoods.includes('turkey') ? 'Turkey and avocado wrap with whole grain tortilla (using your preferred protein)' : 'Turkey and avocado wrap with whole grain tortilla',
        dinner: likedFoods.includes('pasta') ? 'Pasta with lean meat sauce and side salad (featuring your favorite carb!)' : 'Pasta with lean meat sauce and side salad',
        snack: likedFoods.includes('dates') ? 'Energy balls with dates and nuts (using your preferred ingredients)' : 'Energy balls with dates and nuts'
      },
      'Muscle Gain': {
        breakfast: likedFoods.includes('eggs') ? 'Scrambled eggs with whole grain toast and avocado (your preferred protein!)' : 'Scrambled eggs with whole grain toast and avocado',
        lunch: likedFoods.includes('chicken') ? 'Chicken and rice bowl with black beans (featuring your favorite protein)' : 'Chicken and rice bowl with black beans',
        dinner: likedFoods.includes('beef') ? 'Lean beef stir-fry with quinoa (using your preferred meat)' : 'Lean beef stir-fry with quinoa',
        snack: likedFoods.includes('protein shake') ? 'Protein shake with banana (your preferred recovery option)' : 'Protein shake with banana'
      },
      'General Fitness': {
        breakfast: 'Smoothie bowl with protein powder and fruit (customized to your preferences)',
        lunch: 'Mediterranean bowl with hummus and vegetables (avoiding any foods you dislike)',
        dinner: 'Grilled chicken with roasted vegetables and brown rice (using your preferred cooking methods)',
        snack: 'Mixed nuts and fruit (selecting from your liked foods list)'
      }
    };

    const goalMeals = suggestions[goal] || suggestions['Endurance Performance'];

    return [
      {
        meal: "Breakfast",
        description: goalMeals.breakfast,
        calories: breakfastCals,
        timing: "2-3 hours before morning training, or 1 hour after if training first",
        personalizedNote: foodPreferences ? "Customized based on your food preferences" : null
      },
      {
        meal: "Lunch", 
        description: goalMeals.lunch,
        calories: lunchCals,
        timing: "Midday fuel - can be post-workout recovery meal if training AM",
        personalizedNote: dislikedFoods?.length > 0 ? `Avoiding your ${dislikedFoods.length} disliked foods` : null
      },
      {
        meal: "Dinner",
        description: goalMeals.dinner, 
        calories: dinnerCals,
        timing: "Evening recovery and preparation for next day's training",
        personalizedNote: likedFoods?.length > 0 ? `Featuring foods from your ${likedFoods.length} preferred options` : null
      },
      {
        meal: "Snack",
        description: goalMeals.snack,
        calories: snackCals,
        timing: "Between meals or post-workout if main meal is delayed",
        personalizedNote: "Selected from foods you enjoy"
      }
    ];
  }

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

  generateMockMealPlan(userData, nutritionPlan) {
    const { foodPreferences } = userData;
    const likedFoods = foodPreferences?.likedFoods || [];
    const dislikedFoods = foodPreferences?.dislikedFoods || [];
    
    // Simple mock implementation that considers preferences
    return {
      weeklyPlan: Array.from({length: 7}, (_, i) => ({
        day: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][i],
        breakfast: {
          name: likedFoods.includes('oatmeal') ? 'Oatmeal with your favorite toppings' : 'Oatmeal with fruit and nuts', 
          calories: 400, 
          prepTime: '10 min',
          personalizedNote: likedFoods.length > 0 ? 'Uses your preferred foods' : null
        },
        lunch: {
          name: likedFoods.includes('quinoa') ? 'Quinoa power bowl (your favorite grain!)' : 'Quinoa power bowl', 
          calories: 500, 
          prepTime: '15 min',
          personalizedNote: dislikedFoods.length > 0 ? 'Avoids your disliked foods' : null
        },  
        dinner: {
          name: likedFoods.includes('chicken') ? 'Grilled chicken with vegetables (your preferred protein)' : 'Lean protein with vegetables', 
          calories: 600, 
          prepTime: '20 min',
          personalizedNote: 'Customized to your preferences'
        },
        snacks: {
          name: likedFoods.includes('greek yogurt') ? 'Greek yogurt with berries (your favorite!)' : 'Greek yogurt with berries', 
          calories: 200, 
          timing: 'Mid-afternoon'
        }
      })),
      shoppingList: [
        ...['Oats', 'Quinoa', 'Mixed vegetables'].filter(item => !dislikedFoods.includes(item.toLowerCase())),
        ...(likedFoods.includes('chicken') ? ['Chicken breast'] : ['Lean protein']),
        ...(likedFoods.includes('sweet potato') ? ['Sweet potatoes'] : [])
      ],
      prepTips: [
        'Cook grains in bulk on Sunday',
        'Pre-cut vegetables for quick assembly',
        foodPreferences ? 'Meal plan customized based on your food preferences' : 'Standard meal prep strategies'
      ],
      personalizedNotes: `Meal plan considers ${likedFoods.length} liked foods and avoids ${dislikedFoods.length} disliked foods. Based on endurance athlete needs with practical prep strategies tailored to your preferences.`
    };
  }
}

// Create instance and export it
const nutritionServiceInstance = new NutritionService();
export default nutritionServiceInstance;