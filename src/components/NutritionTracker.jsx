import React, { useState, useEffect, useRef } from 'react';
import { Utensils, Clock, Flame, Target, Info, ChefHat, Plus, Search, X, Check, TrendingUp, Calendar } from 'lucide-react';

// Common foods database (simplified - you could expand this or use an API)
const FOOD_DATABASE = [
  // Proteins
  { id: 1, name: 'Chicken Breast (4oz)', calories: 185, protein: 35, carbs: 0, fat: 4, category: 'protein' },
  { id: 2, name: 'Salmon (4oz)', calories: 235, protein: 25, carbs: 0, fat: 14, category: 'protein' },
  { id: 3, name: 'Ground Turkey (4oz)', calories: 200, protein: 22, carbs: 0, fat: 11, category: 'protein' },
  { id: 4, name: 'Eggs (2 large)', calories: 140, protein: 12, carbs: 1, fat: 10, category: 'protein' },
  { id: 5, name: 'Greek Yogurt (1 cup)', calories: 130, protein: 20, carbs: 9, fat: 0, category: 'protein' },
  { id: 6, name: 'Tofu (4oz)', calories: 95, protein: 10, carbs: 2, fat: 6, category: 'protein' },
  
  // Carbs
  { id: 7, name: 'Brown Rice (1 cup)', calories: 215, protein: 5, carbs: 45, fat: 2, category: 'carbs' },
  { id: 8, name: 'Quinoa (1 cup)', calories: 220, protein: 8, carbs: 40, fat: 4, category: 'carbs' },
  { id: 9, name: 'Sweet Potato (medium)', calories: 100, protein: 2, carbs: 24, fat: 0, category: 'carbs' },
  { id: 10, name: 'Oatmeal (1/2 cup dry)', calories: 150, protein: 5, carbs: 27, fat: 3, category: 'carbs' },
  { id: 11, name: 'Whole Wheat Bread (2 slices)', calories: 160, protein: 8, carbs: 30, fat: 2, category: 'carbs' },
  { id: 12, name: 'Banana (medium)', calories: 105, protein: 1, carbs: 27, fat: 0, category: 'carbs' },
  
  // Fats
  { id: 13, name: 'Avocado (1/2)', calories: 120, protein: 1, carbs: 6, fat: 11, category: 'fats' },
  { id: 14, name: 'Almond Butter (2 tbsp)', calories: 190, protein: 7, carbs: 8, fat: 16, category: 'fats' },
  { id: 15, name: 'Olive Oil (1 tbsp)', calories: 120, protein: 0, carbs: 0, fat: 14, category: 'fats' },
  { id: 16, name: 'Nuts, Mixed (1oz)', calories: 170, protein: 5, carbs: 6, fat: 15, category: 'fats' },
  
  // Vegetables
  { id: 17, name: 'Broccoli (1 cup)', calories: 30, protein: 2, carbs: 6, fat: 0, category: 'vegetables' },
  { id: 18, name: 'Spinach (2 cups)', calories: 14, protein: 2, carbs: 2, fat: 0, category: 'vegetables' },
  { id: 19, name: 'Bell Peppers (1 cup)', calories: 30, protein: 1, carbs: 7, fat: 0, category: 'vegetables' },
  { id: 20, name: 'Mixed Greens (2 cups)', calories: 20, protein: 2, carbs: 4, fat: 0, category: 'vegetables' },
  
  // Common meals
  { id: 21, name: 'Protein Shake (your recipe)', calories: 250, protein: 40, carbs: 15, fat: 5, category: 'beverages' },
  { id: 22, name: 'Rice Cakes with Avocado', calories: 200, protein: 3, carbs: 20, fat: 12, category: 'snacks' },
];

const NutritionTracker = ({ trainingData, foodLog, userPreferences, currentWeight, onFoodLogUpdate }) => {
  const [mealPlan, setMealPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState('breakfast');
  const [customSuggestions, setCustomSuggestions] = useState([]);
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
  const [customFood, setCustomFood] = useState({
    name: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: ''
  });
  const [selectedMealType, setSelectedMealType] = useState('breakfast');

  // Save food log to localStorage whenever it changes
  useEffect(() => {
    // Skip the initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    localStorage.setItem('trainfuel_today_food_log', JSON.stringify(todaysFoodLog));
    
    // Only call parent update if provided and data actually changed
    if (onFoodLogUpdate) {
      onFoodLogUpdate(todaysFoodLog);
    }
  }, [todaysFoodLog]);

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
      fat: totals.fat + (food.fat || 0)
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  };

  // Calculate remaining macros
  const calculateRemainingMacros = () => {
    const consumed = calculateConsumedMacros();
    const target = mealPlan?.macros || { calories: 2000, protein: 150, carbs: 200, fat: 70 };
    
    return {
      calories: Math.max(0, (target.calories || 2000) - consumed.calories),
      protein: Math.max(0, (target.protein || 150) - consumed.protein),
      carbs: Math.max(0, (target.carbs || 200) - consumed.carbs),
      fat: Math.max(0, (target.fat || 70) - consumed.fat)
    };
  };

  // Add food to log
  const addFoodToLog = (food, mealType) => {
    const foodWithTimestamp = {
      ...food,
      id: Date.now(), // Add unique ID for removal
      timestamp: new Date().toISOString()
    };
    
    setTodaysFoodLog(prev => ({
      ...prev,
      [mealType]: [...prev[mealType], foodWithTimestamp]
    }));
    
    setShowAddFood(false);
    setSearchQuery('');
    setCustomFood({ name: '', calories: '', protein: '', carbs: '', fat: '' });
  };

  // Remove food from log
  const removeFoodFromLog = (mealType, foodId) => {
    setTodaysFoodLog(prev => ({
      ...prev,
      [mealType]: prev[mealType].filter(food => food.id !== foodId)
    }));
  };

  // Add custom food
  const addCustomFood = () => {
    if (customFood.name && customFood.calories) {
      addFoodToLog({
        name: customFood.name,
        calories: parseInt(customFood.calories),
        protein: parseInt(customFood.protein) || 0,
        carbs: parseInt(customFood.carbs) || 0,
        fat: parseInt(customFood.fat) || 0,
        category: 'custom'
      }, selectedMealType);
    }
  };

  // Update water intake
  const updateWaterIntake = (amount) => {
    setTodaysFoodLog(prev => ({
      ...prev,
      water: Math.max(0, prev.water + amount)
    }));
  };

  // Filter foods based on search
  const filteredFoods = FOOD_DATABASE.filter(food =>
    food.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const consumed = calculateConsumedMacros();
  const remaining = calculateRemainingMacros();
  const targetCalories = mealPlan?.dailyCalories || 2000;
  const percentageConsumed = Math.round((consumed.calories / targetCalories) * 100);

  // Generate meal plan (your existing logic)
  useEffect(() => {
    generateMealPlan();
  }, [trainingData, userPreferences]);

  const generateMealPlan = async () => {
    setLoading(true);
    // Your existing meal plan generation logic
    // For now, using placeholder data
    setMealPlan({
      dailyCalories: 2000,
      macros: { protein: 150, carbs: 200, fat: 70 },
      hydration: { target: 100 }
    });
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Daily Progress Overview */}
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
              className={`h-3 rounded-full transition-all ${
                percentageConsumed > 100 ? 'bg-red-500' : 
                percentageConsumed > 80 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(100, percentageConsumed)}%` }}
            />
          </div>
        </div>

        {/* Macro Breakdown */}
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

        {/* Water Intake */}
        <div className="flex items-center justify-between pt-4 border-t">
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

      {/* Food Log by Meal */}
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
                      <p className="text-sm font-medium">{food.name}</p>
                      <p className="text-xs text-gray-500">
                        {food.calories} cal • P: {food.protein}g • C: {food.carbs}g • F: {food.fat}g
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
              <div className="mt-2 pt-2 border-t text-xs text-gray-600">
                Subtotal: {todaysFoodLog[mealType].reduce((sum, f) => sum + f.calories, 0)} cal
              </div>
            )}
          </div>
        ))}
      </div>

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

      {/* Add Food Modal */}
      {showAddFood && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Add Food to {selectedMealType}</h3>
                <button
                  onClick={() => setShowAddFood(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search foods..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Food List */}
              <div className="mb-4 max-h-48 overflow-y-auto">
                {filteredFoods.length > 0 ? (
                  <div className="space-y-1">
                    {filteredFoods.map(food => (
                      <button
                        key={food.id}
                        onClick={() => addFoodToLog(food, selectedMealType)}
                        className="w-full text-left p-3 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <p className="font-medium text-sm">{food.name}</p>
                        <p className="text-xs text-gray-500">
                          {food.calories} cal • P: {food.protein}g • C: {food.carbs}g • F: {food.fat}g
                        </p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">No foods found</p>
                )}
              </div>

              {/* Custom Food Entry */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Add Custom Food</h4>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Food name"
                    value={customFood.name}
                    onChange={(e) => setCustomFood({...customFood, name: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="Calories"
                      value={customFood.calories}
                      onChange={(e) => setCustomFood({...customFood, calories: e.target.value})}
                      className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="number"
                      placeholder="Protein (g)"
                      value={customFood.protein}
                      onChange={(e) => setCustomFood({...customFood, protein: e.target.value})}
                      className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="number"
                      placeholder="Carbs (g)"
                      value={customFood.carbs}
                      onChange={(e) => setCustomFood({...customFood, carbs: e.target.value})}
                      className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="number"
                      placeholder="Fat (g)"
                      value={customFood.fat}
                      onChange={(e) => setCustomFood({...customFood, fat: e.target.value})}
                      className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    onClick={addCustomFood}
                    disabled={!customFood.name || !customFood.calories}
                    className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Add Custom Food
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Nick Chase Tips */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-200">
        <h4 className="font-semibold text-purple-900 mb-2">Nick Chase Nutrition Tips</h4>
        <ul className="text-sm text-purple-700 space-y-1">
          <li>• Track everything - data drives improvement</li>
          <li>• Liquid nutrition during training sessions</li>
          <li>• Protein within 30 minutes post-workout</li>
          <li>• Vegetable-heavy dinners for recovery</li>
        </ul>
      </div>
    </div>
  );
};

export default NutritionTracker;