// src/services/edamamService.js

class EdamamService {
  constructor() {
    // Food Database API credentials
    this.foodAppId = process.env.REACT_APP_EDAMAM_FOOD_APP_ID;
    this.foodAppKey = process.env.REACT_APP_EDAMAM_FOOD_APP_KEY;
    
    // Nutrition Analysis API credentials
    this.nutritionAppId = process.env.REACT_APP_EDAMAM_NUTRITION_APP_ID;
    this.nutritionAppKey = process.env.REACT_APP_EDAMAM_NUTRITION_APP_KEY;
    
    this.baseUrl = 'https://api.edamam.com';
    
    // Cache to reduce API calls
    this.cache = new Map();
  }

  // Search for foods using natural language
  async searchFood(query) {
    if (!query || query.length < 2) return [];
    
    // Check cache first
    const cacheKey = `search_${query.toLowerCase()}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/api/food-database/v2/parser?` + 
        `app_id=${this.foodAppId}&` +
        `app_key=${this.foodAppKey}&` +
        `ingr=${encodeURIComponent(query)}&` +
        `nutrition-type=cooking`
      );

      if (!response.ok) {
        console.error('Edamam API error:', response.status);
        return [];
      }

      const data = await response.json();
      
      // Transform Edamam format to our format
      const foods = data.hints.slice(0, 20).map(hint => ({
        id: hint.food.foodId,
        name: hint.food.label,
        brand: hint.food.brand || '',
        category: hint.food.category || 'generic',
        image: hint.food.image,
        // Get nutrients per 100g
        calories: Math.round(hint.food.nutrients.ENERC_KCAL || 0),
        protein: Math.round(hint.food.nutrients.PROCNT || 0),
        carbs: Math.round(hint.food.nutrients.CHOCDF || 0),
        fat: Math.round(hint.food.nutrients.FAT || 0),
        fiber: Math.round(hint.food.nutrients.FIBTG || 0),
        sugar: Math.round(hint.food.nutrients.SUGAR || 0),
        sodium: Math.round(hint.food.nutrients.NA || 0),
        // Store measure options for portion sizes
        measures: hint.measures || [],
        // Per 100g by default
        servingSize: 100,
        servingUnit: 'g'
      }));

      // Cache for 1 hour
      this.cache.set(cacheKey, foods);
      setTimeout(() => this.cache.delete(cacheKey), 3600000);

      return foods;
    } catch (error) {
      console.error('Error searching foods:', error);
      return [];
    }
  }

  // Get detailed nutrition for a specific food with portion
  async getNutrition(foodId, quantity = 100, measureUri = null) {
    try {
      const body = {
        ingredients: [{
          quantity: quantity,
          measureURI: measureUri || 'http://www.edamam.com/ontologies/edamam.owl#Measure_gram',
          foodId: foodId
        }]
      };

      const response = await fetch(
        `${this.baseUrl}/api/food-database/v2/nutrients?` +
        `app_id=${this.foodAppId}&` +
        `app_key=${this.foodAppKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        }
      );

      if (!response.ok) {
        console.error('Edamam nutrition API error:', response.status);
        return null;
      }

      const data = await response.json();
      
      // Extract detailed nutrition
      const nutrients = data.totalNutrients;
      return {
        calories: Math.round(nutrients.ENERC_KCAL?.quantity || 0),
        protein: Math.round(nutrients.PROCNT?.quantity || 0),
        carbs: Math.round(nutrients.CHOCDF?.quantity || 0),
        fat: Math.round(nutrients.FAT?.quantity || 0),
        fiber: Math.round(nutrients.FIBTG?.quantity || 0),
        sugar: Math.round(nutrients.SUGAR?.quantity || 0),
        sodium: Math.round(nutrients.NA?.quantity || 0),
        // Additional nutrients
        saturatedFat: Math.round(nutrients.FASAT?.quantity || 0),
        cholesterol: Math.round(nutrients.CHOLE?.quantity || 0),
        vitaminA: Math.round(nutrients.VITA_RAE?.quantity || 0),
        vitaminC: Math.round(nutrients.VITC?.quantity || 0),
        calcium: Math.round(nutrients.CA?.quantity || 0),
        iron: Math.round(nutrients.FE?.quantity || 0),
        potassium: Math.round(nutrients.K?.quantity || 0)
      };
    } catch (error) {
      console.error('Error getting nutrition:', error);
      return null;
    }
  }

  // Parse natural language food input (e.g., "2 cups of brown rice")
  async parseNaturalLanguage(text) {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/nutrition-data?` +
        `app_id=${this.nutritionAppId}&` +
        `app_key=${this.nutritionAppKey}&` +
        `ingr=${encodeURIComponent(text)}`
      );

      if (!response.ok) {
        console.error('Edamam parse API error:', response.status);
        return null;
      }

      const data = await response.json();
      
      if (data.calories === 0) {
        return null; // Couldn't parse the input
      }

      return {
        name: text,
        calories: data.calories,
        protein: Math.round(data.totalNutrients?.PROCNT?.quantity || 0),
        carbs: Math.round(data.totalNutrients?.CHOCDF?.quantity || 0),
        fat: Math.round(data.totalNutrients?.FAT?.quantity || 0),
        fiber: Math.round(data.totalNutrients?.FIBTG?.quantity || 0),
        weight: data.totalWeight,
        // Additional info
        ingredients: data.ingredients,
        healthLabels: data.healthLabels,
        cautions: data.cautions
      };
    } catch (error) {
      console.error('Error parsing natural language:', error);
      return null;
    }
  }

  // Analyze a recipe URL or text
  async analyzeRecipe(title, ingredients, servings = 1) {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/nutrition-details?` +
        `app_id=${this.nutritionAppId}&` +
        `app_key=${this.nutritionAppKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title: title,
            ingr: ingredients, // Array of ingredient strings
            yield: servings
          })
        }
      );

      if (!response.ok) {
        console.error('Edamam recipe API error:', response.status);
        return null;
      }

      const data = await response.json();
      
      // Per serving nutrition
      return {
        name: title,
        servings: servings,
        calories: Math.round(data.calories / servings),
        protein: Math.round((data.totalNutrients?.PROCNT?.quantity || 0) / servings),
        carbs: Math.round((data.totalNutrients?.CHOCDF?.quantity || 0) / servings),
        fat: Math.round((data.totalNutrients?.FAT?.quantity || 0) / servings),
        // Total recipe nutrition
        totalCalories: data.calories,
        totalWeight: data.totalWeight,
        // Detailed breakdown
        ingredients: data.ingredients,
        healthLabels: data.healthLabels,
        dietLabels: data.dietLabels,
        cautions: data.cautions
      };
    } catch (error) {
      console.error('Error analyzing recipe:', error);
      return null;
    }
  }

  // Get autocomplete suggestions
  async autocomplete(query) {
    if (!query || query.length < 2) return [];
    
    try {
      const response = await fetch(
        `${this.baseUrl}/auto-complete?` +
        `app_id=${this.foodAppId}&` +
        `app_key=${this.foodAppKey}&` +
        `q=${encodeURIComponent(query)}&` +
        `limit=10`
      );

      if (!response.ok) {
        return [];
      }

      const suggestions = await response.json();
      return suggestions;
    } catch (error) {
      console.error('Error getting autocomplete:', error);
      return [];
    }
  }

  // Convert common household measures
  getMeasureOptions(measures) {
    if (!measures || measures.length === 0) {
      return [{ label: '100g', value: 100, uri: null }];
    }

    return measures.map(measure => ({
      label: measure.label,
      value: measure.weight, // Weight in grams
      uri: measure.uri
    }));
  }
}

export default new EdamamService();