// src/services/zwiftWorkoutGenerator.js
// Generate Zwift-compatible workout files (.zwo format)
// Supports bike and run workouts with Nick Chase training principles

class ZwiftWorkoutGenerator {
  constructor() {
    this.workoutTypes = {
      bike: ['endurance', 'tempo', 'intervals', 'ftp_test', 'recovery'],
      run: ['endurance', 'tempo', 'intervals', 'recovery']
    };
  }

  /**
   * Generate a bike workout
   * @param {Object} config - Workout configuration
   * @returns {string} XML content for .zwo file
   */
  generateBikeWorkout(config) {
    const {
      type = 'endurance',
      duration = 60, // minutes
      ftp = 200, // watts
      description = '',
      name = 'Custom Bike Workout'
    } = config;

    const workout = this.getBikeWorkoutStructure(type, duration, ftp);
    return this.buildZWO(name, description, workout, 'bike', ftp);
  }

  /**
   * Generate a run workout
   * @param {Object} config - Workout configuration
   * @returns {string} XML content for .zwo file
   */
  generateRunWorkout(config) {
    const {
      type = 'endurance',
      duration = 45, // minutes
      pace = '5:00', // min/km
      description = '',
      name = 'Custom Run Workout'
    } = config;

    const workout = this.getRunWorkoutStructure(type, duration, pace);
    return this.buildZWO(name, description, workout, 'run', null, pace);
  }

  /**
   * Get bike workout structure based on type
   */
  getBikeWorkoutStructure(type, duration, ftp) {
    const structures = {
      endurance: () => {
        // Nick Chase-style Zone 2 endurance ride
        return [
          { type: 'Warmup', duration: 600, powerLow: 0.5, powerHigh: 0.65 },
          { type: 'SteadyState', duration: (duration - 20) * 60, power: 0.68 },
          { type: 'Cooldown', duration: 600, powerLow: 0.65, powerHigh: 0.5 }
        ];
      },
      
      tempo: () => {
        // Sweet spot intervals
        return [
          { type: 'Warmup', duration: 900, powerLow: 0.5, powerHigh: 0.7 },
          { type: 'IntervalsT', repeat: 3, onDuration: 900, offDuration: 300, 
            onPower: 0.88, offPower: 0.65 },
          { type: 'Cooldown', duration: 900, powerLow: 0.7, powerHigh: 0.5 }
        ];
      },
      
      intervals: () => {
        // VO2 max intervals
        return [
          { type: 'Warmup', duration: 900, powerLow: 0.5, powerHigh: 0.7 },
          { type: 'IntervalsT', repeat: 5, onDuration: 300, offDuration: 300,
            onPower: 1.05, offPower: 0.6 },
          { type: 'Cooldown', duration: 600, powerLow: 0.7, powerHigh: 0.5 }
        ];
      },
      
      ftp_test: () => {
        // 20-minute FTP test
        return [
          { type: 'Warmup', duration: 1200, powerLow: 0.5, powerHigh: 0.75 },
          { type: 'SteadyState', duration: 300, power: 0.95 },
          { type: 'FreeRide', duration: 300 },
          { type: 'SteadyState', duration: 1200, power: 0.95, message: 'FTP Test - Go hard!' },
          { type: 'Cooldown', duration: 600, powerLow: 0.75, powerHigh: 0.5 }
        ];
      },
      
      recovery: () => {
        // Easy recovery ride
        return [
          { type: 'SteadyState', duration: duration * 60, power: 0.55 }
        ];
      }
    };

    return structures[type] ? structures[type]() : structures.endurance();
  }

  /**
   * Get run workout structure based on type
   */
  getRunWorkoutStructure(type, duration, pace) {
    const paceToSpeed = (paceStr) => {
      const [min, sec] = paceStr.split(':').map(Number);
      const totalMinutes = min + (sec / 60);
      return 60 / totalMinutes; // km/h
    };

    const baseSpeed = paceToSpeed(pace);

    const structures = {
      endurance: () => {
        // Easy long run
        return [
          { type: 'Warmup', duration: 600, speedLow: baseSpeed * 0.8, speedHigh: baseSpeed * 0.9 },
          { type: 'SteadyState', duration: (duration - 20) * 60, speed: baseSpeed * 0.9 },
          { type: 'Cooldown', duration: 600, speedLow: baseSpeed * 0.9, speedHigh: baseSpeed * 0.8 }
        ];
      },
      
      tempo: () => {
        // Threshold run
        return [
          { type: 'Warmup', duration: 900, speedLow: baseSpeed * 0.8, speedHigh: baseSpeed * 0.9 },
          { type: 'SteadyState', duration: 1200, speed: baseSpeed * 1.05 },
          { type: 'Cooldown', duration: 900, speedLow: baseSpeed * 0.9, speedHigh: baseSpeed * 0.8 }
        ];
      },
      
      intervals: () => {
        // Run intervals
        return [
          { type: 'Warmup', duration: 900, speedLow: baseSpeed * 0.8, speedHigh: baseSpeed * 0.9 },
          { type: 'IntervalsT', repeat: 6, onDuration: 180, offDuration: 120,
            onSpeed: baseSpeed * 1.15, offSpeed: baseSpeed * 0.75 },
          { type: 'Cooldown', duration: 600, speedLow: baseSpeed * 0.9, speedHigh: baseSpeed * 0.8 }
        ];
      },
      
      recovery: () => {
        // Easy recovery run
        return [
          { type: 'SteadyState', duration: duration * 60, speed: baseSpeed * 0.85 }
        ];
      }
    };

    return structures[type] ? structures[type]() : structures.endurance();
  }

  /**
   * Build complete ZWO XML file
   */
  buildZWO(name, description, workoutSegments, sport, ftp = null, pace = null) {
    const author = 'TrainFuel - Nick Chase Style';
    const category = sport === 'bike' ? 'FTP' : 'Benchmark';
    
    // Build workout segments XML
    const segmentsXML = workoutSegments.map(segment => {
      return this.buildSegmentXML(segment, sport);
    }).join('\n        ');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<workout_file>
    <author>${author}</author>
    <name>${name}</name>
    <description>${description}</description>
    <sportType>${sport}</sportType>
    <tags>
        <tag name="TrainFuel"/>
        <tag name="Nick Chase"/>
    </tags>
    <workout>
        ${segmentsXML}
    </workout>
</workout_file>`;

    return xml;
  }

  /**
   * Build XML for a single workout segment
   */
  buildSegmentXML(segment, sport) {
    const { type } = segment;

    switch (type) {
      case 'Warmup':
        if (sport === 'bike') {
          return `<Warmup Duration="${segment.duration}" PowerLow="${segment.powerLow}" PowerHigh="${segment.powerHigh}" pace="0"/>`;
        } else {
          return `<Warmup Duration="${segment.duration}" PowerLow="0.5" PowerHigh="0.7" pace="1">
            <textevent timeoffset="0" message="Easy warmup - find your rhythm"/>
        </Warmup>`;
        }

      case 'Cooldown':
        if (sport === 'bike') {
          return `<Cooldown Duration="${segment.duration}" PowerLow="${segment.powerLow}" PowerHigh="${segment.powerHigh}" pace="0"/>`;
        } else {
          return `<Cooldown Duration="${segment.duration}" PowerLow="0.7" PowerHigh="0.5" pace="1">
            <textevent timeoffset="0" message="Nice work! Easy cooldown"/>
        </Cooldown>`;
        }

      case 'SteadyState':
        if (sport === 'bike') {
          const message = segment.message || 'Steady effort - Nick Chase Zone 2';
          return `<SteadyState Duration="${segment.duration}" Power="${segment.power}" pace="0">
            <textevent timeoffset="0" message="${message}"/>
            ${segment.duration > 600 ? `<textevent timeoffset="${segment.duration / 2}" message="Halfway - keep it steady"/>` : ''}
        </SteadyState>`;
        } else {
          return `<SteadyState Duration="${segment.duration}" Power="0.85" pace="1">
            <textevent timeoffset="0" message="Steady state - maintain rhythm"/>
        </SteadyState>`;
        }

      case 'IntervalsT':
        const intervals = [];
        for (let i = 0; i < segment.repeat; i++) {
          if (sport === 'bike') {
            intervals.push(`<SteadyState Duration="${segment.onDuration}" Power="${segment.onPower}" pace="0">
                <textevent timeoffset="0" message="Interval ${i + 1}/${segment.repeat} - Push!"/>
            </SteadyState>
            <SteadyState Duration="${segment.offDuration}" Power="${segment.offPower}" pace="0">
                <textevent timeoffset="0" message="Recovery - stay smooth"/>
            </SteadyState>`);
          } else {
            intervals.push(`<SteadyState Duration="${segment.onDuration}" Power="0.95" pace="1">
                <textevent timeoffset="0" message="Interval ${i + 1}/${segment.repeat} - Hard effort!"/>
            </SteadyState>
            <SteadyState Duration="${segment.offDuration}" Power="0.65" pace="1">
                <textevent timeoffset="0" message="Recovery jog"/>
            </SteadyState>`);
          }
        }
        return intervals.join('\n        ');

      case 'FreeRide':
        return `<FreeRide Duration="${segment.duration}" Cadence="90">
            <textevent timeoffset="0" message="Free ride - spin easy"/>
        </FreeRide>`;

      default:
        return `<SteadyState Duration="60" Power="0.65" pace="0"/>`;
    }
  }

  /**
   * Download ZWO file
   */
  downloadWorkout(xmlContent, filename) {
    const blob = new Blob([xmlContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.endsWith('.zwo') ? filename : `${filename}.zwo`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Generate workout from training plan
   */
  generateFromPlanWorkout(planWorkout, userSettings = {}) {
    const { type, discipline, duration, intensity, description, name, tss } = planWorkout;
    const { ftp = 200, runPace = '5:00' } = userSettings;

    if (discipline === 'bike' || discipline === 'brick') {
      // Determine bike workout type from intensity
      let workoutType = 'endurance';
      if (intensity === 'Hard') workoutType = 'intervals';
      else if (intensity === 'Moderate') workoutType = 'tempo';
      else if (intensity === 'Easy') workoutType = 'recovery';

      return this.generateBikeWorkout({
        type: workoutType,
        duration: parseInt(duration) || 60,
        ftp,
        description: description || 'Nick Chase-inspired training',
        name: name || `${type} ${discipline}`
      });
    } else if (discipline === 'run') {
      // Determine run workout type from intensity
      let workoutType = 'endurance';
      if (intensity === 'Hard') workoutType = 'intervals';
      else if (intensity === 'Moderate') workoutType = 'tempo';
      else if (intensity === 'Easy') workoutType = 'recovery';

      return this.generateRunWorkout({
        type: workoutType,
        duration: parseInt(duration) || 45,
        pace: runPace,
        description: description || 'Nick Chase-inspired training',
        name: name || `${type} ${discipline}`
      });
    }

    return null; // Swim or other workouts not supported in Zwift
  }

  /**
   * Get available workout types for each sport
   */
  getAvailableTypes(sport) {
    return this.workoutTypes[sport] || [];
  }

  /**
   * Preview workout structure
   */
  previewWorkout(sport, type, duration, ftp = 200, pace = '5:00') {
    if (sport === 'bike') {
      const structure = this.getBikeWorkoutStructure(type, duration, ftp);
      return this.formatPreview(structure, 'bike', ftp);
    } else if (sport === 'run') {
      const structure = this.getRunWorkoutStructure(type, duration, pace);
      return this.formatPreview(structure, 'run', null, pace);
    }
    return null;
  }

  /**
   * Format workout preview
   */
  formatPreview(structure, sport, ftp, pace) {
    return structure.map(segment => {
      if (segment.type === 'IntervalsT') {
        return {
          type: 'Intervals',
          description: `${segment.repeat}x ${Math.floor(segment.onDuration / 60)}min @ ${
            sport === 'bike' 
              ? Math.round(segment.onPower * 100) + '% FTP'
              : 'Hard effort'
          }`,
          duration: (segment.onDuration + segment.offDuration) * segment.repeat
        };
      } else {
        return {
          type: segment.type,
          description: sport === 'bike'
            ? `${Math.floor(segment.duration / 60)}min @ ${Math.round((segment.power || segment.powerHigh) * 100)}% FTP`
            : `${Math.floor(segment.duration / 60)}min easy`,
          duration: segment.duration
        };
      }
    });
  }

  /**
   * Validate workout parameters
   */
  validateWorkout(sport, type, duration, ftp = null, pace = null) {
    const errors = [];

    if (!['bike', 'run'].includes(sport)) {
      errors.push('Sport must be bike or run');
    }

    if (!this.workoutTypes[sport]?.includes(type)) {
      errors.push(`Invalid workout type for ${sport}`);
    }

    if (duration < 15 || duration > 300) {
      errors.push('Duration must be between 15 and 300 minutes');
    }

    if (sport === 'bike' && (!ftp || ftp < 50 || ftp > 500)) {
      errors.push('FTP must be between 50 and 500 watts');
    }

    if (sport === 'run' && !pace) {
      errors.push('Pace is required for run workouts');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export default new ZwiftWorkoutGenerator();
