import React, { useState, useEffect, useRef } from 'react';
import { Utensils, Clock, Flame, Target, Info, ChefHat, Plus, Search, X, Check, TrendingUp, Calendar, Camera, Loader, Save, BookOpen } from 'lucide-react';
import edamamService from '../services/edamamService';
import recipeService from '../services/recipeService';
import TrafficLightIndicator from './TrafficLightIndicator';

const EnhancedNutritionTracker = ({ trainingData, foodLog, userPreferences, currentWeight, onFoodLogUpdate }) => {
  const [mealPlan, setMealPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState('breakfast');
  const [customSuggestions, setCustomSuggestions] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [edamamResults, setEdamamResults] = useState([]);
  const [selectedPortion, setSelectedPortion] = useState({});
  const searchDebounceRef = useRef(null);
  const isInitialMount = useRef(true);

  // Food logging state
  const [todaysFoodLog, setTodaysFoodLog] = useState(() => {
    const saved = localStorage.getItem('trainfuel_today_food_log');
    const today = new Date().toISOString().split('T')[0];
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.date === today) {
        return parsed;
      }
    }
    return {
      date: today,
      breakfast: [],
      lunch: [],
      dinner: [],
      snacks: [],
      water: 0
    };
  });

  const [showAddFood, setShowAddFood] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [naturalLanguageInput, setNaturalLanguageInput] = useState('');
  const [selectedMealType, setSelectedMealType] = useState('breakfast');
  const [activeTab, setActiveTab] = useState('search'); // 'search', 'natural', 'recipe', 'saved'
  
  // Saved recipes state
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [showSaveRecipeModal, setShowSaveRecipeModal] = useState(false);
  const [recipeNameInput, setRecipeNameInput] = useState('');
  const [mealTypeToSave, setMealTypeToSave] = useState(null);

  // Recipe analysis state
  const [recipeInput, setRecipeInput] = useState({
    title: '',
    ingredients: '',
    servings: 1
  });

  // Load saved recipes on mount
  useEffect(() => {
    loadSavedRecipes();
  }, []);

  const loadSavedRecipes = () => {
    const recipes = recipeService.getAllRecipes();
    setSavedRecipes(recipes);
  };

  // Save current meal items as a recipe
  const saveCurrentMealAsRecipe = () => {
    if (!mealTypeToSave || !recipeNameInput.trim()) {
      alert('Please enter a recipe name');
      return;
    }

    const items = todaysFoodLog[mealTypeToSave];
    if (!items || items.length === 0) {
      alert('No items to save in this meal');
      return;
    }

    try {
      const recipeData = recipeService.createFromMealItems(
        recipeNameInput.trim(),
        mealTypeToSave,
        items
      );

      recipeService.saveRecipe(recipeData);
      loadSavedRecipes();
      
      setShowSaveRecipeModal(false);
      setRecipeNameInput('');
      setMealTypeToSave(null);
      
      alert('Recipe saved successfully!');
    } catch (error) {
      console.error('Error saving recipe:', error);
      alert('Failed to save recipe');
    }
  };

  // Add a saved recipe to the food log
  const addSavedRecipe = (recipe, targetMealType) => {
    const itemsToAdd = recipe.items.map(item => ({
      ...item,
      id: Date.now() + Math.random(), // New ID for each instance
      timestamp: new Date().toISOString()
    }));

    setTodaysFoodLog(prev => ({
      ...prev,
      [targetMealType]: [...prev[targetMealType], ...itemsToAdd]
    }));

    // Mark recipe as used
    recipeService.markAsUsed(recipe.id);
    loadSavedRecipes();

    setShowAddFood(false);
  };

  // Delete a saved recipe
  const deleteSavedRecipe = (recipeId) => {
    if (window.confirm('Are you sure you want to delete this recipe?')) {
      recipeService.deleteRecipe(recipeId);
      loadSavedRecipes();
    }
  };

  // Add AI meal suggestion directly to food diary
  const addAIMealSuggestion = (suggestion, targetMealType) => {
    const mealItem = {
      id: Date.now(),
      name: suggestion.name,
      calories: suggestion.calories || suggestion.macros?.calories || 0,
      protein: suggestion.protein || suggestion.macros?.protein || 0,
      carbs: suggestion.carbs || suggestion.macros?.carbs || 0,
      fat: suggestion.fat || suggestion.macros?.fat || 0,
      fiber: suggestion.fiber || 0,
      timestamp: new Date().toISOString(),
      source: 'ai_suggestion',
      description: suggestion.description || '',
      instructions: suggestion.instructions || ''
    };

    setTodaysFoodLog(prev => ({
      ...prev,
      [targetMealType]: [...prev[targetMealType], mealItem]
    }));

    alert(`Added "${suggestion.name}" to ${targetMealType}!`);
  };

  // Save AI meal suggestion as a recipe for future use
  const saveAISuggestionAsRecipe = (suggestion) => {
    try {
      const recipeData = recipeService.createFromAISuggestion(suggestion);
      recipeService.saveRecipe(recipeData);
      loadSavedRecipes();
      alert('Meal saved as recipe!');
    } catch (error) {
      console.error('Error saving AI suggestion as recipe:', error);
      alert('Failed to save recipe');
    }
  };

  // Check and reset food log if date has changed (handles midnight rollover)
  useEffect(() => {
    const checkDateAndReset = () => {
      const today = new Date().toISOString().split('T')[0];

      if (todaysFoodLog.date !== today) {
        console.log('Date changed! Resetting food log from', todaysFoodLog.date, 'to', today);

        // Archive yesterday's log to history before clearing
        if (onFoodLogUpdate) {
          onFoodLogUpdate(todaysFoodLog);
        }

        // Clear the old localStorage entry
        localStorage.removeItem('trainfuel_today_food_log');

        // Reset to fresh log for today
        const freshLog = {
          date: today,
          breakfast: [],
          lunch: [],
          dinner: [],
          snacks: [],
          water: 0
        };

        setTodaysFoodLog(freshLog);
        localStorage.setItem('trainfuel_today_food_log', JSON.stringify(freshLog));
      }
    };

    // Check immediately on mount
    checkDateAndReset();

    // Check every minute in case user keeps app open past midnight
    const intervalId = setInterval(checkDateAndReset, 60000);

    return () => clearInterval(intervalId);
  }, [todaysFoodLog.date, onFoodLogUpdate]);

  // Search Edamam with debounce
  useEffect(() => {
    if (searchQuery.length >= 2) {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }

      searchDebounceRef.current = setTimeout(async () => {
        setSearchLoading(true);
        const results = await edamamService.searchFood(searchQuery);
        setEdamamResults(results);
        setSearchLoading(false);
      }, 500);
    } else {
      setEdamamResults([]);
    }

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [searchQuery]);

  // Calculate consumed macros
  const calculateConsumedMacros = () => {
    const allFoods = [
      ...todaysFoodLog.breakfast,
      ...todaysFoodLog.lunch,
      ...todaysFoodLog.dinner,
      ...todaysFoodLog.snacks
    ];

    return allFoods.reduce((totals, food) => ({
      calories: totals.calories + (food.calories || 0),
      protein: totals.protein + (food.protein || 0),
      carbs: totals.carbs + (food.carbs || 0),
      fat: totals.fat + (food.fat || 0),
      fiber: totals.fiber + (food.fiber || 0),
      sugar: totals.sugar + (food.sugar || 0),
      sodium: totals.sodium + (food.sodium || 0)
    }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 });
  };

  // Calculate remaining macros
  const calculateRemainingMacros = () => {
    const consumed = calculateConsumedMacros();
    // Use actual calculated nutrition from training data
    const target = trainingData?.todaysNutrition ||
      mealPlan?.macros ||
      { calories: 2000, protein: 150, carbs: 200, fat: 70 };

    return {
      calories: Math.max(0, (target.calories || 2000) - consumed.calories),
      protein: Math.max(0, (target.protein || 150) - consumed.protein),
      carbs: Math.max(0, (target.carbs || 200) - consumed.carbs),
      fat: Math.max(0, (target.fat || 70) - consumed.fat)
    };
  };

  // Add food from Edamam search
  const addEdamamFood = async (food, mealType) => {
    // Get the selected portion size
    const portion = selectedPortion[food.id] || { value: 100, uri: null };

    // Get detailed nutrition for the selected portion
    const nutrition = await edamamService.getNutrition(food.id, portion.value, portion.uri);

    const foodWithTimestamp = {
      id: Date.now(),
      name: `${food.name} (${portion.displayLabel || portion.label || '3.5 oz'})`,
      brand: food.brand,
      calories: nutrition?.calories || food.calories,
      protein: nutrition?.protein || food.protein,
      carbs: nutrition?.carbs || food.carbs,
      fat: nutrition?.fat || food.fat,
      fiber: nutrition?.fiber || food.fiber,
      sugar: nutrition?.sugar || food.sugar,
      sodium: nutrition?.sodium || food.sodium,
      timestamp: new Date().toISOString(),
      source: 'edamam'
    };

    setTodaysFoodLog(prev => ({
      ...prev,
      [mealType]: [...prev[mealType], foodWithTimestamp]
    }));

    setShowAddFood(false);
    setSearchQuery('');
    setEdamamResults([]);
  };

  // Parse natural language input
  const parseNaturalLanguage = async () => {
    if (!naturalLanguageInput) return;

    setSearchLoading(true);
    const result = await edamamService.parseNaturalLanguage(naturalLanguageInput);

    if (result) {
      const foodWithTimestamp = {
        id: Date.now(),
        name: naturalLanguageInput,
        ...result,
        timestamp: new Date().toISOString(),
        source: 'natural'
      };

      setTodaysFoodLog(prev => ({
        ...prev,
        [selectedMealType]: [...prev[selectedMealType], foodWithTimestamp]
      }));

      setNaturalLanguageInput('');
      setShowAddFood(false);
    } else {
      alert('Could not parse that food description. Try being more specific, e.g., "2 cups cooked brown rice"');
    }

    setSearchLoading(false);
  };

  // Analyze recipe
  const analyzeRecipe = async () => {
    if (!recipeInput.title || !recipeInput.ingredients) return;

    setSearchLoading(true);
    const ingredients = recipeInput.ingredients.split('\n').filter(i => i.trim());
    const result = await edamamService.analyzeRecipe(
      recipeInput.title,
      ingredients,
      recipeInput.servings
    );

    if (result) {
      const foodWithTimestamp = {
        id: Date.now(),
        name: `${result.name} (1 serving)`,
        calories: result.calories,
        protein: result.protein,
        carbs: result.carbs,
        fat: result.fat,
        timestamp: new Date().toISOString(),
        source: 'recipe'
      };

      setTodaysFoodLog(prev => ({
        ...prev,
        [selectedMealType]: [...prev[selectedMealType], foodWithTimestamp]
      }));

      setRecipeInput({ title: '', ingredients: '', servings: 1 });
      setShowAddFood(false);
    } else {
      alert('Could not analyze this recipe. Please check the format.');
    }

    setSearchLoading(false);
  };

  // Remove food from log
  const removeFoodFromLog = (mealType, foodId) => {
    setTodaysFoodLog(prev => ({
      ...prev,
      [mealType]: prev[mealType].filter(food => food.id !== foodId)
    }));
  };

  // Generate smart meal suggestions based on remaining macros
  // PATCH FOR: src/components/EnhancedNutritionTracker.jsx
  // REPLACE the generateSmartSuggestions function (lines 236-335) with this:

  const generateSmartSuggestions = () => {
    const remaining = calculateRemainingMacros();
    const suggestions = [];

    // Determine what meal time it is
    const hour = new Date().getHours();
    let nextMeal = 'snacks';
    if (hour < 10) nextMeal = 'breakfast';
    else if (hour < 14) nextMeal = 'lunch';
    else if (hour < 20) nextMeal = 'dinner';

    // BREAKFAST-SPECIFIC SUGGESTIONS (only if it's morning)
    if (nextMeal === 'breakfast') {
      if (remaining.protein > 30) {
        suggestions.push({
          name: "Coffee Protein Shake",
          meal: "breakfast",
          description: "Quick, easily digestible breakfast to fuel your morning",
          instructions: "Blend 2 shots espresso, 2 scoops protein powder, 1 cup almond milk, and ice",
          calories: 228,
          protein: 40,
          carbs: 8,
          fat: 4
        });
      }

      if (remaining.carbs > 40) {
        suggestions.push({
          name: "Energy Oatmeal Bowl",
          meal: "breakfast",
          description: "Perfect for fueling your next workout",
          instructions: "Cook 1 cup oats, top with banana, berries, honey, and a scoop of protein powder",
          calories: 380,
          protein: 25,
          carbs: 58,
          fat: 8
        });
      }

      if (remaining.protein > 20) {
        suggestions.push({
          name: "Berry Smoothie Bowl",
          meal: "breakfast",
          description: "Antioxidant-rich liquid breakfast",
          instructions: "Blend frozen berries, protein powder, Greek yogurt, and almond milk. Top with granola",
          calories: 320,
          protein: 28,
          carbs: 42,
          fat: 6
        });
      }

      // Always return early for breakfast to avoid lunch/dinner suggestions
      return suggestions;
    }

    // LUNCH/DINNER SUGGESTIONS (only if NOT breakfast time)
    // High protein, moderate carb suggestions if protein is low
    if (remaining.protein > 30 && nextMeal !== 'breakfast') {
      suggestions.push({
        name: "Grilled Chicken Power Bowl",
        meal: nextMeal,
        description: "High-protein meal perfect for recovery after training",
        instructions: "Grill 6oz chicken breast, serve over quinoa with roasted vegetables and tahini dressing",
        calories: 450,
        protein: 42,
        carbs: 35,
        fat: 12
      });
    }

    // Balanced meal if all macros are moderate
    if (remaining.calories > 400 && remaining.protein > 20 && remaining.carbs > 30 && nextMeal !== 'breakfast') {
      suggestions.push({
        name: "Salmon & Sweet Potato",
        meal: nextMeal,
        description: "Balanced meal with omega-3s for inflammation reduction",
        instructions: "Bake 5oz salmon with herbs, roast sweet potato wedges, steam broccoli",
        calories: 420,
        protein: 35,
        carbs: 32,
        fat: 14
      });
    }

    // SNACK OPTIONS (anytime)
    // Light snack option if calories are low
    if (remaining.calories < 300) {
      suggestions.push({
        name: "Greek Yogurt Parfait",
        meal: "snacks",
        description: "Light, protein-rich snack",
        instructions: "Layer Greek yogurt with granola and berries",
        calories: 200,
        protein: 18,
        carbs: 24,
        fat: 4
      });
    }

    // If very high calories remaining, suggest a full meal
    if (remaining.calories > 600 && nextMeal !== 'breakfast') {
      suggestions.push({
        name: "Turkey & Avocado Wrap",
        meal: nextMeal,
        description: "Satisfying meal with healthy fats",
        instructions: "Whole wheat tortilla with 4oz turkey, avocado, lettuce, tomato, and hummus",
        calories: 520,
        protein: 35,
        carbs: 42,
        fat: 22
      });
    }

    // Always include a quick liquid option for recovery (but only for non-breakfast)
    if (nextMeal !== 'breakfast') {
      suggestions.push({
        name: "Recovery Smoothie",
        meal: "snacks",
        description: "Quick post-workout nutrition for optimal recovery",
        instructions: "Blend protein powder, banana, berries, spinach, and almond milk",
        calories: 280,
        protein: 30,
        carbs: 35,
        fat: 5
      });
    }

    return suggestions;
  };

  // Update water intake
  const updateWaterIntake = (amount) => {
    setTodaysFoodLog(prev => ({
      ...prev,
      water: Math.max(0, prev.water + amount)
    }));
  };

  const consumed = calculateConsumedMacros();
  const remaining = calculateRemainingMacros();
  const targetCalories = mealPlan?.dailyCalories || 2000;
  const percentageConsumed = Math.round((consumed.calories / targetCalories) * 100);

  // Generate meal plan (your existing logic) - only on mount and when props change
  useEffect(() => {
    generateMealPlan();
  }, []); // Empty dependency array - only run on mount

  const generateMealPlan = async () => {
    setLoading(true);
    // Your existing meal plan generation logic
    setMealPlan({
      dailyCalories: 2000,
      macros: { protein: 150, carbs: 200, fat: 70 },
      hydration: { target: 100 }
    });
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Traffic Light Indicator - NEW */}
      {trainingData && (
        <TrafficLightIndicator
          trainingData={trainingData}
          size="large"
        />
      )}
      {/* Daily Progress Overview - Same as before */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Today's Progress
          </h2>
          <span className="text-sm text-gray-500">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </span>
        </div>

        {/* Calorie Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Calories</span>
            <span className="text-sm text-gray-600">
              {consumed.calories} / {targetCalories} cal
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${percentageConsumed > 100 ? 'bg-red-500' :
                percentageConsumed > 80 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
              style={{ width: `${Math.min(100, percentageConsumed)}%` }}
            />
          </div>
        </div>

        {/* Macro Breakdown with additional nutrients */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-medium text-gray-600">Protein</span>
              <span className="text-xs text-gray-500">{consumed.protein}g / {mealPlan?.macros.protein || 150}g</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-blue-500"
                style={{ width: `${Math.min(100, (consumed.protein / (mealPlan?.macros.protein || 150)) * 100)}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-medium text-gray-600">Carbs</span>
              <span className="text-xs text-gray-500">{consumed.carbs}g / {mealPlan?.macros.carbs || 200}g</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-green-500"
                style={{ width: `${Math.min(100, (consumed.carbs / (mealPlan?.macros.carbs || 200)) * 100)}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-medium text-gray-600">Fat</span>
              <span className="text-xs text-gray-500">{consumed.fat}g / {mealPlan?.macros.fat || 70}g</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-yellow-500"
                style={{ width: `${Math.min(100, (consumed.fat / (mealPlan?.macros.fat || 70)) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Additional nutrients */}
        <div className="grid grid-cols-3 gap-4 text-xs">
          <div className="text-center">
            <span className="text-gray-600">Fiber: </span>
            <span className="font-medium">{consumed.fiber}g</span>
          </div>
          <div className="text-center">
            <span className="text-gray-600">Sugar: </span>
            <span className="font-medium">{consumed.sugar}g</span>
          </div>
          <div className="text-center">
            <span className="text-gray-600">Sodium: </span>
            <span className="font-medium">{consumed.sodium}mg</span>
          </div>
        </div>

        {/* Water Intake */}
        <div className="flex items-center justify-between pt-4 border-t mt-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Water</span>
            <span className="text-sm text-gray-600">{todaysFoodLog.water} oz</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => updateWaterIntake(8)}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
              +8 oz
            </button>
            <button
              onClick={() => updateWaterIntake(-8)}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              -8 oz
            </button>
          </div>
        </div>
      </div>

      {/* Food Log by Meal - Same structure as before */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Food Diary</h3>
          <button
            onClick={() => {
              setShowAddFood(true);
              setSelectedMealType('breakfast');
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Food
          </button>
        </div>

        {/* Meal Sections */}
        {['breakfast', 'lunch', 'dinner', 'snacks'].map(mealType => (
          <div key={mealType} className="mb-4 border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium capitalize flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                {mealType}
              </h4>
              <button
                onClick={() => {
                  setShowAddFood(true);
                  setSelectedMealType(mealType);
                }}
                className="text-blue-600 hover:text-blue-700 text-sm"
              >
                + Add
              </button>
            </div>

            {todaysFoodLog[mealType].length > 0 ? (
              <div className="space-y-2">
                {todaysFoodLog[mealType].map(food => (
                  <div key={food.id} className="flex items-center justify-between bg-gray-50 rounded p-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {food.name}
                        {food.brand && <span className="text-gray-500 ml-1">({food.brand})</span>}
                      </p>
                      <p className="text-xs text-gray-500">
                        {food.calories} cal • P: {food.protein}g • C: {food.carbs}g • F: {food.fat}g
                        {food.fiber > 0 && ` • Fiber: ${food.fiber}g`}
                      </p>
                    </div>
                    <button
                      onClick={() => removeFoodFromLog(mealType, food.id)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No foods logged</p>
            )}

            {/* Meal subtotals */}
            {todaysFoodLog[mealType].length > 0 && (
              <div className="mt-2 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">
                    Subtotal: {todaysFoodLog[mealType].reduce((sum, f) => sum + f.calories, 0)} cal
                  </span>
                  <button
                    onClick={() => {
                      setMealTypeToSave(mealType);
                      setRecipeNameInput('');
                      setShowSaveRecipeModal(true);
                    }}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                  >
                    <Save className="w-3 h-3" />
                    Save as Recipe
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Enhanced Add Food Modal with Edamam */}
      {showAddFood && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Add Food to {selectedMealType}</h3>
                <button
                  onClick={() => {
                    setShowAddFood(false);
                    setSearchQuery('');
                    setEdamamResults([]);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tabs for different input methods */}
              <div className="flex gap-2 mb-4 border-b overflow-x-auto">
                <button
                  onClick={() => setActiveTab('search')}
                  className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${activeTab === 'search'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  Search Foods
                </button>
                <button
                  onClick={() => setActiveTab('saved')}
                  className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${activeTab === 'saved'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  <div className="flex items-center gap-1">
                    <BookOpen className="w-4 h-4" />
                    Saved Recipes
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('natural')}
                  className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${activeTab === 'natural'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  Natural Language
                </button>
                <button
                  onClick={() => setActiveTab('recipe')}
                  className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${activeTab === 'recipe'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  Recipe Analyzer
                </button>
              </div>

              {/* Search Tab */}
              {activeTab === 'search' && (
                <div>
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search foods (powered by Edamam)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {searchLoading && (
                      <Loader className="absolute right-3 top-3 w-4 h-4 text-gray-400 animate-spin" />
                    )}
                  </div>

                  {/* Edamam Results */}
                  <div className="max-h-96 overflow-y-auto">
                    {edamamResults.length > 0 ? (
                      <div className="space-y-2">
                        {edamamResults.map(food => (
                          <div key={food.id} className="border rounded-lg p-3 hover:bg-gray-50">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-sm">
                                  {food.name}
                                  {food.brand && <span className="text-gray-500 ml-1">- {food.brand}</span>}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  Per 100g: {food.calories} cal • P: {food.protein}g • C: {food.carbs}g • F: {food.fat}g
                                </p>

                                {/* Portion size selector */}
                                {food.measures && food.measures.length > 0 && (
                                  <div className="mt-2 flex items-center gap-2">
                                    <label className="text-xs text-gray-600">Portion:</label>
                                    <select
                                      className="text-xs px-2 py-1 border rounded"
                                      onChange={(e) => {
                                        const measure = food.measures.find(m => m.uri === e.target.value) ||
                                        {
                                          label: '3.5 oz (100g)',
                                          displayLabel: '3.5 oz',
                                          weight: 100,
                                          uri: null
                                        };
                                        setSelectedPortion({
                                          ...selectedPortion,
                                          [food.id]: {
                                            value: measure.value, // Keep in grams for API
                                            uri: measure.uri,
                                            label: measure.label, // Full label with weight
                                            displayLabel: measure.displayLabel // Just the measure name
                                          }
                                        });
                                      }}
                                    >
                                      <option value="">3.5 oz (100g)</option>
                                      {food.measures.map((measure, idx) => (
                                        <option key={idx} value={measure.uri}>
                                          {measure.label}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}
                              </div>
                              <button
                                onClick={() => addEdamamFood(food, selectedMealType)}
                                className="ml-3 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                              >
                                Add
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : searchQuery.length >= 2 && !searchLoading ? (
                      <p className="text-sm text-gray-500 text-center py-4">No foods found</p>
                    ) : (
                      <p className="text-sm text-gray-400 text-center py-4">
                        Start typing to search from 700,000+ foods
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Saved Recipes Tab */}
              {activeTab === 'saved' && (
                <div>
                  <p className="text-sm text-gray-600 mb-3">
                    Quick access to your saved meal combinations
                  </p>
                  
                  {savedRecipes.length === 0 ? (
                    <div className="text-center py-8">
                      <BookOpen className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                      <p className="text-gray-500 mb-2">No saved recipes yet</p>
                      <p className="text-sm text-gray-400">
                        Add items to a meal, then click "Save as Recipe" to save your favorite combinations
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {savedRecipes.map(recipe => (
                        <div key={recipe.id} className="border rounded-lg p-3 hover:bg-gray-50">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h4 className="font-medium text-sm">{recipe.name}</h4>
                              <p className="text-xs text-gray-500 capitalize">
                                {recipe.mealType} • {recipe.items.length} item(s)
                              </p>
                            </div>
                            <button
                              onClick={() => deleteSavedRecipe(recipe.id)}
                              className="text-red-500 hover:text-red-700 p-1"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          
                          <div className="text-xs text-gray-600 mb-2">
                            {recipe.totalMacros.calories} cal • P: {recipe.totalMacros.protein}g • C: {recipe.totalMacros.carbs}g • F: {recipe.totalMacros.fat}g
                          </div>
                          
                          {/* Recipe items preview */}
                          <div className="mb-2 text-xs text-gray-500">
                            {recipe.items.map((item, idx) => (
                              <div key={idx}>• {item.name}</div>
                            ))}
                          </div>
                          
                          <button
                            onClick={() => addSavedRecipe(recipe, selectedMealType)}
                            className="w-full mt-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                          >
                            Add to {selectedMealType}
                          </button>
                          
                          {recipe.useCount > 0 && (
                            <p className="text-xs text-gray-400 mt-1 text-center">
                              Used {recipe.useCount} time{recipe.useCount !== 1 ? 's' : ''}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Natural Language Tab */}
              {activeTab === 'natural' && (
                <div>
                  <p className="text-sm text-gray-600 mb-3">
                    Type what you ate in plain English, e.g., "2 eggs with 2 slices of whole wheat toast" or "large apple"
                  </p>
                  <textarea
                    placeholder="Describe your food..."
                    value={naturalLanguageInput}
                    onChange={(e) => setNaturalLanguageInput(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 h-24"
                  />
                  <button
                    onClick={parseNaturalLanguage}
                    disabled={!naturalLanguageInput || searchLoading}
                    className="mt-3 w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {searchLoading ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Add to {selectedMealType}
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Recipe Analyzer Tab */}
              {activeTab === 'recipe' && (
                <div>
                  <p className="text-sm text-gray-600 mb-3">
                    Enter a recipe to calculate nutrition per serving
                  </p>
                  <input
                    type="text"
                    placeholder="Recipe name"
                    value={recipeInput.title}
                    onChange={(e) => setRecipeInput({ ...recipeInput, title: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 mb-3"
                  />
                  <textarea
                    placeholder="Enter ingredients (one per line)&#10;e.g.:&#10;2 cups brown rice&#10;1 lb chicken breast&#10;1 tbsp olive oil"
                    value={recipeInput.ingredients}
                    onChange={(e) => setRecipeInput({ ...recipeInput, ingredients: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 h-32 mb-3"
                  />
                  <div className="flex items-center gap-3 mb-3">
                    <label className="text-sm text-gray-600">Servings:</label>
                    <input
                      type="number"
                      min="1"
                      value={recipeInput.servings}
                      onChange={(e) => setRecipeInput({ ...recipeInput, servings: parseInt(e.target.value) || 1 })}
                      className="w-20 px-3 py-1 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    onClick={analyzeRecipe}
                    disabled={!recipeInput.title || !recipeInput.ingredients || searchLoading}
                    className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {searchLoading ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Analyzing Recipe...
                      </>
                    ) : (
                      <>
                        <ChefHat className="w-4 h-4" />
                        Calculate & Add Serving
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Save Recipe Modal */}
      {showSaveRecipeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Save as Recipe</h3>
              <button
                onClick={() => {
                  setShowSaveRecipeModal(false);
                  setRecipeNameInput('');
                  setMealTypeToSave(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Save the items from your {mealTypeToSave} as a recipe for quick access later.
            </p>

            <input
              type="text"
              placeholder="Enter recipe name (e.g., 'My Morning Breakfast')"
              value={recipeNameInput}
              onChange={(e) => setRecipeNameInput(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 mb-4"
              autoFocus
            />

            {mealTypeToSave && todaysFoodLog[mealTypeToSave] && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium mb-2">Items to save:</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  {todaysFoodLog[mealTypeToSave].map((item, idx) => (
                    <li key={idx}>• {item.name}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowSaveRecipeModal(false);
                  setRecipeNameInput('');
                  setMealTypeToSave(null);
                }}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveCurrentMealAsRecipe}
                disabled={!recipeNameInput.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Save Recipe
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remaining Macros Card */}
      <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Remaining for Today</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-600">{remaining.calories}</p>
            <p className="text-sm text-gray-600">Calories</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{remaining.protein}g</p>
            <p className="text-sm text-gray-600">Protein</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{remaining.carbs}g</p>
            <p className="text-sm text-gray-600">Carbs</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-600">{remaining.fat}g</p>
            <p className="text-sm text-gray-600">Fat</p>
          </div>
        </div>
      </div>

      {/* AI Meal Suggestions - Keep your existing suggestions */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <ChefHat className="w-5 h-5" />
          AI Meal Suggestions
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Based on your remaining macros and training schedule, here are personalized meal ideas:
        </p>

        {/* Display suggestions based on remaining macros */}
        <div className="grid gap-4">
          {generateSmartSuggestions().map((suggestion, index) => (
            <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-lg">{suggestion.name}</h4>
                <span className="text-sm bg-gray-100 px-2 py-1 rounded">
                  {suggestion.meal}
                </span>
              </div>

              <p className="text-sm text-gray-600 mb-3">{suggestion.description}</p>

              <div className="mb-3">
                <p className="text-sm text-gray-600 font-medium mb-1">Quick Recipe:</p>
                <p className="text-sm text-gray-700">{suggestion.instructions}</p>
              </div>

              <div className="flex gap-3 pt-3 border-t mb-3">
                <span className="text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded">
                  {suggestion.calories} cal
                </span>
                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                  {suggestion.protein}g protein
                </span>
                <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded">
                  {suggestion.carbs}g carbs
                </span>
                <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-1 rounded">
                  {suggestion.fat}g fat
                </span>
              </div>

              {/* Action buttons for adding/saving */}
              <div className="flex gap-2">
                <button
                  onClick={() => addAIMealSuggestion(suggestion, suggestion.meal)}
                  className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center justify-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add to {suggestion.meal}
                </button>
                <button
                  onClick={() => saveAISuggestionAsRecipe(suggestion)}
                  className="px-3 py-2 bg-green-100 text-green-700 text-sm rounded hover:bg-green-200 flex items-center gap-1"
                >
                  <Save className="w-4 h-4" />
                  Save
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Quick add buttons for suggestions */}
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-900 mb-2">
            💡 <strong>Pro Tip:</strong> These meals are optimized to hit your remaining macros for today.
            Click "Add to [meal]" to instantly add a suggestion, or "Save" to keep it in your recipe library for future use!
          </p>
        </div>
      </div>

      {/* Data-Driven Nutrition Tips */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-200">
        <h4 className="font-semibold text-purple-900 mb-2">Smart Nutrition Tips</h4>
        <ul className="text-sm text-purple-700 space-y-1">
          <li>• Carb cycle based on TSS: High load days = higher carbs</li>
          <li>• Protein within 30min post-workout aids recovery</li>
          <li>• Hydrate: 30-60g carbs/hour for sessions over 90min</li>
          <li>• Anti-inflammatory foods when TSB is negative</li>
        </ul>
      </div>
    </div>
  );
};

export default EnhancedNutritionTracker;