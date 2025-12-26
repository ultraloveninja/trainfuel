// src/services/multiEventSeasonPlanner.js
// Multi-Event Season Planner - Handles A/B/C priority races
// Builds comprehensive season plan with appropriate peaks and tapers

class MultiEventSeasonPlanner {
  constructor(tridotPlanner) {
    this.tridotPlanner = tridotPlanner;
  }

  /**
   * Generate comprehensive season plan from multiple events
   * @param {Array} events - All upcoming events with priorities
   * @param {Object} currentFitness - Current CTL/ATL/TSB
   * @returns {Object} Complete season training plan
   */
  generateMultiEventPlan(events, currentFitness = {}) {
    if (!events || events.length === 0) {
      throw new Error('No events provided for season planning');
    }

    // Sort events by date
    const sortedEvents = this.sortEventsByDate(events);
    
    // Categorize events by priority
    const categorizedEvents = this.categorizeEventsByPriority(sortedEvents);
    
    // Find main A-priority race (furthest in future)
    const mainARace = categorizedEvents.A[categorizedEvents.A.length - 1] || sortedEvents[sortedEvents.length - 1];
    
    // Calculate season timeline
    const today = new Date();
    const seasonEnd = new Date(mainARace.date);
    const weeksInSeason = Math.floor((seasonEnd - today) / (7 * 24 * 60 * 60 * 1000));
    
    console.log('🏆 Multi-Event Season Planning:', {
      totalEvents: events.length,
      A_priority: categorizedEvents.A.length,
      B_priority: categorizedEvents.B.length,
      C_priority: categorizedEvents.C.length,
      mainARace: mainARace.name,
      weeksInSeason
    });

    // Build season structure
    const seasonStructure = this.buildSeasonStructure(
      sortedEvents,
      categorizedEvents,
      mainARace,
      weeksInSeason
    );

    // Generate weekly workouts
    const weeklyPlan = this.generateWeeklyWorkouts(
      seasonStructure,
      currentFitness,
      sortedEvents
    );

    return {
      seasonOverview: {
        startDate: today,
        endDate: seasonEnd,
        totalWeeks: weeksInSeason,
        mainARace: mainARace.name,
        totalEvents: events.length
      },
      events: sortedEvents,
      categorizedEvents,
      seasonStructure,
      weeklyPlan,
      principles: this.tridotPlanner.getTrainingPrinciples(),
      nutritionGuidance: this.tridotPlanner.getNutritionGuidance()
    };
  }

  /**
   * Sort events chronologically
   */
  sortEventsByDate(events) {
    return [...events].sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  /**
   * Categorize events by priority (A/B/C)
   */
  categorizeEventsByPriority(events) {
    const categorized = { A: [], B: [], C: [] };
    
    events.forEach(event => {
      const priority = (event.priority || 'B').toUpperCase();
      if (categorized[priority]) {
        categorized[priority].push(event);
      } else {
        categorized.B.push(event); // Default to B if invalid
      }
    });

    return categorized;
  }

  /**
   * Build season structure with phases around events
   */
  buildSeasonStructure(allEvents, categorizedEvents, mainARace, totalWeeks) {
    const structure = [];
    const today = new Date();
    let currentWeek = 0;

    // Process each event chronologically
    allEvents.forEach((event, index) => {
      const eventDate = new Date(event.date);
      const weeksToEvent = Math.floor((eventDate - today) / (7 * 24 * 60 * 60 * 1000));
      const priority = (event.priority || 'B').toUpperCase();
      
      const isMainARace = event.id === mainARace.id;
      const isLastEvent = index === allEvents.length - 1;

      // Determine phase structure based on priority
      if (priority === 'A' || isMainARace) {
        // A-priority: Full build-up with taper
        structure.push({
          eventId: event.id,
          eventName: event.name,
          eventDate: event.date,
          priority: 'A',
          phaseType: 'peak',
          taperWeeks: 2,
          buildWeeks: Math.max(4, weeksToEvent - currentWeek - 2),
          description: 'Main goal race - full taper'
        });
        currentWeek = weeksToEvent;
        
      } else if (priority === 'B') {
        // B-priority: Mini-taper (1 week reduced volume)
        structure.push({
          eventId: event.id,
          eventName: event.name,
          eventDate: event.date,
          priority: 'B',
          phaseType: 'tune-up',
          taperWeeks: 1,
          buildWeeks: Math.max(2, weeksToEvent - currentWeek - 1),
          description: 'Important race - slight volume reduction'
        });
        currentWeek = weeksToEvent;
        
      } else if (priority === 'C') {
        // C-priority: No taper, race as training
        structure.push({
          eventId: event.id,
          eventName: event.name,
          eventDate: event.date,
          priority: 'C',
          phaseType: 'training-race',
          taperWeeks: 0,
          buildWeeks: 0,
          description: 'Training race - no taper, race effort'
        });
      }

      // Add recovery week after A and B races
      if (priority === 'A' || priority === 'B') {
        currentWeek += 1; // Recovery week
      }
    });

    return structure;
  }

  /**
   * Generate weekly workouts across the season
   */
  generateWeeklyWorkouts(seasonStructure, currentFitness, allEvents) {
    const weeklyPlan = [];
    const today = new Date();
    let currentDate = new Date(today);
    let weekNumber = 1;
    let currentPhaseIndex = 0;

    // Map event dates to week numbers for easy lookup
    const eventWeekMap = {};
    allEvents.forEach(event => {
      const eventDate = new Date(event.date);
      const weekOfEvent = Math.floor((eventDate - today) / (7 * 24 * 60 * 60 * 1000)) + 1;
      eventWeekMap[weekOfEvent] = event;
    });

    // Generate weeks until the last event
    const lastEvent = allEvents[allEvents.length - 1];
    const lastEventDate = new Date(lastEvent.date);
    const totalWeeks = Math.floor((lastEventDate - today) / (7 * 24 * 60 * 60 * 1000)) + 1;

    for (let i = 0; i < totalWeeks; i++) {
      // Check if there's an event this week
      const eventThisWeek = eventWeekMap[weekNumber];
      
      // Determine current phase
      let phase = this.determinePhaseForWeek(weekNumber, seasonStructure, allEvents, today);
      
      // Generate week's workouts
      const week = this.tridotPlanner.generateWeeklyPlan(
        phase,
        weekNumber,
        currentFitness,
        totalWeeks - weekNumber
      );

      // If there's an event this week, adjust the plan
      if (eventThisWeek) {
        week.event = {
          name: eventThisWeek.name,
          type: eventThisWeek.type,
          priority: eventThisWeek.priority,
          date: eventThisWeek.date
        };
        
        // Reduce volume for race week (except C-priority)
        if (eventThisWeek.priority !== 'C') {
          week.weeklyTSS = Math.round(week.weeklyTSS * 0.7);
          week.raceWeek = true;
        }
      }

      weeklyPlan.push({
        weekNumber,
        phase: phase.name,
        startDate: new Date(currentDate),
        ...week
      });

      currentDate.setDate(currentDate.getDate() + 7);
      weekNumber++;
    }

    return weeklyPlan;
  }

  /**
   * Determine which phase a given week should be in
   */
  determinePhaseForWeek(weekNumber, seasonStructure, allEvents, startDate) {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + (weekNumber - 1) * 7);

    // Find the next event after current week
    const nextEvent = allEvents.find(event => {
      const eventDate = new Date(event.date);
      return eventDate >= currentDate;
    });

    if (!nextEvent) {
      return this.tridotPlanner.phases.BASE_1; // Default if no events
    }

    const eventDate = new Date(nextEvent.date);
    const weeksToEvent = Math.floor((eventDate - currentDate) / (7 * 24 * 60 * 60 * 1000));
    const priority = (nextEvent.priority || 'B').toUpperCase();

    // Determine phase based on weeks to event and priority
    if (priority === 'A') {
      // Full periodization for A-priority
      if (weeksToEvent <= 2) return this.tridotPlanner.phases.TAPER;
      if (weeksToEvent <= 4) return this.tridotPlanner.phases.PEAK;
      if (weeksToEvent <= 8) return this.tridotPlanner.phases.BUILD_2;
      if (weeksToEvent <= 12) return this.tridotPlanner.phases.BUILD_1;
      if (weeksToEvent <= 16) return this.tridotPlanner.phases.BASE_2;
      return this.tridotPlanner.phases.BASE_1;
      
    } else if (priority === 'B') {
      // Modified periodization for B-priority
      if (weeksToEvent <= 1) return { ...this.tridotPlanner.phases.TAPER, tssTarget: 200 }; // Mini-taper
      if (weeksToEvent <= 6) return this.tridotPlanner.phases.BUILD_2;
      if (weeksToEvent <= 10) return this.tridotPlanner.phases.BUILD_1;
      return this.tridotPlanner.phases.BASE_2;
      
    } else {
      // C-priority: Continue normal training
      if (weeksToEvent <= 8) return this.tridotPlanner.phases.BUILD_1;
      return this.tridotPlanner.phases.BASE_2;
    }
  }

  /**
   * Get recommended event priorities based on timing
   */
  recommendEventPriorities(events) {
    const sorted = this.sortEventsByDate(events);
    const recommendations = [];

    sorted.forEach((event, index) => {
      let recommendedPriority = 'B'; // Default
      
      // Last event or major distance
      if (index === sorted.length - 1) {
        recommendedPriority = 'A';
      }
      // Early season races
      else if (index < 2) {
        recommendedPriority = 'C';
      }
      // Check distance/type
      else if (event.type?.toLowerCase().includes('ironman') || 
               event.type?.toLowerCase().includes('marathon')) {
        recommendedPriority = 'A';
      }

      recommendations.push({
        eventId: event.id,
        eventName: event.name,
        currentPriority: event.priority || null,
        recommendedPriority,
        reasoning: this.getRecommendationReason(event, index, sorted.length, recommendedPriority)
      });
    });

    return recommendations;
  }

  /**
   * Get reasoning for priority recommendation
   */
  getRecommendationReason(event, index, total, priority) {
    if (priority === 'A') {
      if (index === total - 1) return 'Goal race - peak fitness target';
      return 'Major distance - requires full taper';
    } else if (priority === 'C') {
      return 'Early season - use as training race';
    }
    return 'Mid-season tuneup race';
  }
}

export default MultiEventSeasonPlanner;
