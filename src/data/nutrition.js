// src/data/nutrition.js

export const NUTRITION_PRINCIPLES = {
  training: {
    morning: {
      preworkout: "Option 1: Fasted for easy sessions. Option 2: Banana + coffee 30min before harder efforts",
      during: "Under 60min: Water only. 60-90min: Electrolytes. Over 90min: 30-60g carbs/hour",
      postworkout: "Within 30min: Protein shake (25-30g) + simple carbs (banana/dates)"
    },
    afternoon: {
      preworkout: "Light snack 60-90min before: Rice cakes + nut butter or fruit",
      during: "Same as morning guidelines based on duration",
      postworkout: "If close to meal: Regular meal. Otherwise: Recovery shake"
    },
    evening: {
      preworkout: "Ensure 2-3 hours since last meal, small carb snack if needed",
      during: "Electrolytes for any duration to aid recovery",
      postworkout: "Light protein + carbs, avoid heavy meals before bed"
    }
  },
  
  meals: {
    breakfast: {
      options: [
        "Oatmeal with berries, nuts, and protein powder",
        "Eggs with whole grain toast and avocado",
        "Greek yogurt parfait with granola and fruit",
        "Protein smoothie with banana, spinach, and nut butter"
      ],
      timing: "Within 1-2 hours of waking",
      macros: "30-40g protein, 40-60g carbs, 15-20g fat"
    },
    
    lunch: {
      options: [
        "Grilled chicken/turkey with quinoa and vegetables",
        "Large salad with protein, beans, and whole grains",
        "Turkey and avocado wrap with side salad",
        "Salmon with sweet potato and greens"
      ],
      timing: "4-5 hours after breakfast",
      macros: "35-45g protein, 45-65g carbs, 15-25g fat"
    },
    
    dinner: {
      options: [
        "Lean protein with roasted vegetables and small portion of grains",
        "Stir-fry with tofu/chicken and lots of vegetables",
        "Fish with steamed broccoli and quinoa",
        "Turkey chili with beans and vegetables"
      ],
      timing: "3-4 hours before bed when possible",
      macros: "35-45g protein, 30-50g carbs, 20-25g fat"
    },
    
    snacks: {
      options: [
        "Apple with almond butter",
        "Greek yogurt with berries",
        "Rice cakes with avocado",
        "Protein shake with fruit",
        "Mixed nuts and dried fruit",
        "Hummus with vegetables"
      ],
      timing: "Between meals as needed, post-workout",
      macros: "10-20g protein, 20-30g carbs, 5-15g fat"
    }
  },
  
  hydration: {
    daily: "Half your body weight in ounces minimum",
    training: "16-24oz per hour of training",
    postWorkout: "150% of fluid lost through sweat",
    electrolytes: "Add for sessions over 60min or in heat"
  },
  
  raceWeek: {
    carboLoading: {
      days3to2Before: "Increase carbs to 3-4g per lb bodyweight",
      dayBefore: "Maintain high carbs, reduce fiber, stay hydrated",
      raceDay: "Familiar breakfast 3-4 hours before, 30-60g carbs/hour during"
    },
    foods: {
      increase: ["White rice", "Pasta", "Bagels", "Bananas", "Sports drinks"],
      decrease: ["High fiber foods", "Fatty foods", "New foods", "Alcohol"],
      avoid: ["Spicy foods", "High-fat meals", "Excessive protein", "Unfamiliar foods"]
    }
  },
  
  recovery: {
    immediate: "Within 30min: 25-30g protein + 30-60g carbs",
    daily: "0.8-1g protein per lb bodyweight",
    antiInflammatory: ["Tart cherries", "Turmeric", "Ginger", "Fatty fish", "Berries"],
    supplements: ["Vitamin D", "Omega-3", "Magnesium", "Probiotics", "Iron (if tested low)"]
  },
  
  weightLoss: {
    approach: "Moderate deficit (300-500 calories) while maintaining training quality",
    macros: {
      protein: "1g per lb bodyweight to preserve muscle",
      carbs: "Timed around training for performance",
      fat: "0.3-0.4g per lb bodyweight minimum"
    },
    strategies: [
      "Track intake accurately for 2 weeks to establish baseline",
      "Prioritize protein and vegetables at meals",
      "Time carbohydrates around training sessions",
      "Don't cut calories on hard training days",
      "Weekly refeed day at maintenance calories"
    ]
  }
};

export const MEAL_PLANS = {
  trainingDay: {
    light: {
      calories: 2000,
      meals: {
        breakfast: "Overnight oats with berries and protein powder",
        lunch: "Large salad with grilled chicken and quinoa",
        dinner: "Baked fish with roasted vegetables",
        snacks: "Apple with almond butter, Greek yogurt"
      },
      macros: { protein: 140, carbs: 225, fat: 65 }
    },
    moderate: {
      calories: 2400,
      meals: {
        breakfast: "3-egg omelet with toast and avocado",
        lunch: "Turkey sandwich with sweet potato and salad",
        dinner: "Grilled chicken with rice and vegetables",
        snacks: "Protein shake, rice cakes with nut butter"
      },
      macros: { protein: 160, carbs: 280, fat: 75 }
    },
    heavy: {
      calories: 2800,
      meals: {
        breakfast: "Pancakes with eggs and fruit",
        lunch: "Pasta with meat sauce and side salad",
        dinner: "Steak with potato and vegetables",
        snacks: "Trail mix, protein bar, banana with nut butter"
      },
      macros: { protein: 175, carbs: 350, fat: 85 }
    }
  },
  
  restDay: {
    calories: 1800,
    meals: {
      breakfast: "Greek yogurt parfait with granola",
      lunch: "Large vegetable salad with protein",
      dinner: "Stir-fry with tofu and vegetables",
      snacks: "Vegetables with hummus, small handful of nuts"
    },
    macros: { protein: 130, carbs: 180, fat: 60 }
  }
};

export const RACE_NUTRITION = {
  sprint: {
    before: "Light meal 2 hours before, one gel 15min before start",
    during: "Water/electrolytes only",
    after: "Recovery shake immediately"
  },
  olympic: {
    before: "Carb-focused meal 3 hours before, gel at start",
    during: "30-45g carbs/hour, electrolytes",
    after: "Recovery meal within 30min"
  },
  halfIronman: {
    before: "Large breakfast 3-4 hours before, gel at swim start",
    during: "60-90g carbs/hour on bike, 30-45g/hour on run",
    after: "Immediate recovery drink, full meal within 2 hours"
  },
  ironman: {
    before: "Carb load for 3 days, large breakfast 3-4 hours before",
    during: "60-90g carbs/hour, vary sources, manage electrolytes",
    after: "Liquid nutrition first, solid food when tolerated"
  }
};

export const generateNutritionPlan = (userData) => {
  const { weight, trainingLoad, goal, phase } = userData;
  
  const basalMetabolicRate = weight * 10; // Simplified BMR
  const activityMultiplier = trainingLoad === 'high' ? 1.7 : trainingLoad === 'moderate' ? 1.5 : 1.3;
  const dailyCalories = Math.round(basalMetabolicRate * activityMultiplier);
  
  // Adjust for goals
  let targetCalories = dailyCalories;
  if (goal === 'weightLoss') {
    targetCalories = dailyCalories - 400;
  } else if (goal === 'performance') {
    targetCalories = dailyCalories + 200;
  }
  
  // Calculate macros
  const protein = Math.round(weight * 0.9); // 0.9g per lb for endurance athletes
  const fat = Math.round(targetCalories * 0.25 / 9); // 25% of calories from fat
  const carbs = Math.round((targetCalories - (protein * 4) - (fat * 9)) / 4);
  
  return {
    dailyCalories: targetCalories,
    macros: {
      protein,
      carbs,
      fat
    },
    hydration: Math.round(weight / 2), // oz per day
    mealTiming: phase === 'race' ? 'Increase meal frequency, reduce fiber' : 'Standard 3 meals + 2 snacks'
  };
};