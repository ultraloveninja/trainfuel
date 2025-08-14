// src/services/nutritionService.js - Updated for direct Claude API integration

class NutritionService {
  constructor() {
    // Check if Claude API key is available
    this.hasClaudeAPI = !!process.env.REACT_APP_CLAUDE_API_KEY;
    this.model = "claude-sonnet-4-20250514";
    
    if (this.hasClaudeAPI) {
      console.log('✅ Claude API configured');
    } else {
      console.log('📄 Using intelligent mock data (Claude API key not found)');
    }
  }

  // Direct Claude API call (if you have API key)
  async callClaude(prompt, maxTokens = 2000) {
    if (!this.hasClaudeAPI) {
      throw new Error('Claude API key not configured');
    }

    try {
      console.log('🤖 Making request to Claude API...');
      
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.REACT_APP_CLAUDE_API_KEY,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: maxTokens,
          messages: [{ role: "user", content: prompt }]
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Claude API request failed: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      
      if (!data.content || !data.content[0] || !data.content[0].text) {
        throw new Error('Invalid response format from Claude API');
      }
      
      // Clean and parse JSON response
      let responseText = data.content[0].text;
      responseText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      
      try {
        return JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.error('Raw response:', responseText);
        throw new Error('Failed to parse Claude response as JSON');
      }
      
    } catch (error) {
      console.error('Claude API Error:', error);
      throw error;
    }
  }

  // Generate nutrition plan - tries Claude first, falls back to intelligent mock
  async generateNutritionPlan(userData) {
    console.log('🍎 Generating nutrition plan for:', userData.athlete?.firstname || 'User');
    
    try {
      if (this.hasClaudeAPI) {
        const prompt = this.buildNutritionPrompt(userData);
        const response = await this.callClaude(prompt, 2000);
        console.log('✅ Received Claude nutrition plan');
        return response;
      }
    } catch (error) {
      console.error('❌ Claude API failed:', error);
      console.log('🔄 Falling back to intelligent mock data');
    }
    
    // Use intelligent mock data (this is actually quite good!)
    return this.generateIntelligentMockPlan(userData);
  }

  // Generate daily nutrition - tries Claude first, falls back to mock
  async generateDailyNutrition(userData) {
    console.log('🥗 Generating daily nutrition recommendations');
    
    try {
      if (this.hasClaudeAPI) {
        const prompt = this.buildDailyNutritionPrompt(userData);
        const response = await this.callClaude(prompt, 1500);
        console.log('✅ Received Claude daily nutrition');
        return response;
      }
    } catch (error) {
      console.error('❌ Claude API failed:', error);
      console.log('🔄 Falling back to mock daily nutrition');
    }
    
    // Use mock data
    return this.generateMockDailyNutrition(userData);
  }

  // Generate weekly meal plan
  async generateWeeklyMealPlan(userData, nutritionPlan) {
    console.log('📅 Generating weekly meal plan');
    
    try {
      if (this.hasClaudeAPI) {
        const prompt = this.buildMealPlanPrompt(userData, nutritionPlan);
        const response = await this.callClaude(prompt, 3000);
        console.log('✅ Received Claude meal plan');
        return response;
      }
    } catch (error) {
      console.error('❌ Claude API failed:', error);
      console.log('🔄 Falling back to mock meal plan');
    }
    
    return this.generateMockMealPlan(userData, nutritionPlan);
  }

  // Build nutrition plan prompt
  buildNutritionPrompt(userData) {
    const { athlete, trainingData, activities, preferences } = userData;
    
    return `Create a personalized nutrition plan based on this athlete's real Strava training data.

ATHLETE PROFILE:
- Name: ${athlete?.firstname} ${athlete?.lastname}
- Weight: ${athlete?.weight || 70}kg
- Gender: ${athlete?.sex === 'M' ? 'Male' : athlete?.sex === 'F' ? 'Female' : 'Unknown'}

CURRENT TRAINING DATA (from Strava):
- Training Phase: ${trainingData?.currentPhase}
- Weekly TSS: ${trainingData?.weeklyTSS}
- Today's Activity: ${trainingData?.todaysActivity?.type} (${trainingData?.todaysActivity?.duration} min, ${trainingData?.todaysActivity?.intensity} intensity)

RECENT ACTIVITIES (Last 7 days from Strava):
${activities?.slice(0, 7).map(activity => 
  `- ${activity.date}: ${activity.type}, ${activity.duration} min, ${activity.intensity} intensity, ${activity.tss} TSS`
).join('\n')}

GOALS:
- Primary Goal: ${preferences?.trainingGoal || 'Endurance Performance'}
- Dietary Restrictions: ${preferences?.dietaryRestrictions || 'None'}

This athlete has real training data from Strava. Create specific recommendations based on their actual training patterns and intensity distribution.

Respond ONLY with valid JSON:

{
  "dailyCalories": number,
  "macros": {
    "carbs": { "grams": number, "percentage": number, "timing": "specific timing recommendations" },
    "protein": { "grams": number, "percentage": number, "timing": "specific timing recommendations" },
    "fat": { "grams": number, "percentage": number, "timing": "specific timing recommendations" }
  },
  "hydration": {
    "dailyTarget": number,
    "duringTraining": "specific ml per hour recommendation",
    "recoveryFocus": "specific hydration strategy"
  },
  "workoutNutrition": {
    "preWorkout": "specific food and timing based on training",
    "duringWorkout": "specific fueling strategy", 
    "postWorkout": "specific recovery nutrition"
  },
  "mealSuggestions": [
    { "meal": "Breakfast", "description": "specific meal", "calories": number, "timing": "timing" },
    { "meal": "Lunch", "description": "specific meal", "calories": number, "timing": "timing" },
    { "meal": "Dinner", "description": "specific meal", "calories": number, "timing": "timing" },
    { "meal": "Snack", "description": "specific snack", "calories": number, "timing": "timing" }
  ],
  "supplements": [
    { "name": "supplement", "dosage": "dosage", "timing": "timing", "purpose": "purpose" }
  ],
  "notes": "Specific insights based on their Strava training data and current phase"
}

DO NOT OUTPUT ANYTHING OTHER THAN VALID JSON.`;
  }

  // Build daily nutrition prompt
  buildDailyNutritionPrompt(userData) {
    const { athlete, trainingData, activities } = userData;
    
    return `Provide today's specific nutrition guidance based on real Strava data.

ATHLETE: ${athlete?.firstname} (${athlete?.weight || 70}kg)
TODAY'S TRAINING: ${trainingData?.todaysActivity?.type} - ${trainingData?.todaysActivity?.duration} min at ${trainingData?.todaysActivity?.intensity} intensity (${trainingData?.todaysActivity?.tss} TSS)

RECENT PATTERN (from Strava):
${activities?.slice(0, 3).map(activity => 
  `${activity.date}: ${activity.type}, ${activity.intensity} intensity, ${activity.tss} TSS`
).join('\n')}

TRAINING CONTEXT: ${trainingData?.currentPhase} phase, ${trainingData?.weeklyTSS} weekly TSS

Based on their ACTUAL training data, provide specific nutrition guidance for TODAY.

Respond ONLY with valid JSON:

{
  "preWorkout": {
    "timing": "specific timing before workout",
    "meal": "specific food recommendation",
    "rationale": "why this works for today's training"
  },
  "duringWorkout": {
    "timing": "when to fuel during exercise",
    "fuel": "what to consume",
    "rationale": "why this fueling strategy"
  },
  "postWorkout": {
    "timing": "specific timing after workout", 
    "meal": "specific recovery meal",
    "rationale": "what this accomplishes"
  },
  "hydrationGoal": "specific hydration target with reasoning",
  "racePrep": "any specific notes based on training phase"
}

DO NOT OUTPUT ANYTHING OTHER THAN VALID JSON.`;
  }

  // Build meal plan prompt
  buildMealPlanPrompt(userData, nutritionPlan) {
    const { athlete, activities, preferences } = userData;
    
    return `Create a 7-day meal plan based on this athlete's training schedule and nutrition targets.

ATHLETE: ${athlete?.firstname} (${athlete?.weight || 70}kg)
NUTRITION TARGETS:
- Daily Calories: ${nutritionPlan?.dailyCalories || 2500}
- Carbs: ${nutritionPlan?.macros?.carbs?.grams || 350}g
- Protein: ${nutritionPlan?.macros?.protein?.grams || 140}g
- Fat: ${nutritionPlan?.macros?.fat?.grams || 90}g

TRAINING PATTERN (last 7 days):
${activities?.slice(0, 7).map((activity, index) => 
  `Day ${index + 1}: ${activity.type}, ${activity.duration}min, ${activity.intensity} intensity`
).join('\n')}

PREFERENCES:
- Dietary Restrictions: ${preferences?.dietaryRestrictions || 'None'}
- Training Goal: ${preferences?.trainingGoal || 'Endurance Performance'}

Create practical meals that match training demands and are easy to prepare.

Respond ONLY with valid JSON following this structure:

{
  "weeklyPlan": [
    {
      "day": 1,
      "trainingDay": true,
      "meals": {
        "breakfast": { "name": "meal name", "calories": number, "carbs": number, "protein": number, "fat": number },
        "lunch": { "name": "meal name", "calories": number, "carbs": number, "protein": number, "fat": number },
        "dinner": { "name": "meal name", "calories": number, "carbs": number, "protein": number, "fat": number }
      }
    }
  ],
  "shoppingList": ["ingredient1", "ingredient2"],
  "prepTips": ["tip1", "tip2"]
}

DO NOT OUTPUT ANYTHING OTHER THAN VALID JSON.`;
  }

  // Enhanced intelligent mock plan (keeps all your existing logic)
  generateIntelligentMockPlan(userData) {
    const { athlete, trainingData, activities, preferences } = userData;
    const goal = preferences?.trainingGoal || 'Endurance Performance';
    
    // Calculate realistic calories based on training load
    const baseCalories = this.calculateBaseCalories(athlete);
    const trainingAdjustment = this.calculateTrainingAdjustment(trainingData, activities, goal);
    const dailyCalories = Math.round(baseCalories + trainingAdjustment);
    
    // Smart macro distribution based on training phase
    const macros = this.calculateMacros(dailyCalories, trainingData?.currentPhase, goal);
    
    return {
      dailyCalories,
      macros,
      hydration: {
        dailyTarget: Math.round(35 * (athlete?.weight || 70)),
        duringTraining: `${Math.round((trainingData?.todaysActivity?.duration || 0) * 8)}ml per hour`,
        recoveryFocus: goal === 'Weight Loss' ? 
          'Focus on electrolyte balance without excess calories' : 
          'Rapid rehydration with added carbohydrates'
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
      notes: `Generated for ${athlete?.firstname || 'User'} - ${trainingData?.currentPhase} phase, ${goal} goal. Based on your actual Strava training data! ${this.hasClaudeAPI ? '(Claude API available but using fallback)' : '(Add REACT_APP_CLAUDE_API_KEY to .env for AI recommendations)'}`
    };
  }

  // Keep all your existing helper methods (calculateBaseCalories, etc.)
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
    const baseTSS = trainingData?.todaysActivity?.tss || 0;
    let adjustment = baseTSS * 12; // ~12 calories per TSS point
    
    if (goal === 'Weight Loss') {
      adjustment *= 0.7;
    } else if (goal === 'Muscle Gain') {
      adjustment *= 1.2;
    }
    
    return adjustment;
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
      fatPercentage -= 5;
    }
    
    return {
      carbs: {
        grams: Math.round((calories * carbPercentage / 100) / 4),
        percentage: carbPercentage,
        timing: "Focus around training sessions"
      },
      protein: {
        grams: Math.round((calories * proteinPercentage / 100) / 4),
        percentage: proteinPercentage,
        timing: "Spread throughout the day, emphasize post-workout"
      },
      fat: {
        grams: Math.round((calories * fatPercentage / 100) / 9),
        percentage: fatPercentage,
        timing: "Away from immediate pre/post workout windows"
      }
    };
  }

  getPreWorkoutNutrition(intensity, goal) {
    if (intensity === 'High' || intensity === 'Very High') {
      return goal === 'Weight Loss' ? 
        'Light carbs: banana or small energy bar (30-45g carbs)' :
        'Carb-rich meal: oatmeal with banana and honey (60-80g carbs)';
    }
    return 'Light snack if needed: toast with jam or banana (30g carbs)';
  }

  getDuringWorkoutNutrition(duration, intensity) {
    if (duration > 90 && (intensity === 'High' || intensity === 'Very High')) {
      return 'Sports drink: 30-60g carbs per hour after first 60 minutes';
    } else if (duration > 60) {
      return 'Light sports drink or water with electrolytes (15-30g carbs/hour)';
    }
    return 'Water only - session too short for carb fueling';
  }

  getPostWorkoutNutrition(intensity, goal) {
    if (intensity === 'High' || intensity === 'Very High') {
      return goal === 'Weight Loss' ?
        'Protein-focused recovery: protein shake with minimal carbs (25g protein, 15g carbs)' :
        'Recovery shake: 3:1 carb to protein ratio (60g carbs, 20g protein)';
    }
    return 'Balanced meal within 2 hours: focus on protein and complex carbs';
  }

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
      }
    };

    const goalMeals = suggestions[goal] || suggestions['Endurance Performance'];

    return [
      { meal: "Breakfast", description: goalMeals.breakfast, calories: breakfastCals, timing: "2-3 hours before training" },
      { meal: "Lunch", description: goalMeals.lunch, calories: lunchCals, timing: "Midday fuel" },
      { meal: "Dinner", description: goalMeals.dinner, calories: dinnerCals, timing: "Evening recovery" },
      { meal: "Snack", description: goalMeals.snack, calories: snackCals, timing: "Between meals or post-workout" }
    ];
  }

  getSupplementRecommendations(phase, goal) {
    const base = [
      { name: 'Vitamin D3', dosage: '2000 IU', timing: 'With breakfast', purpose: 'Bone health and immune function' },
      { name: 'Omega-3', dosage: '1000mg EPA/DHA', timing: 'With dinner', purpose: 'Anti-inflammatory support and recovery' }
    ];
    
    if (phase === 'Build' || phase === 'Peak') {
      base.push({
        name: 'Magnesium',
        dosage: '400mg',
        timing: 'Before bed',
        purpose: 'Muscle recovery and sleep quality during intense training'
      });
    }

    if (goal === 'Muscle Gain') {
      base.push({
        name: 'Creatine',
        dosage: '5g',
        timing: 'Post-workout',
        purpose: 'Strength and power development'
      });
    }
    
    return base;
  }

  // Mock daily nutrition
  generateMockDailyNutrition(userData) {
    const { athlete, trainingData } = userData;
    const activity = trainingData?.todaysActivity || { type: 'Rest Day', duration: 0, intensity: 'Rest', tss: 0 };
    
    return {
      preWorkout: {
        timing: "1-2 hours before training",
        meal: activity.intensity === 'High' ? 
          "Oatmeal with banana and honey + coffee" : 
          "Toast with jam + coffee",
        rationale: `For your ${activity.intensity?.toLowerCase()} intensity ${activity.type?.toLowerCase()} session`
      },
      duringWorkout: {
        timing: "Every 20-30 minutes during exercise",
        fuel: activity.duration > 60 ? 
          "Sports drink targeting 30-60g carbs/hour" : 
          activity.duration > 0 ? "Water with electrolytes" : "Rest day - focus on hydration",
        rationale: activity.duration > 60 ? 
          `${activity.duration}min session needs carb replenishment` : 
          `${activity.duration}min session - hydration focus`
      },
      postWorkout: {
        timing: "Within 30 minutes",
        meal: activity.tss > 70 ? 
          "Recovery shake: protein + carbs + fruit" : 
          activity.tss > 0 ? "Protein shake with moderate carbs" : "Focus on balanced meals",
        rationale: activity.tss > 0 ? 
          `TSS ${activity.tss} - prioritize recovery nutrition` : 
          "Rest day - steady nutrient intake"
      },
      hydrationGoal: `${Math.round(35 * (athlete?.weight || 70))}ml base + ${Math.round(activity.duration * 8)}ml training`,
      racePrep: `Based on your real Strava data! ${this.hasClaudeAPI ? '(Claude API available)' : '(Add Claude API key for AI recommendations)'}`
    };
  }

  generateMockMealPlan(userData, nutritionPlan) {
    return {
      weeklyPlan: [
        {
          day: 1,
          trainingDay: true,
          meals: {
            breakfast: { name: "Training Day Oatmeal Bowl", calories: 450, carbs: 65, protein: 15, fat: 12 },
            lunch: { name: "Power Quinoa Bowl", calories: 520, carbs: 68, protein: 22, fat: 18 },
            dinner: { name: "Recovery Salmon Plate", calories: 580, carbs: 45, protein: 35, fat: 22 }
          }
        }
      ],
      shoppingList: ["oats", "banana", "quinoa", "salmon", "sweet potato", "spinach", "almonds"],
      prepTips: [
        "Prep overnight oats for easy breakfast",
        "Cook grains in batches on Sunday",
        "Pre-cut vegetables for quick assembly"
      ]
    };
  }
}

// Create and export instance
const nutritionService = new NutritionService();
export default nutritionService;