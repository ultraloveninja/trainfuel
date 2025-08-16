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
    return `Based on Nick Chase's training methods, generate 3 workout suggestions for:
      
      Current workout: ${data.workout.type} ${data.workout.discipline}
      Fatigue level: ${data.fatigue}
      Season: ${data.isInSeason ? 'In-season' : 'Off-season'}
      Recent activities: ${data.recentActivities || 0} in last 7 days
      
      Follow Nick's principles:
      - Liquid nutrition during long sessions
      - Focus on consistency over intensity
      - Sports psychology foundation
      - Gradual adaptation
      
      Respond with a JSON array of 3 suggestions, each with:
      {
        "title": "short title",
        "description": "detailed description",
        "duration": "time range",
        "nutrition": "fueling strategy"
      }
      
      ONLY respond with valid JSON, no other text.`;
  }

  buildMealPrompt(data) {
    return `Based on Nick Chase's nutrition principles, suggest 3 specific meals for:
      
      Activity level: ${data.activityLevel}
      Daily macros: Protein ${data.macros.protein}g, Carbs ${data.macros.carbs}g, Fat ${data.macros.fat}g
      Dietary preferences: ${data.preferences?.join(', ') || 'None'}
      Recent foods: ${data.recentFoods?.join(', ') || 'Not tracked'}
      
      Follow Nick's principles:
      - Liquid nutrition during training
      - Protein timing around workouts
      - Vegetable-heavy dinners
      - Whole foods focus
      
      Respond with a JSON array of 3 meal suggestions:
      {
        "meal": "breakfast/lunch/dinner",
        "name": "meal name",
        "ingredients": ["list of ingredients"],
        "macros": {"protein": X, "carbs": Y, "fat": Z, "calories": Total},
        "prepTime": "X minutes",
        "instructions": "brief cooking instructions"
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
        title: "Fasted Morning Run",
        description: "Easy Zone 2 run following Nick's fasted training approach for fat adaptation",
        duration: "45-60 min",
        nutrition: "Coffee protein shake post-workout within 30 minutes"
      },
      {
        title: "Tempo Bike Session",
        description: "Sustained effort at race pace with focus on aerodynamic position",
        duration: "75-90 min",
        nutrition: "Diluted sports drink (50/50 with water) every 20 min"
      },
      {
        title: "Brick Workout",
        description: "Bike 60 min at moderate pace, transition to 20 min run at race pace",
        duration: "90 min total",
        nutrition: "200-250 cal/hour from liquid sources, electrolytes throughout"
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