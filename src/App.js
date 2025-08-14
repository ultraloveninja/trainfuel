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

  // UI State
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [showMealDetails, setShowMealDetails] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState(loadEventsFromStorage());

  // AI Features toggle
  const [aiRecommendationsEnabled, setAiRecommendationsEnabled] = useState(() => {
    const saved = localStorage.getItem('trainfuel_ai_enabled');
    return saved ? JSON.parse(saved) : false;
  });

  const [lastAiUpdate, setLastAiUpdate] = useState(null);

  // Save preferences to localStorage when they change
  useEffect(() => {
    localStorage.setItem('trainfuel_food_preferences', JSON.stringify(foodPreferences));
  }, [foodPreferences]);

  useEffect(() => {
    localStorage.setItem('trainfuel_daily_food_log', JSON.stringify(dailyFoodLog));
  }, [dailyFoodLog]);

  useEffect(() => {
    localStorage.setItem('trainfuel_ai_enabled', JSON.stringify(aiRecommendationsEnabled));
  }, [aiRecommendationsEnabled]);

  // Check for existing authentication
  useEffect(() => {
    const checkAuth = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');

      if (code) {
        // Handle OAuth callback
        setLoading(true);
        try {
          const result = await stravaService.exchangeToken(code);
          setAthlete(result.athlete);
          setIsAuthenticated(true);
          // Clear the code from URL
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (err) {
          setError('Failed to authenticate with Strava');
          console.error('Auth error:', err);
        } finally {
          setLoading(false);
        }
      } else {
        // Check if already authenticated
        if (stravaService.isAuthenticated()) {
          const savedAthlete = localStorage.getItem('strava_athlete');
          if (savedAthlete) {
            setAthlete(JSON.parse(savedAthlete));
            setIsAuthenticated(true);
          }
        }
      }
    };

    checkAuth();
  }, []);

  // Fetch activities when authenticated
  useEffect(() => {
    if (isAuthenticated && athlete) {
      fetchActivities();
    }
  }, [isAuthenticated, athlete]);

  // Generate AI recommendations when training data is available
  useEffect(() => {
    if (trainingData && athlete && aiRecommendationsEnabled) {
      generateAIRecommendations();
    }
  }, [trainingData, athlete, aiRecommendationsEnabled]);

  const fetchActivities = async () => {
    setLoading(true);
    setError(null);
    try {
      // stravaService handles the token internally
      const fetchedActivities = await stravaService.getActivities();
      const processed = processStravaActivities(fetchedActivities);
      setActivities(processed);

      const tssData = calculateWeeklyTSS(processed);
      const phase = analyzeTrainingPhase(tssData);
      setTrainingData({ weeklyTSS: tssData, phase, activities: processed });

      setLastSync(new Date());
    } catch (err) {
      console.error('Error fetching activities:', err);
      setError('Failed to fetch activities. Please try refreshing.');
    } finally {
      setLoading(false);
    }
  };

  // Fallback to existing logic if AI fails - Using useCallback to prevent redeclaration
  const generateFallbackRecommendations = useCallback(async () => {
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
  }, [trainingData, athlete, activities, trainingGoal, dietaryRestrictions, seasonType, upcomingEvents, foodPreferences, dailyFoodLog, generateFallbackRecommendations]);

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

  // Generate workout recommendations
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
        console.log('🏃 Generating AI workout plan...');
        const aiWorkout = await nutritionService.generateTrainingRecommendations(userData);
        setDailyWorkout(aiWorkout);
      } else {
        console.log('📋 Generating standard workout plan...');
        const standardWorkout = await nutritionService.generateMockWorkout(userData);
        setDailyWorkout(standardWorkout);
      }

    } catch (err) {
      console.error('❌ Error generating workout:', err);
      // Generate fallback workout
      const fallbackWorkout = {
        type: 'Easy Recovery',
        duration: '45 minutes',
        intensity: 'Zone 2',
        focus: 'Active recovery and movement',
        notes: 'Keep it easy today for recovery'
      };
      setDailyWorkout(fallbackWorkout);
    } finally {
      setGeneratingWorkout(false);
    }
  };

  const handleAddEvent = (event) => {
    const newEvents = [...upcomingEvents, { ...event, id: Date.now() }];
    setUpcomingEvents(newEvents);
    saveEventsToStorage(newEvents);
    setShowAddEvent(false);
  };

  const handleDeleteEvent = (eventId) => {
    const filtered = upcomingEvents.filter(e => e.id !== eventId);
    setUpcomingEvents(filtered);
    saveEventsToStorage(filtered);
  };

  const handleRefresh = async () => {
    await fetchActivities();
    if (aiRecommendationsEnabled) {
      await generateAIRecommendations();
    }
  };

  const handleExportData = () => {
    const exportData = {
      athlete,
      activities,
      trainingData,
      nutritionPlan,
      upcomingEvents,
      foodPreferences,
      dailyFoodLog,
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trainfuel-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const toggleAIRecommendations = () => {
    setAiRecommendationsEnabled(!aiRecommendationsEnabled);
    if (!aiRecommendationsEnabled) {
      generateAIRecommendations();
    }
  };

  // NEW: Add food preference
  const addFoodPreference = (food, type) => {
    setFoodPreferences(prev => {
      const updated = { ...prev };
      if (type === 'like') {
        updated.likedFoods = [...(prev.likedFoods || []), food];
        updated.dislikedFoods = (prev.dislikedFoods || []).filter(f => f !== food);
      } else {
        updated.dislikedFoods = [...(prev.dislikedFoods || []), food];
        updated.likedFoods = (prev.likedFoods || []).filter(f => f !== food);
      }
      return updated;
    });
  };

  // NEW: Log daily food
  const logFood = (foodEntry) => {
    const entry = {
      ...foodEntry,
      date: new Date().toISOString().split('T')[0],
      timestamp: new Date().toISOString()
    };
    setDailyFoodLog(prev => [...prev, entry]);
  };

  // Helper functions for UI
  const getWorkoutType = (activities) => {
    if (!activities || activities.length === 0) return 'Recovery';
    const lastActivity = activities[0];
    const daysSinceLastWorkout = Math.floor((new Date() - new Date(lastActivity.start_date)) / (1000 * 60 * 60 * 24));
    return daysSinceLastWorkout > 1 ? 'Build' : 'Recovery';
  };

  const calculateTargetRPE = (activities, seasonType) => {
    if (seasonType === 'in-season') return '7-8';
    if (!activities || activities.length === 0) return '6-7';
    const recentIntensity = activities[0]?.intensity;
    return recentIntensity === 'High' ? '4-5' : '6-7';
  };

  // Handle Strava connection
  const handleStravaConnect = () => {
    const authUrl = stravaService.getAuthUrl();
    window.location.href = authUrl;
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
                    <span className="text-sm">{loading ? 'Syncing...' : 'Sync'}</span>
                  </button>
                )}

                {isAuthenticated && (
                  <button
                    onClick={handleExportData}
                    className="flex items-center space-x-2 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    <span className="text-sm">Export</span>
                  </button>
                )}

                {isAuthenticated && (
                  <button
                    onClick={toggleAIRecommendations}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                      aiRecommendationsEnabled 
                        ? 'bg-blue-600 text-white hover:bg-blue-700' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    <Zap className="h-4 w-4" />
                    <span className="text-sm">
                      {aiRecommendationsEnabled ? 'AI On' : 'AI Off'}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {isAuthenticated && (
              <nav className="flex space-x-8 py-2">
                {['dashboard', 'calendar', 'settings'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`capitalize text-sm font-medium pb-2 border-b-2 transition-colors ${
                      activeTab === tab
                        ? 'text-blue-600 border-blue-600'
                        : 'text-gray-500 border-transparent hover:text-gray-700'
                    }`}
                  >
                    {tab === 'dashboard' && <Activity className="inline h-4 w-4 mr-1" />}
                    {tab === 'calendar' && <Calendar className="inline h-4 w-4 mr-1" />}
                    {tab === 'settings' && <Settings className="inline h-4 w-4 mr-1" />}
                    {tab}
                  </button>
                ))}
              </nav>
            )}
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {!isAuthenticated ? (
            <StravaAuth 
              onConnect={handleStravaConnect}
              loading={loading}
              error={error}
            />
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <DashboardView
                  athlete={athlete}
                  activities={activities}
                  trainingData={trainingData}
                  nutritionPlan={nutritionPlan}
                  dailyNutrition={dailyNutrition}
                  dailyWorkout={dailyWorkout}
                  loading={loading}
                  lastSync={lastSync}
                  upcomingEvents={upcomingEvents}
                  onAddEvent={() => setShowAddEvent(true)}
                  onDeleteEvent={handleDeleteEvent}
                  generateDailyNutrition={generateDailyNutrition}
                  generateDailyWorkout={generateDailyWorkout}
                  generatingNutrition={generatingNutrition}
                  generatingWorkout={generatingWorkout}
                  aiRecommendationsEnabled={aiRecommendationsEnabled}
                  foodPreferences={foodPreferences}
                  dailyFoodLog={dailyFoodLog}
                  addFoodPreference={addFoodPreference}
                  logFood={logFood}
                  regenerateWithFoodData={regenerateWithFoodData}
                />
              )}

              {activeTab === 'calendar' && (
                <CalendarView
                  activities={activities}
                  upcomingEvents={upcomingEvents}
                  nutritionPlan={nutritionPlan}
                />
              )}

              {activeTab === 'settings' && (
                <SettingsView
                  athlete={athlete}
                  trainingGoal={trainingGoal}
                  setTrainingGoal={setTrainingGoal}
                  dietaryRestrictions={dietaryRestrictions}
                  setDietaryRestrictions={setDietaryRestrictions}
                  seasonType={seasonType}
                  setSeasonType={setSeasonType}
                  onUpdatePreferences={() => {
                    if (aiRecommendationsEnabled) {
                      generateAIRecommendations();
                    }
                  }}
                  foodPreferences={foodPreferences}
                  setFoodPreferences={setFoodPreferences}
                />
              )}
            </>
          )}
        </main>

        {showAddEvent && (
          <AddEventModal
            onClose={() => setShowAddEvent(false)}
            onSave={handleAddEvent}
          />
        )}
      </div>
    </ErrorBoundary>
  );
};

export default App;