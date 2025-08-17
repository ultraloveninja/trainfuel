// src/components/CalendarView.js
import React, { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Plus, Trash2, Clock, MapPin, Activity } from 'lucide-react';

const CalendarView = ({ activities, upcomingEvents, onAddEvent, onDeleteEvent }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [viewMode, setViewMode] = useState('month'); // month or week

  // Get the first day of the month
  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  };

  // Get the last day of the month
  const getLastDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  };

  // Get all days to display in the calendar grid
  const getCalendarDays = () => {
    const firstDay = getFirstDayOfMonth(currentDate);
    const lastDay = getLastDayOfMonth(currentDate);
    const startDate = new Date(firstDay);
    const endDate = new Date(lastDay);
    
    // Adjust to start on Sunday
    startDate.setDate(startDate.getDate() - startDate.getDay());
    // Adjust to end on Saturday
    if (endDate.getDay() !== 6) {
      endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
    }

    const days = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  // Get activities for a specific date
  const getActivitiesForDate = (date) => {
    if (!activities) return [];
    
    const dateStr = date.toISOString().split('T')[0];
    return activities.filter(activity => {
      const activityDate = new Date(activity.start_date).toISOString().split('T')[0];
      return activityDate === dateStr;
    });
  };

  // Get events for a specific date
  const getEventsForDate = (date) => {
    if (!upcomingEvents) return [];
    
    const dateStr = date.toISOString().split('T')[0];
    return upcomingEvents.filter(event => {
      const eventDate = new Date(event.date).toISOString().split('T')[0];
      return eventDate === dateStr;
    });
  };

  // Navigate months
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const calendarDays = getCalendarDays();
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Calendar className="w-6 h-6" />
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={goToToday}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
            >
              Today
            </button>
            <button
              onClick={goToPreviousMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={goToNextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            {onAddEvent && (
              <button
                onClick={onAddEvent}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Event
              </button>
            )}
          </div>
        </div>

        {/* Day Names */}
        <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden mb-px">
          {dayNames.map(day => (
            <div key={day} className="bg-gray-50 py-2 text-center text-sm font-semibold text-gray-700">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
          {calendarDays.map((date, index) => {
            const dayActivities = getActivitiesForDate(date);
            const dayEvents = getEventsForDate(date);
            const hasContent = dayActivities.length > 0 || dayEvents.length > 0;
            
            return (
              <div
                key={index}
                onClick={() => setSelectedDate(date)}
                className={`
                  bg-white p-2 min-h-[100px] cursor-pointer hover:bg-gray-50 transition-colors
                  ${!isCurrentMonth(date) ? 'text-gray-400' : ''}
                  ${isToday(date) ? 'bg-blue-50' : ''}
                  ${selectedDate?.toDateString() === date.toDateString() ? 'ring-2 ring-blue-500' : ''}
                `}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-sm font-medium ${isToday(date) ? 'text-blue-600' : ''}`}>
                    {date.getDate()}
                  </span>
                  {hasContent && (
                    <div className="flex gap-1">
                      {dayActivities.length > 0 && (
                        <div className="w-2 h-2 bg-green-500 rounded-full" title={`${dayActivities.length} activities`} />
                      )}
                      {dayEvents.length > 0 && (
                        <div className="w-2 h-2 bg-purple-500 rounded-full" title={`${dayEvents.length} events`} />
                      )}
                    </div>
                  )}
                </div>
                
                {/* Show first activity and event */}
                <div className="space-y-1">
                  {dayActivities.slice(0, 1).map(activity => (
                    <div key={activity.id} className="text-xs bg-green-100 text-green-700 px-1 py-0.5 rounded truncate">
                      {activity.type}
                    </div>
                  ))}
                  {dayEvents.slice(0, 1).map(event => (
                    <div key={event.id} className="text-xs bg-purple-100 text-purple-700 px-1 py-0.5 rounded truncate">
                      {event.name}
                    </div>
                  ))}
                  {(dayActivities.length > 1 || dayEvents.length > 1) && (
                    <div className="text-xs text-gray-500">
                      +{dayActivities.length + dayEvents.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Date Details */}
      {selectedDate && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">
            {selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </h3>
          
          {/* Activities for selected date */}
          <div className="space-y-4">
            {getActivitiesForDate(selectedDate).length > 0 && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Activities
                </h4>
                <div className="space-y-2">
                  {getActivitiesForDate(selectedDate).map(activity => (
                    <div key={activity.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div>
                        <p className="font-medium">{activity.name}</p>
                        <p className="text-sm text-gray-600">
                          {activity.type} • {(activity.distance / 1000).toFixed(2)} km • {Math.floor(activity.moving_time / 60)} min
                        </p>
                      </div>
                      <a
                        href={`https://www.strava.com/activities/${activity.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 text-sm"
                      >
                        View on Strava →
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Events for selected date */}
            {getEventsForDate(selectedDate).length > 0 && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Events
                </h4>
                <div className="space-y-2">
                  {getEventsForDate(selectedDate).map(event => (
                    <div key={event.id} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                      <div>
                        <p className="font-medium">{event.name}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                          {event.type && <span>{event.type}</span>}
                          {event.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {event.location}
                            </span>
                          )}
                          {event.time && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {event.time}
                            </span>
                          )}
                        </div>
                      </div>
                      {onDeleteEvent && (
                        <button
                          onClick={() => onDeleteEvent(event.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {getActivitiesForDate(selectedDate).length === 0 && getEventsForDate(selectedDate).length === 0 && (
              <p className="text-gray-500 text-center py-4">No activities or events on this date</p>
            )}
          </div>
        </div>
      )}

      {/* Monthly Summary */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Monthly Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-2xl font-bold text-green-600">
              {activities?.filter(a => {
                const date = new Date(a.start_date);
                return date.getMonth() === currentDate.getMonth() && date.getFullYear() === currentDate.getFullYear();
              }).length || 0}
            </p>
            <p className="text-sm text-gray-500">Activities</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-600">
              {activities?.filter(a => {
                const date = new Date(a.start_date);
                return date.getMonth() === currentDate.getMonth() && date.getFullYear() === currentDate.getFullYear();
              }).reduce((sum, a) => sum + (a.distance || 0), 0) / 1000 || 0}.toFixed(1)} km
            </p>
            <p className="text-sm text-gray-500">Distance</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-orange-600">
              {Math.round(activities?.filter(a => {
                const date = new Date(a.start_date);
                return date.getMonth() === currentDate.getMonth() && date.getFullYear() === currentDate.getFullYear();
              }).reduce((sum, a) => sum + (a.moving_time || 0), 0) / 3600 || 0)} hrs
            </p>
            <p className="text-sm text-gray-500">Time</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-purple-600">
              {upcomingEvents?.filter(e => {
                const date = new Date(e.date);
                return date.getMonth() === currentDate.getMonth() && date.getFullYear() === currentDate.getFullYear();
              }).length || 0}
            </p>
            <p className="text-sm text-gray-500">Events</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarView;