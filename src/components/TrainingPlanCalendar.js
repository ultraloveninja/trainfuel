// src/components/TrainingPlanCalendar.js
import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Play, Download, FileText, Calendar as CalendarIcon } from 'lucide-react';

const TrainingPlanCalendar = ({ userSettings }) => {
  const [trainingPlan, setTrainingPlan] = useState(() => {
    const saved = localStorage.getItem('trainfuel_training_plan');
    if (!saved) return null;
    
    const parsed = JSON.parse(saved);
    // Convert startDate strings back to Date objects
    return parsed.map(week => ({
      ...week,
      startDate: new Date(week.startDate)
    }));
  });
  const [currentWeek, setCurrentWeek] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [raceDate, setRaceDate] = useState(() => {
    const saved = localStorage.getItem('trainfuel_race_date');
    return saved || userSettings?.goals?.targetDate || '';
  });

  // Save training plan to localStorage
  useEffect(() => {
    if (trainingPlan) {
      localStorage.setItem('trainfuel_training_plan', JSON.stringify(trainingPlan));
    }
  }, [trainingPlan]);

  useEffect(() => {
    if (raceDate) {
      localStorage.setItem('trainfuel_race_date', raceDate);
    }
  }, [raceDate]);

  const generatePlan = () => {
    if (!raceDate) {
      alert('Please set a race date first!');
      return;
    }

    setGenerating(true);
    
    const race = new Date(raceDate);
    const startDate = new Date(race);
    startDate.setDate(startDate.getDate() - (20 * 7));
    
    const plan = [];
    const phases = [
      { name: 'Base 1', weeks: 4, focus: 'Building aerobic base' },
      { name: 'Base 2', weeks: 4, focus: 'Increasing volume' },
      { name: 'Build 1', weeks: 4, focus: 'Adding intensity' },
      { name: 'Build 2', weeks: 4, focus: 'Race-specific work' },
      { name: 'Peak', weeks: 2, focus: 'High intensity, lower volume' },
      { name: 'Taper', weeks: 2, focus: 'Recovery for race day' }
    ];
    
    let weekCounter = 0;
    let currentDate = new Date(startDate);
    
    phases.forEach(phase => {
      for (let i = 0; i < phase.weeks; i++) {
        const week = {
          weekNumber: weekCounter + 1,
          phase: phase.name,
          focus: phase.focus,
          startDate: new Date(currentDate),
          workouts: generateWeekWorkouts(weekCounter, phase.name)
        };
        
        plan.push(week);
        currentDate.setDate(currentDate.getDate() + 7);
        weekCounter++;
      }
    });
    
    setTrainingPlan(plan);
    setCurrentWeek(0);
    setGenerating(false);
  };

  const generateWeekWorkouts = (weekNum, phase) => {
    const workoutTemplates = {
      'Base 1': [
        { day: 'Monday', type: 'Swim', duration: '45min', description: 'Easy aerobic swim - 2000m', intensity: 'Easy', tss: 45 },
        { day: 'Tuesday', type: 'Bike', duration: '60min', description: 'Endurance ride, Zone 2', intensity: 'Moderate', tss: 55 },
        { day: 'Wednesday', type: 'Run', duration: '40min', description: 'Easy run with strides', intensity: 'Easy', tss: 40 },
        { day: 'Thursday', type: 'Swim', duration: '45min', description: 'Technique focus - drills', intensity: 'Easy', tss: 40 },
        { day: 'Friday', type: 'Strength', duration: '45min', description: 'Full body strength training', intensity: 'Moderate', tss: 35 },
        { day: 'Saturday', type: 'Bike', duration: '90min', description: 'Long endurance ride', intensity: 'Moderate', tss: 80 },
        { day: 'Sunday', type: 'Run', duration: '60min', description: 'Long easy run', intensity: 'Easy', tss: 55 }
      ],
      'Base 2': [
        { day: 'Monday', type: 'Swim', duration: '50min', description: 'Aerobic swim - 2500m', intensity: 'Moderate', tss: 55 },
        { day: 'Tuesday', type: 'Bike', duration: '75min', description: 'Tempo intervals 3x10min', intensity: 'Hard', tss: 75 },
        { day: 'Wednesday', type: 'Run', duration: '45min', description: 'Easy run', intensity: 'Easy', tss: 45 },
        { day: 'Thursday', type: 'Swim', duration: '50min', description: 'Threshold work - 2500m', intensity: 'Hard', tss: 65 },
        { day: 'Friday', type: 'Strength', duration: '45min', description: 'Lower body focus', intensity: 'Moderate', tss: 35 },
        { day: 'Saturday', type: 'Bike', duration: '120min', description: 'Long ride with tempo', intensity: 'Moderate', tss: 100 },
        { day: 'Sunday', type: 'Run', duration: '75min', description: 'Long run building pace', intensity: 'Moderate', tss: 70 }
      ],
      'Build 1': [
        { day: 'Monday', type: 'Swim', duration: '55min', description: 'Threshold intervals - 3000m', intensity: 'Hard', tss: 70 },
        { day: 'Tuesday', type: 'Bike', duration: '90min', description: 'Sweet spot intervals 4x12min', intensity: 'Hard', tss: 90 },
        { day: 'Wednesday', type: 'Run', duration: '50min', description: 'Tempo run 30min @ threshold', intensity: 'Hard', tss: 60 },
        { day: 'Thursday', type: 'Swim', duration: '50min', description: 'Recovery swim - 2500m', intensity: 'Easy', tss: 45 },
        { day: 'Friday', type: 'Strength', duration: '45min', description: 'Maintenance strength', intensity: 'Moderate', tss: 35 },
        { day: 'Saturday', type: 'Brick', duration: '150min', description: 'Bike 2hr + Run 30min', intensity: 'Hard', tss: 130 },
        { day: 'Sunday', type: 'Run', duration: '90min', description: 'Long run with race pace segments', intensity: 'Moderate', tss: 85 }
      ],
      'Build 2': [
        { day: 'Monday', type: 'Swim', duration: '60min', description: 'Race pace intervals - 3500m', intensity: 'Hard', tss: 75 },
        { day: 'Tuesday', type: 'Bike', duration: '90min', description: 'Threshold intervals at race watts', intensity: 'Hard', tss: 95 },
        { day: 'Wednesday', type: 'Run', duration: '60min', description: 'Race pace practice', intensity: 'Hard', tss: 70 },
        { day: 'Thursday', type: 'Swim', duration: '45min', description: 'Easy technique - 2000m', intensity: 'Easy', tss: 40 },
        { day: 'Friday', type: 'Rest', duration: '0min', description: 'Complete rest day', intensity: 'Rest', tss: 0 },
        { day: 'Saturday', type: 'Brick', duration: '180min', description: 'Race simulation: Bike 2.5hr + Run 45min', intensity: 'Hard', tss: 150 },
        { day: 'Sunday', type: 'Recovery', duration: '45min', description: 'Easy swim or bike', intensity: 'Easy', tss: 35 }
      ],
      'Peak': [
        { day: 'Monday', type: 'Swim', duration: '45min', description: 'Short high intensity - 2000m', intensity: 'Very Hard', tss: 65 },
        { day: 'Tuesday', type: 'Bike', duration: '75min', description: 'VO2max intervals 5x5min', intensity: 'Very Hard', tss: 85 },
        { day: 'Wednesday', type: 'Run', duration: '45min', description: '5k tempo with race pace', intensity: 'Hard', tss: 60 },
        { day: 'Thursday', type: 'Swim', duration: '40min', description: 'Easy recovery - 1500m', intensity: 'Easy', tss: 35 },
        { day: 'Friday', type: 'Rest', duration: '0min', description: 'Complete rest', intensity: 'Rest', tss: 0 },
        { day: 'Saturday', type: 'Brick', duration: '120min', description: 'Short intense brick 90min bike + 20min run', intensity: 'Hard', tss: 110 },
        { day: 'Sunday', type: 'Run', duration: '60min', description: 'Moderate long run', intensity: 'Moderate', tss: 60 }
      ],
      'Taper': [
        { day: 'Monday', type: 'Swim', duration: '30min', description: 'Easy swim - 1200m', intensity: 'Easy', tss: 25 },
        { day: 'Tuesday', type: 'Bike', duration: '45min', description: 'Easy spin with 3x3min at race pace', intensity: 'Easy', tss: 35 },
        { day: 'Wednesday', type: 'Run', duration: '30min', description: 'Easy run with 4x1min pickups', intensity: 'Easy', tss: 30 },
        { day: 'Thursday', type: 'Swim', duration: '20min', description: 'Super easy - 800m', intensity: 'Easy', tss: 20 },
        { day: 'Friday', type: 'Rest', duration: '0min', description: 'Complete rest', intensity: 'Rest', tss: 0 },
        { day: 'Saturday', type: 'Shakeout', duration: '20min', description: 'Very easy 15min swim or bike', intensity: 'Easy', tss: 15 },
        { day: 'Sunday', type: 'Race', duration: '300min', description: 'RACE DAY! Half Ironman 70.3', intensity: 'Race', tss: 250 }
      ]
    };
    
    return workoutTemplates[phase] || workoutTemplates['Base 1'];
  };

  const exportToGarmin = () => {
    if (!trainingPlan) return;
    
    let csv = 'Date,Workout Name,Sport,Duration,Description,Intensity,TSS\n';
    
    trainingPlan.forEach(week => {
      week.workouts.forEach((workout, idx) => {
        const workoutDate = new Date(week.startDate);
        workoutDate.setDate(workoutDate.getDate() + idx);
        const dateStr = workoutDate.toISOString().split('T')[0];
        
        csv += `${dateStr},"Week ${week.weekNumber} - ${workout.type}",${workout.type},${workout.duration},"${workout.description}",${workout.intensity},${workout.tss}\n`;
      });
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trainfuel-plan-${raceDate}.csv`;
    a.click();
  };

  const exportWeeklyText = (week) => {
    let text = `Week ${week.weekNumber} - ${week.phase}\n`;
    text += `Focus: ${week.focus}\n`;
    text += `Weekly TSS: ${week.workouts.reduce((sum, w) => sum + (w.tss || 0), 0)}\n\n`;
    
    week.workouts.forEach((workout, idx) => {
      const workoutDate = new Date(week.startDate);
      workoutDate.setDate(workoutDate.getDate() + idx);
      text += `${workout.day} (${workoutDate.toLocaleDateString()})\n`;
      text += `${workout.type} - ${workout.duration}\n`;
      text += `${workout.description}\n`;
      text += `Intensity: ${workout.intensity} | TSS: ${workout.tss}\n\n`;
    });
    
    navigator.clipboard.writeText(text);
    alert('Week copied to clipboard! Paste into Garmin Connect.');
  };

  const getIntensityColor = (intensity) => {
    const colors = {
      'Easy': 'bg-green-100 text-green-800 border-green-200',
      'Moderate': 'bg-blue-100 text-blue-800 border-blue-200',
      'Hard': 'bg-orange-100 text-orange-800 border-orange-200',
      'Very Hard': 'bg-red-100 text-red-800 border-red-200',
      'Rest': 'bg-gray-100 text-gray-800 border-gray-200',
      'Race': 'bg-purple-100 text-purple-800 border-purple-200'
    };
    return colors[intensity] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getSportIcon = (type) => {
    const icons = {
      'Swim': '🏊',
      'Bike': '🚴',
      'Run': '🏃',
      'Brick': '🧱',
      'Strength': '💪',
      'Rest': '😴',
      'Recovery': '🔄',
      'Shakeout': '✨',
      'Race': '🏆'
    };
    return icons[type] || '📋';
  };

  const getWeeklyTSS = (week) => {
    return week.workouts.reduce((sum, workout) => sum + (workout.tss || 0), 0);
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <CalendarIcon className="w-7 h-7 text-blue-600" />
              20-Week Training Plan
            </h2>
            <p className="text-gray-600 mt-1">Structured Half Ironman preparation</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Race Date
            </label>
            <input
              type="date"
              value={raceDate}
              onChange={(e) => setRaceDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="flex items-end">
            <button
              onClick={generatePlan}
              disabled={generating || !raceDate}
              className="w-full bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="w-4 h-4" />
              {generating ? 'Generating...' : trainingPlan ? 'Regenerate Plan' : 'Generate Plan'}
            </button>
          </div>

          {trainingPlan && (
            <div className="flex items-end">
              <button
                onClick={exportToGarmin}
                className="w-full bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Training Plan Display */}
      {trainingPlan ? (
        <>
          {/* Week Navigation */}
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 flex items-center justify-between">
            <button
              onClick={() => setCurrentWeek(Math.max(0, currentWeek - 1))}
              disabled={currentWeek === 0}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            
            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-900">
                Week {trainingPlan[currentWeek].weekNumber} - {trainingPlan[currentWeek].phase}
              </h3>
              <p className="text-gray-600 text-sm mt-1">
                {trainingPlan[currentWeek].startDate.toLocaleDateString()} • {trainingPlan[currentWeek].focus}
              </p>
              <p className="text-sm text-blue-600 font-medium mt-1">
                Weekly TSS: {getWeeklyTSS(trainingPlan[currentWeek])}
              </p>
            </div>
            
            <button
              onClick={() => setCurrentWeek(Math.min(trainingPlan.length - 1, currentWeek + 1))}
              disabled={currentWeek === trainingPlan.length - 1}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          {/* Current Week Workouts */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900">Weekly Schedule</h4>
              <button
                onClick={() => exportWeeklyText(trainingPlan[currentWeek])}
                className="text-sm bg-gray-100 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Copy Week
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {trainingPlan[currentWeek].workouts.map((workout, idx) => {
                const workoutDate = new Date(trainingPlan[currentWeek].startDate);
                workoutDate.setDate(workoutDate.getDate() + idx);
                
                return (
                  <div 
                    key={idx} 
                    className="border-2 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">{workout.day}</span>
                      <span className="text-2xl">{getSportIcon(workout.type)}</span>
                    </div>
                    
                    <div className="text-xs text-gray-500 mb-2">
                      {workoutDate.toLocaleDateString()}
                    </div>
                    
                    <h5 className="font-semibold text-gray-900 mb-1">{workout.type}</h5>
                    <p className="text-sm text-gray-600 mb-2">{workout.duration}</p>
                    <p className="text-xs text-gray-500 mb-3 line-clamp-2">{workout.description}</p>
                    
                    <div className="flex items-center justify-between">
                      <span className={`inline-block text-xs px-2 py-1 rounded border ${getIntensityColor(workout.intensity)}`}>
                        {workout.intensity}
                      </span>
                      <span className="text-xs font-medium text-gray-600">
                        TSS: {workout.tss}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Phase Overview */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Training Phases Overview</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { name: 'Base 1', weeks: '1-4', color: 'bg-green-100 border-green-200', focus: 'Build aerobic foundation' },
                { name: 'Base 2', weeks: '5-8', color: 'bg-green-200 border-green-300', focus: 'Increase volume steadily' },
                { name: 'Build 1', weeks: '9-12', color: 'bg-blue-100 border-blue-200', focus: 'Add intensity and speed' },
                { name: 'Build 2', weeks: '13-16', color: 'bg-blue-200 border-blue-300', focus: 'Race-specific training' },
                { name: 'Peak', weeks: '17-18', color: 'bg-orange-100 border-orange-200', focus: 'Maximum intensity' },
                { name: 'Taper', weeks: '19-20', color: 'bg-purple-100 border-purple-200', focus: 'Rest and race prep' }
              ].map((phase, idx) => (
                <div key={idx} className={`${phase.color} border-2 rounded-lg p-4`}>
                  <h5 className="font-semibold text-gray-900 mb-1">{phase.name}</h5>
                  <p className="text-sm text-gray-600 mb-2">Weeks {phase.weeks}</p>
                  <p className="text-xs text-gray-700">{phase.focus}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Getting Started</h3>
          <ol className="list-decimal list-inside space-y-2 text-blue-800 text-sm mb-4">
            <li>Enter your Half Ironman race date above</li>
            <li>Click "Generate Plan" to create your 20-week schedule</li>
            <li>Navigate through weeks to see all workouts</li>
            <li>Export full plan or copy individual weeks for Garmin Connect</li>
          </ol>
          
          <div className="mt-4 p-4 bg-white rounded-lg border border-blue-200">
            <h4 className="font-semibold text-gray-900 mb-2">💡 Garmin Connect Import:</h4>
            <p className="text-sm text-gray-700 mb-2">
              Click "Copy Week" to grab a week's workouts, then manually add them to your Garmin Connect calendar.
            </p>
            <p className="text-sm text-gray-700">
              Or export the full CSV as a reference guide for all 20 weeks.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainingPlanCalendar;