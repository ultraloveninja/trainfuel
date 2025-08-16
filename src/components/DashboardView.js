// src/components/DashboardView.js
import React from 'react';
import { Activity, TrendingUp, Calendar, Utensils, Zap, Clock } from 'lucide-react';

const DashboardView = ({ athlete, activities, trainingData, nutritionPlan, upcomingEvents, loading }) => {
  // Debug logging
  console.log('DashboardView props:', {
    athlete,
    activities: activities?.length,
    trainingData,
    nutritionPlan,
    upcomingEvents: upcomingEvents?.length,
    loading
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Calculate some basic stats
  const totalActivities = activities?.length || 0;
  const thisWeekActivities = activities?.filter(activity => {
    const activityDate = new Date(activity.start_date);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return activityDate > weekAgo;
  }).length || 0;

  const totalDistance = activities?.reduce((sum, activity) => sum + (activity.distance || 0), 0) || 0;
  const totalTime = activities?.reduce((sum, activity) => sum + (activity.moving_time || 0), 0) || 0;

  return (
    <div className="space-y-6">
      {/* Athlete Summary */}
      {athlete && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center space-x-4">
            {athlete.profile && (
              <img 
                src={athlete.profile_medium || athlete.profile} 
                alt={athlete.firstname}
                className="w-16 h-16 rounded-full"
              />
            )}
            <div>
              <h2 className="text-2xl font-bold">
                {athlete.firstname} {athlete.lastname}
              </h2>
              <p className="text-gray-600">{athlete.city}, {athlete.state}</p>
              {athlete.bio && <p className="text-sm text-gray-500 mt-1">{athlete.bio}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Activities</p>
              <p className="text-2xl font-bold">{totalActivities}</p>
            </div>
            <Activity className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">This Week</p>
              <p className="text-2xl font-bold">{thisWeekActivities}</p>
            </div>
            <Calendar className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Distance</p>
              <p className="text-2xl font-bold">{(totalDistance / 1000).toFixed(1)} km</p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Time</p>
              <p className="text-2xl font-bold">{Math.round(totalTime / 3600)} hrs</p>
            </div>
            <Clock className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Activities</h3>
        {activities && activities.length > 0 ? (
          <div className="space-y-3">
            {activities.slice(0, 5).map((activity) => (
              <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Activity className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="font-medium">{activity.name}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(activity.start_date).toLocaleDateString()} • {activity.type}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">{(activity.distance / 1000).toFixed(2)} km</p>
                  <p className="text-sm text-gray-500">
                    {Math.floor(activity.moving_time / 60)} min
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No activities found. Make sure you're connected to Strava.</p>
        )}
      </div>

      {/* Nutrition Summary */}
      {nutritionPlan && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Utensils className="w-5 h-5" />
            Today's Nutrition Plan
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{nutritionPlan.totalCalories}</p>
              <p className="text-sm text-gray-500">Calories</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{nutritionPlan.macros?.protein}g</p>
              <p className="text-sm text-gray-500">Protein</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">{nutritionPlan.macros?.carbs}g</p>
              <p className="text-sm text-gray-500">Carbs</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{nutritionPlan.macros?.fat}g</p>
              <p className="text-sm text-gray-500">Fat</p>
            </div>
          </div>
        </div>
      )}

      {/* Upcoming Events */}
      {upcomingEvents && upcomingEvents.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Upcoming Events</h3>
          <div className="space-y-2">
            {upcomingEvents.map((event) => (
              <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">{event.name}</p>
                  <p className="text-sm text-gray-500">{event.type}</p>
                </div>
                <p className="text-sm text-gray-600">
                  {new Date(event.date).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardView;