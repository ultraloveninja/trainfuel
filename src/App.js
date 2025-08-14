// src/App.js - Enhanced with Food Preferences and Daily Food Logging

import React, { useState, useEffect, useCallback } from 'react';
import { Activity, Calendar, Download, RefreshCw, Settings, AlertCircle, Zap, Brain } from 'lucide-react';

// Import services
import stravaService from './services/stravaService';
import nutritionService from './services/nutritionService'; // Enhanced food-aware version

// Import components
import StravaAuth from './components/StravaAuth';
import DashboardView from './components/DashboardView'; // Enhanced version
import CalendarView from './components/CalendarView';
import SettingsView from './components/SettingsView'; // Enhanced version
import AddEventModal from './components/AddEventModal';
import ErrorBoundary from './components/ErrorBoundary';

// Import utilities
import { processStravaActivities, calculateWeeklyTSS, analyzeTrainingPhase } from './utils/trainingUtils';
import { loadEventsFromStorage, saveEventsToStorage } from './utils/storageUtils';

const App = () => {
  // Existing state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [athlete, setAthlete] = useState(null);
  const [activities, setActivities] = useState([]);
  const [trainingData, setTrainingData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Nutrition and AI state
  const [nutritionPlan, setNutritionPlan] = useState(null);
  const [dailyNutrition, setDailyNutrition] = useState(null);
  const [dailyWorkout, setDailyWorkout] = useState(null);
  const [mealPlan, setMealPlan] = useState(null);
  const [generatingNutrition, setGeneratingNutrition] = useState(false);
  const [generatingWorkout, setGeneratingWorkout] = useState(false);

  // User preferences
  const [trainingGoal, setTrainingGoal] = useState('Endurance Performance');
  const [dietaryRestrictions, setDietaryRestrictions] = useState('');
  const [seasonType, setSeasonType] = useState('off-season');
  const [lastSync, setLastSync] = useState(null);

  // NEW: Food preferences and logging state
  const [foodPreferences, setFoodPreferences] = useState(() => {
    const saved = localStorage.getItem('trainfuel_food_preferences');
    return saved ? JSON.parse(saved) : { likedFoods: [], dislikedFoods: [] };
  });

  const [dailyFoodLog, setDailyFoodLog] = useState(() => {
    const saved = localStorage.getItem('trainfuel_daily_food_log');
    return saved ? JSON.parse(saved) : [];
  });

  // Events and UI state
  const [upcomingEvents, setUpcomingEvents] = useState(loadEventsFromStorage());
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAddEventModal, setShowAddEventModal] = useState(false);

  // AI Integration flags
  const [aiRecommendationsEnabled, setAiRecommendationsEnabled] = useState(true);
  const [lastAiUpdate, setLastAiUpdate] = useState(null);

  // Save food preferences to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('trainfuel_food_preferences', JSON.stringify(foodPreferences));
  }, [foodPreferences]);

  // Save daily food log to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('trainfuel_daily_food_log', JSON.stringify(dailyFoodLog));
  }, [dailyFoodLog]);

  useEffect(() => {
    saveEventsToStorage(upcomingEvents);
  }, [upcomingEvents]);

  useEffect(() => {
    const checkAuth = async () => {
      if (stravaService.isAuthenticated()) {
        setIsAuthenticated(true);
        await loadStravaData();
      }
    };

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
      handleStravaCallback(code);
    } else {
      checkAuth();
    }
  }, []);

// Enhanced effect to trigger AI recommendations when data changes
useEffect(() => {
  if (trainingData && athlete && aiRecommendationsEnabled) {
    generateAIRecommendations();
  }
}, [seasonType, trainingData?.todaysActivity, upcomingEvents, trainingGoal, aiRecommendationsEnabled, foodPreferences, generateAIRecommendations]);

  const handleStravaCallback = async (code) => {
    console.log('🔗 Starting Strava authentication...');
    setLoading(true);
    setError(null);

    try {
      const result = await stravaService.exchangeToken(code);
      console.log('✅ Authentication successful!');

      setIsAuthenticated(true);
      setAthlete(result.athlete);

      window.history.replaceState({}, document.title, window.location.pathname);
      await loadStravaData();
    } catch (err) {
      console.error('❌ Error during Strava authentication:', err);
      setError(`Failed to connect to Strava: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadStravaData = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!athlete) {
        const athleteData = await stravaService.getAthlete();
        setAthlete(athleteData);
      }

      console.log('📊 Loading Strava activities...');
      const recentActivities = await stravaService.getActivities(1, 30);
      const processedActivities = processStravaActivities(recentActivities);
      setActivities(processedActivities);

      const weeklyTSS = calculateWeeklyTSS(processedActivities);
      const currentPhase = analyzeTrainingPhase(processedActivities);
      const todaysActivity = processedActivities.find(activity =>
        activity.date === new Date().toISOString().split('T')[0]
      ) || processedActivities[0];

      const newTrainingData = {
        currentPhase,
        weeklyTSS,
        todaysActivity: todaysActivity || {
          type: 'Rest Day',
          duration: 0,
          intensity: 'Rest',
          tss: 0
        },
        upcomingActivities: processedActivities.slice(1, 4)
      };

      setTrainingData(newTrainingData);
      setLastSync(new Date());

      console.log('🏃 Training data loaded:', newTrainingData);

    } catch (err) {
      console.error('❌ Error loading Strava data:', err);
      setError('Failed to load training data. Please try refreshing.');
    } finally {
      setLoading(false);
    }
  };

  // Fallback to existing logic if AI fails
const generateFallbackRecommendations = useCallback(async () => {
  try {
    const userData = {
      athlete,
      trainingData,
      activities,
      preferences: { trainingGoal, dietaryRestrictions, seasonType },
      upcomingEvents,
      foodPreferences, // Include even in fallback
      dailyFoodLog
    };

    // Use enhanced mock/intelligent recommendations as fallback
    const fallbackNutrition = await nutritionService.generateIntelligentMockPlan(userData);
    setNutritionPlan(fallbackNutrition);

    const fallbackDaily = await nutritionService.generateMockDailyNutrition(userData);
    setDailyNutrition(fallbackDaily);

  } catch (err) {
    console.error('❌ Even fallback recommendations failed:', err);
  }
}, [athlete, trainingData, activities, trainingGoal, dietaryRestrictions, seasonType, upcomingEvents, foodPreferences, dailyFoodLog]);

// Enhanced AI recommendations generation with food data
const generateAIRecommendations = useCallback(async () => {
  if (!trainingData || !athlete) return;

  console.log('🧠 Generating AI-powered recommendations with food preferences...');
  setGeneratingNutrition(true);

  try {
    const userData = {
      athlete,
      trainingData,
      activities,
      preferences: {
        trainingGoal,
        dietaryRestrictions,
        seasonType
      },
      upcomingEvents,
      foodPreferences,
      dailyFoodLog
    };

    // Generate nutrition plan with Claude AI
    console.log('🍎 Getting AI nutrition plan with food preferences...');
    const aiNutritionPlan = await nutritionService.generateNutritionPlan(userData);
    setNutritionPlan(aiNutritionPlan);

    // Generate daily nutrition recommendations
    console.log('🥗 Getting daily nutrition recommendations with food log...');
    const aiDailyNutrition = await nutritionService.generateDailyNutrition(userData);
    setDailyNutrition(aiDailyNutrition);

    // Generate training recommendations
    console.log('🏃 Getting training recommendations with nutrition awareness...');
    const aiWorkoutPlan = await nutritionService.generateTrainingRecommendations(userData);
    setDailyWorkout(aiWorkoutPlan);

    setLastAiUpdate(new Date());
    console.log('✅ AI recommendations generated successfully with food data!');

  } catch (err) {
    console.error('❌ Error generating AI recommendations:', err);
    setError(`AI recommendations failed: ${err.message}. Using fallback recommendations.`);

    // Still try to generate fallback recommendations
    await generateFallbackRecommendations();
  } finally {
    setGeneratingNutrition(false);
  }
}, [trainingData, athlete, activities, trainingGoal, dietaryRestrictions, seasonType, upcomingEvents, foodPreferences, dailyFoodLog]);

  // NEW: Regenerate recommendations with current food data
  const regenerateWithFoodData = async (currentFoodData) => {
    if (!trainingData || !athlete) return;

    console.log('🔄 Regenerating recommendations with current food intake...');
    setGeneratingNutrition(true);

    try {
      const userData = {
        athlete,
        trainingData,
        activities,
        preferences: { trainingGoal, dietaryRestrictions, seasonType },
        upcomingEvents,
        foodPreferences,
        dailyFoodLog
      };

      // Generate updated recommendations based on current food data
      const updatedRecommendations = await nutritionService.generateWithFoodData(userData, currentFoodData);

      // Update daily nutrition with new recommendations
      setDailyNutrition(prev => ({
        ...prev,
        ...updatedRecommendations,
        lastUpdated: new Date().toISOString()
      }));

      // Also regenerate training recommendations with nutrition awareness
      const updatedWorkout = await nutritionService.generateTrainingRecommendations(userData);
      setDailyWorkout(updatedWorkout);

      setLastAiUpdate(new Date());
      console.log('✅ Recommendations updated with current food data!');

    } catch (err) {
      console.error('❌ Error updating recommendations with food data:', err);
      setError(`Failed to update recommendations: ${err.message}`);
    } finally {
      setGeneratingNutrition(false);
    }
  };

  // Fallback to existing logic if AI fails
  const generateFallbackRecommendations = async () => {
    try {
      const userData = {
        athlete,
        trainingData,
        activities,
        preferences: { trainingGoal, dietaryRestrictions, seasonType },
        upcomingEvents,
        foodPreferences, // Include even in fallback
        dailyFoodLog
      };

      // Use enhanced mock/intelligent recommendations as fallback
      const fallbackNutrition = await nutritionService.generateIntelligentMockPlan(userData);
      setNutritionPlan(fallbackNutrition);

      const fallbackDaily = await nutritionService.generateMockDailyNutrition(userData);
      setDailyNutrition(fallbackDaily);

    } catch (err) {
      console.error('❌ Even fallback recommendations failed:', err);
    }
  };

  // Enhanced manual nutrition generation
  const generateDailyNutrition = async () => {
    setGeneratingNutrition(true);
    try {
      const userData = {
        athlete,
        trainingData,
        activities,
        preferences: { trainingGoal, dietaryRestrictions, seasonType },
        upcomingEvents,
        foodPreferences,
        dailyFoodLog
      };

      if (aiRecommendationsEnabled) {
        console.log('🧠 Generating AI daily nutrition with food preferences...');
        const aiDailyNutrition = await nutritionService.generateDailyNutrition(userData);
        setDailyNutrition(aiDailyNutrition);
      } else {
        console.log('📋 Generating standard daily nutrition with food preferences...');
        const standardNutrition = await nutritionService.generateMockDailyNutrition(userData);
        setDailyNutrition(standardNutrition);
      }

    } catch (err) {
      console.error('❌ Error generating daily nutrition:', err);
      await generateFallbackRecommendations();
    } finally {
      setGeneratingNutrition(false);
    }
  };

  // Enhanced manual workout generation
  const generateDailyWorkout = async () => {
    setGeneratingWorkout(true);
    try {
      const userData = {
        athlete,
        trainingData,
        activities,
        preferences: { trainingGoal, dietaryRestrictions, seasonType },
        upcomingEvents,
        foodPreferences,
        dailyFoodLog
      };

      if (aiRecommendationsEnabled) {
        console.log('🧠 Generating AI workout with nutrition awareness...');
        const aiWorkout = await nutritionService.generateTrainingRecommendations(userData);
        setDailyWorkout(aiWorkout);
      } else {
        console.log('📋 Generating standard workout...');
        const fallbackWorkout = generateStandardWorkout(userData);
        setDailyWorkout(fallbackWorkout);
      }

    } catch (err) {
      console.error('❌ Error generating workout:', err);
      const fallbackWorkout = generateStandardWorkout(userData);
      setDailyWorkout(fallbackWorkout);
    } finally {
      setGeneratingWorkout(false);
    }
  };

  // Standard workout generation (existing logic)
  const generateStandardWorkout = (userData) => {
    const { trainingData, activities: userActivities, preferences } = userData; // Extract what you need
    const { seasonType: userSeasonType } = preferences || {}; // Extract seasonType from preferences
    const todaysActivity = trainingData?.todaysActivity || { type: 'Rest Day', duration: 0 };

    return {
      workoutType: todaysActivity.type,
      primaryFocus: determineWorkoutType(userActivities || activities, userSeasonType || seasonType),
      warmup: {
        duration: "15 minutes",
        description: "Dynamic warm-up with sport-specific movements"
      },
      mainSet: {
        description: `${todaysActivity.type} - ${todaysActivity.duration} minutes`,
        duration: `${todaysActivity.duration} minutes`,
        intensity: todaysActivity.intensity,
        structure: "Based on your current training phase"
      },
      cooldown: {
        duration: "10-15 minutes",
        description: "Easy cool-down with stretching"
      },
      alternatives: ["Recovery session if feeling fatigued"],
      rpe: calculateTargetRPE(userActivities || activities, userSeasonType || seasonType),
      rationale: `Based on ${trainingData?.currentPhase} phase training`,
      recoveryFocus: "Focus on sleep and hydration"
    };
  };

  // NEW: Food preference update handler
  const updateFoodPreferences = (newPreferences) => {
    setFoodPreferences(newPreferences);

    // If AI is enabled and we have training data, regenerate recommendations
    if (aiRecommendationsEnabled && trainingData && athlete) {
      setTimeout(() => generateAIRecommendations(), 500); // Small delay to let state update
    }
  };

  // NEW: Daily food log update handler
  const updateDailyFoodLog = (newFoodLog) => {
    setDailyFoodLog(newFoodLog);

    // Auto-regenerate recommendations if significant food intake changes
    const today = new Date().toISOString().split('T')[0];
    const todaysEntries = newFoodLog.filter(entry => entry.date === today);

    // If they've logged 3+ items today, might be worth updating recommendations
    if (todaysEntries.length >= 3 && aiRecommendationsEnabled && trainingData && athlete) {
      console.log('🔄 Auto-updating recommendations due to significant food log changes...');
      setTimeout(() => {
        const currentFoodData = {
          foodPreferences,
          dailyFoodLog: newFoodLog,
          todaysNutritionTotals: calculateTodaysNutritionTotals(todaysEntries)
        };
        regenerateWithFoodData(currentFoodData);
      }, 1000);
    }
  };

  // Helper: Calculate today's nutrition totals
  const calculateTodaysNutritionTotals = (todaysEntries) => {
    return todaysEntries.reduce((totals, entry) => ({
      calories: totals.calories + (entry.calories || 0),
      carbs: totals.carbs + (entry.carbs || 0),
      protein: totals.protein + (entry.protein || 0),
      fat: totals.fat + (entry.fat || 0)
    }), { calories: 0, carbs: 0, protein: 0, fat: 0 });
  };

  // Event management functions (existing)
  const addEvent = (event) => {
    const newEvent = { ...event, id: Date.now().toString() };
    setUpcomingEvents(prev => [...prev, newEvent].sort((a, b) => new Date(a.date) - new Date(b.date)));
  };

  const clearAllEvents = () => {
    setUpcomingEvents([]);
  };

  // Connection handlers
  const handleConnectStrava = () => {
    window.location.href = stravaService.getAuthUrl();
  };

  const handleDisconnectStrava = () => {
    stravaService.logout();
    setIsAuthenticated(false);
    setAthlete(null);
    setActivities([]);
    setTrainingData(null);
    setNutritionPlan(null);
    setMealPlan(null);
    setDailyNutrition(null);
    setDailyWorkout(null);
    setTrainingGoal('Endurance Performance');
    setDietaryRestrictions('');

    // Reset food data as well
    setFoodPreferences({ likedFoods: [], dislikedFoods: [] });
    setDailyFoodLog([]);
  };

  const handleRefresh = async () => {
    if (isAuthenticated) {
      await loadStravaData();
    }
  };

  // Preference change handlers
  const handleTrainingGoalChange = async (newGoal) => {
    setTrainingGoal(newGoal);
    if (trainingData && athlete && aiRecommendationsEnabled) {
      await generateAIRecommendations();
    }
  };

  const handleDietaryRestrictionsChange = async (newRestrictions) => {
    setDietaryRestrictions(newRestrictions);
    if (trainingData && athlete && aiRecommendationsEnabled) {
      await generateAIRecommendations();
    }
  };

  // AI toggle handler
  const handleAIToggle = async (enabled) => {
    setAiRecommendationsEnabled(enabled);
    if (enabled && trainingData && athlete) {
      await generateAIRecommendations();
    }
  };

  // Helper functions (existing logic adapted)
  const determineWorkoutType = (activities, seasonType) => {
    if (!activities || activities.length === 0) return 'Base Endurance';
    const recent = activities.slice(0, 3);
    const hasHardWorkout = recent.some(a => a.intensity === 'High');
    return hasHardWorkout ? 'Recovery' : 'Build';
  };

  const calculateTargetRPE = (activities, seasonType) => {
    if (seasonType === 'in-season') return '7-8';
    if (!activities || activities.length === 0) return '6-7';
    const recentIntensity = activities[0]?.intensity;
    return recentIntensity === 'High' ? '4-5' : '6-7';
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Activity className="h-8 w-8 text-blue-600" />
                  <h1 className="text-2xl font-bold text-gray-900">TrainFuel</h1>
                  {aiRecommendationsEnabled && (
                    <div className="flex items-center space-x-1 bg-blue-100 px-2 py-1 rounded-full">
                      <Brain className="h-4 w-4 text-blue-600" />
                      <span className="text-xs text-blue-600 font-medium">AI Powered</span>
                    </div>
                  )}
                </div>

                {isAuthenticated && athlete && (
                  <div className="text-sm text-gray-600">
                    Welcome back, {athlete.firstname}!
                    {lastAiUpdate && (
                      <div className="text-xs text-blue-600">
                        AI updated: {lastAiUpdate.toLocaleTimeString()}
                      </div>
                    )}
                    {foodPreferences?.likedFoods?.length > 0 && (
                      <div className="text-xs text-green-600">
                        {foodPreferences.likedFoods.length} food preferences • {dailyFoodLog.filter(entry => entry.date === new Date().toISOString().split('T')[0]).length} foods logged today
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-3">
                {error && (
                  <div className="flex items-center space-x-2 text-red-600 bg-red-50 px-3 py-1 rounded-lg">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">{error.substring(0, 50)}...</span>
                  </div>
                )}

                {isAuthenticated && (
                  <button
                    onClick={handleRefresh}
                    disabled={loading || generatingNutrition}
                    className="flex items-center space-x-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    <span className="text-sm">{loading ? 'Syncing...' : 'Sync Data'}</span>
                  </button>
                )}

                {aiRecommendationsEnabled && generatingNutrition && (
                  <div className="flex items-center space-x-2 bg-blue-100 px-3 py-1 rounded-lg">
                    <Zap className="h-4 w-4 text-blue-600 animate-pulse" />
                    <span className="text-sm text-blue-600">AI Thinking...</span>
                  </div>
                )}

                <button className="flex items-center space-x-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors">
                  <Download className="h-4 w-4" />
                  <span>Export Plan</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        <nav className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-8">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: Activity },
                { id: 'calendar', label: 'Activities', icon: Calendar },
                { id: 'settings', label: 'Settings', icon: Settings }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${activeTab === id ?
                      'border-blue-500 text-blue-600' :
                      'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {!isAuthenticated && (
            <StravaAuth
              onConnect={handleConnectStrava}
              loading={loading}
              error={error}
            />
          )}

          {activeTab === 'dashboard' && (
            <DashboardView
              isAuthenticated={isAuthenticated}
              loading={loading}
              trainingData={trainingData}
              nutritionPlan={nutritionPlan}
              dailyNutrition={dailyNutrition}
              dailyWorkout={dailyWorkout}
              generatingNutrition={generatingNutrition}
              generatingWorkout={generatingWorkout}
              handleGenerateNutrition={generateDailyNutrition}
              handleGenerateWorkout={generateDailyWorkout}
              upcomingEvents={upcomingEvents}
              setShowAddEventModal={setShowAddEventModal}
              aiRecommendationsEnabled={aiRecommendationsEnabled}
              lastAiUpdate={lastAiUpdate}
              // NEW: Food preferences and logging props
              foodPreferences={foodPreferences}
              onUpdateFoodPreferences={updateFoodPreferences}
              dailyFoodLog={dailyFoodLog}
              onUpdateDailyFoodLog={updateDailyFoodLog}
              onRegenerateWithFoodData={regenerateWithFoodData}
            />
          )}

          {activeTab === 'calendar' && (
            <CalendarView
              isAuthenticated={isAuthenticated}
              activities={activities}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              isAuthenticated={isAuthenticated}
              athlete={athlete}
              trainingGoal={trainingGoal}
              onTrainingGoalChange={handleTrainingGoalChange}
              dietaryRestrictions={dietaryRestrictions}
              onDietaryRestrictionsChange={handleDietaryRestrictionsChange}
              seasonType={seasonType}
              onSeasonTypeChange={setSeasonType}
              lastSync={lastSync}
              upcomingEvents={upcomingEvents}
              onClearAllEvents={clearAllEvents}
              onRefresh={handleRefresh}
              aiRecommendationsEnabled={aiRecommendationsEnabled}
              onAIToggle={handleAIToggle}
              onDisconnect={handleDisconnectStrava}
              // NEW: Food preferences props
              foodPreferences={foodPreferences}
              onUpdateFoodPreferences={updateFoodPreferences}
              dailyFoodLog={dailyFoodLog}
            />
          )}

          <AddEventModal
            show={showAddEventModal}
            onClose={() => setShowAddEventModal(false)}
            onAddEvent={addEvent}
            minDate={new Date().toISOString().split('T')[0]}
          />
        </main>
      </div>
    </ErrorBoundary>
  );
};

export default App;