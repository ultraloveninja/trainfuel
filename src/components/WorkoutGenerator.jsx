// src/components/WorkoutGenerator.jsx
import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Activity, Target, Zap, Loader, ChevronRight, TrendingUp, Brain, AlertCircle } from 'lucide-react';
import { WORKOUT_TEMPLATES } from '../data/workouts';
import { NUTRITION_PRINCIPLES } from '../data/nutrition';

const WorkoutGenerator = ({ 
  stravaData, 
  userSettings,
  upcomingEvents,
  onWorkoutSelect,
  aiEnabled = true 
}) => {
  const [selectedDay, setSelectedDay] = useState('today');
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [fatigue, setFatigue] = useState('moderate');
  const [isInSeason, setIsInSeason] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [aiWorkouts, setAiWorkouts] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [lastAiGeneration, setLastAiGeneration] = useState(null);

  // Generate AI workouts with API call
  const generateAIWorkouts = async () => {
    if (!aiEnabled) {
      console.log('AI features disabled');
      return;
    }

    // Rate limiting check
    if (lastAiGeneration) {
      const timeSinceLastCall = Date.now() - new Date(lastAiGeneration).getTime();
      if (timeSinceLastCall < 60000) { // 1 minute minimum
        console.log('Rate limited - please wait before generating again');
        return;
      }
    }

    setAiLoading(true);
    
    try {
      const workoutData = {
        workout: selectedWorkout || WORKOUT_TEMPLATES.easy[0],
        fatigue,
        isInSeason,
        stravaData: stravaData ? {
          recentActivities: stravaData.activities?.slice(0, 7),
          weeklyStats: stravaData.weeklyStats,
          currentPhase: stravaData.trainingPhase
        } : null,
        upcomingEvents,
        userSettings
      };

      const proxyUrl = process.env.REACT_APP_PROXY_URL || 'http://localhost:3001/api/claude';
      
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: buildEnhancedWorkoutPrompt(workoutData)
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      const aiResponse = parseAIWorkoutResponse(data);
      
      setAiWorkouts(aiResponse);
      setLastAiGeneration(new Date().toISOString());
      
    } catch (err) {
      console.error("AI workout generation failed:", err);
      // Use fallback workouts
      setAiWorkouts(generateFallbackWorkouts());
    } finally {
      setAiLoading(false);
    }
  };

  const buildEnhancedWorkoutPrompt = (data) => {
    const { workout, fatigue, isInSeason, stravaData, upcomingEvents, userSettings } = data;
    
    return `You are a data-driven triathlon coach (similar to TriDot) using real training metrics. Generate personalized workout recommendations based on:

ATHLETE PROFILE:
- Current fatigue: ${fatigue}
- Training phase: ${isInSeason ? 'In-Season/Race Prep' : 'Base Building'}
- Goals: ${userSettings?.goals?.primaryGoal || 'Half Ironman completion'}
- Fitness level: ${userSettings?.profile?.fitnessLevel || 'intermediate'}

RECENT TRAINING (Last 7 days):
${stravaData?.recentActivities ? stravaData.recentActivities.map(act => 
  `- ${act.sport_type}: ${Math.round(act.distance/1000)}km, ${Math.round(act.moving_time/60)}min, ${act.average_heartrate || 'N/A'}bpm`
).join('\n') : 'No recent activities'}

UPCOMING EVENTS:
${upcomingEvents?.length > 0 ? upcomingEvents.map(e =>
  `- ${e.name}: ${e.date} (${e.type})`
).join('\n') : 'No upcoming events'}

TRAINING PRINCIPLES:
1. Data-driven intensity - use metrics to guide load
2. Optimize recovery between hard sessions based on HRV/TSB
3. Sport-specific strength and technique work
4. Mental preparation alongside physical training
5. Nutrition timing optimized around workouts
6. Progressive overload with adequate recovery

Generate a JSON response with this EXACT structure:
{
  "todayPrimary": {
    "title": "Workout name",
    "purpose": "Why this workout matters for the athlete",
    "warmup": "Specific warm-up protocol",
    "mainSet": "Detailed main set with intervals/paces",
    "cooldown": "Cool-down protocol",
    "duration": "Total time",
    "intensity": "Easy/Moderate/Hard",
    "nutrition": "Pre/during/post workout nutrition",
    "mentalFocus": "Mental cue or visualization"
  },
  "todayAlternatives": [
    {
      "title": "Alternative workout name",
      "duration": "Time",
      "intensity": "Level",
      "focus": "Primary benefit"
    }
  ],
  "tomorrowPrimary": {
    "title": "Tomorrow's workout",
    "purpose": "Why this follows today well",
    "warmup": "Warm-up",
    "mainSet": "Main work",
    "cooldown": "Cool-down",
    "duration": "Time",
    "intensity": "Level",
    "nutrition": "Nutrition strategy",
    "mentalFocus": "Mental preparation"
  },
  "weeklyTips": [
    "Tip 1 based on current training metrics",
    "Tip 2 for this athlete's current phase",
    "Tip 3 for recovery and adaptation"
  ]
}

IMPORTANT: Respond ONLY with valid JSON. No explanatory text before or after.`;
  };

  const parseAIWorkoutResponse = (data) => {
    try {
      let responseText = data.content || data.message || data.text;
      
      // Handle nested response structure
      if (typeof responseText === 'object' && responseText.text) {
        responseText = responseText.text;
      }
      
      // Clean up response - remove markdown if present
      responseText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      
      const parsed = JSON.parse(responseText);
      return parsed;
    } catch (error) {
      console.error('Error parsing AI response:', error);
      return generateFallbackWorkouts();
    }
  };

  const generateFallbackWorkouts = () => {
    return {
      todayPrimary: {
        title: "Threshold Intervals",
        purpose: "Build lactate threshold and race pace efficiency",
        warmup: "15min easy pace, 4x30s strides",
        mainSet: "4x8min at threshold pace (Z4) with 2min recovery",
        cooldown: "10min easy cool-down",
        duration: "65 minutes",
        intensity: "Moderate-Hard",
        nutrition: "30g carbs 30min before, water during, protein shake after",
        mentalFocus: "Focus on maintaining consistent effort across all intervals"
      },
      todayAlternatives: [
        {
          title: "Recovery Run",
          duration: "45 minutes",
          intensity: "Easy",
          focus: "Active recovery and aerobic maintenance"
        },
        {
          title: "Swim Technique",
          duration: "60 minutes",
          intensity: "Easy-Moderate",
          focus: "Form and efficiency work"
        }
      ],
      tomorrowPrimary: {
        title: "Endurance Bike",
        purpose: "Build aerobic base and muscular endurance",
        warmup: "10min progressive warm-up",
        mainSet: "90min steady Zone 2 with 3x1min high cadence",
        cooldown: "10min easy spin",
        duration: "110 minutes",
        intensity: "Moderate",
        nutrition: "Bottle with 60g carbs per hour, electrolytes",
        mentalFocus: "Maintain steady power output and smooth pedaling"
      },
      weeklyTips: [
        "Prioritize sleep - aim for 8+ hours on hard training days",
        "Include one complete rest day or active recovery day weekly",
        "Practice race nutrition during longer weekend sessions"
      ]
    };
  };

  // Initialize suggestions on component mount
  useEffect(() => {
    if (stravaData || userSettings) {
      const initialSuggestions = generateInitialSuggestions();
      setSuggestions(initialSuggestions);
    }
  }, [stravaData, userSettings, fatigue, isInSeason]);

  const generateInitialSuggestions = () => {
    // Your existing suggestion logic
    const template = isInSeason ? WORKOUT_TEMPLATES.race : 
                    fatigue === 'high' ? WORKOUT_TEMPLATES.recovery :
                    fatigue === 'low' ? WORKOUT_TEMPLATES.hard :
                    WORKOUT_TEMPLATES.moderate;
    
    return template.slice(0, 3);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="w-6 h-6" />
          Workout Generator
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">AI Features:</span>
          <span className={`px-2 py-1 rounded text-xs font-semibold ${
            aiEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
          }`}>
            {aiEnabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
      </div>

      {/* Controls Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Day</label>
          <select 
            value={selectedDay} 
            onChange={(e) => setSelectedDay(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="today">Today</option>
            <option value="tomorrow">Tomorrow</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fatigue Level</label>
          <select 
            value={fatigue} 
            onChange={(e) => setFatigue(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="low">Low</option>
            <option value="moderate">Moderate</option>
            <option value="high">High</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Training Phase</label>
          <select 
            value={isInSeason ? 'race' : 'base'} 
            onChange={(e) => setIsInSeason(e.target.value === 'race')}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="base">Base Building</option>
            <option value="race">Race Prep</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Workout Type</label>
          <select 
            onChange={(e) => setSelectedWorkout(WORKOUT_TEMPLATES[e.target.value]?.[0])}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Auto-Select</option>
            <option value="easy">Easy</option>
            <option value="moderate">Moderate</option>
            <option value="hard">Hard</option>
            <option value="recovery">Recovery</option>
          </select>
        </div>
      </div>

      {/* AI Generation Section */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Brain className="w-5 h-5" />
            AI-Powered Recommendations
          </h3>
          <button
            onClick={generateAIWorkouts}
            disabled={!aiEnabled || aiLoading}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors ${
              !aiEnabled || aiLoading 
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

        {!aiEnabled && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-yellow-800">AI Features Disabled</p>
              <p className="text-yellow-700">Enable AI features in settings to get personalized workout recommendations based on your training data.</p>
            </div>
          </div>
        )}

        {aiWorkouts && aiEnabled && (
          <div className="space-y-4">
            {/* Today's Workout */}
            {selectedDay === 'today' && aiWorkouts.todayPrimary && (
              <div className="bg-white rounded-lg p-4">
                <h4 className="font-semibold text-purple-700 mb-3">
                  Today's Recommended Workout: {aiWorkouts.todayPrimary.title}
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

                {/* Alternative Options */}
                {aiWorkouts.todayAlternatives && aiWorkouts.todayAlternatives.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm font-medium text-gray-700 mb-2">Alternative Options:</p>
                    <div className="space-y-2">
                      {aiWorkouts.todayAlternatives.map((alt, idx) => (
                        <div key={idx} className="text-sm bg-gray-50 rounded p-2">
                          <p className="font-medium">{alt.title}</p>
                          <p className="text-xs text-gray-600">{alt.duration} • {alt.intensity} • {alt.focus}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tomorrow's Preview */}
            {selectedDay === 'tomorrow' && aiWorkouts.tomorrowPrimary && (
              <div className="bg-white rounded-lg p-4">
                <h4 className="font-semibold text-purple-700 mb-3">
                  Tomorrow's Workout: {aiWorkouts.tomorrowPrimary.title}
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

            {/* Weekly Tips */}
            {aiWorkouts.weeklyTips && (
              <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4">
                <h4 className="font-semibold text-green-700 mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Weekly Training Tips
                </h4>
                <ul className="space-y-1">
                  {aiWorkouts.weeklyTips.map((tip, idx) => (
                    <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Last generation timestamp */}
        {lastAiGeneration && (
          <div className="text-xs text-gray-500 mt-2">
            Last generated: {new Date(lastAiGeneration).toLocaleString()}
          </div>
        )}
      </div>

      {/* Fallback Suggestions */}
      {!aiWorkouts && suggestions.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-700">Suggested Workouts</h3>
          {suggestions.map((workout, idx) => (
            <div key={idx} className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                 onClick={() => onWorkoutSelect && onWorkoutSelect(workout)}>
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-lg">{workout.title}</h4>
                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                  workout.intensity === 'Easy' ? 'bg-green-100 text-green-800' :
                  workout.intensity === 'Moderate' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {workout.intensity}
                </span>
              </div>
              <p className="text-gray-600 mb-3">{workout.description}</p>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {workout.duration}
                </span>
                <span className="flex items-center gap-1">
                  <Target className="w-4 h-4" />
                  {workout.discipline}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WorkoutGenerator;