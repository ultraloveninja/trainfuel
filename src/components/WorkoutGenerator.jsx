import React, { useState, useEffect } from 'react';
import { Calendar, Activity, Clock, TrendingUp, AlertCircle } from 'lucide-react';

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
  const [workoutSuggestions, setWorkoutSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fatiguLevel, setFatiguLevel] = useState('moderate');

  useEffect(() => {
    generateWorkout();
  }, [stravaData, upcomingEvents, isInSeason]);

  const analyzeFatigueLevel = (recentActivities) => {
    if (!recentActivities || recentActivities.length === 0) return 'fresh';
    
    const last7Days = recentActivities.slice(0, 7);
    const totalStress = last7Days.reduce((acc, activity) => {
      const intensity = activity.average_heartrate / activity.max_heartrate || 0.7;
      const duration = activity.moving_time / 3600; // Convert to hours
      return acc + (intensity * duration);
    }, 0);

    if (totalStress > 15) return 'high';
    if (totalStress > 8) return 'moderate';
    return 'fresh';
  };

  const generateWorkout = async () => {
    setLoading(true);
    
    try {
      // Analyze recent training from Strava
      const fatigue = analyzeFatigueLevel(stravaData?.activities);
      setFatiguLevel(fatigue);

      // Get appropriate training plan
      const trainingPlan = isInSeason ? NICK_CHASE_METHODS.inSeason : NICK_CHASE_METHODS.offSeason;
      
      // Determine today's workout based on day of week
      const today = new Date();
      const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
      const scheduledWorkout = trainingPlan.weeklyStructure.find(w => w.day === dayName);
      
      // Adjust based on fatigue
      let workout = { ...scheduledWorkout };
      if (fatigue === 'high' && workout.type !== 'easy') {
        workout = {
          ...workout,
          type: 'easy',
          modified: true,
          originalType: workout.type,
          reason: 'High fatigue detected - recovery recommended'
        };
      }

      // Add specific details from training methods
      const workoutDetails = trainingPlan.workoutTypes[workout.type];
      
      // Check for upcoming events and adjust
      let eventAdjustment = null;
      if (upcomingEvents && upcomingEvents.length > 0) {
        const nextEvent = upcomingEvents[0];
        const daysUntilEvent = Math.floor((new Date(nextEvent.date) - today) / (1000 * 60 * 60 * 24));
        
        if (daysUntilEvent <= 7) {
          eventAdjustment = {
            taper: true,
            message: `Tapering for ${nextEvent.name} in ${daysUntilEvent} days`,
            adjustedDuration: workoutDetails.duration.split('-')[0] + ' min'
          };
        }
      }

      // Generate AI-powered suggestions using Claude
      const suggestions = await generateAISuggestions(workout, fatigue, stravaData);

      setTodaysWorkout({
        ...workout,
        ...workoutDetails,
        fatiguLevel: fatigue,
        eventAdjustment,
        timestamp: new Date().toISOString()
      });

      setWorkoutSuggestions(suggestions);
      
    } catch (error) {
      console.error('Error generating workout:', error);
      // Fallback to basic workout
      setTodaysWorkout({
        type: 'easy',
        discipline: 'run',
        duration: '30-45 min',
        effort: 'Zone 2',
        focus: 'Recovery',
        error: true
      });
    } finally {
      setLoading(false);
    }
  };

  const generateAISuggestions = async (workout, fatigue, stravaData) => {
    try {
      const proxyUrl = process.env.REACT_APP_PROXY_URL || 'http://localhost:3001/api/claude';
      const response = await fetch(proxyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: `Based on Nick Chase's training methods and the following data, provide 3 specific workout suggestions:
              
              Current workout: ${workout.type} ${workout.discipline}
              Fatigue level: ${fatigue}
              Season: ${isInSeason ? 'In-season' : 'Off-season'}
              Recent activities: ${stravaData?.activities?.length || 0} in last 7 days
              
              Follow Nick's principles:
              - Liquid nutrition during long sessions
              - Focus on consistency over intensity
              - Sports psychology foundation
              - Gradual adaptation
              
              Respond with a JSON array of 3 suggestions, each with:
              {
                "title": "short title",
                "description": "detailed description",
                "duration": "time range",
                "nutrition": "fueling strategy"
              }
              
              ONLY respond with valid JSON, no other text.`
        })
      });

      if (response.ok) {
        const data = await response.json();
        let responseText = data.content || data.message || data.text;
        if (typeof responseText === 'object' && responseText.text) {
          responseText = responseText.text;
        }
        responseText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        return JSON.parse(responseText);
      }
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
    }

    // Fallback suggestions
    return [
      {
        title: "Fasted Morning Run",
        description: "Easy Zone 2 run following Nick's fasted training approach",
        duration: "45-60 min",
        nutrition: "Coffee protein shake post-workout"
      },
      {
        title: "Tempo Bike Session",
        description: "Sustained effort at race pace with liquid nutrition",
        duration: "75-90 min",
        nutrition: "Diluted sports drink every 20 min"
      },
      {
        title: "Brick Workout",
        description: "Bike-to-run transition practice for race preparation",
        duration: "90 min total",
        nutrition: "Electrolytes + 200 cal/hour from liquids"
      }
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
      {/* Today's Workout Card */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="w-6 h-6" />
            Today's Workout
          </h2>
          <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
            {isInSeason ? 'In Season' : 'Off Season'}
          </span>
        </div>

        {todaysWorkout && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Activity className="w-8 h-8" />
              <div>
                <h3 className="text-xl font-semibold capitalize">
                  {todaysWorkout.type} {todaysWorkout.discipline}
                </h3>
                <p className="text-white/80">{todaysWorkout.focus}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">Duration</span>
                </div>
                <p className="font-semibold">
                  {todaysWorkout.eventAdjustment?.adjustedDuration || todaysWorkout.duration}
                </p>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm">Effort</span>
                </div>
                <p className="font-semibold">{todaysWorkout.effort}</p>
              </div>
            </div>

            {todaysWorkout.modified && (
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

            {todaysWorkout.eventAdjustment && (
              <div className="bg-green-500/20 border border-green-400/50 rounded-lg p-3">
                <p className="text-sm">{todaysWorkout.eventAdjustment.message}</p>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-white/20">
              <p className="text-sm text-white/80">
                <strong>Fatigue Level:</strong> {fatiguLevel}
              </p>
              <p className="text-sm text-white/80 mt-1">
                <strong>Training Philosophy:</strong> {
                  isInSeason ? NICK_CHASE_METHODS.inSeason.philosophy : NICK_CHASE_METHODS.offSeason.philosophy
                }
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Workout Suggestions */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Alternative Workouts</h3>
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
    </div>
  );
};

export default WorkoutGenerator;