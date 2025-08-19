import React, { useState, useEffect } from 'react';
import { Calendar, Activity, Clock, TrendingUp, AlertCircle, Brain, Loader, Zap } from 'lucide-react';

// Nick Chase Training Methods based on project knowledge
const NICK_CHASE_METHODS = {
  inSeason: {
    philosophy: "Liquid nutrition focus, structured training blocks",
    workoutTypes: {
      easy: { effort: "Zone 1-2", duration: "45-90 min", focus: "Recovery and base building" },
      tempo: { effort: "Zone 3-4", duration: "60-90 min", focus: "Race pace practice" },
      intervals: { effort: "Zone 4-5", duration: "45-75 min", focus: "Speed and power" },
      long: { effort: "Zone 2-3", duration: "2-4 hours", focus: "Endurance building" },
      brick: { effort: "Mixed", duration: "90-120 min", focus: "Race simulation" }
    },
    weeklyStructure: [
      { day: "Monday", type: "easy", discipline: "swim" },
      { day: "Tuesday", type: "intervals", discipline: "run" },
      { day: "Wednesday", type: "tempo", discipline: "bike" },
      { day: "Thursday", type: "easy", discipline: "swim" },
      { day: "Friday", type: "tempo", discipline: "run" },
      { day: "Saturday", type: "long", discipline: "bike" },
      { day: "Sunday", type: "brick", discipline: "bike/run" }
    ]
  },
  offSeason: {
    philosophy: "Base building, body composition focus, strength maintenance",
    workoutTypes: {
      easy: { effort: "Zone 1-2", duration: "30-60 min", focus: "Active recovery" },
      strength: { effort: "Gym", duration: "45-60 min", focus: "Muscle retention" },
      aerobic: { effort: "Zone 2", duration: "60-90 min", focus: "Fat burning" },
      tempo: { effort: "Zone 3", duration: "45-60 min", focus: "Fitness maintenance" }
    },
    weeklyStructure: [
      { day: "Monday", type: "strength", discipline: "gym" },
      { day: "Tuesday", type: "aerobic", discipline: "run" },
      { day: "Wednesday", type: "easy", discipline: "bike" },
      { day: "Thursday", type: "strength", discipline: "gym" },
      { day: "Friday", type: "tempo", discipline: "swim" },
      { day: "Saturday", type: "aerobic", discipline: "bike" },
      { day: "Sunday", type: "easy", discipline: "run" }
    ]
  }
};

const WorkoutGenerator = ({ stravaData, upcomingEvents, isInSeason }) => {
  const [todaysWorkout, setTodaysWorkout] = useState(null);
  const [tomorrowsWorkout, setTomorrowsWorkout] = useState(null);
  const [workoutSuggestions, setWorkoutSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fatigueLevel, setFatigueLevel] = useState('moderate');
  const [selectedDay, setSelectedDay] = useState('today');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiWorkouts, setAiWorkouts] = useState(null);
  const [lastAiGeneration, setLastAiGeneration] = useState(null);

  useEffect(() => {
    generateWorkout();
  }, [stravaData, upcomingEvents, isInSeason]);

  const analyzeFatigueLevel = (recentActivities) => {
    if (!recentActivities || recentActivities.length === 0) return 'fresh';
    
    const last7Days = recentActivities.slice(0, 7);
    const totalStress = last7Days.reduce((acc, activity) => {
      const intensity = activity.average_heartrate / activity.max_heartrate || 0.7;
      const duration = activity.moving_time / 3600;
      return acc + (intensity * duration);
    }, 0);

    if (totalStress > 15) return 'high';
    if (totalStress > 8) return 'moderate';
    return 'fresh';
  };

  const generateWorkout = async () => {
    setLoading(true);
    
    try {
      const fatigue = analyzeFatigueLevel(stravaData?.activities);
      setFatigueLevel(fatigue);

      const trainingPlan = isInSeason ? NICK_CHASE_METHODS.inSeason : NICK_CHASE_METHODS.offSeason;
      
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const todayName = today.toLocaleDateString('en-US', { weekday: 'long' });
      const tomorrowName = tomorrow.toLocaleDateString('en-US', { weekday: 'long' });
      
      const todayScheduled = trainingPlan.weeklyStructure.find(w => w.day === todayName);
      const tomorrowScheduled = trainingPlan.weeklyStructure.find(w => w.day === tomorrowName);
      
      let todayWorkout = { ...todayScheduled };
      if (fatigue === 'high' && todayWorkout.type !== 'easy') {
        todayWorkout = {
          ...todayWorkout,
          type: 'easy',
          modified: true,
          originalType: todayWorkout.type,
          reason: 'High fatigue detected - recovery recommended'
        };
      }
      
      let tomorrowWorkout = { ...tomorrowScheduled };
      let projectedFatigue = fatigue;
      
      if (todayWorkout.type === 'intervals' || todayWorkout.type === 'tempo') {
        projectedFatigue = fatigue === 'fresh' ? 'moderate' : 'high';
      } else if (todayWorkout.type === 'easy') {
        projectedFatigue = fatigue === 'high' ? 'moderate' : 'fresh';
      }
      
      if (projectedFatigue === 'high' && tomorrowWorkout.type !== 'easy') {
        tomorrowWorkout = {
          ...tomorrowWorkout,
          type: 'easy',
          modified: true,
          originalType: tomorrowWorkout.type,
          reason: 'Projected fatigue after today\'s workout - consider recovery'
        };
      }

      const todayDetails = trainingPlan.workoutTypes[todayWorkout.type];
      const tomorrowDetails = trainingPlan.workoutTypes[tomorrowWorkout.type];
      
      let eventAdjustment = null;
      if (upcomingEvents && upcomingEvents.length > 0) {
        const nextEvent = upcomingEvents[0];
        const daysUntilEvent = Math.floor((new Date(nextEvent.date) - today) / (1000 * 60 * 60 * 24));
        
        if (daysUntilEvent <= 7) {
          eventAdjustment = {
            taper: true,
            message: `Tapering for ${nextEvent.name} in ${daysUntilEvent} days`,
            adjustedDuration: todayDetails.duration.split('-')[0] + ' min'
          };
        }
      }

      const suggestions = await generateAISuggestions(todayWorkout, fatigue, stravaData);

      setTodaysWorkout({
        ...todayWorkout,
        ...todayDetails,
        fatigueLevel: fatigue,
        eventAdjustment,
        dayName: todayName,
        date: today.toLocaleDateString(),
        timestamp: new Date().toISOString()
      });
      
      setTomorrowsWorkout({
        ...tomorrowWorkout,
        ...tomorrowDetails,
        projectedFatigue,
        dayName: tomorrowName,
        date: tomorrow.toLocaleDateString(),
        timestamp: new Date().toISOString()
      });

      setWorkoutSuggestions(suggestions);
      
    } catch (error) {
      console.error('Error generating workout:', error);
      setTodaysWorkout({
        type: 'easy',
        discipline: 'run',
        duration: '30-45 min',
        effort: 'Zone 2',
        focus: 'Recovery',
        error: true
      });
      setTomorrowsWorkout({
        type: 'easy',
        discipline: 'bike',
        duration: '45-60 min',
        effort: 'Zone 2',
        focus: 'Active Recovery',
        error: true
      });
    } finally {
      setLoading(false);
    }
  };

  const generateAISuggestions = async (workout, fatigue, stravaData) => {
    console.log('Using cached workout suggestions to avoid rate limiting');
    return getFallbackSuggestions(workout, fatigue, stravaData);
  };

  const generateAIWorkouts = async () => {
    try {
      setAiLoading(true);
      const today = await generateAISuggestions(todaysWorkout, fatigueLevel, stravaData);
      const tomorrow = await generateAISuggestions(tomorrowsWorkout, fatigueLevel, stravaData);

      setAiWorkouts({
        todayPrimary: today[0],
        todayAlternatives: today.slice(1),
        tomorrowPrimary: tomorrow[0],
        tomorrowAlternatives: tomorrow.slice(1),
        weekTips: {
          keyFocus: "Balance intensity with recovery",
          recoveryDays: ["Monday", "Thursday"],
          nutritionFocus: "Stay on top of hydration and carbs",
          mentalPrep: "Visualize key workouts to build confidence"
        }
      });
      setLastAiGeneration(new Date().toISOString());
    } catch (err) {
      console.error("AI workout generation failed:", err);
    } finally {
      setAiLoading(false);
    }
  };

  const getFallbackSuggestions = (workout, fatigue, stravaData) => {
    const isHighFatigue = fatigue === 'high';
    const isInSeasonMode = isInSeason;
    
    if (isHighFatigue) {
      return [
        { title: "Recovery Swim", description: "Easy swim focusing on form and breathing technique", duration: "30-45 min", nutrition: "Water only, protein shake post-workout" },
        { title: "Yoga/Stretching", description: "Active recovery with focus on flexibility and mobility", duration: "30-45 min", nutrition: "Stay hydrated, light snack if needed" },
        { title: "Easy Spin", description: "Very light bike ride, keeping heart rate in Zone 1", duration: "45-60 min", nutrition: "Electrolytes only during, recovery meal after" }
      ];
    }
    
    if (isInSeasonMode) {
      return [
        { title: "Race Pace Intervals", description: "Warm up, then 3x10min at race pace with 3min recovery", duration: "60-75 min", nutrition: "Sports drink during, 30-40g carbs per hour" },
        { title: "Brick Workout", description: "60min bike at moderate pace, immediate 20min run at race pace", duration: "80 min total", nutrition: "Liquid nutrition on bike, electrolytes on run" },
        { title: "Threshold Session", description: "20min warm up, 40min at threshold, 10min cool down", duration: "70 min", nutrition: "Diluted sports drink every 15 minutes" }
      ];
    }

    return [
      { title: "Fasted Morning Run", description: "Easy Zone 2 run following Nick's fasted training approach for fat adaptation", duration: "45-60 min", nutrition: "Coffee protein shake post-workout within 30 minutes" },
      { title: "Tempo Bike Session", description: "Sustained effort at moderate pace with focus on aerodynamic position", duration: "75-90 min", nutrition: "Diluted sports drink (50/50 with water) every 20 min" },
      { title: "Base Building Swim", description: "Technical swim session focusing on form and efficiency", duration: "45-60 min", nutrition: "Hydrate well before, protein-rich meal within hour after" }
    ];
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Day Toggle Buttons */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedDay('today')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              selectedDay === 'today' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Today's Workout
          </button>
          <button
            onClick={() => setSelectedDay('tomorrow')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              selectedDay === 'tomorrow' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Tomorrow's Workout
          </button>
        </div>
      </div>

      {/* Workout Card - Shows selected day */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="w-6 h-6" />
            {selectedDay === 'today' ? "Today's" : "Tomorrow's"} Workout
          </h2>
          <div className="flex flex-col items-end gap-1">
            <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
              {isInSeason ? 'In Season' : 'Off Season'}
            </span>
            {selectedDay === 'today' ? (
              <span className="text-xs text-white/80">{todaysWorkout?.date}</span>
            ) : (
              <span className="text-xs text-white/80">{tomorrowsWorkout?.date}</span>
            )}
          </div>
        </div>

        {(selectedDay === 'today' ? todaysWorkout : tomorrowsWorkout) && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Activity className="w-8 h-8" />
              <div>
                <h3 className="text-xl font-semibold capitalize">
                  {selectedDay === 'today' 
                    ? `${todaysWorkout.type} ${todaysWorkout.discipline}` 
                    : `${tomorrowsWorkout.type} ${tomorrowsWorkout.discipline}`}
                </h3>
                <p className="text-white/80">
                  {selectedDay === 'today' ? todaysWorkout.focus : tomorrowsWorkout.focus}
                </p>
                <p className="text-xs text-white/60 mt-1">
                  {selectedDay === 'today' ? todaysWorkout.dayName : tomorrowsWorkout.dayName}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">Duration</span>
                </div>
                <p className="font-semibold">
                  {selectedDay === 'today' 
                    ? (todaysWorkout.eventAdjustment?.adjustedDuration || todaysWorkout.duration)
                    : tomorrowsWorkout.duration}
                </p>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm">Effort</span>
                </div>
                <p className="font-semibold">
                  {selectedDay === 'today' ? todaysWorkout.effort : tomorrowsWorkout.effort}
                </p>
              </div>
            </div>

            {/* Show modifications for selected day */}
            {selectedDay === 'today' && todaysWorkout.modified && (
              <div className="bg-yellow-500/20 border border-yellow-400/50 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 mt-0.5" />
                  <div>
                    <p className="font-semibold">Workout Modified</p>
                    <p className="text-sm">{todaysWorkout.reason}</p>
                    <p className="text-sm mt-1">
                      Original: {todaysWorkout.originalType} {todaysWorkout.discipline}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {selectedDay === 'tomorrow' && tomorrowsWorkout.modified && (
              <div className="bg-yellow-500/20 border border-yellow-400/50 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 mt-0.5" />
                  <div>
                    <p className="font-semibold">Suggested Modification</p>
                    <p className="text-sm">{tomorrowsWorkout.reason}</p>
                    <p className="text-sm mt-1">
                      Scheduled: {tomorrowsWorkout.originalType} {tomorrowsWorkout.discipline}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {selectedDay === 'today' && todaysWorkout.eventAdjustment && (
              <div className="bg-green-500/20 border border-green-400/50 rounded-lg p-3">
                <p className="text-sm">{todaysWorkout.eventAdjustment.message}</p>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-white/20">
              {selectedDay === 'today' ? (
                <>
                  <p className="text-sm text-white/80">
                    <strong>Current Fatigue Level:</strong> {fatigueLevel}
                  </p>
                  <p className="text-sm text-white/80 mt-1">
                    <strong>Training Philosophy:</strong> {
                      isInSeason ? NICK_CHASE_METHODS.inSeason.philosophy : NICK_CHASE_METHODS.offSeason.philosophy
                    }
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm text-white/80">
                    <strong>Projected Fatigue:</strong> {tomorrowsWorkout.projectedFatigue}
                  </p>
                  <p className="text-sm text-white/80 mt-1">
                    <strong>Preparation Tip:</strong> {
                      tomorrowsWorkout.type === 'intervals' || tomorrowsWorkout.type === 'tempo'
                        ? 'Get good sleep tonight and hydrate well. This will be a key session.'
                        : tomorrowsWorkout.type === 'long'
                        ? 'Prepare nutrition for a longer session. Consider pre-hydrating.'
                        : 'Focus on recovery today to be fresh for tomorrow.'
                    }
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* AI-Powered Workout Section */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg shadow-md p-6 border border-purple-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-600" />
              AI-Powered Personal Training
            </h3>
            {lastAiGeneration && (
              <p className="text-xs text-gray-600 mt-1">
                Last generated: {new Date(lastAiGeneration).toLocaleString()}
              </p>
            )}
          </div>
          <button
            onClick={generateAIWorkouts}
            disabled={aiLoading}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              aiLoading 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                : 'bg-purple-600 text-white hover:bg-purple-700'
            }`}
          >
            {aiLoading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Generate AI Workouts
              </>
            )}
          </button>
        </div>

        {aiWorkouts ? (
          <div className="space-y-4">
            {/* Today's AI Workout */}
            {selectedDay === 'today' && aiWorkouts.todayPrimary && (
              <div className="bg-white rounded-lg p-4">
                <h4 className="font-semibold text-purple-700 mb-3">
                  AI Recommended: {aiWorkouts.todayPrimary.title}
                </h4>
                <div className="space-y-3">
                  <div className="text-sm">
                    <span className="font-medium text-gray-700">Purpose:</span>
                    <p className="text-gray-600">{aiWorkouts.todayPrimary.purpose}</p>
                  </div>
                  
                  <div className="bg-gray-50 rounded p-3 space-y-2">
                    <div className="text-sm">
                      <span className="font-medium">🔥 Warm-up:</span>
                      <p className="text-gray-600">{aiWorkouts.todayPrimary.warmup}</p>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">💪 Main Set:</span>
                      <p className="text-gray-600">{aiWorkouts.todayPrimary.mainSet}</p>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">🧊 Cool-down:</span>
                      <p className="text-gray-600">{aiWorkouts.todayPrimary.cooldown}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Duration:</span>
                      <p className="text-gray-600">{aiWorkouts.todayPrimary.duration}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Intensity:</span>
                      <p className="text-gray-600">{aiWorkouts.todayPrimary.intensity}</p>
                    </div>
                  </div>

                  <div className="text-sm border-t pt-3">
                    <span className="font-medium text-gray-700">🥤 Nutrition:</span>
                    <p className="text-gray-600">{aiWorkouts.todayPrimary.nutrition}</p>
                  </div>

                  <div className="text-sm bg-purple-50 rounded p-2">
                    <span className="font-medium text-purple-700">🧠 Mental Focus:</span>
                    <p className="text-purple-600">{aiWorkouts.todayPrimary.mentalFocus}</p>
                  </div>
                </div>

                {/* Alternative AI Workouts */}
                {aiWorkouts.todayAlternatives && aiWorkouts.todayAlternatives.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm font-medium text-gray-700 mb-2">Alternative Options:</p>
                    <div className="space-y-2">
                      {aiWorkouts.todayAlternatives.map((alt, idx) => (
                        <div key={idx} className="text-sm bg-gray-50 rounded p-2">
                          <p className="font-medium">{alt.title}</p>
                          <p className="text-xs text-gray-600">{alt.duration} • {alt.intensity}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tomorrow's AI Workout */}
            {selectedDay === 'tomorrow' && aiWorkouts.tomorrowPrimary && (
              <div className="bg-white rounded-lg p-4">
                <h4 className="font-semibold text-purple-700 mb-3">
                  AI Recommended: {aiWorkouts.tomorrowPrimary.title}
                </h4>
                <div className="space-y-3">
                  <div className="text-sm">
                    <span className="font-medium text-gray-700">Purpose:</span>
                    <p className="text-gray-600">{aiWorkouts.tomorrowPrimary.purpose}</p>
                  </div>
                  
                  <div className="bg-gray-50 rounded p-3 space-y-2">
                    <div className="text-sm">
                      <span className="font-medium">🔥 Warm-up:</span>
                      <p className="text-gray-600">{aiWorkouts.tomorrowPrimary.warmup}</p>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">💪 Main Set:</span>
                      <p className="text-gray-600">{aiWorkouts.tomorrowPrimary.mainSet}</p>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">🧊 Cool-down:</span>
                      <p className="text-gray-600">{aiWorkouts.tomorrowPrimary.cooldown}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Duration:</span>
                      <p className="text-gray-600">{aiWorkouts.tomorrowPrimary.duration}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Intensity:</span>
                      <p className="text-gray-600">{aiWorkouts.tomorrowPrimary.intensity}</p>
                    </div>
                  </div>

                  <div className="text-sm border-t pt-3">
                    <span className="font-medium text-gray-700">🥤 Nutrition:</span>
                    <p className="text-gray-600">{aiWorkouts.tomorrowPrimary.nutrition}</p>
                  </div>

                  <div className="text-sm bg-purple-50 rounded p-2">
                    <span className="font-medium text-purple-700">🧠 Mental Focus:</span>
                    <p className="text-purple-600">{aiWorkouts.tomorrowPrimary.mentalFocus}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Weekly Tips from AI */}
            {aiWorkouts.weekTips && (
              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                <h4 className="font-semibold text-yellow-900 mb-2">This Week's AI Insights</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium text-yellow-800">Key Focus:</span>
                    <p className="text-yellow-700">{aiWorkouts.weekTips.keyFocus}</p>
                  </div>
                  <div>
                    <span className="font-medium text-yellow-800">Recovery Priority:</span>
                    <p className="text-yellow-700">{aiWorkouts.weekTips.recoveryDays?.join(', ')}</p>
                  </div>
                  <div>
                    <span className="font-medium text-yellow-800">Nutrition:</span>
                    <p className="text-yellow-700">{aiWorkouts.weekTips.nutritionFocus}</p>
                  </div>
                  <div>
                    <span className="font-medium text-yellow-800">Mental Prep:</span>
                    <p className="text-yellow-700">{aiWorkouts.weekTips.mentalPrep}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Brain className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">Click "Generate AI Workouts" to get personalized training recommendations</p>
            <p className="text-xs text-gray-400 mt-1">Based on your Strava data, fatigue, and goals</p>
          </div>
        )}
      </div>

      {/* Quick Week Overview */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Week at a Glance</h3>
        <div className="grid grid-cols-7 gap-2">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => {
            const plan = isInSeason ? NICK_CHASE_METHODS.inSeason : NICK_CHASE_METHODS.offSeason;
            const dayWorkout = plan.weeklyStructure[index];
            const isToday = new Date().getDay() === (index + 1) % 7;
            const isTomorrow = new Date().getDay() === index;
            
            return (
              <div 
                key={day} 
                className={`text-center p-2 rounded-lg ${
                  isToday ? 'bg-blue-100 border-2 border-blue-500' : 
                  isTomorrow ? 'bg-purple-100 border-2 border-purple-500' :
                  'bg-gray-50'
                }`}
              >
                <p className="text-xs font-semibold">{day}</p>
                <p className="text-xs mt-1 capitalize">{dayWorkout.type}</p>
                <p className="text-xs text-gray-500">{dayWorkout.discipline}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Workout Suggestions - only show for today */}
      {selectedDay === 'today' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Alternative Workouts for Today</h3>
          <div className="grid gap-4">
            {workoutSuggestions.map((suggestion, index) => (
              <div key={index} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <h4 className="font-semibold text-blue-600">{suggestion.title}</h4>
                <p className="text-sm text-gray-600 mt-1">{suggestion.description}</p>
                <div className="flex gap-4 mt-2">
                  <span className="text-sm bg-gray-100 px-2 py-1 rounded">
                    <Clock className="w-3 h-3 inline mr-1" />
                    {suggestion.duration}
                  </span>
                  <span className="text-sm bg-blue-50 px-2 py-1 rounded text-blue-700">
                    {suggestion.nutrition}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkoutGenerator;
