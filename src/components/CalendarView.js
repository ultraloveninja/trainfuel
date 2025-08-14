import React from 'react';
import PropTypes from 'prop-types';
import { RefreshCw } from 'lucide-react';

const CalendarView = ({ isAuthenticated, activities }) => {
  if (!isAuthenticated) return null;
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activities</h2>
        <div className="space-y-4">
          {activities.slice(0, 10).map((activity, index) => (
            <div key={activity.id || index} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">{activity.date}</p>
                <p className="text-sm text-gray-600">{activity.type}</p>
                {activity.distance && (<p className="text-xs text-gray-500">{(activity.distance / 1000).toFixed(1)}km</p>)}
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">{activity.duration} min</p>
                <span className={`px-2 py-1 rounded text-xs font-medium ${activity.intensity === 'Very High' || activity.intensity === 'High' ? 'bg-red-100 text-red-800' : activity.intensity === 'Moderate' ? 'bg-yellow-100 text-yellow-800' : activity.intensity === 'Low' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800' }`}>{activity.intensity}</span>
                <p className="text-xs text-gray-500 mt-1">TSS: {activity.tss}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

CalendarView.propTypes = {
  isAuthenticated: PropTypes.bool,
  activities: PropTypes.array
};

export default CalendarView;
