// src/services/nutritionService.js
import axios from 'axios';

class NutritionService {
  constructor() {
    this.proxyUrl = process.env.REACT_APP_PROXY_URL || 'http://localhost:3001/api/claude';
  }

  async callClaudeAPI(prompt) {
    try {
      const response = await axios.post(this.proxyUrl, {
        prompt: prompt  // Make sure we're sending 'prompt' field
      });
      
      return response.data;
    } catch (error) {
      console.error('Error calling Claude API:', error.response?.data || error.message);
      return null;
    }
  }

  async generateDailyNutrition(userData) {
    try {
      const prompt = this.buildNutritionPrompt(userData);
      const response = await this.callClaudeAPI(prompt);
      
      if (response && response.content) {
        return this.parseNutritionResponse(response.content);
      }
      
      return this.getFallbackNutrition();
    } catch (error) {
      console.error('Error generating daily nutrition:', error);
      return this.getFallbackNutrition();
    }
  }

buildNutritionPrompt(userData) {
  const { 
    athlete, 
    trainingData, 
    goals, 
    preferences, 
    recentFoodLog,
    todaysFoodLog 
  } = userData;

  // Extract today's workout details
  const todaysWorkouts = trainingData?.today || [];
  const workoutSummary = todaysWorkouts.length > 0 
    ? todaysWorkouts.map(w => 
        `${w.type}: ${w.analysis?.duration?.toFixed(1)}hrs, TSS: ${w.analysis?.tss}, Intensity: ${w.analysis?.intensity}`
      ).join('; ')
    : 'Rest day';

  // Calculate what user has already eaten today
  const consumedToday = this.calculateConsumed(todaysFoodLog);
  
  // Calculate remaining macros needed
  const targetMacros = trainingData?.todaysNutrition || { 
    calories: 2000, 
    protein: 150, 
    carbs: 200, 
    fat: 70 
  };
  
  const remaining = {
    calories: Math.max(0, targetMacros.calories - consumedToday.calories),
    protein: Math.max(0, targetMacros.protein - consumedToday.protein),
    carbs: Math.max(0, targetMacros.carbs - consumedToday.carbs),
    fat: Math.max(0, targetMacros.fat - consumedToday.fat)
  };

  return `You are a nutrition coach following Nick Chase's training and nutrition principles. Generate meal suggestions for an endurance athlete.

ATHLETE PROFILE:
- Age: ${athlete?.age || 46}
- Weight: ${athlete?.weight || 204} lbs
- Height: ${athlete?.height || "6'2"}
- Goal: ${goals?.primaryGoal || 'performance'}

TODAY'S TRAINING:
${workoutSummary}

Training Load: ${trainingData?.trainingPhase || 'moderate'}
Weekly TSS: ${trainingData?.weeklyTSS || 'N/A'}
Traffic Light: ${trainingData?.trafficLight || 'yellow'} (carb needs)

TARGET MACROS FOR TODAY:
- Calories: ${targetMacros.calories}
- Protein: ${targetMacros.protein}g
- Carbs: ${targetMacros.carbs}g
- Fat: ${targetMacros.fat}g

ALREADY CONSUMED TODAY:
- Calories: ${consumedToday.calories}
- Protein: ${consumedToday.protein}g
- Carbs: ${consumedToday.carbs}g
- Fat: ${consumedToday.fat}g

REMAINING NEEDS:
- Calories: ${remaining.calories}
- Protein: ${remaining.protein}g
- Carbs: ${remaining.carbs}g
- Fat: ${remaining.fat}g

PREFERENCES:
- Diet type: ${preferences?.dietType || 'balanced'}
- Restrictions: ${preferences?.restrictions?.join(', ') || 'none'}
- Allergies: ${preferences?.allergies?.join(', ') || 'none'}

NICK CHASE PRINCIPLES TO FOLLOW:
1. Liquid nutrition during training (200-300 cal/hour for 60+ min workouts)
2. Protein timing: within 30 min post-workout
3. Vegetable-heavy dinners for recovery
4. Whole foods focus with strategic supplementation
5. Adjust carbs based on training load (traffic light system)

Generate 3-4 specific meal suggestions that:
- Hit the REMAINING macros needed for today
- Align with the training load and traffic light color
- Include practical cooking instructions
- Follow Nick Chase principles

CRITICAL: Respond ONLY with valid JSON in this exact format:
{
  "meals": [
    {
      "name": "Meal name",
      "meal": "breakfast|lunch|dinner|snack",
      "description": "Why this meal is recommended",
      "ingredients": ["ingredient 1", "ingredient 2"],
      "instructions": "Cooking instructions",
      "macros": {
        "calories": 450,
        "protein": 35,
        "carbs": 50,
        "fat": 12
      },
      "prepTime": "15 minutes"
    }
  ],
  "hydrationReminder": "Hydration goal for today",
  "trainingNutrition": {
    "preworkout": "What to eat before",
    "during": "What to consume during",
    "postworkout": "Recovery nutrition"
  }
}`;
}

// Add this helper function if it doesn't exist
calculateConsumed(todaysFoodLog) {
  if (!todaysFoodLog) return { calories: 0, protein: 0, carbs: 0, fat: 0 };
  
  const allFoods = [
    ...(todaysFoodLog.breakfast || []),
    ...(todaysFoodLog.lunch || []),
    ...(todaysFoodLog.dinner || []),
    ...(todaysFoodLog.snacks || [])
  ];
  
  return allFoods.reduce((totals, food) => ({
    calories: totals.calories + (food.calories || 0),
    protein: totals.protein + (food.protein || 0),
    carbs: totals.carbs + (food.carbs || 0),
    fat: totals.fat + (food.fat || 0)
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
}

  parseNutritionResponse(content) {
    try {
      // Handle string response
      let cleanContent = content;
      if (typeof content === 'string') {
        cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      }
      
      const parsed = JSON.parse(cleanContent);
      return parsed;
    } catch (error) {
      console.error('Error parsing nutrition response:', error);
      return this.getFallbackNutrition();
    }
  }

  getFallbackNutrition() {
    return {
      meals: {
        breakfast: { calories: 400, protein: 30, carbs: 45, fat: 10 },
        lunch: { calories: 500, protein: 40, carbs: 50, fat: 15 },
        dinner: { calories: 600, protein: 45, carbs: 60, fat: 20 },
        snacks: { calories: 300, protein: 15, carbs: 40, fat: 10 }
      },
      hydration: { target: 100 },
      totalCalories: 1800,
      macros: { protein: 130, carbs: 195, fat: 55 }
    };
  }
}

export default new NutritionService();