// src/services/nutritionService.js
import axios from 'axios';

class NutritionService {
  constructor() {
    this.proxyUrl = process.env.REACT_APP_PROXY_URL || 'http://localhost:3001/api/claude';
  }

  async callClaudeAPI(prompt) {
    try {
      const response = await axios.post(this.proxyUrl, {
        prompt: prompt  // Make sure we're sending 'prompt' field
      });
      
      return response.data;
    } catch (error) {
      console.error('Error calling Claude API:', error.response?.data || error.message);
      return null;
    }
  }

  async generateDailyNutrition(userData) {
    try {
      const prompt = this.buildNutritionPrompt(userData);
      const response = await this.callClaudeAPI(prompt);
      
      if (response && response.content) {
        return this.parseNutritionResponse(response.content);
      }
      
      return this.getFallbackNutrition();
    } catch (error) {
      console.error('Error generating daily nutrition:', error);
      return this.getFallbackNutrition();
    }
  }

  buildNutritionPrompt(userData) {
    const { athlete, trainingData, goals, preferences, dietaryRestrictions } = userData;
    
    return `Create a daily nutrition plan for an athlete with the following profile:
      Age: ${athlete?.age || 46}
      Weight: ${athlete?.weight || 204} lbs
      Height: ${athlete?.height || "6'2"}
      Goal: ${goals?.primaryGoal || 'weight_loss'}
      
      Training: ${trainingData?.phase || 'moderate'}
      Dietary Restrictions: ${dietaryRestrictions?.join(', ') || 'None'}
      
      Based on Nick Chase's nutrition principles:
      - Liquid nutrition during training
      - Protein timing around workouts
      - Vegetable-heavy dinners
      - Whole foods focus
      
      Return a JSON object with:
      {
        "meals": {
          "breakfast": {"calories": X, "protein": Y, "carbs": Z, "fat": A},
          "lunch": {"calories": X, "protein": Y, "carbs": Z, "fat": A},
          "dinner": {"calories": X, "protein": Y, "carbs": Z, "fat": A},
          "snacks": {"calories": X, "protein": Y, "carbs": Z, "fat": A}
        },
        "hydration": {"target": X},
        "totalCalories": X,
        "macros": {"protein": Y, "carbs": Z, "fat": A}
      }
      
      ONLY respond with valid JSON.`;
  }

  parseNutritionResponse(content) {
    try {
      // Handle string response
      let cleanContent = content;
      if (typeof content === 'string') {
        cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      }
      
      const parsed = JSON.parse(cleanContent);
      return parsed;
    } catch (error) {
      console.error('Error parsing nutrition response:', error);
      return this.getFallbackNutrition();
    }
  }

  getFallbackNutrition() {
    return {
      meals: {
        breakfast: { calories: 400, protein: 30, carbs: 45, fat: 10 },
        lunch: { calories: 500, protein: 40, carbs: 50, fat: 15 },
        dinner: { calories: 600, protein: 45, carbs: 60, fat: 20 },
        snacks: { calories: 300, protein: 15, carbs: 40, fat: 10 }
      },
      hydration: { target: 100 },
      totalCalories: 1800,
      macros: { protein: 130, carbs: 195, fat: 55 }
    };
  }
}

export default new NutritionService();