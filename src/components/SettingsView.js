import React from 'react';
import PropTypes from 'prop-types';
import { RefreshCw } from 'lucide-react';

const SettingsView = ({ 
  isAuthenticated, athlete, trainingGoal, onTrainingGoalChange, dietaryRestrictions, onDietaryRestrictionsChange,
  seasonType, onSeasonTypeChange, lastSync, upcomingEvents, onClearAllEvents, onRefresh
}) => (
  <div className="space-y-6">
    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Data Sources</h2>
      <div className="space-y-4">
        <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="font-medium text-gray-900">Strava Connection
              {isAuthenticated && <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Connected</span>}
            </p>
            <p className="text-sm text-gray-600">{isAuthenticated ? `Connected as ${athlete?.firstname} ${athlete?.lastname}` : 'Connect your Strava account to import training data'}</p>
          </div>
          {isAuthenticated ? (
            <button className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50">Disconnect</button>
          ) : (
            <button className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600">Connect Strava</button>
          )}
        </div>
      </div>
    </div>

    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Nutrition Preferences</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Training Goal</label>
          <select value={trainingGoal} onChange={(e)=>onTrainingGoalChange(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg">
            <option value="Endurance Performance">Endurance Performance</option>
            <option value="Weight Loss">Weight Loss</option>
            <option value="Muscle Gain">Muscle Gain</option>
            <option value="General Fitness">General Fitness</option>
            <option value="Race Preparation">Race Preparation</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Dietary Restrictions</label>
          <input type="text" value={dietaryRestrictions} onChange={(e)=>onDietaryRestrictionsChange(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg" placeholder="e.g., vegetarian, gluten-free, dairy-free" />
          <p className="text-xs text-gray-500 mt-1">Separate multiple restrictions with commas</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Season Type</label>
          <select value={seasonType} onChange={(e)=>onSeasonTypeChange(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg">
            <option value="in-season">In-Season (Competition Period)</option>
            <option value="off-season">Off-Season (Base Building)</option>
            <option value="pre-season">Pre-Season (Build Phase)</option>
          </select>
        </div>
      </div>
    </div>

    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Data Management</h2>
      <div className="space-y-4">
        <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="font-medium text-gray-900">Clear All Events</p>
            <p className="text-sm text-gray-600">Remove all saved upcoming events</p>
          </div>
          <button onClick={onClearAllEvents} className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50" disabled={upcomingEvents.length === 0}>Clear Events</button>
        </div>

        <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="font-medium text-gray-900">Last Data Sync</p>
            <p className="text-sm text-gray-600">{lastSync?.toLocaleDateString?.()} at {lastSync?.toLocaleTimeString?.()}</p>
          </div>
          <button onClick={onRefresh} disabled={false} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center space-x-2">
            <RefreshCw className="h-4 w-4" />
            <span>Sync Now</span>
          </button>
        </div>
      </div>
    </div>
  </div>
);

SettingsView.propTypes = {
  isAuthenticated: PropTypes.bool,
  athlete: PropTypes.object,
  trainingGoal: PropTypes.string,
  onTrainingGoalChange: PropTypes.func,
  dietaryRestrictions: PropTypes.string,
  onDietaryRestrictionsChange: PropTypes.func,
  seasonType: PropTypes.string,
  onSeasonTypeChange: PropTypes.func,
  lastSync: PropTypes.object,
  upcomingEvents: PropTypes.array,
  onClearAllEvents: PropTypes.func,
  onRefresh: PropTypes.func
};

export default SettingsView;
