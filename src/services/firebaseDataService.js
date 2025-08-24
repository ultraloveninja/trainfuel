// src/services/firebaseDataService.js
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs 
} from 'firebase/firestore';
import { db } from '../config/firebase';

class FirebaseDataService {
  // Save user settings
  async saveUserSettings(userId, settings) {
    try {
      await setDoc(doc(db, 'userSettings', userId), {
        ...settings,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  }
  
  // Get user settings
  async getUserSettings(userId) {
    try {
      const docRef = doc(db, 'userSettings', userId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data();
      }
      return null;
    } catch (error) {
      console.error('Error getting settings:', error);
      return null;
    }
  }
  
  // Save nutrition plan
  async saveNutritionPlan(userId, plan) {
    try {
      const planId = `plan_${Date.now()}`;
      await setDoc(doc(db, 'nutritionPlans', planId), {
        userId,
        ...plan,
        createdAt: new Date().toISOString()
      });
      return planId;
    } catch (error) {
      console.error('Error saving nutrition plan:', error);
      throw error;
    }
  }
  
  // Get user's nutrition plans
  async getUserNutritionPlans(userId) {
    try {
      const q = query(
        collection(db, 'nutritionPlans'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(10)
      );
      
      const querySnapshot = await getDocs(q);
      const plans = [];
      querySnapshot.forEach((doc) => {
        plans.push({ id: doc.id, ...doc.data() });
      });
      
      return plans;
    } catch (error) {
      console.error('Error getting nutrition plans:', error);
      return [];
    }
  }
  
  // Save workout recommendation
  async saveWorkoutRecommendation(userId, workout) {
    try {
      const workoutId = `workout_${Date.now()}`;
      await setDoc(doc(db, 'workouts', workoutId), {
        userId,
        ...workout,
        createdAt: new Date().toISOString()
      });
      return workoutId;
    } catch (error) {
      console.error('Error saving workout:', error);
      throw error;
    }
  }
  
  // Cache Strava activities
  async cacheStravaActivities(userId, activities) {
    try {
      await setDoc(doc(db, 'stravaCache', userId), {
        activities,
        cachedAt: new Date().toISOString()
      });
      return true;
    } catch (error) {
      console.error('Error caching activities:', error);
      return false;
    }
  }
  
  // Get cached Strava activities
  async getCachedStravaActivities(userId) {
    try {
      const docRef = doc(db, 'stravaCache', userId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Check if cache is less than 1 hour old
        const cacheAge = Date.now() - new Date(data.cachedAt).getTime();
        if (cacheAge < 3600000) { // 1 hour in milliseconds
          return data.activities;
        }
      }
      return null;
    } catch (error) {
      console.error('Error getting cached activities:', error);
      return null;
    }
  }
}

export default new FirebaseDataService();