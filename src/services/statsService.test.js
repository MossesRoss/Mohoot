import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StatsService } from './statsService';

describe('StatsService', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should return default stats when no data exists', () => {
    const stats = StatsService.loadStats();
    expect(stats).toEqual({
      totalGamesPlayed: 0,
      totalGamesWon: 0,
      totalQuestionsAnswered: 0,
      totalCorrectAnswers: 0,
      totalIncorrectAnswers: 0,
      totalScore: 0,
    });
  });

  it('should save and load stats correctly', () => {
    const newStats = {
      totalGamesPlayed: 5,
      totalGamesWon: 2,
      totalQuestionsAnswered: 50,
      totalCorrectAnswers: 40,
      totalIncorrectAnswers: 10,
      totalScore: 1000,
    };
    StatsService.saveStats(newStats);
    const loaded = StatsService.loadStats();
    expect(loaded).toEqual(newStats);
  });

  it('should update stats correctly', () => {
    StatsService.saveStats({
      totalGamesPlayed: 1,
      totalGamesWon: 0,
      totalQuestionsAnswered: 10,
      totalCorrectAnswers: 5,
      totalIncorrectAnswers: 5,
      totalScore: 500,
    });

    const updated = StatsService.updateStats({
      incrementGamesPlayed: true,
      incrementGamesWon: true,
      incrementQuestionsAnswered: true,
      incrementCorrectAnswers: true,
      addScore: 100,
    });

    expect(updated).toEqual({
      totalGamesPlayed: 2,
      totalGamesWon: 1,
      totalQuestionsAnswered: 11,
      totalCorrectAnswers: 6,
      totalIncorrectAnswers: 5,
      totalScore: 600,
    });
  });

  it('should handle partial updates (incorrect answer)', () => {
    const updated = StatsService.updateStats({
      incrementQuestionsAnswered: true,
      incrementIncorrectAnswers: true,
    });

    expect(updated.totalQuestionsAnswered).toBe(1);
    expect(updated.totalIncorrectAnswers).toBe(1);
    expect(updated.totalCorrectAnswers).toBe(0);
  });
});
