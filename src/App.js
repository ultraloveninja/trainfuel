// src/App.js - Complete Integration with New Components
import React, { useState, useEffect, useCallback } from 'react';
import { Activity, Calendar, Download, RefreshCw, Settings, AlertCircle, Zap, Brain, Home, Utensils } from 'lucide-react';

// Import services
import stravaService from './services/stravaService';
import nutritionService from './services/nutritionService';

// Import NEW components
import WorkoutGenerator from './components/WorkoutGenerator';
import MealSuggestions from './components/MealSuggestions';
import SettingsPage from './components/SettingsPage';

// Import existing components
import StravaAuth from './components/StravaAuth';
import DashboardView from './components/DashboardView';
import CalendarView from './components/CalendarView';
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

  // Food logging
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
      
      if (!fetchedActivities || !Array.isArray(fetchedActivities)) {
        console.log('No activities returned from Strava');
        setActivities([]);
        setTrainingData(null);
        return;
      }

      setActivities(fetchedActivities);
      
      // Process activities for training data
      const processed = processStravaActivities(fetchedActivities);
      const weeklyStats = calculateWeeklyTSS(processed);
      const phase = analyzeTrainingPhase(processed);
      
      setTrainingData({
        activities: processed,
        weeklyStats,
        phase,
        lastUpdated: new Date().toISOString()
      });

    } catch (err) {
      setError('Failed to fetch activities');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Generate AI recommendations
  const generateAIRecommendations = async () => {
    console.log('Generating AI recommendations...');
    setGeneratingNutrition(true);
    setGeneratingWorkout(true);
    
    try {
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
        recentFoodLog: dailyFoodLog.slice(-7) // Last 7 days
      };

      // Generate nutrition plan
      const nutrition = await nutritionService.generateDailyNutrition(userData) || {
        meals: {
          breakfast: { calories: 400, protein: 30, carbs: 45, fat: 10 },
          lunch: { calories: 500, protein: 40, carbs: 50, fat: 15 },
          dinner: { calories: 600, protein: 45, carbs: 60, fat: 20 },
          snacks: { calories: 300, protein: 15, carbs: 40, fat: 10 }
        },
        hydration: { target: Math.round(userSettings.profile.weight / 2) },
        totalCalories: 1800,
        macros: { protein: 130, carbs: 195, fat: 55 }
      };
      setDailyNutrition(nutrition);

      // The workout will be generated by the WorkoutGenerator component
      setLastAiUpdate(new Date().toISOString());

    } catch (err) {
      console.error('Error generating AI recommendations:', err);
      setError('Failed to generate recommendations');
    } finally {
      setGeneratingNutrition(false);
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

  // Handle settings save
  const handleSettingsSave = (newSettings) => {
    setUserSettings(newSettings);
    // Trigger re-generation if AI is enabled
    if (aiRecommendationsEnabled) {
      generateAIRecommendations();
    }
  };

  // Toggle AI recommendations
  const toggleAIRecommendations = () => {
    setAiRecommendationsEnabled(!aiRecommendationsEnabled);
    if (!aiRecommendationsEnabled) {
      generateAIRecommendations();
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
                {/* AI Toggle */}
                <button
                  onClick={toggleAIRecommendations}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                    aiRecommendationsEnabled 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  <Brain className="w-4 h-4" />
                  <span className="text-sm">AI {aiRecommendationsEnabled ? 'ON' : 'OFF'}</span>
                </button>

                {/* Refresh Button */}
                {isAuthenticated && (
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
        {isAuthenticated && (
          <div className="bg-white border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <nav className="flex space-x-8">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'dashboard'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Home className="w-4 h-4 inline mr-2" />
                  Dashboard
                </button>
                <button
                  onClick={() => setActiveTab('workout')}
                  className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'workout'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Activity className="w-4 h-4 inline mr-2" />
                  Today's Workout
                </button>
                <button
                  onClick={() => setActiveTab('nutrition')}
                  className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'nutrition'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Utensils className="w-4 h-4 inline mr-2" />
                  Nutrition
                </button>
                <button
                  onClick={() => setActiveTab('calendar')}
                  className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'calendar'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Calendar className="w-4 h-4 inline mr-2" />
                  Calendar
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'settings'
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

          {!isAuthenticated ? (
            <StravaAuth onConnect={handleStravaConnect} />
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <DashboardView
                  athlete={athlete}
                  activities={activities}
                  trainingData={trainingData}
                  nutritionPlan={dailyNutrition}
                  upcomingEvents={upcomingEvents}
                  loading={loading}
                />
              )}

              {activeTab === 'workout' && (
                <WorkoutGenerator
                  stravaData={trainingData}
                  upcomingEvents={upcomingEvents}
                  isInSeason={userSettings.goals.currentPhase === 'in_season'}
                />
              )}

              {activeTab === 'nutrition' && (
                <MealSuggestions
                  trainingData={trainingData}
                  foodLog={dailyFoodLog}
                  userPreferences={userSettings.foodPreferences}
                  currentWeight={userSettings.profile.weight}
                />
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