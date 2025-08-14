// src/services/nutritionService.js
class NutritionService {
  constructor() {
    // Use proxy server instead of direct API calls
    this.proxyUrl = process.env.REACT_APP_PROXY_URL || "http://localhost:3001/api/claude";
    this.model = "claude-sonnet-4-20250514";
  }

  // Make API call to Claude via proxy server
  async callClaude(prompt, maxTokens = 2000) {
    try {
      console.log('Making request to proxy server:', this.proxyUrl);
      
      const response = await fetch(this.proxyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: maxTokens,
          messages: [
            { role: "user", content: prompt }
          ]
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Proxy request failed: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }

      const data = await response.json();
      const responseText = data.content[0].text;
      
      // Clean response and parse JSON
      const cleanedResponse = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      return JSON.parse(cleanedResponse);
      
    } catch (error) {
      console.error('Claude API Error:', error);
      throw error;
    }
  }

  // Test proxy connection
  async testConnection() {
    try {
      const healthUrl = this.proxyUrl.replace('/api/claude', '/health');
      const response = await fetch(healthUrl);
      const data = await response.json();
      
      console.log('Proxy server health:', data);
      return data.status === 'OK' && data.hasApiKey;
    } catch (error) {
      console.error('Proxy connection test failed:', error);
      return false;
    }
  }

  // Generate personalized nutrition plan using Claude
  async generateNutritionPlan(userData) {
    console.log('Generating nutrition plan for:', userData);
    
    try {
      const prompt = this.buildNutritionPrompt(userData);
      const response = await this.callClaude(prompt, 2000);
      console.log('✅ Received Claude nutrition plan');
      return response;
      
    } catch (error) {
      console.error('❌ Error generating nutrition plan:', error);
      console.log('🔄 Falling back to intelligent mock data');
      // Fallback to intelligent mock data
      return this.generateIntelligentMockPlan(userData);
    }
  }

  // Generate weekly meal plan using Claude
  async generateWeeklyMealPlan(userData, nutritionPlan) {
    console.log('Generating weekly meal plan for:', userData);
    
    try {
      const prompt = this.buildMealPlanPrompt(userData, nutritionPlan);
      const response = await this.callClaude(prompt, 3000);
      console.log('✅ Received Claude meal plan');
      return response;
      
    } catch (error) {
      console.error('❌ Error generating meal plan:', error);
      console.log('🔄 Falling back to mock meal plan');
      // Fallback to mock meal plan
      return this.generateMockMealPlan(userData, nutritionPlan);
    }
  }

  // Generate daily nutrition recommendations using Claude
  async generateDailyNutrition(userData) {
    console.log('Generating daily nutrition for:', userData);
    
    try {
      const prompt = this.buildDailyNutritionPrompt(userData);
      const response = await this.callClaude(prompt, 1500);
      console.log('✅ Received Claude daily nutrition');
      return response;
      
    } catch (error) {
      console.error('❌ Error generating daily nutrition:', error);
      console.log('🔄 Falling back to mock daily nutrition');
      // Fallback to mock daily nutrition
      return this.generateMockDailyNutrition(userData);
    }
  }

  // Build detailed nutrition plan prompt for Claude
  buildNutritionPrompt(userData) {
    const { athlete, trainingData, activities, preferences } = userData;
    
    return `Create a personalized nutrition plan based on the following athlete data.

ATHLETE PROFILE:
- Name: ${athlete?.firstname} ${athlete?.lastname}
- Weight: ${athlete?.weight || preferences.weight || 70}kg
- Gender: ${athlete?.sex === 'M' ? 'Male' : athlete?.sex === 'F' ? 'Female' : 'Unknown'}
- Age: ${preferences.age || 35}
- Height: ${preferences.height || 175}cm

CURRENT TRAINING DATA:
- Training Phase: ${trainingData?.currentPhase}
- Weekly TSS: ${trainingData?.weeklyTSS}
- Recent Activity: ${trainingData?.todaysActivity?.type} (${trainingData?.todaysActivity?.duration} min, ${trainingData?.todaysActivity?.intensity} intensity, ${trainingData?.todaysActivity?.tss} TSS)

RECENT ACTIVITIES (Last 7 days):
${activities?.slice(0, 7).map(activity => 
  `- ${activity.date}: ${activity.type}, ${activity.duration} min, ${activity.intensity} intensity, ${activity.tss} TSS`
).join('\n')}

GOALS & PREFERENCES:
- Primary Goal: ${preferences.trainingGoal || 'Endurance Performance'}
- Dietary Restrictions: ${preferences.dietaryRestrictions || 'None'}

CONTEXT: This athlete is actively training with real Strava data. Analyze their training patterns, intensity distribution, and current phase to provide highly specific nutrition recommendations.

Respond ONLY with valid JSON in this exact format:

{
  "dailyCalories": number,
  "macros": {
    "carbs": { "grams": number, "percentage": number, "timing": "specific timing recommendations" },
    "protein": { "grams": number, "percentage": number, "timing": "specific timing recommendations" },
    "fat": { "grams": number, "percentage": number, "timing": "specific timing recommendations" }
  },
  "hydration": {
    "dailyTarget": number,
    "duringTraining": "specific ml per hour based on training duration",
    "recoveryFocus": "specific hydration strategy"
  },
  "workoutNutrition": {
    "preWorkout": "specific food and timing based on upcoming workout",
    "duringWorkout": "specific fueling strategy for their training intensity", 
    "postWorkout": "specific recovery nutrition with timing"
  },
  "mealSuggestions": [
    {
      "meal": "Breakfast",
      "description": "specific meal based on training schedule",
      "calories": number,
      "timing": "specific timing relative to training"
    },
    {
      "meal": "Pre-Training",
      "description": "specific pre-workout meal",
      "calories": number,
      "timing": "specific timing"
    },
    {
      "meal": "Post-Training",
      "description": "specific recovery meal",
      "calories": number,
      "timing": "specific timing"
    },
    {
      "meal": "Dinner",
      "description": "specific dinner based on training load",
      "calories": number,
      "timing": "specific timing"
    }
  ],
  "supplements": [
    {
      "name": "supplement name",
      "dosage": "specific dosage",
      "timing": "specific timing",
      "purpose": "specific purpose for this athlete's training"
    }
  ],
  "notes": "Key insights about this athlete's specific training phase, recent activities, and personalized recommendations"
}

DO NOT OUTPUT ANYTHING OTHER THAN VALID JSON.`;
  }

  // Build meal plan prompt for Claude
  buildMealPlanPrompt(userData, nutritionPlan) {
    const { athlete, trainingData, activities, preferences } = userData;
    
    return `Create a 7-day meal plan based on this athlete's nutrition plan and training schedule.

ATHLETE: ${athlete?.firstname} (${athlete?.weight || 70}kg)
NUTRITION TARGETS:
- Daily Calories: ${nutritionPlan.dailyCalories}
- Carbs: ${nutritionPlan.macros.carbs.grams}g (${nutritionPlan.macros.carbs.percentage}%)
- Protein: ${nutritionPlan.macros.protein.grams}g (${nutritionPlan.macros.protein.percentage}%)
- Fat: ${nutritionPlan.macros.fat.grams}g (${nutritionPlan.macros.fat.percentage}%)

TRAINING PATTERN (analyze for meal timing):
${activities?.slice(0, 7).map((activity, index) => 
  `Day ${index + 1}: ${activity.type}, ${activity.duration}min, ${activity.intensity} intensity`
).join('\n')}

PREFERENCES:
- Dietary Restrictions: ${preferences.dietaryRestrictions || 'None'}
- Cooking Skill: ${preferences.cookingSkill || 'Intermediate'}

Create meals that:
1. Match training demands (higher carbs on hard training days)
2. Optimize timing around workouts
3. Meet nutritional targets
4. Are practical and enjoyable

Respond ONLY with valid JSON:

{
  "weeklyPlan": [
    {
      "day": 1,
      "trainingDay": true/false,
      "meals": {
        "breakfast": { "name": "string", "calories": number, "carbs": number, "protein": number, "fat": number },
        "preWorkout": { "name": "string", "calories": number, "timing": "string" },
        "postWorkout": { "name": "string", "calories": number, "timing": "string" },
        "lunch": { "name": "string", "calories": number, "carbs": number, "protein": number, "fat": number },
        "snack": { "name": "string", "calories": number, "carbs": number, "protein": number, "fat": number },
        "dinner": { "name": "string", "calories": number, "carbs": number, "protein": number, "fat": number }
      },
      "dailyTotals": { "calories": number, "carbs": number, "protein": number, "fat": number }
    }
  ],
  "shoppingList": ["ingredient1", "ingredient2"],
  "prepTips": ["tip1", "tip2"]
}

DO NOT OUTPUT ANYTHING OTHER THAN VALID JSON.`;
  }

  // Build daily nutrition prompt for Claude
  buildDailyNutritionPrompt(userData) {
    const { athlete, trainingData, activities, preferences } = userData;
    
    return `Provide today's specific nutrition guidance for this athlete.

ATHLETE: ${athlete?.firstname} (${athlete?.weight || 70}kg)
TODAY'S TRAINING: ${trainingData?.todaysActivity?.type} - ${trainingData?.todaysActivity?.duration} min at ${trainingData?.todaysActivity?.intensity} intensity

RECENT TRAINING PATTERN:
${activities?.slice(0, 3).map(activity => 
  `${activity.date}: ${activity.type}, ${activity.intensity} intensity`
).join('\n')}

CONTEXT: ${trainingData?.currentPhase} phase, ${trainingData?.weeklyTSS} weekly TSS

Provide specific guidance for TODAY based on their actual training. Be practical and actionable.

Respond ONLY with valid JSON:

{
  "preWorkout": {
    "timing": "specific timing before workout",
    "meal": "specific food recommendation",
    "rationale": "why this works for today's training"
  },
  "duringWorkout": {
    "strategy": "specific fueling strategy",
    "details": "what to consume and when"
  },
  "postWorkout": {
    "timing": "specific timing after workout", 
    "meal": "specific recovery meal",
    "focus": "what this meal accomplishes"
  },
  "hydrationGoal": "specific hydration target for today",
  "racePrep": "any race-specific nutrition notes"
}

DO NOT OUTPUT ANYTHING OTHER THAN VALID JSON.`;
  }

  // Keep all your existing fallback methods unchanged...
  generateIntelligentMockPlan(userData) {
    const { athlete, trainingData, activities, preferences } = userData;
    const goal = preferences?.trainingGoal || 'Endurance Performance';
    
    // Calculate calories based on actual training load
    const baseCalories = this.calculateBaseCalories(athlete);
    const trainingAdjustment = this.calculateTrainingAdjustment(trainingData, activities, goal);
    const dailyCalories = Math.round(baseCalories + trainingAdjustment);
    
    // Adjust macros based on training phase AND goal
    const macros = this.calculateMacros(dailyCalories, trainingData.currentPhase, goal);
    
    // Generate phase-specific recommendations
    const phaseRecommendations = this.getPhaseRecommendations(trainingData.currentPhase, goal);
    
    return {
      dailyCalories,
      macros,
      hydration: {
        dailyTarget: Math.round(35 * (athlete.weight || 70)),
        duringTraining: `${Math.round(trainingData.todaysActivity.duration * 8)}ml per hour`,
        recoveryFocus: goal === 'Weight Loss' ? 
          'Focus on electrolyte balance without excess calories' : 
          'Rapid rehydration with added carbohydrates'
      },
      workoutNutrition: {
        preWorkout: this.getPreWorkoutNutrition(trainingData.todaysActivity.intensity, goal),
        duringWorkout: this.getDuringWorkoutNutrition(trainingData.todaysActivity.duration, trainingData.todaysActivity.intensity),
        postWorkout: this.getPostWorkoutNutrition(trainingData.todaysActivity.intensity, goal)
      },
      mealSuggestions: [
        {
          meal: "Breakfast",
          description: "Oatmeal with berries and Greek yogurt",
          calories: Math.round(dailyCalories * 0.25),
          timing: "2-3 hours before training"
        }
      ],
      supplements: this.getSupplementRecommendations(trainingData.currentPhase, goal),
      notes: `FALLBACK MODE: Based on your ${trainingData.currentPhase} training phase and ${goal.toLowerCase()} goal. ${phaseRecommendations}`
    };
  }

  generateMockDailyNutrition(userData) {
    const { athlete, trainingData } = userData;
    
    return {
      preWorkout: {
        timing: "1-2 hours before",
        meal: "Banana with almond butter and coffee",
        rationale: `FALLBACK MODE: Given your ${trainingData.todaysActivity.intensity.toLowerCase()} intensity session`
      },
      duringWorkout: {
        strategy: trainingData.todaysActivity.duration > 60 ? "Sports drink with 30-60g carbs/hour" : "Water only",
        details: "Start fueling after 45-60 minutes"
      },
      postWorkout: {
        timing: "Within 30 minutes",
        meal: "Protein shake with banana",
        focus: "Rapid recovery and glycogen replenishment"
      },
      hydrationGoal: `${Math.round(35 * (athlete.weight || 70))}ml base + training needs`,
      racePrep: "FALLBACK MODE: Focus on consistent daily nutrition habits"
    };
  }

  generateMockMealPlan(userData, nutritionPlan) {
    return {
      weeklyPlan: [
        {
          day: 1,
          trainingDay: true,
          meals: {
            breakfast: { name: "FALLBACK: Training Day Oatmeal", calories: 450, carbs: 65, protein: 15, fat: 12 },
            lunch: { name: "FALLBACK: Quinoa Power Bowl", calories: 520, carbs: 68, protein: 22, fat: 18 },
            dinner: { name: "FALLBACK: Salmon with Sweet Potato", calories: 580, carbs: 45, protein: 35, fat: 22 }
          },
          dailyTotals: { calories: nutritionPlan.dailyCalories, carbs: nutritionPlan.macros.carbs.grams, protein: nutritionPlan.macros.protein.grams, fat: nutritionPlan.macros.fat.grams }
        }
      ],
      shoppingList: ["oats", "banana", "salmon", "sweet potato"],
      prepTips: ["FALLBACK MODE: Prep overnight oats", "Cook grains in batches"]
    };
  }

  // Keep all your existing helper methods (calculateBaseCalories, etc.)
  calculateBaseCalories(athlete) {
    const weight = athlete.weight || 70;
    const age = athlete.age || 35;
    const height = athlete.height || 175;
    const isMale = athlete.sex === 'M';
    
    if (isMale) {
      return (10 * weight) + (6.25 * height) - (5 * age) + 5;
    } else {
      return (10 * weight) + (6.25 * height) - (5 * age) - 161;
    }
  }

  calculateTrainingAdjustment(trainingData, activities, goal) {
    const baseTSS = trainingData?.todaysActivity?.tss || 0;
    const weeklyAverage = trainingData?.weeklyTSS / 7 || 0;
    
    let adjustment = baseTSS * 15;
    
    if (goal === 'Weight Loss') {
      adjustment *= 0.8;
    } else if (goal === 'Performance') {
      adjustment *= 1.1;
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

  getPhaseRecommendations(phase, goal) {
    const recommendations = {
      'Build': 'Focus on adequate carbohydrate intake to support increased training load.',
      'Peak': 'Maintain energy with consistent nutrition timing. Practice race-day nutrition.',
      'Recovery': 'Emphasize protein for tissue repair and lighter, nutrient-dense meals.',
      'Base': 'Build healthy eating habits with balanced macronutrient distribution.'
    };
    
    return recommendations[phase] || recommendations['Base'];
  }

  getPreWorkoutNutrition(intensity, goal) {
    if (intensity === 'High' || intensity === 'Very High') {
      return goal === 'Weight Loss' ? 
        'Light carbs: banana or small energy bar' :
        'Carb-rich: oatmeal with banana and honey';
    }
    return 'Light snack if needed: banana or toast';
  }

  getDuringWorkoutNutrition(duration, intensity) {
    if (duration > 90 && (intensity === 'High' || intensity === 'Very High')) {
      return 'Sports drink: 30-60g carbs per hour after first hour';
    } else if (duration > 60) {
      return 'Light sports drink or water with electrolytes';
    }
    return 'Water only';
  }

  getPostWorkoutNutrition(intensity, goal) {
    if (intensity === 'High' || intensity === 'Very High') {
      return goal === 'Weight Loss' ?
        'Protein shake with minimal carbs' :
        'Recovery shake: 3:1 carb to protein ratio';
    }
    return 'Balanced meal within 2 hours';
  }

  getSupplementRecommendations(phase, goal) {
    const base = [
      { name: 'Vitamin D3', dosage: '2000 IU', timing: 'With breakfast', purpose: 'Bone health and immune function' },
      { name: 'Omega-3', dosage: '1000mg EPA/DHA', timing: 'With dinner', purpose: 'Anti-inflammatory support' }
    ];
    
    if (phase === 'Build' || phase === 'Peak') {
      base.push({
        name: 'Magnesium',
        dosage: '400mg',
        timing: 'Before bed',
        purpose: 'Muscle recovery and sleep quality'
      });
    }
    
    return base;
  }
}

// Create and export instance
const nutritionService = new NutritionService();
export default nutritionService;