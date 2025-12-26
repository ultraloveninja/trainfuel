// src/components/UnifiedTrainingSystem.jsx
// COMPLETE FILE - Multi-Event Season Planning

import React, { useState, useEffect } from 'react';
import {
  Calendar, Activity, TrendingUp, Download, Plus, ChevronLeft, ChevronRight,
  AlertCircle, Clock, Zap, Target, CalendarDays
} from 'lucide-react';
import tridotPlanner from '../services/tridotStylePlanner';
import zwiftGenerator from '../services/zwiftWorkoutGenerator';
import { convertSwimDistance, convertSwimWorkoutDescription, convertSwimStructure } from '../utils/swimConverter';
import MultiEventSeasonPlanner from '../services/multiEventSeasonPlanner';

const UnifiedTrainingSystem = ({
  upcomingEvents,
  fitnessMetrics,
  userSettings,
  trainingData
}) => {
  const [trainingPlan, setTrainingPlan] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedEvents, setSelectedEvents] = useState([]);
  const [eventPriorities, setEventPriorities] = useState({});
  const [planningMode, setPlanningMode] = useState('multi'); // 'single' or 'multi'
  const [viewMode, setViewMode] = useState('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [todaysWorkout, setTodaysWorkout] = useState(null);
  const [selectedWorkout, setSelectedWorkout] = useState(null); // Track which workout is selected
  const [generating, setGenerating] = useState(false);

  // Get today's workout when plan changes
  useEffect(() => {
    if (trainingPlan) {
      // Handle both single and multi-event plan structures
      const workout = trainingPlan.seasonOverview
        ? getTodaysWorkoutMulti(trainingPlan)
        : tridotPlanner.getTodaysWorkout(trainingPlan, fitnessMetrics);
      setTodaysWorkout(workout);
      setSelectedWorkout(workout); // Also set as initially selected workout
    }
  }, [trainingPlan, fitnessMetrics]);

  /**
   * Get today's workout from multi-event plan
   */
  const getTodaysWorkoutMulti = (plan) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find today's week
    const currentWeek = plan.weeklyPlan.find(week => {
      const weekStart = new Date(week.startDate);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      return today >= weekStart && today <= weekEnd;
    });

    if (!currentWeek) return null;

    // Find today's workout
    const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][today.getDay()];
    const todayWorkout = currentWeek.workouts.find(w => w.day === dayOfWeek);

    if (!todayWorkout) return null;

    return {
      ...todayWorkout,
      week: currentWeek.weekNumber,
      phase: currentWeek.phase,
      event: currentWeek.event // Include if this is a race week
    };
  };

  /**
   * Generate multi-event season plan
   */
  const generateMultiEventPlan = async () => {
    setGenerating(true);

    try {
      // Initialize multi-event planner
      const multiPlanner = new MultiEventSeasonPlanner(tridotPlanner);

      // Generate comprehensive season plan
      const plan = multiPlanner.generateMultiEventPlan(upcomingEvents, fitnessMetrics);

      setTrainingPlan(plan);
      console.log('✅ Multi-event season plan generated:', plan);
      console.log('📅 Total weeks:', plan.weeklyPlan.length);
      console.log('🏆 Events:', plan.events.map(e => `${e.name} (${e.priority || 'B'})`));

    } catch (error) {
      console.error('Error generating multi-event plan:', error);
      alert('Error generating season plan. Check console for details.');
    } finally {
      setGenerating(false);
    }
  };

  /**
   * Generate single-event plan (original behavior)
   */
  const generateSingleEventPlan = async () => {
    if (selectedEvents.length === 0) {
      alert('Please select an event first');
      return;
    }

    setGenerating(true);

    try {
      const selectedEvent = upcomingEvents.find(e => e.id === selectedEvents[0]);
      const raceDate = new Date(selectedEvent.date);

      const plan = tridotPlanner.generateSeasonPlan(
        raceDate,
        fitnessMetrics,
        {
          type: selectedEvent.type,
          distance: selectedEvent.distance
        }
      );

      setTrainingPlan(plan);
      console.log('✅ Single-event plan generated:', plan);

    } catch (error) {
      console.error('Error generating single-event plan:', error);
      alert('Error generating plan. Check console for details.');
    } finally {
      setGenerating(false);
    }
  };

  /**
   * Update event priority and save to localStorage
   */
  const updateEventPriority = (eventId, newPriority) => {
    // Update in upcomingEvents (will need parent to refresh)
    const updatedEvents = upcomingEvents.map(ev =>
      ev.id === eventId ? { ...ev, priority: newPriority } : ev
    );

    // Save to localStorage
    localStorage.setItem('trainfuelEvents', JSON.stringify(updatedEvents));

    // Update local state
    setEventPriorities(prev => ({ ...prev, [eventId]: newPriority }));

    // Force re-render by updating a dummy state or calling parent callback
    console.log(`Event ${eventId} priority updated to ${newPriority}`);
  };

  /**
   * Export workout to Zwift
   */
  const exportToZwift = (workout) => {
    const settings = {
      ftp: userSettings?.profile?.ftp || 200,
      runPace: userSettings?.profile?.runPace || '5:00'
    };

    const zwoContent = zwiftGenerator.generateFromPlanWorkout(workout, settings);

    if (zwoContent) {
      const filename = `${workout.name.replace(/\s+/g, '_')}_${workout.date}`;
      zwiftGenerator.downloadWorkout(zwoContent, filename);
    } else {
      alert('This workout type cannot be exported to Zwift');
    }
  };

  /**
   * Get workouts for current week with better date matching
   */
  const getCurrentWeekWorkouts = () => {
    if (!trainingPlan || !trainingPlan.weeklyPlan) {
      console.log('No training plan available');
      return [];
    }

    const weekStart = new Date(currentDate);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    const currentWeek = trainingPlan.weeklyPlan.find((week) => {
      const planWeekStart = new Date(week.startDate);
      planWeekStart.setHours(0, 0, 0, 0);

      const planWeekEnd = new Date(planWeekStart);
      planWeekEnd.setDate(planWeekEnd.getDate() + 6);

      return weekStart >= planWeekStart && weekStart <= planWeekEnd;
    });

    if (currentWeek) {
      return currentWeek.workouts || [];
    }

    const sortedWeeks = [...trainingPlan.weeklyPlan].sort((a, b) => {
      const dateA = new Date(a.startDate);
      const dateB = new Date(b.startDate);
      return Math.abs(dateA - weekStart) - Math.abs(dateB - weekStart);
    });

    const closestWeek = sortedWeeks[0];
    return closestWeek?.workouts || [];
  };

  /**
   * Navigate weeks
   */
  const navigateWeek = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + (direction * 7));
    setCurrentDate(newDate);
  };

  /**
   * Go to current week (today)
   */
  const goToCurrentWeek = () => {
    setCurrentDate(new Date());
  };

  /**
   * Get week summary stats
   */
  const getWeekSummary = () => {
    const workouts = getCurrentWeekWorkouts();
    const totalTSS = workouts.reduce((sum, w) => sum + (w.tss || 0), 0);
    const totalDuration = workouts.reduce((sum, w) => sum + (parseInt(w.duration) || 0), 0);
    const keyWorkouts = workouts.filter(w => w.keyWorkout).length;

    return { totalTSS, totalDuration, keyWorkouts, workoutCount: workouts.length };
  };

  /**
   * Get workout for specific day of week
   */
  const getWorkoutForDay = (dayName) => {
    const workouts = getCurrentWeekWorkouts();
    return workouts.find(w => w.day === dayName) || null;
  };

  /**
   * Get intensity color
   */
  const getIntensityColor = (intensity) => {
    switch (intensity?.toLowerCase()) {
      case 'hard': return 'bg-red-100 text-red-800 border-red-300';
      case 'moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'easy': return 'bg-green-100 text-green-800 border-green-300';
      case 'rest': return 'bg-gray-100 text-gray-800 border-gray-300';
      default: return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  /**
   * Get discipline icon
   */
  const getDisciplineIcon = (discipline) => {
    switch (discipline?.toLowerCase()) {
      case 'swim': return '🏊';
      case 'bike': return '🚴';
      case 'run': return '🏃';
      case 'strength': return '💪';
      case 'rest': return '😴';
      default: return '🏃';
    }
  };

  /**
   * Get priority badge color
   */
  const getPriorityColor = (priority) => {
    switch ((priority || 'B').toUpperCase()) {
      case 'A': return 'border-red-500 bg-red-50 text-red-700';
      case 'B': return 'border-yellow-500 bg-yellow-50 text-yellow-700';
      case 'C': return 'border-green-500 bg-green-50 text-green-700';
      default: return 'border-gray-500 bg-gray-50 text-gray-700';
    }
  };

  const weekSummary = getWeekSummary();
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Handle clicking on a day to view that workout
  const handleDayClick = (workout) => {
    if (workout) {
      setSelectedWorkout(workout);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header - Multi-Event Display */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Calendar className="w-6 h-6 text-blue-600" />
          Training Plan & Workouts
        </h2>

        {/* Planning Mode Toggle */}
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Upcoming Events</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setPlanningMode('multi')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${planningMode === 'multi'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                Season Plan (All Events)
              </button>
              <button
                onClick={() => setPlanningMode('single')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${planningMode === 'single'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                Single Event
              </button>
            </div>
          </div>

          {/* Display all events as cards */}
          {upcomingEvents && upcomingEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcomingEvents.map((event) => (
                <div
                  key={event.id}
                  className={`border-2 rounded-lg p-4 transition-all ${selectedEvents.includes(event.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                    }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{event.name}</h4>
                      <p className="text-sm text-gray-600">
                        {new Date(event.date).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {Math.floor((new Date(event.date) - new Date()) / (1000 * 60 * 60 * 24))} days away • {event.type}
                      </p>
                    </div>

                    {/* Priority Badge */}
                    <div className="flex flex-col items-end gap-2">
                      <select
                        value={event.priority || 'B'}
                        onChange={(e) => updateEventPriority(event.id, e.target.value)}
                        className={`px-3 py-1 text-sm font-bold rounded-lg border-2 ${getPriorityColor(event.priority)}`}
                      >
                        <option value="A">A - Goal Race</option>
                        <option value="B">B - Important</option>
                        <option value="C">C - Training</option>
                      </select>

                      {planningMode === 'single' && (
                        <input
                          type="checkbox"
                          checked={selectedEvents.includes(event.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedEvents([event.id]); // Single select
                            } else {
                              setSelectedEvents([]);
                            }
                          }}
                          className="w-5 h-5 text-blue-600 rounded"
                        />
                      )}
                    </div>
                  </div>

                  {/* Event Details */}
                  {event.distance && (
                    <div className="mt-2 text-xs text-gray-600">
                      <span className="mr-3">📏 {event.distance}</span>
                    </div>
                  )}

                  {/* Priority Explanation */}
                  <div className="mt-2 p-2 bg-white rounded text-xs">
                    {(event.priority || 'B') === 'A' && (
                      <p className="text-gray-700">
                        <strong>Goal Race:</strong> Full taper, peak fitness
                      </p>
                    )}
                    {(event.priority || 'B') === 'B' && (
                      <p className="text-gray-700">
                        <strong>Important Race:</strong> Reduced volume week
                      </p>
                    )}
                    {(event.priority || 'B') === 'C' && (
                      <p className="text-gray-700">
                        <strong>Training Race:</strong> No taper, race effort
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-2">No upcoming events</p>
              <p className="text-sm text-gray-500">Add events to generate your training plan</p>
            </div>
          )}

          {/* Generate Plan Button */}
          {upcomingEvents && upcomingEvents.length > 0 && (
            <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-blue-900">
                    {planningMode === 'multi'
                      ? `Season Plan: ${upcomingEvents.length} Events`
                      : `Single Event: ${selectedEvents.length} Selected`
                    }
                  </h4>
                  <p className="text-sm text-blue-700 mt-1">
                    {planningMode === 'multi'
                      ? 'Generates comprehensive plan across all events with appropriate peaks and tapers'
                      : 'Generates focused plan for selected event only'
                    }
                  </p>
                </div>
                <button
                  onClick={() => planningMode === 'multi' ? generateMultiEventPlan() : generateSingleEventPlan()}
                  disabled={generating || (planningMode === 'single' && selectedEvents.length === 0)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-medium"
                >
                  {generating ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      Generate Plan
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Selected Workout Display - Highlighted */}
      {selectedWorkout && (
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-medium opacity-90">
                {selectedWorkout.day === daysOfWeek[new Date().getDay()] ? "TODAY'S WORKOUT" : `${selectedWorkout.day?.toUpperCase()}'S WORKOUT`}
              </h3>
              <h2 className="text-2xl font-bold mt-1">{selectedWorkout.name}</h2>
            </div>
            <div className="text-right">
              <div className="text-3xl mb-1">{getDisciplineIcon(selectedWorkout.discipline)}</div>
              <p className="text-sm opacity-90">Week {selectedWorkout.week} • {selectedWorkout.phase}</p>
            </div>
          </div>

          {/* Race Week Indicator */}
          {selectedWorkout.event && (
            <div className="mb-4 p-3 bg-yellow-500/20 border border-yellow-400/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                <div>
                  <p className="font-semibold">Race Week: {selectedWorkout.event.name}</p>
                  <p className="text-sm opacity-90">
                    {selectedWorkout.event.priority === 'A' && 'Goal Race - Full Taper'}
                    {selectedWorkout.event.priority === 'B' && 'Important Race - Reduced Volume'}
                    {selectedWorkout.event.priority === 'C' && 'Training Race - Normal Volume'}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-white/10 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-sm">Duration</span>
              </div>
              <p className="font-semibold">{selectedWorkout.duration}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4" />
                <span className="text-sm">Intensity</span>
              </div>
              <p className="font-semibold">{selectedWorkout.intensity}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-4 h-4" />
                <span className="text-sm">TSS</span>
              </div>
              <p className="font-semibold">{selectedWorkout.tss}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-4 h-4" />
                <span className="text-sm">Focus</span>
              </div>
              <p className="font-semibold text-sm">{selectedWorkout.phase}</p>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-sm font-medium mb-2">Workout Details:</p>
            <p className="text-sm opacity-90">
              {selectedWorkout.discipline === 'swim'
                ? convertSwimWorkoutDescription(selectedWorkout.description, userSettings?.profile?.poolType)
                : selectedWorkout.description
              }
            </p>
            {selectedWorkout.structure && (
              <p className="text-sm opacity-90 mt-2">
                <strong>Structure:</strong> {
                  selectedWorkout.discipline === 'swim'
                    ? convertSwimStructure(selectedWorkout.structure, userSettings?.profile?.poolType)
                    : selectedWorkout.structure
                }
              </p>
            )}
          </div>

          {selectedWorkout.modified && (
            <div className="bg-yellow-500/20 border border-yellow-400/50 rounded-lg p-3 mb-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 mt-0.5" />
                <div>
                  <p className="font-semibold">Workout Adjusted by AI</p>
                  <p className="text-sm opacity-90 mt-1">{selectedWorkout.aiReason}</p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-sm font-medium mb-1">Nutrition Strategy:</p>
            <p className="text-sm opacity-90">{selectedWorkout.nutrition}</p>
          </div>

          <button
            onClick={() => setSelectedWorkout(null)}
            className="w-full mt-4 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
          >
            Mark Complete
          </button>

          {(selectedWorkout.discipline === 'bike' || selectedWorkout.discipline === 'run') && (
            <button
              onClick={() => exportToZwift(selectedWorkout)}
              className="w-full mt-2 px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export to Zwift
            </button>
          )}
        </div>
      )}

      {/* Weekly Training Plan */}
      {trainingPlan && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold">Weekly Training Plan</h3>
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigateWeek(-1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="font-medium">
                {currentDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
              <button
                onClick={() => navigateWeek(1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex justify-center mb-6">
            <button
              onClick={goToCurrentWeek}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
            >
              <CalendarDays className="w-4 h-4" />
              Go to Current Week
            </button>
          </div>

          {/* Week Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="text-sm text-blue-700 mb-1">Total TSS</p>
              <p className="text-2xl font-bold text-blue-900">{weekSummary.totalTSS}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <p className="text-sm text-green-700 mb-1">Duration</p>
              <p className="text-2xl font-bold text-green-900">{weekSummary.totalDuration}min</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <p className="text-sm text-purple-700 mb-1">Workouts</p>
              <p className="text-2xl font-bold text-purple-900">{weekSummary.workoutCount}</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
              <p className="text-sm text-orange-700 mb-1">Key Sessions</p>
              <p className="text-2xl font-bold text-orange-900">{weekSummary.keyWorkouts}</p>
            </div>
          </div>

          {/* Daily Workouts Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {daysOfWeek.map((day, index) => {
              const workout = getWorkoutForDay(day);
              const isToday = new Date().getDay() === index;
              const isSelected = selectedWorkout && selectedWorkout.day === day;

              return (
                <div
                  key={day}
                  onClick={() => handleDayClick(workout)}
                  className={`border-2 rounded-lg p-3 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200'
                      : isToday
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm">{day.substring(0, 3)}</h4>
                    {workout && <span className="text-xl">{getDisciplineIcon(workout.discipline)}</span>}
                  </div>
                  {workout ? (
                    <>
                      <p className="text-xs font-semibold text-gray-900 mb-1">
                        {workout.discipline === 'swim'
                          ? `${workout.name} 🏊`
                          : workout.name
                        }
                      </p>
                      {workout.discipline === 'swim' && workout.description && (
                        <p className="text-xs text-gray-500 mb-1">
                          {(() => {
                            const match = workout.description.match(/(\d+)m/);
                            if (match) {
                              const converted = convertSwimDistance(parseInt(match[1]), userSettings?.profile?.poolType);
                              return `${converted.distance} ${converted.unit} (${converted.laps} laps)`;
                            }
                            return '';
                          })()}
                        </p>
                      )}
                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <span>{workout.duration}min</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${getIntensityColor(workout.intensity)}`}>
                          {workout.intensity}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">TSS: {workout.tss}</p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-400">Rest</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Data-Driven Training Principles */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200 p-6">
        <h3 className="text-lg font-semibold text-purple-900 mb-4">Training Principles</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {trainingPlan?.principles?.map((principle, index) => (
            <div key={index} className="text-center">
              <p className="font-medium text-purple-900 text-sm mb-1">{principle.principle}</p>
              <p className="text-xs text-purple-700">{principle.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UnifiedTrainingSystem;