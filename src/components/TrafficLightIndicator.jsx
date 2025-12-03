// src/components/TrafficLightIndicator.jsx
// Visual indicator for daily carb needs - Fuelin-style traffic light system
// 🔴 Red = Low carb day | 🟡 Yellow = Moderate carb | 🟢 Green = High carb

import React from 'react';
import { TrendingUp, Minus, TrendingDown, Zap, Activity } from 'lucide-react';

const TrafficLightIndicator = ({ trainingData, size = 'large' }) => {
  if (!trainingData) {
    return (
      <div className="bg-gray-100 border-2 border-gray-300 rounded-lg p-4">
        <p className="text-gray-600 text-center">
          Connect Strava to see your daily nutrition guidance
        </p>
      </div>
    );
  }

  const color = trainingData.trafficLight || 'yellow';
  const todaysNutrition = trainingData.todaysNutrition || {};
  const todaysWorkouts = trainingData.today || [];
  
  // Color configuration for traffic light system
  const colorConfig = {
    green: {
      bg: 'bg-green-50',
      bgDark: 'bg-green-100',
      border: 'border-green-500',
      text: 'text-green-900',
      textLight: 'text-green-700',
      icon: TrendingUp,
      iconColor: 'text-green-600',
      label: 'HIGH CARB DAY',
      emoji: '🟢',
      message: 'Hard training day - fuel up!',
      carbRange: `${todaysNutrition.carbs}g+ carbs needed`,
      advice: 'Eat plenty of quality carbs before, during, and after training. Your body needs the fuel!'
    },
    yellow: {
      bg: 'bg-yellow-50',
      bgDark: 'bg-yellow-100',
      border: 'border-yellow-500',
      text: 'text-yellow-900',
      textLight: 'text-yellow-700',
      icon: Minus,
      iconColor: 'text-yellow-600',
      label: 'MODERATE CARB DAY',
      emoji: '🟡',
      message: 'Moderate training - balanced fuel',
      carbRange: `${todaysNutrition.carbs}g carbs needed`,
      advice: 'Balanced approach today. Focus on quality carbs around your workout.'
    },
    red: {
      bg: 'bg-red-50',
      bgDark: 'bg-red-100',
      border: 'border-red-500',
      text: 'text-red-900',
      textLight: 'text-red-700',
      icon: TrendingDown,
      iconColor: 'text-red-600',
      label: 'LOW CARB DAY',
      emoji: '🔴',
      message: 'Rest/recovery - reduce carbs',
      carbRange: `${todaysNutrition.carbs}g carbs needed`,
      advice: 'Rest day or easy training. Focus on protein and vegetables, reduce carbs slightly.'
    }
  };

  const config = colorConfig[color];
  const Icon = config.icon;

  // Size variants
  const sizeClasses = {
    small: {
      container: 'p-3',
      text: 'text-sm',
      title: 'text-base',
      icon: 'w-5 h-5',
      badge: 'w-8 h-8'
    },
    medium: {
      container: 'p-4',
      text: 'text-base',
      title: 'text-lg',
      icon: 'w-6 h-6',
      badge: 'w-10 h-10'
    },
    large: {
      container: 'p-6',
      text: 'text-base',
      title: 'text-xl',
      icon: 'w-8 h-8',
      badge: 'w-12 h-12'
    }
  };

  const sizes = sizeClasses[size];

  return (
    <div className={`${config.bg} ${config.border} border-2 rounded-lg ${sizes.container} ${config.text} shadow-md`}>
      {/* Header Section */}
      <div className="flex items-start gap-4 mb-4">
        {/* Traffic Light Badge */}
        <div className={`${config.bgDark} ${config.border} border-2 rounded-full p-3 flex-shrink-0 ${sizes.badge} flex items-center justify-center`}>
          <Icon className={`${sizes.icon} ${config.iconColor}`} />
        </div>
        
        {/* Main Info */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={`font-bold ${sizes.title}`}>{config.label}</h3>
            <span className="text-2xl">{config.emoji}</span>
          </div>
          <p className={`${sizes.text} ${config.textLight} font-medium`}>
            {config.message}
          </p>
          <p className={`text-sm ${config.textLight} font-bold mt-1`}>
            Target: {config.carbRange}
          </p>
        </div>

        {/* Calorie Badge */}
        <div className={`${config.bgDark} rounded-lg p-3 text-center hidden sm:block`}>
          <Zap className={`${sizes.icon} ${config.iconColor} mx-auto mb-1`} />
          <p className={`font-bold ${sizes.title}`}>{todaysNutrition.calories || 0}</p>
          <p className="text-xs opacity-75">calories</p>
        </div>
      </div>

      {/* Macros Breakdown */}
      <div className={`grid grid-cols-3 gap-3 mb-4 ${config.bgDark} rounded-lg p-3`}>
        <div className="text-center">
          <p className={`font-bold ${sizes.title} ${config.text}`}>
            {todaysNutrition.protein || 0}g
          </p>
          <p className={`text-xs ${config.textLight}`}>Protein</p>
        </div>
        <div className="text-center">
          <p className={`font-bold ${sizes.title} ${config.text}`}>
            {todaysNutrition.carbs || 0}g
          </p>
          <p className={`text-xs ${config.textLight}`}>Carbs</p>
        </div>
        <div className="text-center">
          <p className={`font-bold ${sizes.title} ${config.text}`}>
            {todaysNutrition.fat || 0}g
          </p>
          <p className={`text-xs ${config.textLight}`}>Fat</p>
        </div>
      </div>

      {/* Advice Section */}
      <div className={`${config.bgDark} rounded-lg p-3 mb-4`}>
        <p className={`text-sm ${config.textLight}`}>
          <strong>Today's Strategy:</strong> {config.advice}
        </p>
      </div>

      {/* Today's Workouts */}
      {todaysWorkouts && todaysWorkouts.length > 0 ? (
        <div className={`border-t-2 ${config.border} pt-4`}>
          <div className="flex items-center gap-2 mb-3">
            <Activity className={`w-4 h-4 ${config.iconColor}`} />
            <p className={`text-sm font-bold ${config.text}`}>
              Today's Training:
            </p>
          </div>
          <div className="space-y-2">
            {todaysWorkouts.map((workout, idx) => (
              <div 
                key={idx} 
                className={`${config.bgDark} rounded-lg p-3 border ${config.border}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className={`font-semibold ${sizes.text} ${config.text}`}>
                    {workout.name || workout.type}
                  </p>
                  <span className={`text-xs px-2 py-1 rounded ${config.bgDark} border ${config.border}`}>
                    {workout.type}
                  </span>
                </div>
                <div className="flex gap-4 text-xs">
                  <span className={config.textLight}>
                    <strong>Duration:</strong> {workout.analysis?.duration?.toFixed(1) || 0}hrs
                  </span>
                  <span className={config.textLight}>
                    <strong>TSS:</strong> {workout.analysis?.tss || 0}
                  </span>
                  <span className={config.textLight}>
                    <strong>Intensity:</strong> {workout.analysis?.intensity || 'moderate'}
                  </span>
                </div>
                {workout.analysis?.carbsNeeded > 0 && (
                  <p className={`text-xs ${config.textLight} mt-2`}>
                    💡 <strong>Carbs for this workout:</strong> {workout.analysis.carbsNeeded}g 
                    ({workout.analysis.carbsDuringWorkout}g during + {workout.analysis.recoveryCarbs}g recovery)
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className={`border-t-2 ${config.border} pt-4`}>
          <p className={`text-sm ${config.textLight} text-center`}>
            <strong>Rest Day</strong> - No workouts scheduled
          </p>
        </div>
      )}

      {/* Weekly Summary (if available) */}
      {trainingData.weeklyTSS !== undefined && (
        <div className={`${config.bgDark} rounded-lg p-3 mt-4`}>
          <p className={`text-xs ${config.textLight} mb-2`}>
            <strong>Weekly Training Load:</strong>
          </p>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <p className={`font-bold ${config.text}`}>{trainingData.weeklyTSS}</p>
              <p className={config.textLight}>TSS</p>
            </div>
            <div>
              <p className={`font-bold ${config.text}`}>{trainingData.weeklyDuration?.toFixed(1)}hrs</p>
              <p className={config.textLight}>Duration</p>
            </div>
            <div>
              <p className={`font-bold ${config.text}`}>{trainingData.workoutCount || 0}</p>
              <p className={config.textLight}>Workouts</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrafficLightIndicator;
