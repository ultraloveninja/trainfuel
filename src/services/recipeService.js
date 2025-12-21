// src/services/recipeService.js

class RecipeService {
  constructor() {
    this.storageKey = 'trainfuel_saved_recipes';
  }

  // Get all saved recipes
  getAllRecipes() {
    try {
      const recipes = localStorage.getItem(this.storageKey);
      return recipes ? JSON.parse(recipes) : [];
    } catch (error) {
      console.error('Error loading recipes:', error);
      return [];
    }
  }

  // Save a new recipe
  saveRecipe(recipe) {
    try {
      const recipes = this.getAllRecipes();
      
      const newRecipe = {
        id: Date.now(),
        name: recipe.name,
        mealType: recipe.mealType || 'snacks',
        items: recipe.items || [], // Array of food items
        totalMacros: this.calculateTotalMacros(recipe.items),
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
        useCount: 0
      };

      recipes.push(newRecipe);
      localStorage.setItem(this.storageKey, JSON.stringify(recipes));
      
      console.log('Recipe saved:', newRecipe);
      return newRecipe;
    } catch (error) {
      console.error('Error saving recipe:', error);
      throw error;
    }
  }

  // Update an existing recipe
  updateRecipe(recipeId, updates) {
    try {
      const recipes = this.getAllRecipes();
      const index = recipes.findIndex(r => r.id === recipeId);
      
      if (index !== -1) {
        recipes[index] = {
          ...recipes[index],
          ...updates,
          updatedAt: new Date().toISOString()
        };
        localStorage.setItem(this.storageKey, JSON.stringify(recipes));
        return recipes[index];
      }
      
      return null;
    } catch (error) {
      console.error('Error updating recipe:', error);
      throw error;
    }
  }

  // Delete a recipe
  deleteRecipe(recipeId) {
    try {
      const recipes = this.getAllRecipes();
      const filtered = recipes.filter(r => r.id !== recipeId);
      localStorage.setItem(this.storageKey, JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error('Error deleting recipe:', error);
      return false;
    }
  }

  // Get recipe by ID
  getRecipeById(recipeId) {
    const recipes = this.getAllRecipes();
    return recipes.find(r => r.id === recipeId);
  }

  // Get recipes by meal type
  getRecipesByMealType(mealType) {
    const recipes = this.getAllRecipes();
    return recipes.filter(r => r.mealType === mealType);
  }

  // Mark recipe as used (for tracking favorites)
  markAsUsed(recipeId) {
    const recipe = this.getRecipeById(recipeId);
    if (recipe) {
      this.updateRecipe(recipeId, {
        lastUsed: new Date().toISOString(),
        useCount: (recipe.useCount || 0) + 1
      });
    }
  }

  // Calculate total macros for a recipe
  calculateTotalMacros(items) {
    if (!items || items.length === 0) {
      return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
    }

    return items.reduce((totals, item) => ({
      calories: totals.calories + (item.calories || 0),
      protein: totals.protein + (item.protein || 0),
      carbs: totals.carbs + (item.carbs || 0),
      fat: totals.fat + (item.fat || 0),
      fiber: totals.fiber + (item.fiber || 0)
    }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
  }

  // Create recipe from AI meal suggestion
  createFromAISuggestion(aiSuggestion) {
    return {
      name: aiSuggestion.name,
      mealType: aiSuggestion.meal || 'lunch',
      items: [{
        id: Date.now(),
        name: aiSuggestion.name,
        calories: aiSuggestion.calories || aiSuggestion.macros?.calories || 0,
        protein: aiSuggestion.protein || aiSuggestion.macros?.protein || 0,
        carbs: aiSuggestion.carbs || aiSuggestion.macros?.carbs || 0,
        fat: aiSuggestion.fat || aiSuggestion.macros?.fat || 0,
        fiber: aiSuggestion.fiber || 0,
        description: aiSuggestion.description || '',
        instructions: aiSuggestion.instructions || '',
        timestamp: new Date().toISOString(),
        source: 'ai_suggestion'
      }]
    };
  }

  // Create recipe from current meal items
  createFromMealItems(name, mealType, items) {
    return {
      name: name,
      mealType: mealType,
      items: items.map(item => ({
        ...item,
        // Ensure we have all required fields
        id: item.id || Date.now() + Math.random(),
        name: item.name,
        calories: item.calories || 0,
        protein: item.protein || 0,
        carbs: item.carbs || 0,
        fat: item.fat || 0,
        fiber: item.fiber || 0
      }))
    };
  }

  // Export recipes to JSON file
  exportRecipes() {
    const recipes = this.getAllRecipes();
    const dataStr = JSON.stringify(recipes, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `trainfuel-recipes-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
  }

  // Import recipes from JSON file
  async importRecipes(file) {
    try {
      const text = await file.text();
      const importedRecipes = JSON.parse(text);
      
      if (!Array.isArray(importedRecipes)) {
        throw new Error('Invalid recipe file format');
      }

      const currentRecipes = this.getAllRecipes();
      const merged = [...currentRecipes, ...importedRecipes];
      
      localStorage.setItem(this.storageKey, JSON.stringify(merged));
      return merged.length - currentRecipes.length; // Return number of recipes imported
    } catch (error) {
      console.error('Error importing recipes:', error);
      throw error;
    }
  }

  // Get frequently used recipes
  getFrequentRecipes(limit = 5) {
    const recipes = this.getAllRecipes();
    return recipes
      .sort((a, b) => (b.useCount || 0) - (a.useCount || 0))
      .slice(0, limit);
  }

  // Get recently used recipes
  getRecentRecipes(limit = 5) {
    const recipes = this.getAllRecipes();
    return recipes
      .sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed))
      .slice(0, limit);
  }
}

export default new RecipeService();
