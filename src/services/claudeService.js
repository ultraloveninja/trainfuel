// src/services/claudeService.js
class ClaudeService {
  constructor() {
    // Use proxy server to avoid CORS issues
    this.apiUrl = process.env.REACT_APP_PROXY_URL || 'http://localhost:3001/api/claude';
  }

  async generateWorkoutSuggestions(workoutData) {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: this.buildWorkoutPrompt(workoutData)
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get AI suggestions');
      }

      const data = await response.json();
      return this.parseWorkoutResponse(data);
    } catch (error) {
      console.error('Error calling Claude API:', error);
      return this.getFallbackWorkouts();
    }
  }

  async generateMealSuggestions(nutritionData) {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: this.buildMealPrompt(nutritionData)
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get meal suggestions');
      }

      const data = await response.json();
      return this.parseMealResponse(data);
    } catch (error) {
      console.error('Error calling Claude API:', error);
      return this.getFallbackMeals();
    }
  }

  buildWorkoutPrompt(data) {
    return `You are an AI training coach using data-driven insights (similar to TriDot) to create personalized workout recommendations.

ATHLETE DATA:
- Current Fitness (CTL): ${data.fitness?.ctl || 'N/A'}
- Acute Training Load (ATL): ${data.fitness?.atl || 'N/A'}
- Training Stress Balance (TSB): ${data.fitness?.tsb || 'N/A'}
- Recent HRV: ${data.wellness?.hrv || 'N/A'}
- Sleep Quality: ${data.wellness?.sleep || 'N/A'}
- Weight: ${data.profile?.weight || 'N/A'}
- FTP: ${data.profile?.ftp || 'N/A'}W
- Max HR: ${data.profile?.maxHR || 'N/A'}

RECENT TRAINING:
- Last 7 days activities: ${data.recentActivities || 0}
- Last workout TSS: ${data.lastWorkoutTSS || 'N/A'}
- Training phase: ${data.trainingPhase || 'Base'}
- Days until race: ${data.daysToRace || 'N/A'}

CONSTRAINTS:
- Available time: ${data.availableTime || '60'} minutes
- Preferred discipline: ${data.preferredDiscipline || 'Any'}
- Equipment: ${data.equipment || 'All available'}

GENERATE 3 WORKOUT SUGGESTIONS that:
1. Optimize training load based on TSB (if TSB < -20, focus on recovery; if TSB > 5, increase intensity)
2. Consider HRV and sleep for intensity decisions (low HRV = easier day)
3. Periodize towards race date if provided
4. Balance swim/bike/run volume for triathlon training
5. Include specific power/pace/HR zones based on athlete thresholds
6. Provide clear fueling strategy for each workout

Respond with a JSON array of 3 suggestions:
{
  "title": "workout name",
  "description": "detailed description with zones",
  "discipline": "swim/bike/run/brick",
  "duration": "X minutes",
  "targetTSS": X,
  "intensity": "recovery/endurance/tempo/threshold/VO2",
  "zones": "specific HR or power zones",
  "nutrition": "fueling strategy",
  "reasoning": "why this workout based on data"
}

ONLY respond with valid JSON, no other text.`;
  }

  buildMealPrompt(data) {
    return `You are an AI nutrition coach creating data-driven meal plans for endurance athletes.

TRAINING DATA:
- Today's planned TSS: ${data.todayTSS || 0}
- Training intensity: ${data.trainingIntensity || 'moderate'}
- Workout timing: ${data.workoutTime || 'morning'}
- Training phase: ${data.trainingPhase || 'base'}

ATHLETE PROFILE:
- Weight: ${data.profile?.weight || 'N/A'}lbs
- Goal: ${data.goal || 'performance'}
- Daily macro targets: Protein ${data.macros.protein}g, Carbs ${data.macros.carbs}g, Fat ${data.macros.fat}g
- Dietary preferences: ${data.preferences?.join(', ') || 'None'}
- Allergies: ${data.allergies?.join(', ') || 'None'}

RECOVERY INDICATORS:
- HRV: ${data.wellness?.hrv || 'N/A'}
- Sleep: ${data.wellness?.sleep || 'N/A'} hours
- TSB: ${data.fitness?.tsb || 'N/A'}

NUTRITION STRATEGY:
- Carb cycling based on training load (high TSS = high carb, low TSS = lower carb)
- Protein timing around workouts for recovery
- Anti-inflammatory foods when TSB is negative (hard training block)
- Nutrient-dense foods to support adaptation

GENERATE 3 MEAL SUGGESTIONS:
1. Optimize carbs based on today's training (TSS > 100 = high carb, TSS < 50 = moderate carb)
2. Include recovery-focused nutrients if TSB < -15
3. Consider workout timing for meal placement
4. Align with dietary preferences and restrictions
5. Provide practical, athlete-friendly meals

Respond with a JSON array of 3 meal suggestions:
{
  "meal": "breakfast/lunch/dinner/snack",
  "name": "meal name",
  "ingredients": ["list of ingredients with amounts"],
  "macros": {"protein": X, "carbs": Y, "fat": Z, "calories": Total},
  "prepTime": "X minutes",
  "instructions": "brief cooking instructions",
  "timing": "when to eat relative to workout",
  "benefits": "why this meal for today's training"
}

ONLY respond with valid JSON, no other text.`;
  }

  parseWorkoutResponse(response) {
    try {
      // Handle different response formats
      let content = response.content || response.message || response.text;
      if (typeof content === 'object' && content.text) {
        content = content.text;
      }
      
      // Clean up the response
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      // Parse JSON
      const suggestions = JSON.parse(content);
      return Array.isArray(suggestions) ? suggestions : [suggestions];
    } catch (error) {
      console.error('Error parsing workout response:', error);
      return this.getFallbackWorkouts();
    }
  }

  parseMealResponse(response) {
    try {
      // Handle different response formats
      let content = response.content || response.message || response.text;
      if (typeof content === 'object' && content.text) {
        content = content.text;
      }
      
      // Clean up the response
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      // Parse JSON
      const suggestions = JSON.parse(content);
      return Array.isArray(suggestions) ? suggestions : [suggestions];
    } catch (error) {
      console.error('Error parsing meal response:', error);
      return this.getFallbackMeals();
    }
  }

  getFallbackWorkouts() {
    return [
      {
        title: "Endurance Base Ride",
        description: "Zone 2 ride focusing on aerobic development. Keep power at 56-75% FTP (140-187W if FTP is 250W). HR should be 60-75% max.",
        discipline: "bike",
        duration: "90 minutes",
        targetTSS: 90,
        intensity: "endurance",
        zones: "Zone 2: 140-187W or HR 120-150",
        nutrition: "30-60g carbs/hour from sports drink. Start fueling at 45min mark.",
        reasoning: "Building aerobic base with sustainable intensity for long-term fitness gains"
      },
      {
        title: "Tempo Run with Intervals",
        description: "Warm up 15min easy, then 3x10min at threshold pace with 3min recovery jog. Cool down 10min.",
        discipline: "run",
        duration: "60 minutes",
        targetTSS: 75,
        intensity: "tempo",
        zones: "Threshold: 85-95% max HR or ~7:30/mile pace",
        nutrition: "Hydration only for <90min. Post-run protein within 30min.",
        reasoning: "Improves lactate threshold and race-pace sustainability"
      },
      {
        title: "Recovery Swim",
        description: "Easy continuous swim with technique focus. Include drills for form improvement.",
        discipline: "swim",
        duration: "45 minutes",
        targetTSS: 30,
        intensity: "recovery",
        zones: "Zone 1-2: RPE 3-4 out of 10",
        nutrition: "Hydrate before/after. No intra-workout fuel needed.",
        reasoning: "Active recovery promotes blood flow without adding training stress"
      }
    ];
  }

  getFallbackMeals() {
    return [
      {
        meal: "lunch",
        name: "Turkey Quinoa Power Bowl",
        ingredients: ["6oz ground turkey", "1/2 cup quinoa", "2 cups mixed greens", "1/2 avocado", "cherry tomatoes", "olive oil drizzle"],
        macros: { protein: 45, carbs: 35, fat: 15, calories: 455 },
        prepTime: "25 minutes",
        instructions: "Cook quinoa according to package. Brown turkey with seasonings. Assemble bowl with greens base, add quinoa, turkey, avocado, and tomatoes. Drizzle with olive oil."
      },
      {
        meal: "dinner",
        name: "Baked Chicken & Roasted Vegetables",
        ingredients: ["6oz chicken breast", "2 cups broccoli", "1 cup bell peppers", "1 small sweet potato", "olive oil", "herbs"],
        macros: { protein: 50, carbs: 30, fat: 10, calories: 410 },
        prepTime: "35 minutes",
        instructions: "Season chicken with herbs, bake at 400°F for 25 min. Toss vegetables with olive oil, roast alongside chicken. Serve together."
      },
      {
        meal: "breakfast",
        name: "Post-Workout Protein Oats",
        ingredients: ["1/2 cup oats", "1 scoop protein powder", "1/2 banana", "1 tbsp almond butter", "cinnamon"],
        macros: { protein: 30, carbs: 45, fat: 10, calories: 390 },
        prepTime: "5 minutes",
        instructions: "Cook oats with water or almond milk. Mix in protein powder while hot. Top with sliced banana, almond butter, and cinnamon."
      }
    ];
  }
}

export default new ClaudeService();