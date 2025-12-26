import React, { useState, useEffect } from 'react';
import { Settings, User, Target, Utensils, Calendar, Bell, Save, Check, X, Link as LinkIcon } from 'lucide-react';
import intervalsService from '../services/intervalsService';

const SettingsPage = ({ onSave }) => {
  const [settings, setSettings] = useState({
    profile: {
      name: '',
      age: 46,
      height: '6\'2"',
      weight: 204,
      gender: 'male',
      ftp: 200,
      runPace: '5:00',
      poolType: '25-yards'
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
  const [intervalsConnected, setIntervalsConnected] = useState(false);
  const [intervalsProfile, setIntervalsProfile] = useState(null);
  const [showIntervalsSetup, setShowIntervalsSetup] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [athleteId, setAthleteId] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState(null);

  // Load saved settings on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('trainfuelSettings');
    let loadedSettings = savedSettings ? JSON.parse(savedSettings) : settings;

    // Check intervals.icu connection status
    if (intervalsService.isConfigured()) {
      setIntervalsConnected(true);
      const storedProfile = localStorage.getItem('intervals_athlete_profile');
      if (storedProfile) {
        const profile = JSON.parse(storedProfile);
        setIntervalsProfile(profile);

        // Auto-populate settings from intervals.icu if fields are empty or unset
        if (profile.name && (!loadedSettings.profile.name || loadedSettings.profile.name === '')) {
          loadedSettings.profile.name = profile.name;
        }
        if (profile.weight && (!loadedSettings.profile.weight || loadedSettings.profile.weight === 0)) {
          loadedSettings.profile.weight = Math.round(profile.weight * 2.20462); // kg to lbs
        }
        if (profile.ftp && (!loadedSettings.profile.ftp || loadedSettings.profile.ftp === 0)) {
          loadedSettings.profile.ftp = profile.ftp;
        }
      }
    }

    setSettings(loadedSettings);
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

  const handleIntervalsConnect = async () => {
    setConnectionError(null);
    setIsConnecting(true);

    try {
      // Save credentials
      intervalsService.setCredentials(apiKey, athleteId);

      // Test the connection
      const isValid = await intervalsService.testConnection();

      if (isValid) {
        // Fetch athlete profile
        const profile = await intervalsService.getAthleteProfile();
        setIntervalsProfile(profile);
        setIntervalsConnected(true);
        setShowIntervalsSetup(false);

        // Auto-populate settings from intervals.icu
        if (profile.weight) {
          updateSettings('profile', 'weight', Math.round(profile.weight * 2.20462)); // kg to lbs
        }
        if (profile.name && (!settings.profile.name || settings.profile.name === '')) {
          updateSettings('profile', 'name', profile.name);
        }
        if (profile.ftp) {
          updateSettings('profile', 'ftp', profile.ftp);
        }

        // Save updated settings
        setTimeout(handleSave, 100);
      } else {
        throw new Error('Invalid credentials');
      }
    } catch (err) {
      setConnectionError(err.message || 'Failed to connect');
      intervalsService.clearCredentials();
    } finally {
      setIsConnecting(false);
    }
  };

  const handleIntervalsDisconnect = () => {
    if (window.confirm('Are you sure you want to disconnect from Intervals.icu?')) {
      intervalsService.clearCredentials();
      setIntervalsConnected(false);
      setIntervalsProfile(null);
    }
  };

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
              { id: 'integrations', label: 'Integrations', icon: LinkIcon },
              { id: 'profile', label: 'Profile', icon: User },
              { id: 'goals', label: 'Goals', icon: Target },
              { id: 'food', label: 'Food Preferences', icon: Utensils },
              { id: 'training', label: 'Training', icon: Calendar },
              { id: 'notifications', label: 'Notifications', icon: Bell }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${activeTab === tab.id
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
          {/* Integrations Tab */}
          {activeTab === 'integrations' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold mb-4">Data Integrations</h2>

              {/* Intervals.icu Section */}
              <div className="border rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">Intervals.icu</h3>
                    <p className="text-sm text-gray-600">Connect your Intervals.icu account for comprehensive training data</p>
                  </div>
                  {intervalsConnected && (
                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                      Connected
                    </span>
                  )}
                </div>

                {intervalsConnected && intervalsProfile ? (
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Name:</span>
                          <span className="ml-2 font-medium">{intervalsProfile.name}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Athlete ID:</span>
                          <span className="ml-2 font-medium">{intervalsProfile.id}</span>
                        </div>
                        {intervalsProfile.ftp && (
                          <div>
                            <span className="text-gray-600">FTP:</span>
                            <span className="ml-2 font-medium">{intervalsProfile.ftp}W</span>
                          </div>
                        )}
                        {intervalsProfile.weight && (
                          <div>
                            <span className="text-gray-600">Weight:</span>
                            <span className="ml-2 font-medium">{intervalsProfile.weight}kg ({intervalsProfile.weightInLbs}lbs)</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={handleIntervalsDisconnect}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Disconnect
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {!showIntervalsSetup ? (
                      <button
                        onClick={() => setShowIntervalsSetup(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        Connect to Intervals.icu
                      </button>
                    ) : (
                      <div className="space-y-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h4 className="font-semibold text-blue-900 mb-2">How to get your credentials:</h4>
                          <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                            <li>Go to <a href="https://intervals.icu/settings" target="_blank" rel="noopener noreferrer" className="underline">intervals.icu/settings</a></li>
                            <li>Scroll down to "Developer Settings"</li>
                            <li>Click "Generate API Key" and copy it</li>
                            <li>Copy your Athlete ID (starts with "i")</li>
                          </ol>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            API Key
                          </label>
                          <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="Enter your API key"
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Athlete ID
                          </label>
                          <input
                            type="text"
                            value={athleteId}
                            onChange={(e) => setAthleteId(e.target.value)}
                            placeholder="e.g., i398037"
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        {connectionError && (
                          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                            {connectionError}
                          </div>
                        )}

                        <div className="flex gap-2">
                          <button
                            onClick={handleIntervalsConnect}
                            disabled={isConnecting || !apiKey || !athleteId}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                          >
                            {isConnecting ? 'Connecting...' : 'Connect'}
                          </button>
                          <button
                            onClick={() => setShowIntervalsSetup(false)}
                            className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-gray-600 mb-2"><strong>Why Intervals.icu?</strong></p>
                      <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                        <li>Real TSS data from power meters (not estimates)</li>
                        <li>Comprehensive Garmin data integration</li>
                        <li>Advanced training metrics (CTL, ATL, TSB)</li>
                        <li>Wellness tracking (HRV, sleep, weight)</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

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
                {/* Profile Tab */}
                {activeTab === 'profile' && (
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold mb-4">Personal Information</h2>
                    <div className="grid grid-cols-2 gap-4">
                      {/* ... existing fields (Name, Age, Height, Weight, Gender) ... */}

                      {/* ADD THESE TWO NEW FIELDS AFTER GENDER: */}

                      {/* FTP Field */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          FTP (Watts)
                        </label>
                        <input
                          type="number"
                          min="50"
                          max="500"
                          value={settings.profile.ftp || 200}
                          onChange={(e) => updateSettings('profile', 'ftp', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="200"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Functional Threshold Power for bike workouts
                        </p>
                      </div>

                      {/* Run Pace Field */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Run Pace (min/km)
                        </label>
                        <input
                          type="text"
                          value={settings.profile.runPace || '5:00'}
                          onChange={(e) => updateSettings('profile', 'runPace', e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="5:00"
                          pattern="[0-9]:[0-5][0-9]"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Format: M:SS (e.g., 5:00 for 5 min/km)
                        </p>
                      </div>
                      {/* Pool Type Field */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Pool Type
                        </label>
                        <select
                          value={settings.profile.poolType || '25-yards'}
                          onChange={(e) => updateSettings('profile', 'poolType', e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="25-yards">25 Yards (US Short Course)</option>
                          <option value="25-meters">25 Meters (Short Course)</option>
                          <option value="50-meters">50 Meters (Olympic)</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                          Select your pool length for swim workout calculations
                        </p>
                      </div>
                    </div>
                  </div>
                )}
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
                  <strong>Smart Nutrition Strategy:</strong> Carb cycle based on training load, time protein around workouts
                  for recovery, and include anti-inflammatory foods during hard training blocks.
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