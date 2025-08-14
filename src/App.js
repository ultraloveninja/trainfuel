// src/App.js - Complete Fixed Version
import React, { useState, useEffect, useCallback } from 'react';
import { Activity, Calendar, Download, RefreshCw, Settings, AlertCircle, Zap, Brain } from 'lucide-react';

// Import services
import stravaService from './services/stravaService';
import nutritionService from './services/nutritionService';

// Import components
import StravaAuth from './components/StravaAuth';
import DashboardView from './components/DashboardView';
import CalendarView from './components/CalendarView';
import SettingsView from './components/SettingsView';
import AddEventModal from './components/AddEventModal';
import ErrorBoundary from './components/ErrorBoundary';

// Import utilities
import { processStravaActivities, calculateWeeklyTSS, analyzeTrainingPhase } from './utils/trainingUtils';
import { loadEventsFromStorage, saveEventsToStorage } from './utils/storageUtils';

const App = () => {
  // Core state
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
  const [generatingNutrition, setGeneratingNutrition] = useState(false);
  const [generatingWorkout, setGeneratingWorkout] = useState(false);

  // User preferences
  const [trainingGoal, setTrainingGoal] = useState('Endurance Performance');
  const [dietaryRestrictions, setDietaryRestrictions] = useState('');
  const [seasonType, setSeasonType] = useState('off-season');
  const [lastSync, setLastSync] = useState(null);

  // Food preferences and logging
  const [foodPreferences, setFoodPreferences] = useState(() => {
    const saved = localStorage.getItem('trainfuel_food_preferences');
    return saved ? JSON.parse(saved) : { likedFoods: [], dislikedFoods: [] };
  });

  const [dailyFoodLog, setDailyFoodLog] = useState(() => {
    const saved = localStorage.getItem('trainfuel_daily_food_log');
    return saved ? JSON.parse(saved) : [];
  });

  // UI state
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState(loadEventsFromStorage());

  // AI features
  const [aiRecommendationsEnabled, setAiRecommendationsEnabled] = useState(() => {
    const saved = localStorage.getItem('trainfuel_ai_enabled');
    return saved ? JSON.parse(saved) : false;
  });
  const [lastAiUpdate, setLastAiUpdate] = useState(null);

  // Save preferences to localStorage
  useEffect(() => {
    localStorage.setItem('trainfuel_food_preferences', JSON.stringify(foodPreferences));
  }, [foodPreferences]);

  useEffect(() => {
    localStorage.setItem('trainfuel_daily_food_log', JSON.stringify(dailyFoodLog));
  }, [dailyFoodLog]);

  useEffect(() => {
    localStorage.setItem('trainfuel_ai_enabled', JSON.stringify(aiRecommendationsEnabled));
  }, [aiRecommendationsEnabled]);

  useEffect(() => {
    saveEventsToStorage(upcomingEvents);
  }, [upcomingEvents]);

  // Check authentication on mount
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

  // Generate AI recommendations when data is available
  useEffect(() => {
    if (trainingData && athlete && aiRecommendationsEnabled) {
      generateAIRecommendations();
    }
  }, [trainingData, athlete, aiRecommendationsEnabled]);

  // Fetch Strava activities
  const fetchActivities = async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedActivities = await stravaService.getActivities();
      
      // Handle empty or invalid response
      if (!fetchedActivities || !Array.isArray(fetchedActivities)) {
        console.log('No activities returned from Strava');
        setActivities([]);
        setTrainingData({
          weeklyTSS: 0,
          phase: 'Base',
          activities: [],
          currentPhase: 'Base',
          todaysActivity: {
            type: 'Rest Day',
            duration: 0,
            intensity: 'Rest',
            tss: 0
          }
        });
        return;
      }

      const processed = processStravaActivities(fetchedActivities);
      setActivities(processed);

      // Fix: Pass activities array to analyzeTrainingPhase, not TSS number
      const tssData = calculateWeeklyTSS(processed);
      const phase = analyzeTrainingPhase(processed); // Changed from analyzeTrainingPhase(tssData)
      
      const todaysActivity = processed.find(activity =>
        activity.date === new Date().toISOString().split('T')[0]
      ) || processed[0];

      setTrainingData({ 
        weeklyTSS: tssData, 
        phase, 
        activities: processed,
        currentPhase: phase,
        todaysActivity: todaysActivity || {
          type: 'Rest Day',
          duration: 0,
          intensity: 'Rest',
          tss: 0
        }
      });

      setLastSync(new Date());
    } catch (err) {
      console.error('Error fetching activities:', err);
      setError('Failed to fetch activities. Please try refreshing.');
    } finally {
      setLoading(false);
    }
  };

  // Fallback recommendations (only ONE declaration using useCallback)
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

      const fallbackNutrition = await nutritionService.generateNutritionPlan(userData);
      setNutritionPlan(fallbackNutrition);

      const fallbackDaily = await nutritionService.generateMockDailyNutrition(userData);
      setDailyNutrition(fallbackDaily);

    } catch (err) {
      console.error('Even fallback recommendations failed:', err);
    }
  }, [athlete, trainingData, activities, trainingGoal, dietaryRestrictions, seasonType, upcomingEvents, foodPreferences, dailyFoodLog]);

  // AI recommendations generation
  const generateAIRecommendations = useCallback(async () => {
    if (!trainingData || !athlete) return;

    console.log('Generating AI-powered recommendations...');
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

      // Generate with AI or fallback
      const nutritionPlan = await nutritionService.generateNutritionPlan(userData);
      setNutritionPlan(nutritionPlan);

      const dailyNutrition = await nutritionService.generateMockDailyNutrition(userData);
      setDailyNutrition(dailyNutrition);

      const workoutPlan = await nutritionService.generateMockWorkout?.(userData) || {
        type: 'Recovery',
        duration: '45 minutes',
        intensity: 'Zone 2',
        focus: 'Active recovery'
      };
      setDailyWorkout(workoutPlan);

      setLastAiUpdate(new Date());

    } catch (err) {
      console.error('Error generating AI recommendations:', err);
      setError(`AI recommendations failed: ${err.message}`);
      await generateFallbackRecommendations();
    } finally {
      setGeneratingNutrition(false);
    }
  }, [trainingData, athlete, activities, trainingGoal, dietaryRestrictions, seasonType, upcomingEvents, foodPreferences, dailyFoodLog, generateFallbackRecommendations]);

  // Manual nutrition generation
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

      const nutrition = await nutritionService.generateMockDailyNutrition(userData);
      setDailyNutrition(nutrition);

    } catch (err) {
      console.error('Error generating daily nutrition:', err);
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

      const workout = await nutritionService.generateMockWorkout?.(userData) || {
        type: 'Easy Run',
        duration: '45 minutes',
        intensity: 'Zone 2',
        focus: 'Aerobic base building'
      };
      setDailyWorkout(workout);

    } catch (err) {
      console.error('Error generating workout:', err);
      setDailyWorkout({
        type: 'Recovery',
        duration: '30 minutes',
        intensity: 'Easy',
        focus: 'Active recovery'
      });
    } finally {
      setGeneratingWorkout(false);
    }
  };

  // Event management
  const addEvent = (event) => {
    const newEvent = {
      ...event,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    setUpcomingEvents([...upcomingEvents, newEvent]);
  };

  const deleteEvent = (eventId) => {
    setUpcomingEvents(upcomingEvents.filter(e => e.id !== eventId));
  };

  const clearAllEvents = () => {
    setUpcomingEvents([]);
  };

  // Handle Strava connection
  const handleStravaConnect = () => {
    const authUrl = stravaService.getAuthUrl();
    window.location.href = authUrl;
  };

  // Handle refresh
  const handleRefresh = async () => {
    await fetchActivities();
    if (aiRecommendationsEnabled) {
      await generateAIRecommendations();
    }
  };

  // Handle export
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
    URL.revokeObjectURL(url);
  };

  // Toggle AI recommendations
  const toggleAIRecommendations = () => {
    setAiRecommendationsEnabled(!aiRecommendationsEnabled);
    if (!aiRecommendationsEnabled) {
      generateAIRecommendations();
    }
  };

  // Update functions for child components
  const updateFoodPreferences = (newPreferences) => {
    setFoodPreferences(newPreferences);
  };

  const updateDailyFoodLog = (newLog) => {
    setDailyFoodLog(newLog);
  };

  const regenerateWithFoodData = async (currentFoodData) => {
    console.log('Regenerating with food data:', currentFoodData);
    await generateAIRecommendations();
  };

  const handleTrainingGoalChange = (goal) => {
    setTrainingGoal(goal);
  };

  const handleDietaryRestrictionsChange = (restrictions) => {
    setDietaryRestrictions(restrictions);
  };

  const handleAIToggle = () => {
    toggleAIRecommendations();
  };

  const handleDisconnectStrava = () => {
    stravaService.logout();
    setIsAuthenticated(false);
    setAthlete(null);
    setActivities([]);
    setTrainingData(null);
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
                  <>
                    <button
                      onClick={handleRefresh}
                      disabled={loading || generatingNutrition}
                      className="flex items-center space-x-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                      <span className="text-sm">{loading ? 'Syncing...' : 'Sync'}</span>
                    </button>

                    <button
                      onClick={handleExportData}
                      className="flex items-center space-x-2 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      <span className="text-sm">Export</span>
                    </button>

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
                  </>
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
                  foodPreferences={foodPreferences}
                  onUpdateFoodPreferences={updateFoodPreferences}
                  dailyFoodLog={dailyFoodLog}
                />
              )}
            </>
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