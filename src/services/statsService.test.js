import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StatsService } from './statsService';
import { increment } from 'firebase/firestore';

// Mock Firestore
const mockDb = {};
const mockAppId = 'app1';
const mockUserId = 'user1';

// We need to mock the firebase/firestore module imports used in StatsService
vi.mock('firebase/firestore', () => ({
  doc: vi.fn((db, ...path) => ({ path: path.join('/') })),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  increment: vi.fn((val) => ({ type: 'increment', value: val })),
}));

import { getDoc, setDoc } from 'firebase/firestore';

describe('StatsService (Firestore)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return default stats when no data exists', async () => {
    getDoc.mockResolvedValue({ exists: () => false });

    const stats = await StatsService.loadStats(mockDb, mockAppId, mockUserId);
    
    expect(stats).toEqual({
      totalGamesPlayed: 0,
      totalGamesWon: 0,
      totalQuestionsAnswered: 0,
      totalCorrectAnswers: 0,
      totalIncorrectAnswers: 0,
      totalScore: 0,
    });
  });

  it('should load existing stats', async () => {
    const existingData = {
      totalGamesPlayed: 5,
      totalScore: 100
    };
    getDoc.mockResolvedValue({ 
      exists: () => true, 
      data: () => existingData 
    });

    const stats = await StatsService.loadStats(mockDb, mockAppId, mockUserId);
    
    expect(stats).toMatchObject(existingData);
    expect(stats.totalGamesWon).toBe(0); // Default for missing field
  });

  it('should update stats using atomic increments', async () => {
    await StatsService.updateStats(mockDb, mockAppId, mockUserId, {
      incrementGamesPlayed: true,
      addScore: 500
    });

    expect(setDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: `artifacts/${mockAppId}/users/${mockUserId}/playerStats/summary` }),
      {
        totalGamesPlayed: { type: 'increment', value: 1 },
        totalScore: { type: 'increment', value: 500 }
      },
      { merge: true }
    );
  });
});