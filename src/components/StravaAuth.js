import React from 'react';
import PropTypes from 'prop-types';
import { Link, RefreshCw, AlertCircle } from 'lucide-react';

const StravaAuth = ({ onConnect, loading, error }) => (
  <div className="bg-white p-8 rounded-lg border border-gray-200 shadow-sm text-center">
    <div className="mb-6">
      <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
        <Link className="h-8 w-8 text-orange-600" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect to Strava</h2>
      <p className="text-gray-600">
        Connect your Strava account to get personalized nutrition plans based on your actual training data.
      </p>
    </div>

    <button
      onClick={onConnect}
      disabled={loading}
      className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center space-x-2 mx-auto"
    >
      {loading ? (
        <>
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Connecting...</span>
        </>
      ) : (
        <>
          <Link className="h-4 w-4" />
          <span>Connect Strava Account</span>
        </>
      )}
    </button>

    {error && (
      <div className="mt-4 flex items-center justify-center space-x-2 text-red-600">
        <AlertCircle className="h-4 w-4" />
        <span className="text-sm">{error}</span>
      </div>
    )}
  </div>
);

StravaAuth.propTypes = {
  onConnect: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  error: PropTypes.string,
};

export default StravaAuth;
