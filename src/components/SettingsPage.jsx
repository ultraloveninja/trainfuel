import React, { useState, useEffect } from 'react';
import { Settings, User, Target, Utensils, Calendar, Bell, Save, Check, X } from 'lucide-react';

const SettingsPage = ({ onSave }) => {
  const [settings, setSettings] = useState({
    profile: {
      name: '',
      age: 46,
      height: '6\'2"',
      weight: 204,
      gender: 'male'
    },
    goals: {
      primaryGoal: 'weight_loss',
      targetWeight: 195,
      targetDate: '',
      currentPhase: 'in_season'
    },
    foodPreferences: {
      dietType: 'balanced',
      restrictions: [],
      allergies: [],
      favoriteFoods: [],
      dislikedFoods: [],
      mealPrepDay: 'sunday',
      cookingTime: 'moderate'
    },
    trainingPreferences: {
      preferredTime: 'morning',
      alternativeTime: 'afternoon',
      weeklyHours: 8,
      raceDistance: 'half_ironman'
    },
    notifications: {
      mealReminders: true,
      workoutReminders: true,
      hydrationReminders: true,
      reminderTime: '07:00'
    },
    apiKeys: {
      stravaClientId: '',
      stravaClientSecret: '',
      garminKey: ''
    }
  });

  const [saveStatus, setSaveStatus] = useState('');
  const [activeTab, setActiveTab] = useState('profile');

  // Load saved settings on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('trainfuelSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('trainfuelSettings', JSON.stringify(settings));
    setSaveStatus('saved');
    if (onSave) {
      onSave(settings);
    }
    setTimeout(() => setSaveStatus(''), 3000);
  };

  const updateSettings = (category, field, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }));
  };

  const toggleArrayItem = (category, field, item) => {
    setSettings(prev => {
      const currentArray = prev[category][field] || [];
      const newArray = currentArray.includes(item)
        ? currentArray.filter(i => i !== item)
        : [...currentArray, item];
      
      return {
        ...prev,
        [category]: {
          ...prev[category],
          [field]: newArray
        }
      };
    });
  };

  const dietaryRestrictions = [
    'Vegetarian',
    'Vegan',
    'Gluten-Free',
    'Dairy-Free',
    'Keto',
    'Paleo',
    'Low-Carb',
    'Low-Sodium'
  ];

  const commonAllergies = [
    'Nuts',
    'Shellfish',
    'Eggs',
    'Soy',
    'Fish',
    'Wheat',
    'Milk'
  ];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="border-b p-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Settings className="w-6 h-6" />
              Settings
            </h1>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              Save Changes
              {saveStatus === 'saved' && <Check className="w-4 h-4 ml-1" />}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <div className="flex">
            {[
              { id: 'profile', label: 'Profile', icon: User },
              { id: 'goals', label: 'Goals', icon: Target },
              { id: 'food', label: 'Food Preferences', icon: Utensils },
              { id: 'training', label: 'Training', icon: Calendar },
              { id: 'notifications', label: 'Notifications', icon: Bell }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold mb-4">Personal Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={settings.profile.name}
                    onChange={(e) => updateSettings('profile', 'name', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Age
                  </label>
                  <input
                    type="number"
                    value={settings.profile.age}
                    onChange={(e) => updateSettings('profile', 'age', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Height
                  </label>
                  <input
                    type="text"
                    value={settings.profile.height}
                    onChange={(e) => updateSettings('profile', 'height', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Weight (lbs)
                  </label>
                  <input
                    type="number"
                    value={settings.profile.weight}
                    onChange={(e) => updateSettings('profile', 'weight', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gender
                  </label>
                  <select
                    value={settings.profile.gender}
                    onChange={(e) => updateSettings('profile', 'gender', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Goals Tab */}
          {activeTab === 'goals' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold mb-4">Training Goals</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Primary Goal
                  </label>
                  <select
                    value={settings.goals.primaryGoal}
                    onChange={(e) => updateSettings('goals', 'primaryGoal', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="weight_loss">Weight Loss</option>
                    <option value="performance">Performance</option>
                    <option value="maintain">Maintain</option>
                    <option value="muscle_gain">Muscle Gain</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Weight (lbs)
                  </label>
                  <input
                    type="number"
                    value={settings.goals.targetWeight}
                    onChange={(e) => updateSettings('goals', 'targetWeight', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Date
                  </label>
                  <input
                    type="date"
                    value={settings.goals.targetDate}
                    onChange={(e) => updateSettings('goals', 'targetDate', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Training Phase
                  </label>
                  <select
                    value={settings.goals.currentPhase}
                    onChange={(e) => updateSettings('goals', 'currentPhase', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="in_season">In Season</option>
                    <option value="off_season">Off Season</option>
                    <option value="pre_season">Pre Season</option>
                    <option value="recovery">Recovery</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Food Preferences Tab */}
          {activeTab === 'food' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold mb-4">Food & Nutrition Preferences</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Diet Type
                </label>
                <select
                  value={settings.foodPreferences.dietType}
                  onChange={(e) => updateSettings('foodPreferences', 'dietType', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="balanced">Balanced</option>
                  <option value="high_protein">High Protein</option>
                  <option value="mediterranean">Mediterranean</option>
                  <option value="plant_based">Plant-Based</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dietary Restrictions
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {dietaryRestrictions.map(restriction => (
                    <label key={restriction} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={settings.foodPreferences.restrictions.includes(restriction)}
                        onChange={() => toggleArrayItem('foodPreferences', 'restrictions', restriction)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm">{restriction}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Allergies
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {commonAllergies.map(allergy => (
                    <label key={allergy} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={settings.foodPreferences.allergies.includes(allergy)}
                        onChange={() => toggleArrayItem('foodPreferences', 'allergies', allergy)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm">{allergy}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Meal Prep Day
                  </label>
                  <select
                    value={settings.foodPreferences.mealPrepDay}
                    onChange={(e) => updateSettings('foodPreferences', 'mealPrepDay', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="sunday">Sunday</option>
                    <option value="monday">Monday</option>
                    <option value="saturday">Saturday</option>
                    <option value="flexible">Flexible</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cooking Time Preference
                  </label>
                  <select
                    value={settings.foodPreferences.cookingTime}
                    onChange={(e) => updateSettings('foodPreferences', 'cookingTime', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="quick">Quick (&lt; 30 min)</option>
                    <option value="moderate">Moderate (30-60 min)</option>
                    <option value="extended">Extended (60+ min)</option>
                  </select>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <strong>Nick Chase Nutrition Principle:</strong> Focus on liquid nutrition during training, 
                  protein timing around workouts, and vegetable-heavy dinners for optimal performance and recovery.
                </p>
              </div>
            </div>
          )}

          {/* Training Tab */}
          {activeTab === 'training' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold mb-4">Training Preferences</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preferred Training Time
                  </label>
                  <select
                    value={settings.trainingPreferences.preferredTime}
                    onChange={(e) => updateSettings('trainingPreferences', 'preferredTime', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="early_morning">Early Morning (5-7 AM)</option>
                    <option value="morning">Morning (7-9 AM)</option>
                    <option value="lunch">Lunch (11 AM-1 PM)</option>
                    <option value="afternoon">Afternoon (2-4 PM)</option>
                    <option value="evening">Evening (5-7 PM)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Alternative Training Time
                  </label>
                  <select
                    value={settings.trainingPreferences.alternativeTime}
                    onChange={(e) => updateSettings('trainingPreferences', 'alternativeTime', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="early_morning">Early Morning (5-7 AM)</option>
                    <option value="morning">Morning (7-9 AM)</option>
                    <option value="lunch">Lunch (11 AM-1 PM)</option>
                    <option value="afternoon">Afternoon (2-4 PM)</option>
                    <option value="evening">Evening (5-7 PM)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Weekly Training Hours
                  </label>
                  <input
                    type="number"
                    value={settings.trainingPreferences.weeklyHours}
                    onChange={(e) => updateSettings('trainingPreferences', 'weeklyHours', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Primary Race Distance
                  </label>
                  <select
                    value={settings.trainingPreferences.raceDistance}
                    onChange={(e) => updateSettings('trainingPreferences', 'raceDistance', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="sprint">Sprint Triathlon</option>
                    <option value="olympic">Olympic</option>
                    <option value="half_ironman">Half Ironman</option>
                    <option value="ironman">Ironman</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold mb-4">Notification Preferences</h2>
              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                  <span className="font-medium">Meal Reminders</span>
                  <input
                    type="checkbox"
                    checked={settings.notifications.mealReminders}
                    onChange={(e) => updateSettings('notifications', 'mealReminders', e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                </label>
                <label className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                  <span className="font-medium">Workout Reminders</span>
                  <input
                    type="checkbox"
                    checked={settings.notifications.workoutReminders}
                    onChange={(e) => updateSettings('notifications', 'workoutReminders', e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                </label>
                <label className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                  <span className="font-medium">Hydration Reminders</span>
                  <input
                    type="checkbox"
                    checked={settings.notifications.hydrationReminders}
                    onChange={(e) => updateSettings('notifications', 'hydrationReminders', e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default Reminder Time
                </label>
                <input
                  type="time"
                  value={settings.notifications.reminderTime}
                  onChange={(e) => updateSettings('notifications', 'reminderTime', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;