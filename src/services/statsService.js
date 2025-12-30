const STORAGE_KEY = 'mohoot_player_stats';

const DEFAULT_STATS = {
  totalGamesPlayed: 0,
  totalGamesWon: 0,
  totalQuestionsAnswered: 0,
  totalCorrectAnswers: 0,
  totalIncorrectAnswers: 0,
  totalScore: 0,
};

export const StatsService = {
  // Load stats from local storage
  loadStats: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? { ...DEFAULT_STATS, ...JSON.parse(stored) } : DEFAULT_STATS;
    } catch (e) {
      console.error("Failed to load stats", e);
      return DEFAULT_STATS;
    }
  },

  // Save stats to local storage
  saveStats: (stats) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
    } catch (e) {
      console.error("Failed to save stats", e);
    }
  },

  // Update specific fields
  updateStats: (updates) => {
    const current = StatsService.loadStats();
    const newStats = { ...current };

    if (updates.incrementGamesPlayed) newStats.totalGamesPlayed++;
    if (updates.incrementGamesWon) newStats.totalGamesWon++;
    if (updates.incrementQuestionsAnswered) newStats.totalQuestionsAnswered++;
    if (updates.incrementCorrectAnswers) newStats.totalCorrectAnswers++;
    if (updates.incrementIncorrectAnswers) newStats.totalIncorrectAnswers++;
    if (updates.addScore) newStats.totalScore += updates.addScore;

    StatsService.saveStats(newStats);
    return newStats;
  },
  
  // Clear stats (for testing or user reset)
  clearStats: () => {
    localStorage.removeItem(STORAGE_KEY);
    return DEFAULT_STATS;
  }
};
