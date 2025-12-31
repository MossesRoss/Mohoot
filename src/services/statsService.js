import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';

export const StatsService = {
  // Load stats from Firestore
  loadStats: async (db, appId, userId) => {
    if (!userId) return null;
    try {
      const ref = doc(db, 'artifacts', appId, 'users', userId, 'playerStats', 'summary');
      const snap = await getDoc(ref);
      
      const defaultStats = {
        totalGamesPlayed: 0,
        totalGamesWon: 0,
        totalQuestionsAnswered: 0,
        totalCorrectAnswers: 0,
        totalIncorrectAnswers: 0,
        totalScore: 0,
      };

      if (snap.exists()) {
        return { ...defaultStats, ...snap.data() };
      } else {
        return defaultStats;
      }
    } catch (e) {
      console.error("Failed to load stats", e);
      return null;
    }
  },

  // Update specific fields atomically
  updateStats: async (db, appId, userId, updates) => {
    if (!userId) return;
    const ref = doc(db, 'artifacts', appId, 'users', userId, 'playerStats', 'summary');
    
    const firestoreUpdates = {};
    if (updates.incrementGamesPlayed) firestoreUpdates.totalGamesPlayed = increment(1);
    if (updates.incrementGamesWon) firestoreUpdates.totalGamesWon = increment(1);
    if (updates.incrementQuestionsAnswered) firestoreUpdates.totalQuestionsAnswered = increment(1);
    if (updates.incrementCorrectAnswers) firestoreUpdates.totalCorrectAnswers = increment(1);
    if (updates.incrementIncorrectAnswers) firestoreUpdates.totalIncorrectAnswers = increment(1);
    if (updates.addScore) firestoreUpdates.totalScore = increment(updates.addScore);
    if (updates.incrementPlaytime) firestoreUpdates.totalPlaytime = increment(updates.incrementPlaytime); // in seconds

    try {
      await setDoc(ref, firestoreUpdates, { merge: true });
    } catch (e) {
      console.error("Failed to save stats", e);
    }
  }
};