// src/services/nutritionService.js - Updated to use proxy
import axios from 'axios';

class NutritionService {
  constructor() {
    // Use proxy in development, direct API in production with proper backend
    this.apiEndpoint = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:3001/api/claude'  // Local proxy
      : process.env.REACT_APP_PROXY_URL || '/api/claude'; // Production endpoint
  }

  // Call Claude API through proxy
  async callClaudeAPI(messages, system = null) {
    try {
      const response = await axios.post(this.apiEndpoint, {
        model: 'claude-sonnet-4-20250514',  // Using your working model
        max_tokens: 2000,
        temperature: 0.7,
        messages,
        system
      });

      return response.data;
    } catch (error) {
      console.error('Error calling Claude API:', error.response?.data || error.message);
      throw error;
    }
  }

  // Generate AI-powered nutrition plan
  async generateNutritionPlan(userData) {
    const { athlete, trainingData, activities, preferences, upcomingEvents, foodPreferences } = userData;
    
    try {
      const systemPrompt = `You are an expert sports nutritionist specializing in endurance athletes. 
        Create personalized nutrition plans based on training data and individual needs.
        Consider food preferences and restrictions when making recommendations.
        Provide specific, actionable advice with exact portions and timing.
        
        IMPORTANT: Return ONLY valid JSON with no additional text, markdown, or explanations.`;

      const userMessage = `Create a comprehensive nutrition plan for this athlete:

ATHLETE PROFILE:
- Name: ${athlete?.firstname || 'Athlete'}
- Weight: ${athlete?.weight || 70}kg
- Training Goal: ${preferences?.trainingGoal || 'Endurance Performance'}
- Dietary Restrictions: ${preferences?.dietaryRestrictions || 'None'}
- Season: ${preferences?.seasonType || 'off-season'}

FOOD PREFERENCES:
- Liked Foods: ${foodPreferences?.likedFoods?.join(', ') || 'None specified'}
- Disliked Foods: ${foodPreferences?.dislikedFoods?.join(', ') || 'None specified'}

TRAINING DATA:
- Current Phase: ${trainingData?.currentPhase || 'Base'}
- Weekly TSS: ${trainingData?.weeklyTSS || 0}
- Today's Activity: ${trainingData?.todaysActivity?.type || 'Rest'} for ${trainingData?.todaysActivity?.duration || 0} minutes

UPCOMING EVENTS:
${upcomingEvents?.map(e => `- ${e.name} on ${e.date}`).join('\n') || 'None scheduled'}

Return a JSON object with this exact structure (no markdown, no code blocks, just JSON):
{
  "dailyCalories": 2500,
  "macros": {
    "carbs": {"grams": 350, "percentage": 55},
    "protein": {"grams": 125, "percentage": 20},
    "fat": {"grams": 70, "percentage": 25}
  },
  "hydration": {
    "daily": "3000ml",
    "training": "750ml per hour",
    "preWorkout": "500ml 2 hours before",
    "postWorkout": "150% of fluid lost"
  },
  "mealTiming": {
    "breakfast": "7:00 AM - High carb meal",
    "snack1": "10:00 AM - Light snack",
    "lunch": "12:30 PM - Balanced meal",
    "snack2": "3:30 PM - Pre-workout fuel",
    "dinner": "6:30 PM - Recovery focused",
    "evening": "8:30 PM - Light protein"
  },
  "supplements": [
    {"name": "Vitamin D", "dose": "2000 IU", "timing": "Morning"},
    {"name": "Omega-3", "dose": "1000mg", "timing": "With dinner"}
  ],
  "personalizedNotes": "Specific recommendations based on your profile"
}`;

      const response = await this.callClaudeAPI(
        [{ role: 'user', content: userMessage }],
        systemPrompt
      );

      // Parse Claude's response with better error handling
      const responseText = response.content[0].text;
      console.log('Raw Claude response:', responseText.substring(0, 200) + '...');
      
      // Clean up the response - remove markdown code blocks if present
      let cleanedResponse = responseText;
      
      // Remove markdown code blocks
      cleanedResponse = cleanedResponse.replace(/```json\s*/gi, '');
      cleanedResponse = cleanedResponse.replace(/```\s*/gi, '');
      
      // Remove any text before the first {
      const jsonStart = cleanedResponse.indexOf('{');
      if (jsonStart > 0) {
        cleanedResponse = cleanedResponse.substring(jsonStart);
      }
      
      // Remove any text after the last }
      const jsonEnd = cleanedResponse.lastIndexOf('}');
      if (jsonEnd > -1 && jsonEnd < cleanedResponse.length - 1) {
        cleanedResponse = cleanedResponse.substring(0, jsonEnd + 1);
      }
      
      // Trim whitespace
      cleanedResponse = cleanedResponse.trim();
      
      try {
        const parsedData = JSON.parse(cleanedResponse);
        console.log('Successfully parsed nutrition plan:', parsedData);
        return parsedData;
      } catch (parseError) {
        console.error('Failed to parse cleaned response:', cleanedResponse.substring(0, 500));
        throw parseError;
      }

    } catch (error) {
      console.error('Error generating AI nutrition plan:', error);
      // Fallback to intelligent mock data
      return this.generateIntelligentMockPlan(userData);
    }
  }

  // Generate daily nutrition recommendations
  async generateDailyNutrition(userData) {
    try {
      const systemPrompt = `You are a sports nutritionist providing daily meal recommendations.
        Focus on practical, easy-to-prepare meals that align with training needs.
        Consider the athlete's food preferences and what they've already eaten today.`;

      const userMessage = `Create today's nutrition plan based on:
        Training: ${userData.trainingData?.todaysActivity?.type || 'Rest'}
        Duration: ${userData.trainingData?.todaysActivity?.duration || 0} minutes
        Intensity: ${userData.trainingData?.todaysActivity?.intensity || 'Low'}
        Liked Foods: ${userData.foodPreferences?.likedFoods?.join(', ') || 'None'}
        Disliked Foods: ${userData.foodPreferences?.dislikedFoods?.join(', ') || 'None'}
        
        Provide specific meal suggestions and timing in JSON format.`;

      const response = await this.callClaudeAPI(
        [{ role: 'user', content: userMessage }],
        systemPrompt
      );

      const responseText = response.content[0].text;
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return this.generateMockDailyNutrition(userData);

    } catch (error) {
      console.error('Error generating daily nutrition:', error);
      return this.generateMockDailyNutrition(userData);
    }
  }

  // Existing fallback methods (keep all your existing mock methods)
  generateIntelligentMockPlan(userData) {
    const { athlete, trainingData, preferences, foodPreferences } = userData;
    const goal = preferences?.trainingGoal || 'Endurance Performance';
    
    // Calculate base metabolic rate (BMR)
    const weight = athlete?.weight || 70;
    const bmr = weight * 24; // Simplified calculation
    
    // Add activity factor based on training
    const activityMultiplier = trainingData?.weeklyTSS > 500 ? 1.8 : 
                              trainingData?.weeklyTSS > 300 ? 1.6 : 1.4;
    
    const dailyCalories = Math.round(bmr * activityMultiplier);
    
    // Calculate macros based on goal
    let carbPercent = 0.50;
    let proteinPercent = 0.20;
    let fatPercent = 0.30;
    
    if (goal === 'Weight Loss') {
      carbPercent = 0.40;
      proteinPercent = 0.30;
      fatPercent = 0.30;
    } else if (goal === 'Muscle Gain') {
      carbPercent = 0.45;
      proteinPercent = 0.25;
      fatPercent = 0.30;
    }
    
    return {
      dailyCalories,
      macros: {
        carbs: {
          grams: Math.round((dailyCalories * carbPercent) / 4),
          percentage: carbPercent * 100
        },
        protein: {
          grams: Math.round((dailyCalories * proteinPercent) / 4),
          percentage: proteinPercent * 100
        },
        fat: {
          grams: Math.round((dailyCalories * fatPercent) / 9),
          percentage: fatPercent * 100
        }
      },
      hydration: {
        daily: `${Math.round(weight * 35)}ml`,
        training: '500-750ml per hour',
        preWorkout: '500ml 2 hours before',
        postWorkout: '150% of fluid lost'
      },
      mealTiming: {
        breakfast: '7:00 AM - High carb, moderate protein',
        snack1: '10:00 AM - Light snack if training',
        lunch: '12:30 PM - Balanced meal',
        snack2: '3:30 PM - Pre-workout fuel',
        dinner: '6:30 PM - Recovery focused',
        evening: '8:30 PM - Light protein if needed'
      },
      supplements: [
        { name: 'Vitamin D', dose: '2000 IU', timing: 'Morning' },
        { name: 'Omega-3', dose: '1000mg', timing: 'With dinner' },
        { name: 'Magnesium', dose: '400mg', timing: 'Before bed' }
      ],
      personalizedNotes: `Plan customized for ${foodPreferences?.likedFoods?.length || 0} food preferences`
    };
  }

  generateMockDailyNutrition(userData) {
    const { trainingData, foodPreferences } = userData;
    const activity = trainingData?.todaysActivity || { type: 'Rest', duration: 0, intensity: 'Low' };
    
    return {
      preWorkout: {
        timing: activity.duration > 60 ? '2-3 hours before' : '1-2 hours before',
        meal: 'Oatmeal with banana and honey',
        calories: 300,
        notes: 'Easy to digest carbs for energy'
      },
      duringWorkout: {
        needed: activity.duration > 90,
        suggestion: activity.duration > 90 ? 'Sports drink with 30-60g carbs/hour' : 'Water only',
        calories: activity.duration > 90 ? 200 : 0
      },
      postWorkout: {
        timing: 'Within 30 minutes',
        meal: 'Protein shake with fruit',
        calories: 350,
        notes: 'Optimize recovery with 3:1 carb to protein ratio'
      },
      meals: {
        breakfast: {
          time: '7:00 AM',
          meal: foodPreferences?.likedFoods?.includes('eggs') ? 
            'Eggs with whole grain toast' : 'Overnight oats with berries',
          calories: 450
        },
        lunch: {
          time: '12:30 PM',
          meal: 'Grilled chicken salad with quinoa',
          calories: 550
        },
        dinner: {
          time: '6:30 PM',
          meal: 'Salmon with sweet potato and vegetables',
          calories: 600
        },
        snacks: [
          { time: '10:00 AM', item: 'Greek yogurt with nuts', calories: 200 },
          { time: '3:00 PM', item: 'Apple with almond butter', calories: 250 }
        ]
      },
      totalCalories: 2600,
      hydration: {
        target: '3000ml throughout the day',
        timing: 'Sip regularly, increase around workouts'
      }
    };
  }

  // Add other existing methods here...
}

export default new NutritionService();