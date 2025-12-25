import React, { useState, useEffect } from 'react';
import { Utensils, Clock, Flame, Target, Info, ChefHat } from 'lucide-react';

// Data-driven nutrition principles
const NUTRITION_PRINCIPLES = {
  training: {
    morning: {
      preworkout: "Fasted or minimal fuel (1/2 banana if needed)",
      during: "Liquid nutrition only - 200-300 cal/hour for 60+ min",
      postworkout: "Protein shake within 30 min, meal within 2 hours"
    },
    afternoon: {
      preworkout: "Light snack 60-90 min before",
      during: "Sports drink diluted 50/50 with water",
      postworkout: "Protein shake, then regular dinner"
    }
  },
  meals: {
    breakfast: {
      base: "Coffee protein shake (2 shots espresso + 2 scoops protein + almond milk)",
      additions: ["1/2 banana", "handful berries", "1 tbsp almond butter"]
    },
    snack: {
      base: "2-3 rice cakes with avocado, olive oil, salt & pepper",
      alternatives: ["Greek yogurt with berries", "Apple with almond butter", "Hard boiled eggs"]
    },
    lunch: {
      template: "Protein (6oz) + Vegetables (2 cups) + Grain (1/2 cup)",
      proteins: ["Grilled chicken", "Ground turkey", "Salmon", "Tofu"],
      vegetables: ["Mixed greens", "Roasted broccoli", "Bell peppers", "Spinach"],
      grains: ["Quinoa", "Brown rice", "Sweet potato", "Wild rice"]
    },
    dinner: {
      template: "Protein (6oz) + Vegetables (2-3 cups) + Small starch",
      focus: "Vegetable-heavy, lean protein, minimal starch"
    }
  },
  hydration: {
    daily: "Half body weight in ounces minimum",
    training: "16-20oz before, 6-8oz every 15-20min during, continue after"
  }
};

// NEW: Validation function to filter inappropriate meal suggestions
const validateMealAppropriate = (meal) => {
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
    'pan-fried'
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
};

const MealSuggestions = ({ trainingData, foodLog, userPreferences, currentWeight }) => {
  const [mealPlan, setMealPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMeal, setSelectedMeal] = useState('lunch');
  const [customSuggestions, setCustomSuggestions] = useState([]);

  useEffect(() => {
    generateMealPlan();
  }, [trainingData, foodLog, userPreferences]);

  const calculateDailyCalories = (weight, activityLevel, goal) => {
    // Base metabolic rate estimation
    const bmr = weight * 10; // Simplified BMR

    // Activity multiplier based on training
    const activityMultipliers = {
      rest: 1.2,
      light: 1.4,
      moderate: 1.6,
      heavy: 1.8
    };

    const tdee = bmr * (activityMultipliers[activityLevel] || 1.5);

    // Adjust for goals
    if (goal === 'weight_loss') return tdee - 300;
    if (goal === 'maintain') return tdee;
    return tdee + 200;
  };

  const analyzeTrainingLoad = (activities) => {
    if (!activities || activities.length === 0) return 'rest';

    const todayActivity = activities[0];
    const duration = todayActivity?.moving_time / 3600 || 0;

    if (duration === 0) return 'rest';
    if (duration < 1) return 'light';
    if (duration < 2) return 'moderate';
    return 'heavy';
  };

  const generateMealPlan = async () => {
    setLoading(true);

    try {
      const activityLevel = analyzeTrainingLoad(trainingData?.activities);
      const dailyCalories = calculateDailyCalories(
        currentWeight || 204,
        activityLevel,
        userPreferences?.goal || 'weight_loss'
      );

      // Calculate macro distribution
      const proteinGrams = Math.round((currentWeight || 204) * 0.8); // 0.8g per lb for endurance athletes
      const carbsGrams = activityLevel === 'heavy' ? 250 : activityLevel === 'moderate' ? 200 : 150;
      const fatGrams = Math.round((dailyCalories - (proteinGrams * 4) - (carbsGrams * 4)) / 9);

      const macros = {
        protein: proteinGrams,
        carbs: carbsGrams,
        fat: fatGrams
      };

      // Generate meals based on training timing
      const trainingTime = trainingData?.todaysWorkout?.time || 'morning';
      const meals = generateMealsForDay(macros, activityLevel, trainingTime);

      // Get AI-powered custom suggestions
      const suggestions = await generateAIMealSuggestions(
        activityLevel,
        macros,
        foodLog,
        userPreferences
      );

      setMealPlan({
        date: new Date().toISOString(),
        activityLevel,
        dailyCalories,
        macros,
        meals,
        hydration: {
          target: Math.round((currentWeight || 204) / 2),
          training: activityLevel !== 'rest' ? '+20-30oz during workout' : 'Rest day - maintain baseline'
        }
      });

      setCustomSuggestions(suggestions);

    } catch (error) {
      console.error('Error generating meal plan:', error);
      // Fallback to basic meal plan
      setMealPlan(generateFallbackMealPlan());
    } finally {
      setLoading(false);
    }
  };

  const generateMealsForDay = (macros, activityLevel, trainingTime) => {
    const meals = {
      breakfast: {
        ...NUTRITION_PRINCIPLES.meals.breakfast,
        calories: Math.round(macros.protein * 0.25 * 4 + 100),
        protein: Math.round(macros.protein * 0.25),
        timing: trainingTime === 'morning' ? 'Post-workout' : '7:00 AM'
      },
      snack: {
        ...NUTRITION_PRINCIPLES.meals.snack,
        calories: 200,
        protein: 5,
        timing: '10:00 AM'
      },
      lunch: {
        ...NUTRITION_PRINCIPLES.meals.lunch,
        calories: Math.round(macros.protein * 0.3 * 4 + macros.carbs * 0.3 * 4 + 100),
        protein: Math.round(macros.protein * 0.3),
        carbs: Math.round(macros.carbs * 0.3),
        timing: trainingTime === 'afternoon' ? '12:00 PM (90 min before training)' : '12:30 PM'
      },
      dinner: {
        ...NUTRITION_PRINCIPLES.meals.dinner,
        calories: Math.round(macros.protein * 0.35 * 4 + macros.carbs * 0.3 * 4 + 150),
        protein: Math.round(macros.protein * 0.35),
        carbs: Math.round(macros.carbs * 0.3),
        timing: '6:30 PM'
      }
    };

    // Add training-specific nutrition
    if (activityLevel !== 'rest') {
      meals.training = {
        pre: trainingTime === 'morning'
          ? NUTRITION_PRINCIPLES.training.morning.preworkout
          : NUTRITION_PRINCIPLES.training.afternoon.preworkout,
        during: activityLevel === 'heavy'
          ? NUTRITION_PRINCIPLES.training.morning.during
          : 'Water/electrolytes only',
        post: NUTRITION_PRINCIPLES.training.morning.postworkout
      };
    }

    return meals;
  };

  const generateAIMealSuggestions = async (activityLevel, macros, foodLog, preferences) => {
    try {
      const proxyUrl = process.env.REACT_APP_PROXY_URL || 'http://localhost:3001/api/claude';
      const response = await fetch(proxyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: `Based on data-driven nutrition for endurance athletes, suggest 3 specific meals:

Activity level: ${activityLevel}
Daily macros: Protein ${macros.protein}g, Carbs ${macros.carbs}g, Fat ${macros.fat}g
Dietary preferences: ${preferences?.restrictions || 'None'}

Follow Nick's principles:
1. Breakfast: Light, liquid-focused (protein shakes, smoothies, quick oats). NOT full meals with grilled meat!
2. Lunch: Balanced, meal prep friendly - protein + grain + vegetables
3. Dinner: Vegetable-heavy, lean protein, minimal starch
4. Snacks: Quick, portable, 200-300 calories

CRITICAL: Ensure meal suggestions are APPROPRIATE for their meal type:
- Breakfast = Coffee protein shake, smoothie bowl, protein oats, Greek yogurt bowl (LIGHT & QUICK, NO GRILLED MEATS)
- Lunch = Chicken breast + quinoa + vegetables, turkey bowl
- Dinner = Salmon + roasted vegetables, chicken + large salad (HEAVY ON VEGETABLES)
- Snacks = Rice cakes + avocado, Greek yogurt + berries

DO NOT suggest for breakfast: grilled chicken, salmon, baked chicken, power bowls, or any meal requiring more than 10 minutes prep time.

Respond ONLY in valid JSON format:
{
  "suggestions": [
    {
      "meal": "breakfast|lunch|dinner",
      "name": "Meal name",
      "ingredients": ["ingredient 1", "ingredient 2"],
      "macros": {"protein": 30, "carbs": 45, "fat": 10, "calories": 390},
      "prepTime": "5 minutes",
      "instructions": "Step by step"
    }
  ]
}`
        })
      });

      if (response.ok) {
        const data = await response.json();
        let responseText = data.content || data.message || data.text;
        if (typeof responseText === 'object' && responseText.text) {
          responseText = responseText.text;
        }
        responseText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        
        const parsed = JSON.parse(responseText);
        
        // FIXED: Extract the suggestions array properly
        let suggestions = parsed.suggestions || parsed || [];
        
        // Ensure it's an array
        if (!Array.isArray(suggestions)) {
          console.warn('AI response is not an array, using fallback');
          return getFallbackSuggestions();
        }
        
        // FIXED: Filter out inappropriate suggestions
        const validSuggestions = suggestions.filter(validateMealAppropriate);
        
        if (validSuggestions.length === 0) {
          console.warn('All AI suggestions were filtered out, using fallback');
          return getFallbackSuggestions();
        }
        
        console.log(`✅ Returning ${validSuggestions.length} validated meal suggestions`);
        return validSuggestions;
      }
    } catch (error) {
      console.error('Error getting AI meal suggestions:', error);
    }

    // Fallback if AI fails
    return getFallbackSuggestions();
  };

  // FIXED: Moved to separate function for reuse
  const getFallbackSuggestions = () => {
    return [
      {
        meal: "breakfast",
        name: "Coffee Protein Shake",
        ingredients: ["2 shots espresso", "2 scoops protein powder", "1 cup almond milk", "ice"],
        macros: { protein: 40, carbs: 8, fat: 4, calories: 228 },
        prepTime: "2 minutes",
        instructions: "Blend espresso, protein powder, almond milk, and ice until smooth."
      },
      {
        meal: "lunch",
        name: "Turkey Quinoa Bowl",
        ingredients: ["6oz ground turkey", "1/2 cup quinoa", "2 cups mixed greens", "1/2 avocado", "cherry tomatoes"],
        macros: { protein: 45, carbs: 35, fat: 15, calories: 455 },
        prepTime: "25 minutes",
        instructions: "Cook quinoa. Brown turkey with spices. Assemble bowl with greens, top with turkey, quinoa, avocado."
      },
      {
        meal: "dinner",
        name: "Baked Chicken & Roasted Vegetables",
        ingredients: ["6oz chicken breast", "2 cups broccoli", "1 cup bell peppers", "1 small sweet potato", "olive oil"],
        macros: { protein: 50, carbs: 30, fat: 10, calories: 410 },
        prepTime: "35 minutes",
        instructions: "Season and bake chicken at 400°F. Roast vegetables with olive oil. Serve together."
      }
    ];
  };

  const generateFallbackMealPlan = () => ({
    date: new Date().toISOString(),
    activityLevel: 'moderate',
    dailyCalories: 2200,
    macros: { protein: 160, carbs: 200, fat: 70 },
    meals: NUTRITION_PRINCIPLES.meals,
    hydration: { target: 100, training: 'Standard hydration protocol' }
  });

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Daily Overview */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Utensils className="w-5 h-5" />
            Today's Nutrition Plan
          </h2>
          <span className={`px-3 py-1 rounded-full text-sm ${mealPlan?.activityLevel === 'heavy' ? 'bg-red-100 text-red-700' :
            mealPlan?.activityLevel === 'moderate' ? 'bg-yellow-100 text-yellow-700' :
              mealPlan?.activityLevel === 'light' ? 'bg-green-100 text-green-700' :
                'bg-gray-100 text-gray-700'
            }`}>
            {mealPlan?.activityLevel} training day
          </span>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <Flame className="w-5 h-5 mx-auto mb-1 text-orange-500" />
            <p className="text-2xl font-bold">{mealPlan?.dailyCalories}</p>
            <p className="text-xs text-gray-600">Calories</p>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">{mealPlan?.macros.protein}g</p>
            <p className="text-xs text-gray-600">Protein</p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">{mealPlan?.macros.carbs}g</p>
            <p className="text-xs text-gray-600">Carbs</p>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <p className="text-2xl font-bold text-yellow-600">{mealPlan?.macros.fat}g</p>
            <p className="text-xs text-gray-600">Fat</p>
          </div>
        </div>

        {/* Hydration Target */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Hydration Target:</span>
            <span className="text-sm text-blue-700">
              {mealPlan?.hydration.target}oz base + {mealPlan?.hydration.training}
            </span>
          </div>
        </div>
      </div>

      {/* Meal Timeline */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Meal Schedule</h3>
        <div className="space-y-4">
          {mealPlan?.meals && Object.entries(mealPlan.meals).map(([mealType, meal]) => (
            <div key={mealType} className="border-l-4 border-blue-500 pl-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold capitalize">{mealType}</h4>
                  <p className="text-sm text-gray-600">{meal.timing}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{meal.calories} cal</p>
                  {meal.protein && (
                    <p className="text-xs text-gray-500">{meal.protein}g protein</p>
                  )}
                </div>
              </div>
              {meal.base && (
                <p className="text-sm mt-2 text-gray-700">{meal.base}</p>
              )}
              {meal.template && (
                <p className="text-sm mt-2 text-gray-700">{meal.template}</p>
              )}
            </div>
          ))}

          {/* Training Nutrition if applicable */}
          {mealPlan?.meals.training && (
            <div className="border-l-4 border-orange-500 pl-4 mt-4">
              <h4 className="font-semibold text-orange-700">Training Nutrition</h4>
              <div className="text-sm space-y-1 mt-2">
                <p><strong>Pre:</strong> {mealPlan.meals.training.pre}</p>
                <p><strong>During:</strong> {mealPlan.meals.training.during}</p>
                <p><strong>Post:</strong> {mealPlan.meals.training.post}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Custom Meal Suggestions */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <ChefHat className="w-5 h-5" />
            Recommended Meals
          </h3>
          <select
            value={selectedMeal}
            onChange={(e) => setSelectedMeal(e.target.value)}
            className="px-3 py-1 border rounded-lg text-sm"
          >
            <option value="breakfast">Breakfast</option>
            <option value="lunch">Lunch</option>
            <option value="dinner">Dinner</option>
          </select>
        </div>

        <div className="grid gap-4">
          {customSuggestions
            .filter(s => !selectedMeal || s.meal === selectedMeal)
            .map((suggestion, index) => (
              <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-lg">{suggestion.name}</h4>
                  <span className="text-sm bg-gray-100 px-2 py-1 rounded">
                    <Clock className="w-3 h-3 inline mr-1" />
                    {suggestion.prepTime}
                  </span>
                </div>

                <div className="mb-3">
                  <p className="text-sm text-gray-600 font-medium mb-1">Ingredients:</p>
                  <p className="text-sm text-gray-700">
                    {suggestion.ingredients.join(', ')}
                  </p>
                </div>

                <div className="mb-3">
                  <p className="text-sm text-gray-600 font-medium mb-1">Instructions:</p>
                  <p className="text-sm text-gray-700">{suggestion.instructions}</p>
                </div>

                <div className="flex gap-3 pt-3 border-t">
                  <span className="text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded">
                    {suggestion.macros.calories} cal
                  </span>
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                    {suggestion.macros.protein}g protein
                  </span>
                  <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded">
                    {suggestion.macros.carbs}g carbs
                  </span>
                  <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-1 rounded">
                    {suggestion.macros.fat}g fat
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Quick Tips */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-200">
        <h4 className="font-semibold text-purple-900 mb-2">Smart Nutrition Tips</h4>
        <ul className="text-sm text-purple-700 space-y-1">
          <li>• Carb cycle based on TSS: High load = higher carbs</li>
          <li>• Fuel training properly - 30-60g carbs/hour for 90+ min sessions</li>
          <li>• Practice race nutrition during long sessions</li>
          <li>• Anti-inflammatory foods during hard training blocks</li>
        </ul>
      </div>
    </div>
  );
};

export default MealSuggestions;