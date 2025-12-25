// src/App.js - Complete Integration with New Components
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Activity, Calendar, Download, RefreshCw, Settings, AlertCircle, Zap, Brain, Home, Utensils, ClipboardList } from 'lucide-react';


// Import services
import nutritionService from './services/nutritionService';
import intervalsService from './services/intervalsService';



// Import NEW components
import WorkoutGenerator from './components/WorkoutGenerator';
//import NutritionTracker from './components/NutritionTracker';
import EnhancedNutritionTracker from './components/EnhancedNutritionTracker';
import SettingsPage from './components/SettingsPage';
import TrainingPlanCalendar from './components/TrainingPlanCalendar';
import TrafficLightIndicator from './components/TrafficLightIndicator';
import FitnessWidget from './components/FitnessWidget';

// Import existing components
import IntervalsAuth from './components/IntervalsAuth';
import DashboardView from './components/DashboardView';
import CalendarView from './components/CalendarView';
import AddEventModal from './components/AddEventModal';
import ErrorBoundary from './components/ErrorBoundary';

// Import utilities
import { processStravaActivities, calculateWeeklyTSS, analyzeTrainingPhase } from './utils/trainingUtils';
import { loadEventsFromStorage, saveEventsToStorage } from './utils/storageUtils';

const App = () => {
  // Core state
  const [isConnected, setIsConnected] = useState(false);
  const [athlete, setAthlete] = useState(null);
  const [activities, setActivities] = useState([]);
  const [trainingData, setTrainingData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fitnessMetrics, setFitnessMetrics] = useState(null);

  // Add rate limiting refs
  const lastAICallRef = useRef(0);
  const aiCallDebounceRef = useRef(null);
  const MIN_TIME_BETWEEN_CALLS = 60000; // 1 minute minimum between AI calls

  // Settings state (NEW)
  const [userSettings, setUserSettings] = useState(() => {
    const saved = localStorage.getItem('trainfuelSettings');
    return saved ? JSON.parse(saved) : {
      profile: {
        name: '',
        age: 46,
        height: '6\'2"',
        weight: 204,
        gender: 'male'
      },
      goals: {
        primaryGoal: 'weight_loss',
        targetWeight: 195,
        targetDate: '',
        currentPhase: 'in_season'
      },
      foodPreferences: {
        dietType: 'balanced',
        restrictions: [],
        allergies: [],
        favoriteFoods: [],
        dislikedFoods: [],
        mealPrepDay: 'sunday',
        cookingTime: 'moderate'
      },
      trainingPreferences: {
        preferredTime: 'morning',
        alternativeTime: 'afternoon',
        weeklyHours: 8,
        raceDistance: 'half_ironman'
      },
      notifications: {
        mealReminders: true,
        workoutReminders: true,
        hydrationReminders: true,
        reminderTime: '07:00'
      }
    };
  });

  // Nutrition and AI state
  const [nutritionPlan, setNutritionPlan] = useState(null);
  const [dailyNutrition, setDailyNutrition] = useState(null);
  const [dailyWorkout, setDailyWorkout] = useState(null);
  const [generatingNutrition, setGeneratingNutrition] = useState(false);
  const [generatingWorkout, setGeneratingWorkout] = useState(false);

  // Food logging with history
  const [foodLogHistory, setFoodLogHistory] = useState(() => {
    const saved = localStorage.getItem('trainfuel_food_log_history');
    return saved ? JSON.parse(saved) : [];
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
    return saved ? JSON.parse(saved) : true;
  });
  const [lastAiUpdate, setLastAiUpdate] = useState(null);

  // Generate AI recommendations with rate limiting
  const generateAIRecommendations = useCallback(async (force = false) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastAICallRef.current;

    if (!force && timeSinceLastCall < MIN_TIME_BETWEEN_CALLS) {
      console.log(`Skipping AI call - too soon (${timeSinceLastCall}ms since last call)`);
      return;
    }

    if (aiCallDebounceRef.current) {
      clearTimeout(aiCallDebounceRef.current);
    }

    // Debounce the actual call
    aiCallDebounceRef.current = setTimeout(async () => {
      console.log('Generating AI recommendations...');
      setGeneratingNutrition(true);
      setGeneratingWorkout(true);

      try {
        lastAICallRef.current = Date.now(); // Update last call time

        const userData = {
          athlete: {
            age: userSettings.profile.age,
            weight: userSettings.profile.weight,
            height: userSettings.profile.height,
            gender: userSettings.profile.gender
          },
          trainingData,
          goals: userSettings.goals,
          preferences: userSettings.foodPreferences,
          dietaryRestrictions: userSettings.foodPreferences.restrictions,
          recentFoodLog: foodLogHistory.slice(-7),
          todaysFoodLog: dailyFoodLog
        };

        // Only call nutrition service if we have the data we need
        if (userData.athlete && userData.athlete.weight) {
          const nutrition = await nutritionService.generateDailyNutrition(userData);
          setDailyNutrition(nutrition || {
            meals: {
              breakfast: { calories: 400, protein: 30, carbs: 45, fat: 10 },
              lunch: { calories: 500, protein: 40, carbs: 50, fat: 15 },
              dinner: { calories: 600, protein: 45, carbs: 60, fat: 20 },
              snacks: { calories: 300, protein: 15, carbs: 40, fat: 10 }
            },
            hydration: { target: Math.round(userSettings.profile.weight / 2) },
            totalCalories: 1800,
            macros: { protein: 130, carbs: 195, fat: 55 }
          });
        }

        setLastAiUpdate(new Date().toISOString());

      } catch (err) {
        console.error('Error generating AI recommendations:', err);
        // Don't set error state to avoid re-renders
      } finally {
        setGeneratingNutrition(false);
        setGeneratingWorkout(false);
      }
    }, 1000); // 1 second debounce
  }, [trainingData, userSettings, foodLogHistory, dailyFoodLog]);

  // Handle food log updates
  const handleFoodLogUpdate = useCallback((todayLog) => {
    // Save today's log
    setDailyFoodLog(todayLog);

    // Update history (keep last 30 days)
    const updatedHistory = [...foodLogHistory];
    const todayIndex = updatedHistory.findIndex(log => log.date === todayLog.date);

    if (todayIndex >= 0) {
      updatedHistory[todayIndex] = todayLog;
    } else {
      updatedHistory.push(todayLog);
    }

    // Keep only last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const filteredHistory = updatedHistory.filter(log =>
      new Date(log.date) > thirtyDaysAgo
    );

    setFoodLogHistory(filteredHistory);
    localStorage.setItem('trainfuel_food_log_history', JSON.stringify(filteredHistory));

    // DON'T automatically regenerate AI recommendations
    // User can manually refresh if needed
  }, [foodLogHistory]);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('trainfuelSettings', JSON.stringify(userSettings));
  }, [userSettings]);

  useEffect(() => {
    localStorage.setItem('trainfuel_daily_food_log', JSON.stringify(dailyFoodLog));
  }, [dailyFoodLog]);

  useEffect(() => {
    localStorage.setItem('trainfuel_ai_enabled', JSON.stringify(aiRecommendationsEnabled));
  }, [aiRecommendationsEnabled]);

  useEffect(() => {
    saveEventsToStorage(upcomingEvents);
  }, [upcomingEvents]);

  // Check intervals.icu connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      if (intervalsService.isConfigured()) {
        setLoading(true);
        try {
          // Fetch athlete profile
          const storedProfile = localStorage.getItem('intervals_athlete_profile');
          if (storedProfile) {
            const profile = JSON.parse(storedProfile);
            setAthlete(profile);
            setIsConnected(true);
          } else {
            // Fetch fresh profile
            const profile = await intervalsService.getAthleteProfile();
            setAthlete(profile);
            setIsConnected(true);
          }
        } catch (err) {
          console.error('Failed to fetch athlete profile:', err);
          setError('Failed to connect to Intervals.icu. Please check your credentials in Settings.');
        } finally {
          setLoading(false);
        }
      }
    };

    checkConnection();
  }, []);

  // Fetch activities when connected
  useEffect(() => {
    if (isConnected && athlete) {
      fetchActivities();
    }
  }, [isConnected, athlete]);

  // Generate AI recommendations when data is available (with rate limiting)
  useEffect(() => {
    // Only generate on initial load or when explicitly enabled
    if (trainingData && athlete && aiRecommendationsEnabled) {
      // Only call if we haven't called recently
      const timeSinceLastCall = Date.now() - lastAICallRef.current;
      if (timeSinceLastCall > MIN_TIME_BETWEEN_CALLS) {
        generateAIRecommendations();
      }
    }
  }, []); // Empty dependency array - only run once on mount

  // Fetch activities from intervals.icu
  const fetchActivities = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!intervalsService.isConfigured()) {
        throw new Error('Intervals.icu not configured. Please add your credentials in Settings.');
      }

      // Fetch training data from intervals.icu
      const intervalsData = await intervalsService.getTrainingData();

      setActivities(intervalsData.activities);
      setFitnessMetrics(intervalsData.fitness);

      // Process activities for training data
      const processed = processStravaActivities(intervalsData.activities, {
        weight: userSettings.profile.weight || athlete?.weight,
        age: userSettings.profile.age,
        gender: userSettings.profile.gender,
        primaryGoal: userSettings.goals.primaryGoal
      });

      setTrainingData(processed);

    } catch (err) {
      console.error('Error fetching activities:', err);
      setError(err.message || 'Failed to fetch activities. Check your Intervals.icu credentials in Settings.');
    } finally {
      setLoading(false);
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

  // Handle intervals.icu connection success
  const handleIntervalsConnectionSuccess = async (profile) => {
    setAthlete(profile);
    setIsConnected(true);
    await fetchActivities();
  };

  // Handle refresh with rate limiting
  const handleRefresh = async () => {
    await fetchActivities();
    if (aiRecommendationsEnabled) {
      await generateAIRecommendations(true); // Force = true to bypass rate limit check
    }
  };

  // Handle settings save without triggering AI
  const handleSettingsSave = useCallback((newSettings) => {
    setUserSettings(newSettings);
    // DON'T automatically trigger AI regeneration
    console.log('Settings saved. Click refresh to update AI recommendations.');
  }, []);

  // Toggle AI recommendations with rate limiting
  const toggleAIRecommendations = () => {
    const newState = !aiRecommendationsEnabled;
    setAiRecommendationsEnabled(newState);
    if (newState) {
      // Only generate if we haven't called recently
      const timeSinceLastCall = Date.now() - lastAICallRef.current;
      if (timeSinceLastCall > MIN_TIME_BETWEEN_CALLS) {
        generateAIRecommendations(true);
      } else {
        console.log('AI enabled but waiting for rate limit cooldown');
      }
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <h1 className="text-2xl font-bold text-gray-900">TrainFuel</h1>
                {athlete && (
                  <span className="text-sm text-gray-600">
                    Welcome, {athlete.firstname}!
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-4">
                {/* NEW: Intervals.icu indicator */}
                {isConnected && (
                  <span className="text-xs text-blue-600">
                    ✓ Intervals.icu
                  </span>
                )}
                {/* AI Toggle */}
                <button
                  onClick={toggleAIRecommendations}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${aiRecommendationsEnabled
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-700'
                    }`}
                >
                  <Brain className="w-4 h-4" />
                  <span className="text-sm">AI {aiRecommendationsEnabled ? 'ON' : 'OFF'}</span>
                </button>

                {/* Refresh Button */}
                {isConnected && (
                  <button
                    onClick={handleRefresh}
                    disabled={loading}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Navigation Tabs */}
        {isConnected && (
          <div className="bg-white border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <nav className="flex space-x-8">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'dashboard'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  <Home className="w-4 h-4 inline mr-2" />
                  Dashboard
                </button>
                <button
                  onClick={() => setActiveTab('workout')}
                  className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'workout'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  <Activity className="w-4 h-4 inline mr-2" />
                  Today's Workout
                </button>
                <button
                  onClick={() => setActiveTab('nutrition')}
                  className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'nutrition'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  <Utensils className="w-4 h-4 inline mr-2" />
                  Nutrition
                </button>
                <button
                  onClick={() => setActiveTab('trainingplan')}
                  className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'trainingplan'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  <ClipboardList className="w-4 h-4 inline mr-2" />
                  Training Plan
                </button>
                <button
                  onClick={() => setActiveTab('calendar')}
                  className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'calendar'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  <Calendar className="w-4 h-4 inline mr-2" />
                  Calendar
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'settings'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  <Settings className="w-4 h-4 inline mr-2" />
                  Settings
                </button>
              </nav>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-red-700">{error}</span>
            </div>
          )}

          {!isConnected ? (
            <IntervalsAuth onConnectionSuccess={handleIntervalsConnectionSuccess} />
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <>
                  {/* Dashboard shows profile first (inside DashboardView), then FitnessWidget */}
                  <DashboardView
                    athlete={athlete}
                    activities={activities}
                    trainingData={trainingData}
                    nutritionPlan={dailyNutrition}
                    upcomingEvents={upcomingEvents}
                    loading={loading}
                  />

                  {/* FitnessWidget appears AFTER DashboardView content */}
                  {fitnessMetrics && fitnessMetrics.ctl > 0 && (
                    <div className="mt-6">
                      <FitnessWidget fitness={fitnessMetrics} />
                    </div>
                  )}
                </>
              )}

              {activeTab === 'workout' && (
                <>
                  {/* Workout shows FitnessWidget FIRST */}
                  {fitnessMetrics && fitnessMetrics.ctl > 0 && (
                    <div className="mb-6">
                      <FitnessWidget fitness={fitnessMetrics} />
                    </div>
                  )}

                  <WorkoutGenerator
                    stravaData={trainingData}
                    upcomingEvents={upcomingEvents}
                    isInSeason={userSettings.goals.currentPhase === 'in_season'}
                  />
                </>
              )}

              {activeTab === 'nutrition' && (
                <EnhancedNutritionTracker
                  trainingData={trainingData}
                  foodLog={foodLogHistory}
                  userPreferences={userSettings.foodPreferences}
                  currentWeight={userSettings.profile.weight}
                  onFoodLogUpdate={handleFoodLogUpdate}
                />
              )}

              {activeTab === 'trainingplan' && (
                <TrainingPlanCalendar userSettings={userSettings} />
              )}

              {activeTab === 'calendar' && (
                <CalendarView
                  activities={activities}
                  upcomingEvents={upcomingEvents}
                  onAddEvent={() => setShowAddEventModal(true)}
                  onDeleteEvent={deleteEvent}
                />
              )}

              {activeTab === 'settings' && (
                <SettingsPage onSave={handleSettingsSave} />
              )}
            </>
          )}
        </main>

        {/* Modals */}
        {showAddEventModal && (
          <AddEventModal
            onClose={() => setShowAddEventModal(false)}
            onSave={(event) => {
              addEvent(event);
              setShowAddEventModal(false);
            }}
          />
        )}
      </div>
    </ErrorBoundary>
  );
};

export default App;