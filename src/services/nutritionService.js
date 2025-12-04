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

  // NEW: Validation function to filter inappropriate meal suggestions
  validateMealAppropriate(meal) {
    const breakfastInappropriate = [
      'grilled chicken',
      'chicken breast',
      'salmon',
      'grilled',
      'roasted chicken',
      'power bowl',
      'steak',
      'beef',
      'pork',
      'turkey breast',
      'baked chicken',
      'seared',
      'pan-fried',
      'sweet potato'  // Sweet potato for breakfast is too heavy
    ];
    
    const name = (meal.name || '').toLowerCase();
    const mealType = (meal.meal || '').toLowerCase();
    
    if (mealType === 'breakfast') {
      const hasInappropriateKeyword = breakfastInappropriate.some(keyword => 
        name.includes(keyword)
      );
      
      if (hasInappropriateKeyword) {
        console.warn('❌ FILTERED inappropriate breakfast suggestion:', meal.name);
        return false;
      }
      
      console.log('✅ Validated breakfast suggestion:', meal.name);
    }
    
    return true;
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

MEAL TYPE GUIDELINES - CRITICAL FOR APPROPRIATE SUGGESTIONS:

BREAKFAST must be:
- Light, easily digestible, liquid-focused
- Quick prep (under 5 minutes ideal)
- Examples: Coffee protein shake, smoothie bowl, protein oats, Greek yogurt
- ABSOLUTELY NO: Grilled chicken, salmon, "power bowls", heavy starches, full meals, sweet potatoes, baked chicken

LUNCH should be:
- Balanced protein + vegetables + grain
- Meal prep friendly (20-30 minute prep or pre-made)
- Examples: Chicken breast + quinoa + vegetables, turkey bowl with rice
- Portable for work/training

DINNER should be:
- Vegetable-heavy (2-3 cups vegetables - this is critical!)
- Lean protein (6oz chicken, fish, or plant-based)
- Minimal starch
- Recovery focused
- Examples: Salmon + roasted vegetables, chicken + large salad with sweet potato

SNACKS should be:
- Quick, portable, no cooking
- 200-300 calories
- Examples: Rice cakes + avocado, Greek yogurt + berries, apple + almond butter

CRITICAL RESTRICTIONS FOR BREAKFAST:
You MUST NOT suggest any of these for breakfast:
- Grilled chicken
- Baked chicken
- Chicken breast (any preparation)
- Salmon
- Any fish
- Power bowls
- Meal prep bowls
- Sweet potato
- Any meal requiring cooking or more than 5 minutes

ONLY suggest for breakfast:
- Protein shakes (especially coffee protein shake)
- Smoothie bowls
- Overnight oats or quick oats
- Greek yogurt bowls
- Fruit + protein combinations
- Liquid-focused options

Generate 3-4 specific meal suggestions that:
- Hit the REMAINING macros needed for today (not total - they've already eaten some!)
- Are STRICTLY APPROPRIATE for their meal type (breakfast = ONLY shakes/smoothies/oats/yogurt, NEVER grilled meats!)
- Align with the training load and traffic light color
- Include practical cooking instructions
- Follow Nick Chase principles
- Consider what they've ALREADY eaten today (avoid repetition)

CRITICAL: Respond ONLY with valid JSON in this exact format:
{
  "meals": [
    {
      "name": "Meal name that matches the meal type",
      "meal": "breakfast|lunch|dinner|snack",
      "description": "Why this meal is recommended for THIS meal type and training load",
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

  // Helper function
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
      
      // FIXED: Filter meals to ensure they're appropriate
      if (parsed.meals && Array.isArray(parsed.meals)) {
        const validMeals = parsed.meals.filter(meal => this.validateMealAppropriate(meal));
        
        if (validMeals.length === 0) {
          console.warn('All AI meal suggestions were filtered out - using fallback');
          return this.getFallbackNutrition();
        }
        
        parsed.meals = validMeals;
        console.log(`✅ Returning ${validMeals.length} validated meal suggestions`);
      }
      
      return parsed;
    } catch (error) {
      console.error('Error parsing nutrition response:', error);
      return this.getFallbackNutrition();
    }
  }

  getFallbackNutrition() {
    return {
      meals: [
        {
          name: "Coffee Protein Shake",
          meal: "breakfast",
          description: "Quick, liquid-focused breakfast following Nick Chase principles",
          ingredients: ["2 shots espresso", "2 scoops protein powder", "1 cup almond milk", "ice"],
          instructions: "Blend espresso, protein powder, almond milk, and ice until smooth.",
          macros: { calories: 228, protein: 40, carbs: 8, fat: 4 },
          prepTime: "2 minutes"
        },
        {
          name: "Turkey Quinoa Bowl",
          meal: "lunch",
          description: "Balanced lunch with lean protein and whole grains",
          ingredients: ["6oz ground turkey", "1/2 cup quinoa", "2 cups mixed greens", "1/2 avocado"],
          instructions: "Cook quinoa. Brown turkey with spices. Assemble bowl.",
          macros: { calories: 455, protein: 45, carbs: 35, fat: 15 },
          prepTime: "25 minutes"
        },
        {
          name: "Baked Chicken & Roasted Vegetables",
          meal: "dinner",
          description: "Vegetable-heavy dinner for recovery",
          ingredients: ["6oz chicken breast", "2 cups broccoli", "1 cup bell peppers", "olive oil"],
          instructions: "Season and bake chicken at 400°F. Roast vegetables with olive oil.",
          macros: { calories: 410, protein: 50, carbs: 30, fat: 10 },
          prepTime: "35 minutes"
        }
      ],
      hydrationReminder: "Aim for 100oz water today",
      trainingNutrition: {
        preworkout: "Light snack or fasted",
        during: "Liquid nutrition 200-300 cal/hour",
        postworkout: "Protein shake within 30 minutes"
      }
    };
  }
}

export default new NutritionService();