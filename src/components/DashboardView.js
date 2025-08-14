import React from 'react';
import PropTypes from 'prop-types';
import { TrendingUp, Activity, Target, Zap, Brain, RefreshCw, Calendar, Zap as ZapIcon } from 'lucide-react';

const DashboardView = ({ 
  isAuthenticated, loading, trainingData, nutritionPlan, dailyNutrition, dailyWorkout,
  generatingNutrition, handleGenerateNutrition, handleGenerateWorkout, upcomingEvents, setShowAddEventModal
}) => {
  if (!isAuthenticated) {
    return null; // Parent will render StravaAuth
  }

  if (loading && !trainingData) {
    return (
      <div className="bg-white p-8 rounded-lg border border-gray-200 shadow-sm text-center">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
        <p className="text-gray-600">Loading your training data...</p>
      </div>
    );
  }

  if (!trainingData) {
    return (
      <div className="bg-white p-8 rounded-lg border border-gray-200 shadow-sm text-center">
        <p className="text-gray-600">Unable to load training data. Please try refreshing.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Training Phase</p>
              <p className="text-2xl font-bold text-blue-900">{trainingData.currentPhase}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Weekly TSS</p>
              <p className="text-2xl font-bold text-green-900">{trainingData.weeklyTSS}</p>
            </div>
            <Activity className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-600 font-medium">Daily Calories</p>
              <p className="text-2xl font-bold text-orange-900">
                {nutritionPlan ? nutritionPlan.dailyCalories : '---'}
              </p>
              {nutritionPlan && <p className="text-xs text-orange-600">AI Optimized</p>}
            </div>
            <Target className="h-8 w-8 text-orange-500" />
          </div>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 font-medium">Hydration</p>
              <p className="text-2xl font-bold text-purple-900">
                {nutritionPlan ? `${(nutritionPlan.hydration?.dailyTarget / 1000).toFixed(1)}L` : '---'}
              </p>
              {nutritionPlan && <p className="text-xs text-purple-600">Daily Target</p>}
            </div>
            <ZapIcon className="h-8 w-8 text-purple-500" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Brain className="h-5 w-5 text-green-600" />
              <h3 className="text-lg font-bold text-gray-900">Today's Nutrition</h3>
            </div>
            <button onClick={handleGenerateNutrition} disabled={generatingNutrition} className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center space-x-1 px-3 py-2 border border-blue-200 rounded-lg hover:bg-blue-50">
              <RefreshCw className={`h-4 w-4 ${generatingNutrition ? 'animate-spin' : ''}`} />
              <span>{generatingNutrition ? 'Generating...' : 'Generate'}</span>
            </button>
          </div>

          {dailyNutrition ? (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Pre-Workout ({dailyNutrition.preWorkout.timing})</h4>
                <p className="text-sm text-blue-800 mb-2">{dailyNutrition.preWorkout.meal}</p>
                <p className="text-xs text-blue-600 italic">{dailyNutrition.preWorkout.rationale}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">During Workout ({dailyNutrition.duringWorkout.timing})</h4>
                <p className="text-sm text-green-800 mb-2">{dailyNutrition.duringWorkout.fuel}</p>
                <p className="text-xs text-green-600 italic">{dailyNutrition.duringWorkout.rationale}</p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <h4 className="font-medium text-orange-900 mb-2">Post-Workout ({dailyNutrition.postWorkout.timing})</h4>
                <p className="text-sm text-orange-800 mb-2">{dailyNutrition.postWorkout.meal}</p>
                <p className="text-xs text-orange-600 italic">{dailyNutrition.postWorkout.rationale}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Hydration Goal</h4>
                <p className="text-sm text-gray-800">{dailyNutrition.hydrationGoal}</p>
              </div>
              {dailyNutrition.racePrep && (
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="font-medium text-yellow-900 mb-2">Race Preparation</h4>
                  <p className="text-sm text-yellow-800">{dailyNutrition.racePrep}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Click "Generate" to get your personalized nutrition for today</p>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <ZapIcon className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-bold text-gray-900">Today's Workout</h3>
            </div>
            <button onClick={handleGenerateWorkout} disabled={generatingNutrition} className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center space-x-1 px-3 py-2 border border-blue-200 rounded-lg hover:bg-blue-50">
              <RefreshCw className={`h-4 w-4 ${generatingNutrition ? 'animate-spin' : ''}`} />
              <span>{generatingNutrition ? 'Generating...' : 'Generate'}</span>
            </button>
          </div>

          {dailyWorkout ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div>
                  <p className="font-medium text-blue-900">{dailyWorkout.workoutType}</p>
                  <p className="text-sm text-blue-600">{dailyWorkout.primaryFocus}</p>
                </div>
                <span className="px-2 py-1 bg-blue-200 text-blue-800 text-sm font-medium rounded">RPE {dailyWorkout.rpe}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-green-50 p-3 rounded">
                  <p className="text-sm font-medium text-green-900">Warm-up</p>
                  <p className="text-sm text-green-700">{dailyWorkout.warmup.duration}</p>
                  <p className="text-xs text-green-600 mt-1">{dailyWorkout.warmup.description}</p>
                </div>

                <div className="bg-red-50 p-3 rounded">
                  <p className="text-sm font-medium text-red-900">Main Set</p>
                  <p className="text-sm text-red-700">{dailyWorkout.mainSet}</p>
                </div>

                <div className="bg-purple-50 p-3 rounded">
                  <p className="text-sm font-medium text-purple-900">Cool-down</p>
                  <p className="text-sm text-purple-700">{dailyWorkout.cooldown.duration}</p>
                  <p className="text-xs text-purple-600 mt-1">{dailyWorkout.cooldown.description}</p>
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded">
                <p className="text-sm font-medium text-gray-900 mb-2">Rationale</p>
                <p className="text-sm text-gray-700">{dailyWorkout.rationale}</p>
              </div>

              <div className="bg-yellow-50 p-3 rounded">
                <p className="text-sm font-medium text-yellow-900 mb-2">Alternatives</p>
                <ul className="text-sm text-yellow-700 space-y-1">
                  {dailyWorkout.alternatives.map((alt, index) => (<li key={index}>• {alt}</li>))}
                </ul>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Click "Generate" to get your personalized workout for today</p>
          )}
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-purple-600" />
            <h3 className="text-lg font-bold text-gray-900">Upcoming Events</h3>
          </div>
          <button onClick={()=>setShowAddEventModal(true)} className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center space-x-1 px-3 py-2 border border-blue-200 rounded-lg hover:bg-blue-50">
            <Calendar className="h-4 w-4" />
            <span>Add Event</span>
          </button>
        </div>
        {upcomingEvents.length > 0 ? (
          <div className="space-y-4">
            {upcomingEvents.map(event => (
              <div key={event.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="font-medium text-gray-900 text-lg">{event.name}</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${event.priority === 'A' ? 'bg-red-100 text-red-800' : event.priority === 'B' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800' }`}>Priority {event.priority}</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${event.weeksOut <= 2 ? 'bg-red-100 text-red-800' : event.weeksOut <= 6 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800' }`}>{event.weeksOut} weeks</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{event.type}</p>
                    <p className="text-xs text-gray-500 mb-3">{event.date}</p>
                    {event.details && (
                      <div className="bg-gray-50 rounded p-3">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Event Details:</h4>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div><span className="font-medium text-gray-700">Distance:</span><p className="text-gray-600">{event.details.distance}</p></div>
                          <div><span className="font-medium text-gray-700">Terrain:</span><p className="text-gray-600">{event.details.terrain}</p></div>
                        </div>
                        {event.notes && (<div className="mt-2 text-xs"><span className="font-medium text-gray-700">Notes:</span><p className="text-gray-600 mt-1">{event.notes}</p></div>)}
                      </div>
                    )}
                  </div>
                  <button className="text-red-600 hover:text-red-800 text-xs px-2 py-1 rounded ml-4">✕</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">No upcoming events</p>
            <p className="text-sm text-gray-400">Add your races and events to get targeted training and nutrition plans.</p>
          </div>
        )}
      </div>
    </div>
  );
};

DashboardView.propTypes = {
  isAuthenticated: PropTypes.bool,
  loading: PropTypes.bool,
  trainingData: PropTypes.object,
  nutritionPlan: PropTypes.object,
  dailyNutrition: PropTypes.object,
  dailyWorkout: PropTypes.object,
  generatingNutrition: PropTypes.bool,
  handleGenerateNutrition: PropTypes.func,
  handleGenerateWorkout: PropTypes.func,
  upcomingEvents: PropTypes.array,
  setShowAddEventModal: PropTypes.func
};

export default DashboardView;
