import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PlayerApp from './App';
import * as firestore from 'firebase/firestore';
import * as auth from 'firebase/auth';

// Mock Firebase Auth
vi.mock('firebase/auth', async () => {
    return {
        getAuth: vi.fn(),
        signInAnonymously: vi.fn().mockResolvedValue({ user: { uid: 'user1' } }),
        onAuthStateChanged: vi.fn((auth, callback) => {
            callback({ uid: 'user1', displayName: 'Test User' });
            return () => {};
        }),
        updateProfile: vi.fn().mockResolvedValue(true)
    };
});

// Mock Firebase Firestore
vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual('firebase/firestore');
  return {
    ...actual,
    getFirestore: vi.fn(),
    initializeFirestore: vi.fn(),
    persistentLocalCache: vi.fn(),
    persistentMultipleTabManager: vi.fn(),
    collection: vi.fn((db, ...path) => ({ type: 'collection', path: path.join('/') })),
    doc: vi.fn((db, ...path) => ({ type: 'doc', path: path.join('/') })),
    onSnapshot: vi.fn(),
    updateDoc: vi.fn(),
    setDoc: vi.fn(),
    getDoc: vi.fn(),
    deleteDoc: vi.fn(),
    addDoc: vi.fn(),
    serverTimestamp: vi.fn(),
  };
});

describe('Persistence Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('PlayerApp restores PIN and attempts join from localStorage', async () => {
    localStorage.setItem('mohoot_player_pin', '654321');

    // Mock getDoc to simulate finding the game
    firestore.getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ status: 'LOBBY', players: {} })
    });

    // Mock onSnapshot for the player listener
    firestore.onSnapshot.mockImplementation((ref, callback) => {
        // Simulate a session update
        callback({
            exists: () => true,
            data: () => ({ status: 'LOBBY', players: { 'user1': { nickname: 'Test User' } } })
        });
        return () => {};
    });

    render(<PlayerApp />);

    await waitFor(() => {
        expect(screen.getByText("You're In!")).toBeInTheDocument();
    });
  });
});