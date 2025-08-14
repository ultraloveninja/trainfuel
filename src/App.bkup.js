import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Calendar, Activity, Download, RefreshCw } from 'lucide-react';
import stravaService from './services/stravaService';
import nutritionService from './services/nutritionService';
import { processStravaActivities, calculateWeeklyTSS, analyzeTrainingPhase } from './utils/trainingUtils';
import { determineWorkoutType, getPrimaryFocus, getMainWorkout, calculateTargetRPE, getWorkoutRationale } from './utils/workoutUtils';
import ErrorBoundary from './components/ErrorBoundary';
import StravaAuth from './components/StravaAuth';
import DashboardView from './components/DashboardView';
import CalendarView from './components/CalendarView';
import SettingsView from './components/SettingsView';
import AddEventModal from './components/AddEventModal';

const saveEventsToStorage = (events) => {
  try {
    localStorage.setItem('upcoming_events', JSON.stringify(events));
  } catch (error) {
    console.error('Error saving events to localStorage:', error);
  }
};

const loadEventsFromStorage = () => {
  try {
    const savedEvents = localStorage.getItem('upcoming_events');
    if (savedEvents) return JSON.parse(savedEvents);
  } catch (error) {
    console.error('Error loading events from localStorage:', error);
  }
  return [];
};

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [lastSync, setLastSync] = useState(new Date());
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [athlete, setAthlete] = useState(null);
  const [activities, setActivities] = useState([]);
  const [trainingData, setTrainingData] = useState(null);
  const [seasonType, setSeasonType] = useState('in-season');
  const [upcomingEvents, setUpcomingEvents] = useState(() => loadEventsFromStorage());
  const [dailyNutrition, setDailyNutrition] = useState(null);
  const [dailyWorkout, setDailyWorkout] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [nutritionPlan, setNutritionPlan] = useState(null);
  const [generatingNutrition, setGeneratingNutrition] = useState(false);
  const [mealPlan, setMealPlan] = useState(null);
  const [trainingGoal, setTrainingGoal] = useState('Endurance Performance');
  const [dietaryRestrictions, setDietaryRestrictions] = useState('');
  const [showAddEventModal, setShowAddEventModal] = useState(false);

  useEffect(() => { saveEventsToStorage(upcomingEvents); }, [upcomingEvents]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (trainingData && athlete) {
      generateDailyNutrition();
      generateDailyWorkout();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seasonType, trainingData?.todaysActivity, upcomingEvents]);

  const handleStravaCallback = async (code) => {
    setLoading(true);
    setError(null);
    try {
      const result = await stravaService.exchangeToken(code);
      setIsAuthenticated(true);
      setAthlete(result.athlete);
      window.history.replaceState({}, document.title, window.location.pathname);
      await loadStravaData();
    } catch (err) {
      console.error('Error during Strava authentication:', err);
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

      const recentActivities = await stravaService.getActivities(1, 30);
      const processedActivities = processStravaActivities(recentActivities);
      setActivities(processedActivities);

      const weeklyTSS = calculateWeeklyTSS(processedActivities);
      const currentPhase = analyzeTrainingPhase(processedActivities);
      const todaysActivity = processedActivities.find(activity =>
        activity.date === new Date().toISOString().split('T')[0]
      ) || processedActivities[0];

      setTrainingData({
        currentPhase,
        weeklyTSS,
        todaysActivity: todaysActivity || {
          type: 'Rest Day',
          duration: 0,
          intensity: 'Rest',
          tss: 0
        },
        upcomingActivities: processedActivities.slice(1, 4)
      });

      setLastSync(new Date());
      await generateNutritionPlan();
    } catch (err) {
      console.error('Error loading Strava data:', err);
      setError('Failed to load training data. Please try refreshing.');
    } finally {
      setLoading(false);
    }
  };

  const generateNutritionPlan = async () => {
    if (!trainingData || !athlete) return;
    setGeneratingNutrition(true);
    try {
      const userData = { athlete, trainingData, activities, upcomingEvents, preferences: { weight: athlete.weight || 70, age: 35, height: 175, trainingGoal, dietaryRestrictions } };
      const plan = await nutritionService.generateNutritionPlan(userData);
      setNutritionPlan(plan);
    } catch (err) {
      console.error('Error generating nutrition plan:', err);
      setNutritionPlan({
        dailyCalories: 3200,
        macros: { carbs: { grams: 480, percentage: 60 }, protein: { grams: 160, percentage: 20 }, fat: { grams: 71, percentage: 20 } },
        hydration: { dailyTarget: 3500 },
        workoutNutrition: { preWorkout: 'Banana + Coffee (1hr before)', duringWorkout: 'Sports drink (60g carbs/hr)', postWorkout: 'Recovery shake within 30min' }
      });
    } finally {
      setGeneratingNutrition(false);
    }
  };

  const generateMealPlan = async () => {
    if (!nutritionPlan || !trainingData) return;
    setGeneratingNutrition(true);
    try {
      const userData = { athlete, trainingData, activities, preferences: { dietaryRestrictions, cookingSkill: 'Intermediate' } };
      const weeklyPlan = await nutritionService.generateWeeklyMealPlan(userData, nutritionPlan);
      setMealPlan(weeklyPlan);
    } catch (err) {
      console.error('Error generating meal plan:', err);
    } finally {
      setGeneratingNutrition(false);
    }
  };

  const generateDailyNutrition = async () => {
    setGeneratingNutrition(true);
    try {
      const currentTrainingData = trainingData || { currentPhase: 'Base', weeklyTSS: 0, todaysActivity: { type: 'Rest Day', duration: 0, intensity: 'Rest', tss: 0 } };
      const currentAthlete = athlete || { weight: 70, firstname: 'User' };

      const response = {
        preWorkout: {
          timing: "1-2 hours before",
          meal: seasonType === 'in-season' ? `Oatmeal with banana and honey, coffee with ${currentTrainingData.todaysActivity.intensity === 'High' ? 'extra carbs' : 'normal prep'}` : "Light toast with honey and coffee",
          rationale: `Given your ${currentTrainingData.todaysActivity.intensity.toLowerCase()} intensity ${currentTrainingData.todaysActivity.type.toLowerCase()} session, you need ${currentTrainingData.todaysActivity.intensity === 'High' ? 'easily digestible carbs for quick energy' : 'moderate fuel to avoid heaviness'}.`
        },
        duringWorkout: {
          timing: "Every 20-30 minutes during exercise",
          fuel: currentTrainingData.todaysActivity.duration > 60 ? "Sports drink targeting 60g carbs/hour" : currentTrainingData.todaysActivity.duration > 0 ? "Water with electrolytes - session duration doesn't require carbs" : "Rest day - focus on hydration throughout the day",
          rationale: currentTrainingData.todaysActivity.duration > 60 ? `For ${currentTrainingData.todaysActivity.duration}min at ${currentTrainingData.todaysActivity.intensity.toLowerCase()} intensity, you need carb replenishment to maintain power.` : currentTrainingData.todaysActivity.duration > 0 ? `For ${currentTrainingData.todaysActivity.duration}min session, focus on hydration and electrolyte balance.` : "Rest day allows focus on overall hydration and recovery nutrition."
        },
        postWorkout: {
          timing: "Within 30 minutes",
          meal: currentTrainingData.todaysActivity.tss > 70 ? "Protein shake with extra carbs + fruit" : currentTrainingData.todaysActivity.tss > 0 ? "Protein shake with moderate carbs + fruit" : "Focus on balanced meals throughout the day",
          rationale: currentTrainingData.todaysActivity.tss > 70 ? `With TSS ${currentTrainingData.todaysActivity.tss}, prioritize glycogen replenishment and protein synthesis.` : currentTrainingData.todaysActivity.tss > 0 ? `With TSS ${currentTrainingData.todaysActivity.tss}, focus on protein for recovery without excess calories.` : "Rest day nutrition focuses on steady nutrient intake and recovery preparation."
        },
        dinnerSuggestion: {
          meal: seasonType === 'in-season' ? `Lean protein (salmon/chicken), quinoa, roasted vegetables - sized for ${currentTrainingData.currentPhase} phase` : "Balanced meal with emphasis on anti-inflammatory foods",
          rationale: `Supporting ${currentTrainingData.currentPhase} training phase while maintaining consistency for ${upcomingEvents.length > 0 ? 'upcoming events' : 'general fitness'}.`
        },
        hydrationGoal: `${Math.round(35 * (currentAthlete.weight || 70))}ml base + ${Math.round(currentTrainingData.todaysActivity.duration * 8)}ml during training`,
        racePrep: upcomingEvents.length > 0 ? `With ${upcomingEvents[0]?.name} in ${upcomingEvents[0]?.weeksOut} weeks, ${upcomingEvents[0]?.weeksOut <= 3 ? 'lock in race nutrition - no experiments' : 'good time to test race-day nutrition strategies'}.` : "No upcoming events - focus on consistent daily nutrition habits"
      };

      setDailyNutrition(response);
    } catch (err) {
      console.error('Error generating daily nutrition:', err);
    } finally {
      setGeneratingNutrition(false);
    }
  };

  const generateDailyWorkout = async () => {
    setGeneratingNutrition(true);
    try {
      const currentActivities = activities.length > 0 ? activities : [];
      const currentTrainingData = trainingData || { currentPhase: 'Base', weeklyTSS: 0, todaysActivity: { type: 'Base Endurance', duration: 45, intensity: 'Moderate', tss: 35 } };

      const response = {
        workoutType: determineWorkoutType(currentActivities, seasonType),
        primaryFocus: getPrimaryFocus(upcomingEvents),
        warmup: {
          duration: "15 minutes",
          description: seasonType === 'in-season' ? "Dynamic warm-up with sport-specific movements, gradually increasing intensity" : "Easy 15min with 4x30sec pickups in final 5min"
        },
        mainSet: getMainWorkout(currentActivities, seasonType, upcomingEvents),
        cooldown: { duration: "10-15 minutes", description: "Easy spin/walk with 5min of stretching focus on hip flexors and calves" },
        alternatives: ["If feeling fatigued: Convert to easy recovery session", seasonType === 'in-season' ? "If race week: Reduce intensity by 20%" : "If time-crunched: Focus on main set only"],
        rpe: calculateTargetRPE(currentActivities, seasonType),
        rationale: getWorkoutRationale(currentActivities, upcomingEvents, currentTrainingData)
      };

      setDailyWorkout(response);
    } catch (err) {
      console.error('Error generating daily workout:', err);
    } finally {
      setGeneratingNutrition(false);
    }
  };

  const handleConnectStrava = () => { window.location.href = stravaService.getAuthUrl(); };
  const handleDisconnectStrava = () => {
    stravaService.logout();
    setIsAuthenticated(false);
    setAthlete(null);
    setActivities([]);
    setTrainingData(null);
    setNutritionPlan(null);
    setMealPlan(null);
    setTrainingGoal('Endurance Performance');
    setDietaryRestrictions('');
  };

  const handleRefresh = async () => { if (isAuthenticated) await loadStravaData(); };
  const handleRegenerateNutrition = async () => { await generateNutritionPlan(); };

  const handleTrainingGoalChange = async (newGoal) => {
    setTrainingGoal(newGoal);
    if (trainingData && athlete) {
      setGeneratingNutrition(true);
      setTimeout(async () => { await generateNutritionPlan(); setGeneratingNutrition(false); }, 500);
    }
  };

  const handleDietaryRestrictionsChange = async (restrictions) => {
    setDietaryRestrictions(restrictions);
    if (trainingData && athlete && nutritionPlan) await generateNutritionPlan();
  };

  const clearAllEvents = () => { setUpcomingEvents([]); localStorage.removeItem('upcoming_events'); };

  const addEvent = (event) => {
    setUpcomingEvents(prev => [...prev, event].sort((a,b)=>a.weeksOut-b.weeksOut));
    if (trainingData && athlete) { generateDailyNutrition(); generateDailyWorkout(); }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-500 w-10 h-10 rounded-lg flex items-center justify-center">
                    <Activity className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">TrainFuel</h1>
                    <p className="text-sm text-gray-600">AI-Powered Sports Nutrition</p>
                  </div>
                </div>
                {isAuthenticated && athlete && (
                  <div className="hidden sm:block text-sm">
                    <p className="text-gray-600">Welcome back, <span className="font-medium text-gray-900">{athlete.firstname}</span></p>
                    <p className="text-xs text-gray-500">Last sync: {lastSync.toLocaleTimeString()}</p>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-3">
                {isAuthenticated && (
                  <button onClick={handleRefresh} disabled={loading} className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100">
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    <span className="text-sm">{loading ? 'Syncing...' : 'Sync Data'}</span>
                  </button>
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
              {[ { id: 'dashboard', label: 'Dashboard', icon: Activity }, { id: 'calendar', label: 'Activities', icon: Calendar }, { id: 'settings', label: 'Settings', icon: Activity } ].map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={()=>setActiveTab(id)} className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${activeTab===id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                  <Icon className="h-4 w-4" /><span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {!isAuthenticated && <StravaAuth onConnect={handleConnectStrava} loading={loading} error={error} />}
          {activeTab === 'dashboard' && (
            <DashboardView
              isAuthenticated={isAuthenticated} loading={loading} trainingData={trainingData}
              nutritionPlan={nutritionPlan} dailyNutrition={dailyNutrition} dailyWorkout={dailyWorkout}
              generatingNutrition={generatingNutrition} handleGenerateNutrition={generateDailyNutrition}
              handleGenerateWorkout={generateDailyWorkout} upcomingEvents={upcomingEvents} setShowAddEventModal={setShowAddEventModal}
            />
          )}
          {activeTab === 'calendar' && <CalendarView isAuthenticated={isAuthenticated} activities={activities} />}
          {activeTab === 'settings' && (
            <SettingsView isAuthenticated={isAuthenticated} athlete={athlete} trainingGoal={trainingGoal} onTrainingGoalChange={handleTrainingGoalChange}
              dietaryRestrictions={dietaryRestrictions} onDietaryRestrictionsChange={handleDietaryRestrictionsChange} seasonType={seasonType} onSeasonTypeChange={setSeasonType}
              lastSync={lastSync} upcomingEvents={upcomingEvents} onClearAllEvents={clearAllEvents} onRefresh={handleRefresh}
            />
          )}

          <AddEventModal show={showAddEventModal} onClose={()=>setShowAddEventModal(false)} onAddEvent={addEvent} minDate={new Date().toISOString().split('T')[0]} />
        </main>
      </div>
    </ErrorBoundary>
  );
};

App.propTypes = {};

export default App;
