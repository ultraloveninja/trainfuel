// src/services/firebaseAuthService.js
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

class FirebaseAuthService {
  // Create new user with Strava data
  async createUserWithStrava(stravaAthlete, stravaTokens) {
    try {
      // Create a unique email from Strava ID
      const email = `strava_${stravaAthlete.id}@trainfuel.app`;
      const password = `strava_${stravaAthlete.id}_${Date.now()}`; // Auto-generate password
      
      // Create Firebase auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Store user data in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        stravaId: stravaAthlete.id,
        email: email,
        name: `${stravaAthlete.firstname} ${stravaAthlete.lastname}`,
        profile: stravaAthlete,
        stravaTokens: {
          access_token: stravaTokens.access_token,
          refresh_token: stravaTokens.refresh_token,
          expires_at: stravaTokens.expires_at
        },
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      });
      
      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }
  
  // Sign in existing user with Strava
  async signInWithStrava(stravaAthlete) {
    try {
      const email = `strava_${stravaAthlete.id}@trainfuel.app`;
      
      // Check if user exists
      const userDoc = await this.getUserByStravaId(stravaAthlete.id);
      
      if (userDoc) {
        // User exists, sign them in
        // For Strava users, we'll use a custom token approach
        // For now, we'll auto-sign them in
        return userDoc;
      } else {
        // New user, create account
        return null;
      }
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  }
  
  // Get user by Strava ID
  async getUserByStravaId(stravaId) {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('stravaId', '==', stravaId));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        return querySnapshot.docs[0].data();
      }
      return null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }
  
  // Sign out
  async signOut() {
    try {
      await signOut(auth);
      localStorage.clear(); // Clear all local storage
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }
  
  // Auth state observer
  onAuthStateChanged(callback) {
    return onAuthStateChanged(auth, callback);
  }
}

export default new FirebaseAuthService();