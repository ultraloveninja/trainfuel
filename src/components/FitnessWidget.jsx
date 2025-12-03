// src/components/FitnessWidget.jsx
// Display fitness metrics from Intervals.icu (CTL/ATL/TSB)
// These metrics help understand training load and recovery needs

import React from 'react';
import { TrendingUp, Activity, Battery, AlertCircle } from 'lucide-react';

const FitnessWidget = ({ fitness }) => {
  if (!fitness || (!fitness.ctl && !fitness.atl && !fitness.tsb)) {
    return (
      <div className="bg-gray-100 border-2 border-gray-300 rounded-lg p-4">
        <p className="text-gray-600 text-sm text-center">
          Connect Intervals.icu to see your fitness metrics
        </p>
      </div>
    );
  }

  const ctl = fitness.ctl || 0;
  const atl = fitness.atl || 0;
  const tsb = fitness.tsb || 0;

  // Determine form status from TSB
  const getFormStatus = (tsb) => {
    if (tsb > 25) return {
      status: 'Fresh',
      color: 'green',
      message: 'Well rested - good time for hard efforts',
      icon: Battery
    };
    if (tsb > 5) return {
      status: 'Optimal',
      color: 'blue',
      message: 'Perfect balance - maintain current training',
      icon: TrendingUp
    };
    if (tsb > -10) return {
      status: 'Productive',
      color: 'yellow',
      message: 'Slight fatigue - building fitness',
      icon: Activity
    };
    if (tsb > -30) return {
      status: 'Overreaching',
      color: 'orange',
      message: 'Significant fatigue - consider recovery',
      icon: AlertCircle
    };
    return {
      status: 'Overtraining',
      color: 'red',
      message: 'High fatigue - recovery needed',
      icon: AlertCircle
    };
  };

  const formStatus = getFormStatus(tsb);
  const StatusIcon = formStatus.icon;

  // Color configurations
  const colorConfig = {
    green: {
      bg: 'bg-green-50',
      border: 'border-green-500',
      text: 'text-green-900',
      textLight: 'text-green-700',
      iconColor: 'text-green-600'
    },
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-500',
      text: 'text-blue-900',
      textLight: 'text-blue-700',
      iconColor: 'text-blue-600'
    },
    yellow: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-500',
      text: 'text-yellow-900',
      textLight: 'text-yellow-700',
      iconColor: 'text-yellow-600'
    },
    orange: {
      bg: 'bg-orange-50',
      border: 'border-orange-500',
      text: 'text-orange-900',
      textLight: 'text-orange-700',
      iconColor: 'text-orange-600'
    },
    red: {
      bg: 'bg-red-50',
      border: 'border-red-500',
      text: 'text-red-900',
      textLight: 'text-red-700',
      iconColor: 'text-red-600'
    }
  };

  const config = colorConfig[formStatus.color];

  // Determine fitness level from CTL
  const getFitnessLevel = (ctl) => {
    if (ctl > 100) return 'Elite';
    if (ctl > 80) return 'Advanced';
    if (ctl > 60) return 'Intermediate';
    if (ctl > 40) return 'Developing';
    return 'Beginner';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">Training Status</h3>
        <span className="text-xs text-gray-500">from Intervals.icu</span>
      </div>

      {/* Form Status Card */}
      <div className={`${config.bg} ${config.border} border-2 rounded-lg p-4 mb-4`}>
        <div className="flex items-center gap-3 mb-2">
          <StatusIcon className={`w-6 h-6 ${config.iconColor}`} />
          <div>
            <h4 className={`font-bold ${config.text}`}>{formStatus.status}</h4>
            <p className={`text-sm ${config.textLight}`}>{formStatus.message}</p>
          </div>
        </div>
        
        {/* TSB Bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className={config.textLight}>Form (TSB)</span>
            <span className={`font-bold ${config.text}`}>{tsb > 0 ? '+' : ''}{Math.round(tsb)}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all ${
                tsb > 0 ? 'bg-green-500' : 'bg-orange-500'
              }`}
              style={{ 
                width: `${Math.min(Math.abs(tsb / 50) * 100, 100)}%`,
                marginLeft: tsb > 0 ? '50%' : '0',
                transform: tsb < 0 ? 'scaleX(-1)' : 'none'
              }}
            />
          </div>
        </div>
      </div>

      {/* Fitness Metrics Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* CTL (Fitness) */}
        <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-semibold text-blue-900">FITNESS</span>
          </div>
          <p className="text-3xl font-bold text-blue-900">{Math.round(ctl)}</p>
          <p className="text-xs text-blue-700 mt-1">CTL</p>
          <p className="text-xs text-blue-600 mt-1">{getFitnessLevel(ctl)}</p>
        </div>

        {/* ATL (Fatigue) */}
        <div className="bg-orange-50 rounded-lg p-4 border-2 border-orange-200">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-orange-600" />
            <span className="text-xs font-semibold text-orange-900">FATIGUE</span>
          </div>
          <p className="text-3xl font-bold text-orange-900">{Math.round(atl)}</p>
          <p className="text-xs text-orange-700 mt-1">ATL</p>
          <p className="text-xs text-orange-600 mt-1">
            {atl > ctl ? 'High' : 'Manageable'}
          </p>
        </div>
      </div>

      {/* Info Section */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <h4 className="text-xs font-semibold text-gray-900 mb-2">What This Means:</h4>
        <ul className="text-xs text-gray-700 space-y-1">
          <li><strong>Fitness (CTL):</strong> Your chronic training load - higher is fitter</li>
          <li><strong>Fatigue (ATL):</strong> Recent training stress - needs recovery</li>
          <li><strong>Form (TSB):</strong> Fitness minus Fatigue - readiness to perform</li>
        </ul>
      </div>

      {/* Nutrition Adjustment Based on Form */}
      <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
        <h4 className="text-xs font-semibold text-purple-900 mb-2">
          💡 Nutrition Adjustment:
        </h4>
        <p className="text-xs text-purple-700">
          {tsb < -20 && 'High fatigue - increase calories and carbs for recovery'}
          {tsb >= -20 && tsb < 0 && 'Building fitness - maintain current nutrition'}
          {tsb >= 0 && tsb < 15 && 'Good balance - stick with your plan'}
          {tsb >= 15 && 'Well rested - fuel up for hard training ahead'}
        </p>
      </div>
    </div>
  );
};

export default FitnessWidget;
