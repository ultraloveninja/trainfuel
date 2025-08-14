import React, { useState } from 'react';
import PropTypes from 'prop-types';

const AddEventModal = ({ show, onClose, onAddEvent, minDate }) => {
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventType, setEventType] = useState('');
  const [eventPriority, setEventPriority] = useState('B');
  const [distance, setDistance] = useState('');
  const [terrain, setTerrain] = useState('road');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!eventName || !eventDate || !eventType) {
      alert('Please fill in Event Name, Date, and Type');
      return;
    }
    const weeksOut = Math.ceil((new Date(eventDate) - new Date()) / (7 * 24 * 60 * 60 * 1000));
    if (weeksOut < 0) {
      alert('Event date must be in the future');
      return;
    }
    let sportType = 'other';
    const eventTypeLower = eventType.toLowerCase();
    if (eventTypeLower.includes('triathlon')) sportType = 'triathlon';
    else if (eventTypeLower.includes('cycling') || eventTypeLower.includes('bike')) sportType = 'cycling';
    else if (eventTypeLower.includes('running') || eventTypeLower.includes('marathon')) sportType = 'running';
    else if (eventTypeLower.includes('swimming')) sportType = 'swimming';

    const newEvent = {
      id: Date.now(),
      name: eventName,
      date: eventDate,
      type: eventType,
      priority: eventPriority,
      weeksOut,
      details: { sportType, distance: distance || 'Not specified', terrain },
      notes
    };

    onAddEvent(newEvent);

    // reset
    setEventName('');
    setEventDate('');
    setEventType('');
    setEventPriority('B');
    setDistance('');
    setTerrain('road');
    setNotes('');
    onClose();
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Add New Event</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Event Name *</label>
            <input type="text" value={eventName} onChange={(e)=>setEventName(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg" placeholder="e.g., Boston Marathon" required/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Event Date *</label>
            <input type="date" value={eventDate} onChange={(e)=>setEventDate(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg" min={minDate} required/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Event Type *</label>
            <select value={eventType} onChange={(e)=>setEventType(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg" required>
              <option value="">Select event type</option>
              <optgroup label="Running Events"><option value="5K Run">5K Run</option><option value="10K Run">10K Run</option><option value="Half Marathon">Half Marathon</option><option value="Marathon">Marathon</option><option value="Ultra Marathon">Ultra Marathon</option><option value="Trail Run">Trail Run</option></optgroup>
              <optgroup label="Cycling Events"><option value="Road Race">Road Race</option><option value="Time Trial">Time Trial</option><option value="Gran Fondo">Gran Fondo</option><option value="Mountain Bike Race">Mountain Bike Race</option><option value="Cyclocross">Cyclocross</option></optgroup>
              <optgroup label="Swimming Events"><option value="Open Water Swim">Open Water Swim</option><option value="Pool Competition">Pool Competition</option></optgroup>
              <optgroup label="Triathlon Events"><option value="Sprint Triathlon">Sprint Triathlon</option><option value="Olympic Triathlon">Olympic Triathlon</option><option value="Half Ironman">Half Ironman</option><option value="Ironman">Ironman</option></optgroup>
              <optgroup label="Other Events"><option value="Adventure Race">Adventure Race</option><option value="Obstacle Course">Obstacle Course</option><option value="Other">Other</option></optgroup>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority Level</label>
            <select value={eventPriority} onChange={(e)=>setEventPriority(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg">
              <option value="A">A - Goal Race (Most Important)</option>
              <option value="B">B - Important Event</option>
              <option value="C">C - Training Race/Fun Event</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Distance (Optional)</label>
            <input type="text" value={distance} onChange={(e)=>setDistance(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg" placeholder="e.g., 42.2km, 100 miles, 1.5k swim"/>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Terrain/Course Type</label>
            <select value={terrain} onChange={(e)=>setTerrain(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg">
              <option value="road">Road</option><option value="trail">Trail</option><option value="track">Track</option><option value="hills">Hills/Mountains</option><option value="flat">Flat</option><option value="mixed">Mixed</option><option value="indoor">Indoor</option><option value="open-water">Open Water</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
            <textarea value={notes} onChange={(e)=>setNotes(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg" rows="3" placeholder="Special considerations, goals, nutrition strategy, etc." />
          </div>

          <div className="flex space-x-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-lg">Cancel</button>
            <button type="submit" className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg">Add Event</button>
          </div>
        </form>
      </div>
    </div>
  );
};

AddEventModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onAddEvent: PropTypes.func.isRequired,
  minDate: PropTypes.string
};

export default AddEventModal;
