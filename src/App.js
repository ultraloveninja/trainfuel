// src/App.js - Complete Firebase Integration
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Activity, Calendar, Download, RefreshCw, Settings, AlertCircle, Zap, Brain, Home, Utensils } from 'lucide-react';

// Import Firebase services (you'll create these)
import { auth, db, functions } from './config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

// Import existing services
import stravaService from './services/stravaService';
import nutritionService from './services/nutritionService';

// Import components
import WorkoutGenerator from './components/WorkoutGenerator';
import EnhancedNutritionTracker from './components/EnhancedNutritionTracker';
import SettingsPage from './components/SettingsPage';
import StravaAuth from './components/StravaAuth';
import DashboardView from './components/DashboardView';
import CalendarView from './components/CalendarView';
import AddEventModal from './components/AddEventModal';
import ErrorBoundary from './components/ErrorBoundary';

// Import utilities
import { processStravaActivities, calculateWeeklyTSS, analyzeTrainingPhase } from './utils/trainingUtils';
import { loadEventsFromStorage, saveEventsToStorage } from './utils/storageUtils';

const App = () => {
  // Firebase user state
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [firebaseLoading, setFirebaseLoading] = useState(true);
  
  // Core state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [athlete, setAthlete] = useState(null);
  const [activities, setActivities] = useState([]);
  const [trainingData, setTrainingData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Rate limiting refs
  const lastAICallRef = useRef(0);
  const aiCallDebounceRef = useRef(null);
  const MIN_TIME_BETWEEN_CALLS = 60000;

  // Settings state
  const [userSettings, setUserSettings] = useState(() => {
    const saved = localStorage.getItem('trainfuelSettings');
    return saved ? JSON.parse(saved) : {
      profile: {
        age: '',
        weight: '',
        height: '',
        fitnessLevel: 'intermediate',
        dietaryRestrictions: []
      },
      goals: {
        primaryGoal: 'endurance',
        targetWeight: '',
        weeklyTrainingHours: 10
      },
      preferences: {
        mealPrepDay: 'sunday',
        cookingSkill: 'intermediate',
        budget: 'moderate'
      }
    };
  });

  // UI state
  const [activeView, setActiveView] = useState('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState(() => loadEventsFromStorage());
  const [foodLog, setFoodLog] = useState(() => {
    const saved = localStorage.getItem('trainfuel_food_log');
    return saved ? JSON.parse(saved) : {};
  });
  const [syncStatus, setSyncStatus] = useState({ syncing: false, lastSync: null });
  const [nutritionPlans, setNutritionPlans] = useState([]);
  const [aiRecommendationsEnabled, setAiRecommendationsEnabled] = useState(true);

  // Firebase Auth Observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseLoading(false);
      
      if (user) {
        setFirebaseUser(user);
        
        // Load user data from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // Set athlete data from Firestore
            if (userData.stravaProfile) {
              setAthlete(userData.stravaProfile);
              setIsAuthenticated(true);
            }
            
            // Load user settings from Firestore
            if (userData.settings) {
              setUserSettings(userData.settings);
            }
            
            // Load cached activities from Firestore
            if (userData.cachedActivities) {
              setActivities(userData.cachedActivities);
              processActivitiesData(userData.cachedActivities);
            }
          }
        } catch (err) {
          console.error('Error loading user data from Firestore:', err);
        }
      } else {
        setFirebaseUser(null);
        // Check for local Strava auth
        checkLocalStravaAuth();
      }
    });

    return () => unsubscribe();
  }, []);

  // Check local Strava authentication (fallback for non-Firebase users)
  const checkLocalStravaAuth = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
      // Handle OAuth callback
      setLoading(true);
      try {
        const result = await stravaService.exchangeToken(code);
        
        // Create or update Firebase user if needed
        if (firebaseUser) {
          await updateFirebaseUserWithStrava(firebaseUser.uid, result);
        } else {
          // For now, just use local storage
          setAthlete(result.athlete);
          setIsAuthenticated(true);
        }
        
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (err) {
        setError('Failed to authenticate with Strava');
        console.error('Auth error:', err);
      } finally {
        setLoading(false);
      }
    } else {
      // Check if already authenticated locally
      const authenticated = stravaService.isAuthenticated();
      if (authenticated) {
        const savedAthlete = localStorage.getItem('strava_athlete');
        if (savedAthlete) {
          const athleteData = JSON.parse(savedAthlete);
          setAthlete(athleteData);
          setIsAuthenticated(true);
        }
      }
    }
  };

  // Update Firebase user with Strava data
  const updateFirebaseUserWithStrava = async (userId, stravaData) => {
    try {
      await setDoc(doc(db, 'users', userId), {
        stravaProfile: stravaData.athlete,
        stravaTokens: {
          access_token: stravaData.access_token,
          refresh_token: stravaData.refresh_token,
          expires_at: stravaData.expires_at
        },
        lastLogin: new Date().toISOString()
      }, { merge: true });
      
      setAthlete(stravaData.athlete);
      setIsAuthenticated(true);
    } catch (err) {
      console.error('Error updating Firebase user:', err);
    }
  };

  // Fetch activities when authenticated
  useEffect(() => {
    if (isAuthenticated && athlete) {
      fetchActivities();
    }
  }, [isAuthenticated, athlete]);

  // Generate AI recommendations when data is available
  useEffect(() => {
    if (trainingData && athlete && aiRecommendationsEnabled) {
      const timeSinceLastCall = Date.now() - lastAICallRef.current;
      if (timeSinceLastCall >= MIN_TIME_BETWEEN_CALLS) {
        if (aiCallDebounceRef.current) {
          clearTimeout(aiCallDebounceRef.current);
        }
        
        aiCallDebounceRef.current = setTimeout(() => {
          generateAIRecommendations();
        }, 2000);
      }
    }
  }, [trainingData, athlete, aiRecommendationsEnabled]);

  // Save settings to Firebase when they change
  useEffect(() => {
    const saveSettingsToFirebase = async () => {
      if (firebaseUser && userSettings) {
        try {
          await updateDoc(doc(db, 'users', firebaseUser.uid), {
            settings: userSettings,
            updatedAt: new Date().toISOString()
          });
        } catch (err) {
          console.error('Error saving settings to Firebase:', err);
        }
      }
    };

    // Save locally always
    localStorage.setItem('trainfuelSettings', JSON.stringify(userSettings));
    
    // Save to Firebase if user is logged in
    if (firebaseUser) {
      saveSettingsToFirebase();
    }
  }, [userSettings, firebaseUser]);

  // Process activities data
  const processActivitiesData = (activitiesData) => {
    const processed = processStravaActivities(activitiesData);
    const weeklyTSS = calculateWeeklyTSS(processed);
    const phase = analyzeTrainingPhase(processed, upcomingEvents);
    
    setTrainingData({
      processedActivities: processed,
      weeklyTSS,
      trainingPhase: phase,
      recentActivities: activitiesData.slice(0, 10)
    });
  };

  // Fetch activities from Strava
  const fetchActivities = async () => {
    if (!isAuthenticated) return;

    setSyncStatus({ syncing: true, lastSync: syncStatus.lastSync });
    
    try {
      const activitiesData = await stravaService.getActivities();
      setActivities(activitiesData);
      processActivitiesData(activitiesData);
      
      const now = new Date().toISOString();
      setSyncStatus({ syncing: false, lastSync: now });
      
      // Cache activities in Firebase if user is logged in
      if (firebaseUser) {
        await updateDoc(doc(db, 'users', firebaseUser.uid), {
          cachedActivities: activitiesData,
          lastActivitySync: now
        });
      }
    } catch (err) {
      console.error('Error fetching activities:', err);
      setError('Failed to fetch activities from Strava');
      setSyncStatus({ syncing: false, lastSync: syncStatus.lastSync });
      
      // Try to refresh token using Firebase function if available
      if (firebaseUser) {
        await refreshStravaTokenViaFirebase();
      }
    }
  };

  // Refresh Strava token using Firebase Function
  const refreshStravaTokenViaFirebase = async () => {
    try {
      const refreshToken = localStorage.getItem('strava_refresh_token');
      if (!refreshToken) return false;

      const refreshStravaToken = httpsCallable(functions, 'refreshStravaToken');
      const result = await refreshStravaToken({ refreshToken });
      
      if (result.data.success) {
        localStorage.setItem('strava_access_token', result.data.tokens.access_token);
        localStorage.setItem('strava_refresh_token', result.data.tokens.refresh_token);
        localStorage.setItem('strava_token_expiry', (result.data.tokens.expires_at * 1000).toString());
        return true;
      }
    } catch (err) {
      console.error('Error refreshing token via Firebase:', err);
    }
    return false;
  };

  // Generate AI recommendations using Firebase Function
  const generateAIRecommendations = async () => {
    if (!firebaseUser) {
      // Fallback to local proxy for non-Firebase users
      await generateLocalAIRecommendations();
      return;
    }

    try {
      lastAICallRef.current = Date.now();
      
      const callClaude = httpsCallable(functions, 'callClaudeAPI');
      const result = await callClaude({
        prompt: buildNutritionPrompt(),
        type: 'nutrition'
      });
      
      if (result.data.success) {
        const nutritionPlan = parseAIResponse(result.data.response);
        setNutritionPlans([nutritionPlan, ...nutritionPlans.slice(0, 4)]);
        
        // Save to Firebase
        await setDoc(doc(db, 'nutritionPlans', `${firebaseUser.uid}_${Date.now()}`), {
          userId: firebaseUser.uid,
          plan: nutritionPlan,
          createdAt: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('Error generating AI recommendations:', err);
    }
  };

  // Fallback to local AI generation (for testing without Firebase)
  const generateLocalAIRecommendations = async () => {
    try {
      lastAICallRef.current = Date.now();
      
      const proxyUrl = process.env.REACT_APP_PROXY_URL || 'http://localhost:3001/api/claude';
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: buildNutritionPrompt() })
      });
      
      if (response.ok) {
        const data = await response.json();
        const nutritionPlan = parseAIResponse(data.response);
        setNutritionPlans([nutritionPlan, ...nutritionPlans.slice(0, 4)]);
      }
    } catch (err) {
      console.error('Error with local AI generation:', err);
    }
  };

  // Build nutrition prompt for AI
  const buildNutritionPrompt = () => {
    return `Create a personalized nutrition plan for an athlete with the following profile:
      - Fitness Level: ${userSettings.profile.fitnessLevel}
      - Primary Goal: ${userSettings.goals.primaryGoal}
      - Weekly Training Hours: ${userSettings.goals.weeklyTrainingHours}
      - Recent Training Load: ${trainingData?.weeklyTSS || 'moderate'}
      - Upcoming Events: ${upcomingEvents.length > 0 ? upcomingEvents[0].name : 'None scheduled'}
      
      Provide specific meal suggestions and timing recommendations following Nick Chase's nutrition methodology.
      Return as JSON with structure: { dailyCalories, macros, meals, hydration, supplements }`;
  };

  // Parse AI response
  const parseAIResponse = (response) => {
    try {
      return JSON.parse(response);
    } catch {
      return {
        dailyCalories: 2500,
        macros: { carbs: 50, protein: 25, fat: 25 },
        meals: [],
        hydration: "3-4 liters per day",
        supplements: []
      };
    }
  };

  // Handle Strava connection
  const handleStravaConnect = () => {
    const authUrl = stravaService.getAuthUrl();
    window.location.href = authUrl;
  };

  // Handle logout
  const handleLogout = async () => {
    stravaService.clearTokens();
    
    // Sign out from Firebase if logged in
    if (firebaseUser) {
      try {
        await auth.signOut();
      } catch (err) {
        console.error('Error signing out from Firebase:', err);
      }
    }
    
    setIsAuthenticated(false);
    setAthlete(null);
    setActivities([]);
    setTrainingData(null);
    localStorage.clear();
  };

  // Update settings
  const updateSettings = (newSettings) => {
    setUserSettings(newSettings);
  };

  // Add event
  const handleAddEvent = (event) => {
    const newEvents = [...upcomingEvents, { ...event, id: Date.now() }];
    setUpcomingEvents(newEvents);
    saveEventsToStorage(newEvents);
    
    // Save to Firebase if user is logged in
    if (firebaseUser) {
      updateDoc(doc(db, 'users', firebaseUser.uid), {
        events: newEvents
      });
    }
  };

  // Delete event
  const handleDeleteEvent = (eventId) => {
    const newEvents = upcomingEvents.filter(e => e.id !== eventId);
    setUpcomingEvents(newEvents);
    saveEventsToStorage(newEvents);
    
    // Update Firebase if user is logged in
    if (firebaseUser) {
      updateDoc(doc(db, 'users', firebaseUser.uid), {
        events: newEvents
      });
    }
  };

  // Update food log
  const updateFoodLog = (newLog) => {
    setFoodLog(newLog);
    localStorage.setItem('trainfuel_food_log', JSON.stringify(newLog));
    
    // Save to Firebase if user is logged in
    if (firebaseUser) {
      updateDoc(doc(db, 'users', firebaseUser.uid), {
        foodLog: newLog,
        lastFoodLogUpdate: new Date().toISOString()
      });
    }
  };

  // Export data
  const exportData = () => {
    const dataToExport = {
      athlete,
      activities: activities.slice(0, 50),
      trainingData,
      upcomingEvents,
      userSettings,
      foodLog,
      nutritionPlans,
      exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trainfuel-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  // Show loading state while Firebase is initializing
  if (firebaseLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading TrainFuel...</p>
        </div>
      </div>
    );
  }

  // Render main app
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-3">
                <Activity className="h-8 w-8 text-orange-500" />
                <h1 className="text-2xl font-bold text-gray-900">TrainFuel</h1>
                {firebaseUser && (
                  <span className="text-sm text-gray-500 ml-4">
                    Firebase Connected
                  </span>
                )}
              </div>

              {isAuthenticated && (
                <div className="flex items-center space-x-4">
                  {/* Sync Status */}
                  <div className="flex items-center space-x-2">
                    {syncStatus.syncing ? (
                      <RefreshCw className="h-4 w-4 animate-spin text-orange-500" />
                    ) : (
                      <button
                        onClick={fetchActivities}
                        className="text-gray-600 hover:text-orange-500 transition-colors"
                        title="Sync Activities"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                    )}
                    {syncStatus.lastSync && (
                      <span className="text-xs text-gray-500">
                        Last sync: {new Date(syncStatus.lastSync).toLocaleTimeString()}
                      </span>
                    )}
                  </div>

                  {/* Export Button */}
                  <button
                    onClick={exportData}
                    className="text-gray-600 hover:text-orange-500 transition-colors"
                    title="Export Data"
                  >
                    <Download className="h-4 w-4" />
                  </button>

                  {/* User Info */}
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-700">
                      {athlete?.firstname} {athlete?.lastname}
                    </span>
                    <button
                      onClick={handleLogout}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Navigation */}
        {isAuthenticated && (
          <nav className="bg-white border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex space-x-8">
                <button
                  onClick={() => setActiveView('dashboard')}
                  className={`py-2 px-3 border-b-2 ${
                    activeView === 'dashboard'
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  } transition-colors flex items-center space-x-2`}
                >
                  <Home className="h-4 w-4" />
                  <span>Dashboard</span>
                </button>
                <button
                  onClick={() => setActiveView('workouts')}
                  className={`py-2 px-3 border-b-2 ${
                    activeView === 'workouts'
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  } transition-colors flex items-center space-x-2`}
                >
                  <Zap className="h-4 w-4" />
                  <span>Workouts</span>
                </button>
                <button
                  onClick={() => setActiveView('nutrition')}
                  className={`py-2 px-3 border-b-2 ${
                    activeView === 'nutrition'
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  } transition-colors flex items-center space-x-2`}
                >
                  <Utensils className="h-4 w-4" />
                  <span>Nutrition</span>
                </button>
                <button
                  onClick={() => setActiveView('calendar')}
                  className={`py-2 px-3 border-b-2 ${
                    activeView === 'calendar'
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  } transition-colors flex items-center space-x-2`}
                >
                  <Calendar className="h-4 w-4" />
                  <span>Calendar</span>
                </button>
                <button
                  onClick={() => setActiveView('settings')}
                  className={`py-2 px-3 border-b-2 ${
                    activeView === 'settings'
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  } transition-colors flex items-center space-x-2`}
                >
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </button>
              </div>
            </div>
          </nav>
        )}

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span>{error}</span>
            </div>
          )}

          {!isAuthenticated ? (
            <StravaAuth onConnect={handleStravaConnect} loading={loading} error={error} />
          ) : (
            <>
              {activeView === 'dashboard' && (
                <DashboardView
                  athlete={athlete}
                  activities={activities}
                  trainingData={trainingData}
                  upcomingEvents={upcomingEvents}
                  nutritionPlans={nutritionPlans}
                />
              )}

              {activeView === 'workouts' && (
                <WorkoutGenerator
                  stravaData={{
                    activities,
                    weeklyStats: trainingData?.weeklyTSS,
                    trainingPhase: trainingData?.trainingPhase
                  }}
                  userSettings={userSettings}
                  upcomingEvents={upcomingEvents}
                  aiEnabled={aiRecommendationsEnabled && !!firebaseUser}
                />
              )}

              {activeView === 'nutrition' && (
                <EnhancedNutritionTracker
                  trainingData={trainingData}
                  foodLog={foodLog}
                  userPreferences={userSettings}
                  currentWeight={userSettings.profile.weight}
                  onFoodLogUpdate={updateFoodLog}
                />
              )}

              {activeView === 'calendar' && (
                <CalendarView
                  activities={activities}
                  upcomingEvents={upcomingEvents}
                  onAddEvent={handleAddEvent}
                  onDeleteEvent={handleDeleteEvent}
                />
              )}

              {activeView === 'settings' && (
                <SettingsPage
                  settings={userSettings}
                  onUpdateSettings={updateSettings}
                  aiEnabled={aiRecommendationsEnabled}
                  onToggleAI={() => setAiRecommendationsEnabled(!aiRecommendationsEnabled)}
                />
              )}
            </>
          )}
        </main>

        {/* Add Event Modal */}
        {isModalOpen && (
          <AddEventModal
            onClose={() => setIsModalOpen(false)}
            onSave={handleAddEvent}
          />
        )}
      </div>
    </ErrorBoundary>
  );
};

export default App;