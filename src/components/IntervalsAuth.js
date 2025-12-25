// src/components/IntervalsAuth.js
// Component for setting up Intervals.icu connection

import React, { useState } from 'react';
import intervalsService from '../services/intervalsService';

function IntervalsAuth({ onConnectionSuccess }) {
  const [apiKey, setApiKey] = useState('');
  const [athleteId, setAthleteId] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [showInstructions, setShowInstructions] = useState(false);

  const handleConnect = async () => {
    setError(null);
    setIsConnecting(true);

    try {
      // Save credentials
      intervalsService.setCredentials(apiKey, athleteId);

      // Test the connection
      const isValid = await intervalsService.testConnection();

      if (isValid) {
        // Fetch athlete profile
        const profile = await intervalsService.getAthleteProfile();
        console.log('Connected to Intervals.icu:', profile.name);

        if (onConnectionSuccess) {
          onConnectionSuccess(profile);
        }
      } else {
        throw new Error('Invalid credentials. Please check your API key and Athlete ID.');
      }
    } catch (err) {
      console.error('Connection error:', err);
      setError(err.message || 'Failed to connect to Intervals.icu');
      intervalsService.clearCredentials();
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Connect to Intervals.icu
        </h2>
        <button
          onClick={() => setShowInstructions(!showInstructions)}
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          {showInstructions ? 'Hide' : 'Show'} Instructions
        </button>
      </div>

      {showInstructions && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">How to get your credentials:</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
            <li>
              Go to{' '}
              <a
                href="https://intervals.icu/settings"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                intervals.icu/settings
              </a>
            </li>
            <li>Scroll down to "Developer Settings" near the bottom</li>
            <li>Click "Generate API Key" and copy it</li>
            <li>Your Athlete ID is shown in the same section (starts with "i")</li>
          </ol>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-1">
            API Key
          </label>
          <input
            type="password"
            id="apiKey"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your Intervals.icu API key"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="athleteId" className="block text-sm font-medium text-gray-700 mb-1">
            Athlete ID
          </label>
          <input
            type="text"
            id="athleteId"
            value={athleteId}
            onChange={(e) => setAthleteId(e.target.value)}
            placeholder="e.g., i398037"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <button
          onClick={handleConnect}
          disabled={isConnecting || !apiKey || !athleteId}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isConnecting ? 'Connecting...' : 'Connect to Intervals.icu'}
        </button>
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <p className="text-sm text-gray-600">
          <strong>Why Intervals.icu?</strong> We use Intervals.icu because it provides:
        </p>
        <ul className="text-sm text-gray-600 list-disc list-inside mt-2 space-y-1">
          <li>Real TSS data from your power meter (not estimates)</li>
          <li>Comprehensive Garmin data integration</li>
          <li>Advanced training metrics (CTL, ATL, TSB)</li>
          <li>Wellness tracking (HRV, sleep, weight)</li>
        </ul>
      </div>
    </div>
  );
}

export default IntervalsAuth;
