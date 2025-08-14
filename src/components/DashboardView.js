// src/components/DashboardView.js - Enhanced with Food Preferences and Logging

import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Utensils, 
  Clock, 
  Target, 
  Zap, 
  Plus, 
  X, 
  ThumbsUp, 
  ThumbsDown,
  Calendar,
  Brain,
  Trash2,
  Edit3,
  Save,
  AlertCircle
} from 'lucide-react';

const DashboardView = ({
  isAuthenticated,
  loading,
  trainingData,
  nutritionPlan,
  dailyNutrition,
  dailyWorkout,
  generatingNutrition,
  generatingWorkout,
  handleGenerateNutrition,
  handleGenerateWorkout,
  upcomingEvents,
  setShowAddEventModal,
  aiRecommendationsEnabled,
  lastAiUpdate,
  // New props for food preferences and logging
  foodPreferences,
  onUpdateFoodPreferences,
  dailyFoodLog,
  onUpdateDailyFoodLog,
  onRegenerateWithFoodData
}) => {
  // Local state for food preferences management
  const [showFoodPreferences, setShowFoodPreferences] = useState(false);
  const [newDislikedFood, setNewDislikedFood] = useState('');
  const [newLikedFood, setNewLikedFood] = useState('');
  
  // Local state for daily food logging
  const [showFoodLogger, setShowFoodLogger] = useState(false);
  const [newFoodEntry, setNewFoodEntry] = useState({
    name: '',
    amount: '',
    mealType: 'breakfast',
    calories: '',
    time: new Date().toTimeString().slice(0, 5)
  });
  
  // Track today's nutrition totals
  const [todaysNutritionTotals, setTodaysNutritionTotals] = useState({
    calories: 0,
    carbs: 0,
    protein: 0,
    fat: 0
  });

  // Calculate today's nutrition totals from food log
  useEffect(() => {
    if (dailyFoodLog) {
      const today = new Date().toISOString().split('T')[0];
      const todaysEntries = dailyFoodLog.filter(entry => entry.date === today);
      
      const totals = todaysEntries.reduce((acc, entry) => ({
        calories: acc.calories + (entry.calories || 0),
        carbs: acc.carbs + (entry.carbs || 0),
        protein: acc.protein + (entry.protein || 0),
        fat: acc.fat + (entry.fat || 0)
      }), { calories: 0, carbs: 0, protein: 0, fat: 0 });
      
      setTodaysNutritionTotals(totals);
    }
  }, [dailyFoodLog]);

  if (!isAuthenticated) {
    return (
      <div className="text-center py-12">
        <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Connect Your Training Data</h3>
        <p className="text-gray-600">Connect your Strava account to get personalized nutrition and training recommendations.</p>
      </div>
    );
  }

  const addFoodPreference = (type) => {
    const food = type === 'liked' ? newLikedFood : newDislikedFood;
    if (!food.trim()) return;

    const updatedPreferences = {
      ...foodPreferences,
      [type === 'liked' ? 'likedFoods' : 'dislikedFoods']: [
        ...(foodPreferences?.[type === 'liked' ? 'likedFoods' : 'dislikedFoods'] || []),
        food.trim()
      ]
    };

    onUpdateFoodPreferences(updatedPreferences);
    
    if (type === 'liked') {
      setNewLikedFood('');
    } else {
      setNewDislikedFood('');
    }
  };

  const removeFoodPreference = (type, food) => {
    const updatedPreferences = {
      ...foodPreferences,
      [type === 'liked' ? 'likedFoods' : 'dislikedFoods']: 
        (foodPreferences?.[type === 'liked' ? 'likedFoods' : 'dislikedFoods'] || [])
        .filter(f => f !== food)
    };
    onUpdateFoodPreferences(updatedPreferences);
  };

  const addFoodEntry = () => {
    if (!newFoodEntry.name.trim()) return;

    const entry = {
      ...newFoodEntry,
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      timestamp: new Date().toISOString()
    };

    onUpdateDailyFoodLog([...dailyFoodLog, entry]);
    
    // Reset form
    setNewFoodEntry({
      name: '',
      amount: '',
      mealType: 'breakfast',
      calories: '',
      time: new Date().toTimeString().slice(0, 5)
    });
  };

  const removeFoodEntry = (entryId) => {
    onUpdateDailyFoodLog(dailyFoodLog.filter(entry => entry.id !== entryId));
  };

  const regenerateWithCurrentData = async () => {
    // Trigger AI regeneration with current food log and preferences
    await onRegenerateWithFoodData({
      foodPreferences,
      dailyFoodLog,
      todaysNutritionTotals
    });
  };

  const getTodaysFoodEntries = () => {
    const today = new Date().toISOString().split('T')[0];
    return dailyFoodLog?.filter(entry => entry.date === today) || [];
  };

  const getRemainingNutrition = () => {
    if (!nutritionPlan) return null;
    
    return {
      calories: (nutritionPlan.dailyCalories || 0) - todaysNutritionTotals.calories,
      carbs: (nutritionPlan.macros?.carbs?.grams || 0) - todaysNutritionTotals.carbs,
      protein: (nutritionPlan.macros?.protein?.grams || 0) - todaysNutritionTotals.protein,
      fat: (nutritionPlan.macros?.fat?.grams || 0) - todaysNutritionTotals.fat
    };
  };

  const remainingNutrition = getRemainingNutrition();

  return (
    <div className="space-y-6">
      {/* Header with AI Status */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Today's Training & Nutrition</h1>
            <p className="text-gray-600 mt-1">
              {trainingData?.todaysActivity?.type || 'Rest Day'} • {trainingData?.currentPhase} Phase
            </p>
          </div>
          
          {aiRecommendationsEnabled && (
            <div className="flex items-center space-x-2 bg-blue-100 px-3 py-2 rounded-lg">
              <Brain className="h-5 w-5 text-blue-600" />
              <div className="text-sm">
                <div className="text-blue-900 font-medium">AI Enhanced</div>
                {lastAiUpdate && (
                  <div className="text-blue-600">Updated: {lastAiUpdate.toLocaleTimeString()}</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Training Overview */}
      {trainingData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <Activity className="h-6 w-6 text-green-600" />
              <h3 className="text-lg font-semibold">Today's Training</h3>
            </div>
            <div className="mt-4 space-y-2">
              <p className="text-2xl font-bold text-gray-900">{trainingData.todaysActivity?.duration || 0} min</p>
              <p className="text-gray-600">{trainingData.todaysActivity?.type}</p>
              <p className="text-sm text-gray-500">
                {trainingData.todaysActivity?.intensity} intensity • {trainingData.todaysActivity?.tss || 0} TSS
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <Target className="h-6 w-6 text-purple-600" />
              <h3 className="text-lg font-semibold">Weekly Load</h3>
            </div>
            <div className="mt-4 space-y-2">
              <p className="text-2xl font-bold text-gray-900">{trainingData.weeklyTSS || 0}</p>
              <p className="text-gray-600">Total TSS</p>
              <p className="text-sm text-gray-500">
                {Math.round((trainingData.weeklyTSS || 0) / 7)} daily average
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Calendar className="h-6 w-6 text-orange-600" />
                <h3 className="text-lg font-semibold">Next Event</h3>
              </div>
              <button
                onClick={() => setShowAddEventModal(true)}
                className="text-orange-600 hover:text-orange-700"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4">
              {upcomingEvents.length > 0 ? (
                <div>
                  <p className="font-medium text-gray-900">{upcomingEvents[0].name}</p>
                  <p className="text-gray-600">{upcomingEvents[0].type}</p>
                  <p className="text-sm text-gray-500">
                    {Math.ceil((new Date(upcomingEvents[0].date) - new Date()) / (1000 * 60 * 60 * 24))} days away
                  </p>
                </div>
              ) : (
                <p className="text-gray-500">No events scheduled</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Food Preferences and Daily Nutrition Tracking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Food Preferences Panel */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <ThumbsUp className="h-6 w-6 text-green-600" />
              <h3 className="text-lg font-semibold">Food Preferences</h3>
            </div>
            <button
              onClick={() => setShowFoodPreferences(!showFoodPreferences)}
              className="text-blue-600 hover:text-blue-700"
            >
              <Edit3 className="h-5 w-5" />
            </button>
          </div>

          {showFoodPreferences ? (
            <div className="space-y-4">
              {/* Add Liked Foods */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Foods I Like</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newLikedFood}
                    onChange={(e) => setNewLikedFood(e.target.value)}
                    placeholder="e.g., salmon, quinoa, blueberries..."
                    className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    onKeyPress={(e) => e.key === 'Enter' && addFoodPreference('liked')}
                  />
                  <button
                    onClick={() => addFoodPreference('liked')}
                    className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {(foodPreferences?.likedFoods || []).map((food, index) => (
                    <span key={index} className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm flex items-center space-x-1">
                      <span>{food}</span>
                      <button
                        onClick={() => removeFoodPreference('liked', food)}
                        className="text-green-600 hover:text-green-800"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Add Disliked Foods */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Foods I Dislike</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newDislikedFood}
                    onChange={(e) => setNewDislikedFood(e.target.value)}
                    placeholder="e.g., mushrooms, olives, spicy food..."
                    className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    onKeyPress={(e) => e.key === 'Enter' && addFoodPreference('disliked')}
                  />
                  <button
                    onClick={() => addFoodPreference('disliked')}
                    className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {(foodPreferences?.dislikedFoods || []).map((food, index) => (
                    <span key={index} className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-sm flex items-center space-x-1">
                      <span>{food}</span>
                      <button
                        onClick={() => removeFoodPreference('disliked', food)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setShowFoodPreferences(false)}
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>Save Preferences</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <h4 className="font-medium text-green-700 mb-1">Liked Foods ({(foodPreferences?.likedFoods || []).length})</h4>
                <p className="text-sm text-gray-600">
                  {(foodPreferences?.likedFoods || []).slice(0, 3).join(', ')}
                  {(foodPreferences?.likedFoods || []).length > 3 && '...'}
                </p>
              </div>
              <div>
                <h4 className="font-medium text-red-700 mb-1">Disliked Foods ({(foodPreferences?.dislikedFoods || []).length})</h4>
                <p className="text-sm text-gray-600">
                  {(foodPreferences?.dislikedFoods || []).slice(0, 3).join(', ')}
                  {(foodPreferences?.dislikedFoods || []).length > 3 && '...'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Daily Food Log Panel */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Utensils className="h-6 w-6 text-blue-600" />
              <h3 className="text-lg font-semibold">Today's Food Log</h3>
            </div>
            <button
              onClick={() => setShowFoodLogger(!showFoodLogger)}
              className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-1"
            >
              <Plus className="h-4 w-4" />
              <span>Add Food</span>
            </button>
          </div>

          {showFoodLogger && (
            <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Food name"
                  value={newFoodEntry.name}
                  onChange={(e) => setNewFoodEntry({...newFoodEntry, name: e.target.value})}
                  className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Amount (e.g., 1 cup)"
                  value={newFoodEntry.amount}
                  onChange={(e) => setNewFoodEntry({...newFoodEntry, amount: e.target.value})}
                  className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <select
                  value={newFoodEntry.mealType}
                  onChange={(e) => setNewFoodEntry({...newFoodEntry, mealType: e.target.value})}
                  className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                  <option value="snack">Snack</option>
                </select>
                <input
                  type="number"
                  placeholder="Calories"
                  value={newFoodEntry.calories}
                  onChange={(e) => setNewFoodEntry({...newFoodEntry, calories: parseInt(e.target.value) || ''})}
                  className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="time"
                  value={newFoodEntry.time}
                  onChange={(e) => setNewFoodEntry({...newFoodEntry, time: e.target.value})}
                  className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={addFoodEntry}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                >
                  Add Entry
                </button>
                <button
                  onClick={() => setShowFoodLogger(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Today's Food Entries */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {getTodaysFoodEntries().map((entry) => (
              <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{entry.name}</span>
                    <span className="text-sm text-gray-500">({entry.amount})</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {entry.mealType} • {entry.time} • {entry.calories || '?'} cal
                  </div>
                </div>
                <button
                  onClick={() => removeFoodEntry(entry.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            
            {getTodaysFoodEntries().length === 0 && (
              <p className="text-gray-500 text-center py-4">No food logged today</p>
            )}
          </div>
        </div>
      </div>

      {/* Nutrition Progress Tracking */}
      {nutritionPlan && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Today's Nutrition Progress</h3>
            {aiRecommendationsEnabled && getTodaysFoodEntries().length > 0 && (
              <button
                onClick={regenerateWithCurrentData}
                disabled={generatingNutrition}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center space-x-2"
              >
                <Brain className={`h-4 w-4 ${generatingNutrition ? 'animate-pulse' : ''}`} />
                <span>{generatingNutrition ? 'Updating...' : 'Update AI Recommendations'}</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{todaysNutritionTotals.calories}</div>
              <div className="text-sm text-gray-600">of {nutritionPlan.dailyCalories} calories</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{width: `${Math.min((todaysNutritionTotals.calories / nutritionPlan.dailyCalories) * 100, 100)}%`}}
                ></div>
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{todaysNutritionTotals.carbs}g</div>
              <div className="text-sm text-gray-600">of {nutritionPlan.macros?.carbs?.grams || 0}g carbs</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-green-600 h-2 rounded-full" 
                  style={{width: `${Math.min((todaysNutritionTotals.carbs / (nutritionPlan.macros?.carbs?.grams || 1)) * 100, 100)}%`}}
                ></div>
              </div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{todaysNutritionTotals.protein}g</div>
              <div className="text-sm text-gray-600">of {nutritionPlan.macros?.protein?.grams || 0}g protein</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-red-600 h-2 rounded-full" 
                  style={{width: `${Math.min((todaysNutritionTotals.protein / (nutritionPlan.macros?.protein?.grams || 1)) * 100, 100)}%`}}
                ></div>
              </div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{todaysNutritionTotals.fat}g</div>
              <div className="text-sm text-gray-600">of {nutritionPlan.macros?.fat?.grams || 0}g fat</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-yellow-600 h-2 rounded-full" 
                  style={{width: `${Math.min((todaysNutritionTotals.fat / (nutritionPlan.macros?.fat?.grams || 1)) * 100, 100)}%`}}
                ></div>
              </div>
            </div>
          </div>

          {remainingNutrition && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Remaining for Today:</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className={`${remainingNutrition.calories > 0 ? 'text-blue-800' : 'text-red-800'}`}>
                  {remainingNutrition.calories > 0 ? '+' : ''}{remainingNutrition.calories} calories
                </div>
                <div className={`${remainingNutrition.carbs > 0 ? 'text-blue-800' : 'text-red-800'}`}>
                  {remainingNutrition.carbs > 0 ? '+' : ''}{remainingNutrition.carbs}g carbs
                </div>
                <div className={`${remainingNutrition.protein > 0 ? 'text-blue-800' : 'text-red-800'}`}>
                  {remainingNutrition.protein > 0 ? '+' : ''}{remainingNutrition.protein}g protein
                </div>
                <div className={`${remainingNutrition.fat > 0 ? 'text-blue-800' : 'text-red-800'}`}>
                  {remainingNutrition.fat > 0 ? '+' : ''}{remainingNutrition.fat}g fat
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Nutrition Recommendations */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Utensils className="h-6 w-6 text-green-600" />
              <h3 className="text-lg font-semibold">Today's Nutrition</h3>
              {aiRecommendationsEnabled && (
                <div className="bg-green-100 px-2 py-1 rounded-full">
                  <span className="text-xs text-green-600 font-medium">AI Enhanced</span>
                </div>
              )}
            </div>
            <button
              onClick={handleGenerateNutrition}
              disabled={generatingNutrition}
              className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <Zap className={`h-4 w-4 ${generatingNutrition ? 'animate-pulse' : ''}`} />
              <span>{generatingNutrition ? 'Generating...' : 'Regenerate'}</span>
            </button>
          </div>

          {dailyNutrition ? (
            <div className="space-y-4">
              {dailyNutrition.preWorkout && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">Pre-Workout</h4>
                  <p className="text-sm text-gray-600 mb-1">{dailyNutrition.preWorkout.timing}</p>
                  <p className="text-gray-800">{dailyNutrition.preWorkout.food}</p>
                </div>
              )}
              
              {dailyNutrition.postWorkout && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">Post-Workout</h4>
                  <p className="text-sm text-gray-600 mb-1">{dailyNutrition.postWorkout.timing}</p>
                  <p className="text-gray-800">{dailyNutrition.postWorkout.food}</p>
                </div>
              )}

              {dailyNutrition.keyFocus && (
                <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                  <h4 className="font-medium text-green-900 mb-1">Today's Focus</h4>
                  <p className="text-sm text-green-800">{dailyNutrition.keyFocus}</p>
                </div>
              )}

              {/* Show AI adaptations based on food log */}
              {aiRecommendationsEnabled && getTodaysFoodEntries().length > 0 && (
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-1">AI Adaptation</h4>
                  <p className="text-sm text-blue-800">
                    Recommendations updated based on your logged food intake and preferences.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">Click "Regenerate" to get your personalized nutrition recommendations</p>
            </div>
          )}
        </div>

        {/* Daily Workout Recommendations */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Activity className="h-6 w-6 text-blue-600" />
              <h3 className="text-lg font-semibold">Today's Workout</h3>
              {aiRecommendationsEnabled && (
                <div className="bg-blue-100 px-2 py-1 rounded-full">
                  <span className="text-xs text-blue-600 font-medium">AI Enhanced</span>
                </div>
              )}
            </div>
            <button
              onClick={handleGenerateWorkout}
              disabled={generatingWorkout}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Zap className={`h-4 w-4 ${generatingWorkout ? 'animate-pulse' : ''}`} />
              <span>{generatingWorkout ? 'Generating...' : 'Regenerate'}</span>
            </button>
          </div>

          {dailyWorkout ? (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-1">{dailyWorkout.workoutType}</h4>
                <p className="text-sm text-gray-600 mb-2">{dailyWorkout.primaryFocus}</p>
                <p className="text-gray-800">{dailyWorkout.mainSet?.description}</p>
              </div>

              {dailyWorkout.warmup && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">Warm-up ({dailyWorkout.warmup.duration})</h4>
                  <p className="text-sm text-gray-700">{dailyWorkout.warmup.description}</p>
                </div>
              )}

              {dailyWorkout.cooldown && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">Cool-down ({dailyWorkout.cooldown.duration})</h4>
                  <p className="text-sm text-gray-700">{dailyWorkout.cooldown.description}</p>
                </div>
              )}

              {dailyWorkout.rpe && (
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-1">Target RPE: {dailyWorkout.rpe}</h4>
                  <p className="text-sm text-blue-800">{dailyWorkout.rationale}</p>
                </div>
              )}

              {dailyWorkout.alternatives && dailyWorkout.alternatives.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">Alternatives</h4>
                  <ul className="text-sm text-gray-700 space-y-1">
                    {dailyWorkout.alternatives.map((alt, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <span className="text-gray-400">•</span>
                        <span>{alt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">Click "Regenerate" to get your personalized workout recommendations</p>
            </div>
          )}
        </div>
      </div>

      {/* Weekly Nutrition Plan */}
      {nutritionPlan && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Your Nutrition Plan</h3>
            {aiRecommendationsEnabled && (
              <div className="bg-purple-100 px-2 py-1 rounded-full">
                <span className="text-xs text-purple-600 font-medium">Personalized by AI</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Daily Targets</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Calories:</span>
                  <span className="font-medium">{nutritionPlan.dailyCalories}</span>
                </div>
                <div className="flex justify-between">
                  <span>Carbs:</span>
                  <span className="font-medium">{nutritionPlan.macros?.carbs?.grams}g ({nutritionPlan.macros?.carbs?.percentage}%)</span>
                </div>
                <div className="flex justify-between">
                  <span>Protein:</span>
                  <span className="font-medium">{nutritionPlan.macros?.protein?.grams}g ({nutritionPlan.macros?.protein?.percentage}%)</span>
                </div>
                <div className="flex justify-between">
                  <span>Fat:</span>
                  <span className="font-medium">{nutritionPlan.macros?.fat?.grams}g ({nutritionPlan.macros?.fat?.percentage}%)</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3">Hydration</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">Daily Target:</span>
                  <p className="font-medium">{nutritionPlan.hydration?.dailyTarget}</p>
                </div>
                <div>
                  <span className="text-gray-600">During Training:</span>
                  <p className="font-medium">{nutritionPlan.hydration?.duringTraining}</p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3">Meal Suggestions</h4>
              <div className="space-y-2 text-sm">
                {nutritionPlan.mealSuggestions?.slice(0, 3).map((meal, index) => (
                  <div key={index}>
                    <span className="text-gray-600">{meal.meal}:</span>
                    <p className="font-medium">{meal.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {nutritionPlan.notes && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700">{nutritionPlan.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Food Preferences Impact */}
      {aiRecommendationsEnabled && (foodPreferences?.likedFoods?.length > 0 || foodPreferences?.dislikedFoods?.length > 0) && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Brain className="h-6 w-6 text-purple-600" />
            <h3 className="text-lg font-semibold text-purple-900">AI Food Personalization</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-purple-900 mb-2">What AI Knows About Your Preferences:</h4>
              <ul className="text-sm text-purple-800 space-y-1">
                {foodPreferences?.likedFoods?.length > 0 && (
                  <li>• Prioritizes {foodPreferences.likedFoods.length} foods you enjoy</li>
                )}
                {foodPreferences?.dislikedFoods?.length > 0 && (
                  <li>• Avoids {foodPreferences.dislikedFoods.length} foods you dislike</li>
                )}
                {getTodaysFoodEntries().length > 0 && (
                  <li>• Considers {getTodaysFoodEntries().length} foods you've eaten today</li>
                )}
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-purple-900 mb-2">How This Improves Recommendations:</h4>
              <ul className="text-sm text-purple-800 space-y-1">
                <li>• More realistic meal suggestions you'll actually eat</li>
                <li>• Better macro distribution based on real intake</li>
                <li>• Adaptive portion sizes throughout the day</li>
                <li>• Personalized race nutrition strategies</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-white bg-opacity-50 rounded-lg">
            <p className="text-sm text-purple-700">
              <strong>Pro Tip:</strong> The more you log your daily food intake and update your preferences, 
              the smarter Claude becomes at creating meal plans you'll love and nutrition strategies that work for your lifestyle.
            </p>
          </div>
        </div>
      )}

      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">Loading training data...</p>
        </div>
      )}
    </div>
  );
};

export default DashboardView;