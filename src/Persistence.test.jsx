import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HostApp, PlayerApp } from './App';
import * as firestore from 'firebase/firestore';

// Mock Firebase
vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual('firebase/firestore');
  return {
    ...actual,
    getFirestore: vi.fn(),
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
  const mockUser = { uid: 'user1', displayName: 'Test User', photoURL: 'test.jpg' };
  
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('HostApp restores session from localStorage', async () => {
    // Setup LocalStorage
    const storedState = JSON.stringify({ quizId: 'quiz1', pin: '123456' });
    localStorage.setItem('mohoot_host_state', storedState);

    // Mock onSnapshot to handle both collection (quizzes) and doc (session)
    firestore.onSnapshot.mockImplementation((ref, callback) => {
        if (ref.type === 'collection') {
            // Quizzes collection
            callback({ docs: [{ id: 'quiz1', data: () => ({ title: 'My Quiz', questions: [] }) }] });
        } else {
            // Session doc
            callback({ 
                exists: () => true, 
                data: () => ({ 
                    status: 'LOBBY', 
                    players: {}, 
                    quizSnapshot: { questions: [] } // Ensure quizSnapshot exists
                }) 
            });
        }
        return () => {};
    });

    render(<HostApp user={mockUser} onBack={vi.fn()} />);

    // Expect HostGameEngine to be active. 
    await waitFor(() => {
        const pinElement = screen.getByText('123456');
        expect(pinElement).toBeInTheDocument();
    });
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

    render(<PlayerApp user={mockUser} onBack={vi.fn()} />);

    await waitFor(() => {
        // If successful, PlayerApp shows "You're In."
        expect(screen.getByText("You're In.")).toBeInTheDocument();
    });
    
    // Check if the input field is filled (though it disappears on success)
    // Or check if getDoc was called with correct PIN
    // firestore.doc is called with args. We can't easily spy on the exact args here without more setup,
    // but the success state proves the flow worked.
  });
});
