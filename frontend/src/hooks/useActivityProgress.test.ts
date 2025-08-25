import { renderHook, act, waitFor } from '@testing-library/react';
import { useActivityProgress } from './useActivityProgress';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  value: true,
  writable: true,
});

describe('useActivityProgress', () => {
  const defaultProps = {
    studentId: 'student123',
    planId: 'plan456',
    dayIndex: 1,
    activityType: 'who',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    mockLocalStorage.setItem.mockImplementation(() => {});
    mockLocalStorage.removeItem.mockImplementation(() => {});
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ progress: {} }),
    });
    
    // Mock health check endpoint for connection quality testing
    mockFetch.mockImplementation((url) => {
      if (url === '/api/enhanced-activities/health') {
        return Promise.resolve({
          ok: true,
          status: 200,
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ progress: {} }),
      });
    });
  });

  describe('initialization', () => {
    it('should initialize with loading state', () => {
      const { result } = renderHook(() => useActivityProgress(defaultProps));
      
      expect(result.current.isLoading).toBe(true);
      expect(result.current.progress).toBe(null);
      expect(result.current.error).toBe(null);
    });

    it('should create new progress when no existing progress found', async () => {
      const { result } = renderHook(() => useActivityProgress(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.progress).toEqual({
        id: 'student123_plan456_1_who',
        activityType: 'who',
        status: 'not_started',
        attempts: 0,
        responses: [],
      });
    });

    it('should load progress from server when available', async () => {
      const serverProgress = {
        id: 'student123_plan456_1_who',
        activityType: 'who',
        status: 'in_progress',
        attempts: 2,
        responses: [{ id: 'resp1', question: 'test', answer: 'test', createdAt: new Date() }],
      };

      mockFetch.mockImplementation((url) => {
        if (url === '/api/enhanced-activities/health') {
          return Promise.resolve({
            ok: true,
            status: 200,
          });
        }
        if (url.includes('/api/enhanced-activities/progress/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ progress: { who: serverProgress } }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ progress: {} }),
        });
      });

      const { result } = renderHook(() => useActivityProgress(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.progress).toEqual(serverProgress);
    });

    it('should load progress from localStorage when server is unavailable', async () => {
      const localProgress = {
        id: 'student123_plan456_1_who',
        activityType: 'who',
        status: 'completed',
        attempts: 1,
        responses: [],
      };

      mockFetch.mockImplementation((url) => {
        if (url === '/api/enhanced-activities/health') {
          return Promise.resolve({
            ok: true,
            status: 200,
          });
        }
        if (url.includes('/api/enhanced-activities/progress/')) {
          return Promise.resolve({
            ok: false,
            status: 404,
            statusText: 'Not Found',
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ progress: {} }),
        });
      });

      mockLocalStorage.getItem
        .mockReturnValueOnce(null) // First call for sync queue
        .mockReturnValueOnce(JSON.stringify(localProgress)); // Second call for progress

      const { result } = renderHook(() => useActivityProgress(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.progress).toEqual(localProgress);
    });

    it('should handle initialization errors gracefully', async () => {
      mockFetch.mockImplementation((url) => {
        if (url === '/api/enhanced-activities/health') {
          return Promise.resolve({
            ok: true,
            status: 200,
          });
        }
        if (url.includes('/api/enhanced-activities/progress/')) {
          return Promise.reject(new Error('Server error'));
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ progress: {} }),
        });
      });
      
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const { result } = renderHook(() => useActivityProgress(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Server error');
    });
  });

  describe('progress updates', () => {
    it('should update progress status', async () => {
      const { result } = renderHook(() => useActivityProgress(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.updateProgress('in_progress', 30);
      });

      expect(result.current.progress?.status).toBe('in_progress');
      expect(result.current.progress?.timeSpent).toBe(30);
      expect(result.current.progress?.startedAt).toBeInstanceOf(Date);
    });

    it('should save response to progress', async () => {
      const { result } = renderHook(() => useActivityProgress(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const response = {
        id: 'resp1',
        question: 'Who is the main character?',
        answer: 'Alice',
        isCorrect: true,
        score: 100,
        createdAt: new Date(),
      };

      await act(async () => {
        await result.current.saveResponse(response);
      });

      expect(result.current.progress?.responses).toHaveLength(1);
      expect(result.current.progress?.responses[0]).toEqual(response);
      expect(result.current.progress?.attempts).toBe(1);
    });

    it('should complete activity with multiple responses', async () => {
      const { result } = renderHook(() => useActivityProgress(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const responses = [
        {
          id: 'resp1',
          question: 'Who is the main character?',
          answer: 'Alice',
          isCorrect: true,
          score: 100,
          createdAt: new Date(),
        },
        {
          id: 'resp2',
          question: 'Who is the helper?',
          answer: 'Bob',
          isCorrect: true,
          score: 100,
          createdAt: new Date(),
        },
      ];

      await act(async () => {
        await result.current.completeActivity(responses, 120);
      });

      expect(result.current.progress?.status).toBe('completed');
      expect(result.current.progress?.responses).toHaveLength(2);
      expect(result.current.progress?.timeSpent).toBe(120);
      expect(result.current.progress?.completedAt).toBeInstanceOf(Date);
    });
  });

  describe('localStorage persistence', () => {
    it('should save progress to localStorage', async () => {
      const { result } = renderHook(() => useActivityProgress(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.updateProgress('in_progress');
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'activity_progress_student123_plan456_1_who',
        expect.stringContaining('"status":"in_progress"')
      );
    });

    it('should load progress from localStorage with proper date conversion', async () => {
      const storedProgress = {
        id: 'student123_plan456_1_who',
        activityType: 'who',
        status: 'completed',
        attempts: 1,
        startedAt: '2023-01-01T10:00:00Z',
        completedAt: '2023-01-01T10:30:00Z',
        timeSpent: 1800,
        responses: [
          {
            id: 'resp1',
            question: 'test',
            answer: 'test',
            createdAt: '2023-01-01T10:15:00Z',
          },
        ],
      };

      mockFetch.mockImplementation((url) => {
        if (url === '/api/enhanced-activities/health') {
          return Promise.resolve({
            ok: true,
            status: 200,
          });
        }
        if (url.includes('/api/enhanced-activities/progress/')) {
          return Promise.resolve({
            ok: false,
            status: 404,
            statusText: 'Not Found',
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ progress: {} }),
        });
      });

      mockLocalStorage.getItem
        .mockReturnValueOnce(null) // First call for sync queue
        .mockReturnValueOnce(JSON.stringify(storedProgress)); // Second call for progress

      const { result } = renderHook(() => useActivityProgress(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.progress?.startedAt).toBeInstanceOf(Date);
      expect(result.current.progress?.completedAt).toBeInstanceOf(Date);
      expect(result.current.progress?.responses[0].createdAt).toBeInstanceOf(Date);
    });
  });

  describe('server synchronization', () => {
    it('should save progress to server when online', async () => {
      const { result } = renderHook(() => useActivityProgress(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.updateProgress('in_progress');
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/enhanced-activities/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"status":"in_progress"'),
      });
    });

    it('should queue updates when offline', async () => {
      // Mock offline state
      Object.defineProperty(navigator, 'onLine', { value: false });

      const { result } = renderHook(() => useActivityProgress(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.updateProgress('in_progress');
      });

      // Should save to localStorage but queue for server
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
      
      // Check that sync queue was saved
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'activity_sync_queue',
        expect.stringContaining('"action":"update"')
      );
    });

    it('should process sync queue when coming back online', async () => {
      const localProgress = {
        id: 'student123_plan456_1_who',
        activityType: 'who',
        status: 'completed',
        attempts: 1,
        responses: [],
      };

      mockFetch.mockImplementation((url) => {
        if (url === '/api/enhanced-activities/health') {
          return Promise.resolve({
            ok: true,
            status: 200,
          });
        }
        if (url.includes('/api/enhanced-activities/progress/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ progress: { who: localProgress } }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ progress: {} }),
        });
      });

      // Mock localStorage to return local progress
      mockLocalStorage.getItem
        .mockReturnValueOnce(null) // First call for sync queue
        .mockReturnValueOnce(JSON.stringify(localProgress)); // Second call for progress

      const { result } = renderHook(() => useActivityProgress(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Simulate coming back online
      await act(async () => {
        await result.current.updateProgress('in_progress');
      });

      // Should process sync queue when connection is good
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/enhanced-activities\/progress/),
        expect.any(Object)
      );
    });
  });

  describe('cross-device synchronization', () => {
    it('should sync with server when server has more recent data', async () => {
      const serverProgress = {
        id: 'student123_plan456_1_who',
        activityType: 'who',
        status: 'completed',
        attempts: 2,
        responses: [],
        completedAt: new Date('2023-01-01T11:00:00Z'),
      };

      const localProgress = {
        id: 'student123_plan456_1_who',
        activityType: 'who',
        status: 'in_progress',
        attempts: 1,
        responses: [],
        startedAt: new Date('2023-01-01T10:00:00Z'),
      };

      mockFetch.mockImplementation((url) => {
        if (url === '/api/enhanced-activities/health') {
          return Promise.resolve({
            ok: true,
            status: 200,
          });
        }
        if (url.includes('/api/enhanced-activities/progress/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ progress: { who: serverProgress } }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ progress: {} }),
        });
      });

      // Mock localStorage to return local progress
      mockLocalStorage.getItem
        .mockReturnValueOnce(null) // First call for sync queue
        .mockReturnValueOnce(JSON.stringify(localProgress)); // Second call for progress

      const { result } = renderHook(() => useActivityProgress(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should use server progress since it's more recent
      expect(result.current.progress?.status).toBe('completed');
      expect(result.current.progress?.attempts).toBe(2);
    });

    it('should push local progress when local has more recent data', async () => {
      const serverProgress = {
        id: 'student123_plan456_1_who',
        activityType: 'who',
        status: 'in_progress',
        attempts: 1,
        responses: [],
        startedAt: new Date('2023-01-01T10:00:00Z'),
      };

      const localProgress = {
        id: 'student123_plan456_1_who',
        activityType: 'who',
        status: 'completed',
        attempts: 2,
        responses: [],
        completedAt: new Date('2023-01-01T11:00:00Z'),
      };

      mockFetch.mockImplementation((url) => {
        if (url === '/api/enhanced-activities/health') {
          return Promise.resolve({
            ok: true,
            status: 200,
          });
        }
        if (url.includes('/api/enhanced-activities/progress/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ progress: { who: serverProgress } }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ progress: {} }),
        });
      });

      // Mock localStorage to return local progress
      mockLocalStorage.getItem
        .mockReturnValueOnce(null) // First call for sync queue
        .mockReturnValueOnce(JSON.stringify(localProgress)); // Second call for progress

      const { result } = renderHook(() => useActivityProgress(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Ensure local progress is loaded
      expect(result.current.progress?.status).toBe('completed');

      // Trigger cross-device sync
      await act(async () => {
        await result.current.syncCrossDevice();
      });

      // Should push local progress to server since it's more recent
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/enhanced-activities\/progress/),
        expect.any(Object)
      );
    });

    it('should handle sync when no local progress exists', async () => {
      const serverProgress = {
        id: 'student123_plan456_1_who',
        activityType: 'who',
        status: 'completed',
        attempts: 1,
        responses: [],
        startedAt: new Date('2023-01-01T10:00:00Z'),
        completedAt: new Date('2023-01-01T11:00:00Z'),
      };

      // Mock server response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ progress: { who: serverProgress } }),
      });

      const { result } = renderHook(() => useActivityProgress(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Trigger cross-device sync
      await act(async () => {
        await result.current.syncCrossDevice();
      });

      // Should use server progress since no local progress exists
      expect(result.current.progress?.status).toBe('completed');
    });
  });

  describe('reset functionality', () => {
    it('should reset progress to initial state', async () => {
      const { result } = renderHook(() => useActivityProgress(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // First update progress
      await act(async () => {
        await result.current.updateProgress('in_progress');
      });

      expect(result.current.progress?.status).toBe('in_progress');

      // Then reset
      await act(async () => {
        await result.current.resetProgress();
      });

      expect(result.current.progress?.status).toBe('not_started');
      expect(result.current.progress?.attempts).toBe(0);
      expect(result.current.progress?.responses).toHaveLength(0);
      expect(mockLocalStorage.removeItem).toHaveBeenCalled();
    });
  });

  describe('activity state', () => {
    it('should return correct activity state', async () => {
      const { result } = renderHook(() => useActivityProgress(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const state = result.current.getActivityState();
      expect(state).toEqual({
        isLoading: false,
        error: undefined,
        isCompleted: false,
        currentAttempt: 0,
        timeSpent: 0,
        answers: [],
        feedback: undefined,
        status: 'not_started',
        canProceed: false,
        isLocked: false
      });
    });

    it('should return activity state with responses', async () => {
      const { result } = renderHook(() => useActivityProgress(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const response = {
        id: 'resp1',
        question: 'Who is the main character?',
        answer: 'Alice',
        isCorrect: true,
        score: 100,
        feedback: 'Great job!',
        createdAt: new Date(),
      };

      await act(async () => {
        await result.current.saveResponse(response);
      });

      const state = result.current.getActivityState();

      expect(state.answers).toEqual(['Alice']);
      expect(state.currentAttempt).toBe(1);
      expect(state.feedback).toEqual({
        isCorrect: true,
        score: 100,
        feedback: 'Great job!',
      });
    });
  });

  describe('auto-save functionality', () => {
    it('should auto-save after changes when enabled', async () => {
      jest.useFakeTimers();

      const { result } = renderHook(() => useActivityProgress({ ...defaultProps, autoSave: true }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.updateProgress('in_progress');
      });

      // Should not have saved yet (within 2 second window)
      expect(result.current.hasUnsavedChanges).toBe(true);

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(result.current.hasUnsavedChanges).toBe(false);
      });

      jest.useRealTimers();
    });

    it('should not auto-save when disabled', async () => {
      const { result } = renderHook(() => useActivityProgress({ ...defaultProps, autoSave: false }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.updateProgress('in_progress');
      });

      expect(result.current.hasUnsavedChanges).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle server save failures gracefully', async () => {
      mockFetch.mockImplementation((url) => {
        if (url === '/api/enhanced-activities/health') {
          return Promise.resolve({
            ok: true,
            status: 200,
          });
        }
        if (url.includes('/api/enhanced-activities/progress/')) {
          return Promise.resolve({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ progress: {} }),
        });
      });

      const { result } = renderHook(() => useActivityProgress(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.updateProgress('in_progress');
      });

      // Should queue for retry when server save fails
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'activity_sync_queue',
        expect.stringContaining('"action":"update"')
      );
    });

    it('should handle localStorage failures gracefully', async () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage full');
      });

      const { result } = renderHook(() => useActivityProgress(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should still work even with localStorage failures
      expect(result.current.progress).toBeDefined();
      expect(result.current.error).toBe(null);
    });
  });

  describe('progress restoration', () => {
    it('should restore progress from server when available', async () => {
      const serverProgress = {
        id: 'student123_plan456_1_who',
        activityType: 'who',
        status: 'in_progress',
        attempts: 1,
        responses: [],
        startedAt: new Date('2023-01-01T10:00:00Z'),
      };

      mockFetch.mockImplementation((url) => {
        if (url === '/api/enhanced-activities/health') {
          return Promise.resolve({
            ok: true,
            status: 200,
          });
        }
        if (url.includes('/api/enhanced-activities/progress/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ progress: { who: serverProgress } }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ progress: {} }),
        });
      });

      const { result } = renderHook(() => useActivityProgress(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.progress?.status).toBe('in_progress');
      expect(result.current.restoredFrom).toBe('server');
      expect(result.current.canRestore).toBe(true);
    });

    it('should restore progress from localStorage when server is unavailable', async () => {
      const localProgress = {
        id: 'student123_plan456_1_who',
        activityType: 'who',
        status: 'completed',
        attempts: 1,
        responses: [],
      };

      mockFetch.mockImplementation((url) => {
        if (url === '/api/enhanced-activities/health') {
          return Promise.resolve({
            ok: true,
            status: 200,
          });
        }
        if (url.includes('/api/enhanced-activities/progress/')) {
          return Promise.resolve({
            ok: false,
            status: 404,
            statusText: 'Not Found',
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ progress: {} }),
        });
      });

      // Mock localStorage to return local progress
      mockLocalStorage.getItem
        .mockReturnValueOnce(null) // First call for sync queue
        .mockReturnValueOnce(JSON.stringify(localProgress)); // Second call for progress

      const { result } = renderHook(() => useActivityProgress(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.progress?.status).toBe('completed');
      expect(result.current.restoredFrom).toBe('local');
      expect(result.current.canRestore).toBe(true);
    });

    it('should handle explicit progress restoration', async () => {
      const serverProgress = {
        id: 'student123_plan456_1_who',
        activityType: 'who',
        status: 'in_progress',
        attempts: 1,
        responses: [],
        startedAt: new Date('2023-01-01T10:00:00Z'),
      };

      // Mock server response for initial load (no progress)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const { result } = renderHook(() => useActivityProgress(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Mock server response for restoration call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ progress: { who: serverProgress } }),
      });

      // Trigger explicit restoration
      await act(async () => {
        await result.current.restoreProgress();
      });

      expect(result.current.isRestoring).toBe(false);
      expect(result.current.restoredFrom).toBe('server');
      expect(result.current.progress?.status).toBe('in_progress');
    });

    it('should show restoration status during loading', async () => {
      const { result } = renderHook(() => useActivityProgress(defaultProps));

      // During initial loading, should show restoring state
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isRestoring).toBe(true);
      expect(result.current.restoredFrom).toBe('none');

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isRestoring).toBe(false);
    });

    it('should handle restoration errors gracefully', async () => {
      mockFetch.mockImplementation((url) => {
        if (url === '/api/enhanced-activities/health') {
          return Promise.resolve({
            ok: true,
            status: 200,
          });
        }
        if (url.includes('/api/enhanced-activities/progress/')) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ progress: {} }),
        });
      });
      
      // Mock localStorage to return null (no local progress)
      mockLocalStorage.getItem
        .mockReturnValueOnce(null) // First call for sync queue
        .mockReturnValueOnce(null); // Second call for progress

      const { result } = renderHook(() => useActivityProgress(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.restoredFrom).toBe('none');
      expect(result.current.canRestore).toBe(false);
    });
  });

  describe('session management', () => {
    beforeEach(() => {
      // Mock document.visibilityState
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true,
      });
      
      // Mock window event listeners
      window.addEventListener = jest.fn();
      window.removeEventListener = jest.fn();
      document.addEventListener = jest.fn();
      document.removeEventListener = jest.fn();
    });

    it('should create session ID on initialization', async () => {
      const { result } = renderHook(() => useActivityProgress(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'currentSessionId',
        expect.stringMatching(/activity_session_\d+_[a-z0-9]+/)
      );
    });

    it('should save session data when progress changes', async () => {
      const { result } = renderHook(() => useActivityProgress(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.updateProgress('in_progress');
      });

      // Should save session data (check for session ID pattern)
      const setItemCalls = mockLocalStorage.setItem.mock.calls;
      const sessionCall = setItemCalls.find(call => 
        call[0] && typeof call[0] === 'string' && call[0].startsWith('activity_session_')
      );
      expect(sessionCall).toBeDefined();
    });

    it('should detect interrupted session on mount', async () => {
      const interruptedSessionData = {
        sessionId: 'activity_session_1234567890_abc123',
        studentId: 'student123',
        planId: 'plan456',
        dayIndex: 1,
        activityType: 'who',
        progress: {
          id: 'student123_plan456_1_who',
          activityType: 'who',
          status: 'in_progress',
          attempts: 1,
          responses: []
        },
        startedAt: '2023-01-01T10:00:00Z',
        lastActivity: '2023-01-01T10:30:00Z',
        interruptedAt: '2023-01-01T10:30:00Z',
        totalTimeSpent: 1800,
        activityCount: 1
      };

      mockLocalStorage.getItem
        .mockReturnValueOnce('activity_session_1234567890_abc123') // currentSessionId
        .mockReturnValueOnce(JSON.stringify(interruptedSessionData)) // session data
        .mockReturnValueOnce(null) // sync queue
        .mockReturnValueOnce(null); // progress

      const { result } = renderHook(() => useActivityProgress(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.sessionInterrupted).toBe(true);
    });

    it('should recover session when requested', async () => {
      const sessionData = {
        sessionId: 'activity_session_1234567890_abc123',
        studentId: 'student123',
        planId: 'plan456',
        dayIndex: 1,
        activityType: 'who',
        progress: {
          id: 'student123_plan456_1_who',
          activityType: 'who',
          status: 'in_progress',
          attempts: 2,
          responses: [
            { id: 'resp1', question: 'test', answer: 'test', createdAt: '2023-01-01T10:00:00Z' }
          ]
        },
        startedAt: '2023-01-01T10:00:00Z',
        lastActivity: '2023-01-01T10:30:00Z',
        totalTimeSpent: 1800,
        activityCount: 2
      };

      mockLocalStorage.getItem
        .mockReturnValueOnce('activity_session_1234567890_abc123') // currentSessionId
        .mockReturnValueOnce(JSON.stringify(sessionData)) // session data
        .mockReturnValueOnce(null) // sync queue
        .mockReturnValueOnce(null); // progress

      const { result } = renderHook(() => useActivityProgress(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.recoverSession();
      });

      expect(result.current.sessionRecovered).toBe(true);
      expect(result.current.restoredFrom).toBe('session');
      expect(result.current.progress?.attempts).toBe(2);
      expect(result.current.progress?.responses).toHaveLength(1);
    });

    it('should clear session data when requested', async () => {
      const { result } = renderHook(() => useActivityProgress(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.updateProgress('in_progress');
      });

      await act(() => {
        result.current.clearSession();
      });

      // Should clear session data
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('currentSessionId');
      expect(result.current.progress).toBe(null);
      expect(result.current.hasUnsavedChanges).toBe(false);
    });

    it('should provide session information', async () => {
      const { result } = renderHook(() => useActivityProgress(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const sessionInfo = result.current.getSessionInfo();
      expect(sessionInfo.sessionId).toBe('N/A');
      expect(sessionInfo.totalTimeSpent).toBe(0);
      expect(sessionInfo.activityCount).toBe(0);
      expect(sessionInfo.unsavedChanges).toBe(false);
    });

    it('should handle beforeunload event with unsaved changes', async () => {
      const { result } = renderHook(() => useActivityProgress(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.updateProgress('in_progress');
      });

      // Simulate beforeunload event
      const beforeUnloadEvent = new Event('beforeunload') as any;
      beforeUnloadEvent.preventDefault = jest.fn();
      beforeUnloadEvent.returnValue = '';

      // Trigger the event handler by finding the beforeunload listener
      const eventListeners = (window.addEventListener as jest.Mock).mock.calls;
      const beforeUnloadHandler = eventListeners.find(call => call[0] === 'beforeunload')?.[1];
      
      if (beforeUnloadHandler) {
        beforeUnloadHandler(beforeUnloadEvent);
        expect(beforeUnloadEvent.preventDefault).toHaveBeenCalled();
        expect(beforeUnloadEvent.returnValue).toBe('You have unsaved changes. Are you sure you want to leave?');
      }
    });
  });

  describe('connection quality monitoring', () => {
    beforeEach(() => {
      // Mock setInterval and clearInterval
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should test connection quality on initialization', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
      });

      const { result } = renderHook(() => useActivityProgress(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should test connection quality immediately
      expect(mockFetch).toHaveBeenCalledWith('/api/enhanced-activities/health', {
        method: 'HEAD',
        cache: 'no-cache'
      });
    });

    it('should update connection quality based on response time', async () => {
      const startTime = Date.now();
      mockFetch.mockImplementation(() => {
        const endTime = Date.now();
        const latency = endTime - startTime;
        return Promise.resolve({
          ok: true,
          status: 200,
        });
      });

      const { result } = renderHook(() => useActivityProgress(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Fast response should be excellent
      expect(result.current.connectionQuality).toBe('excellent');
    });

    it('should handle connection quality test failures', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useActivityProgress(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.connectionQuality).toBe('offline');
    });

    it('should process sync queue when connection quality is good', async () => {
      // Mock good connection quality
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
      });

      const { result } = renderHook(() => useActivityProgress(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Simulate coming back online with good connection
      await act(async () => {
        await result.current.updateProgress('in_progress');
      });

      // Should process sync queue when connection is good
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/enhanced-activities\/progress/),
        expect.any(Object)
      );
    });
  });

  describe('enhanced state tracking', () => {
    it('should validate state transitions correctly', async () => {
      const { result } = renderHook(() => useActivityProgress(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Valid transition: not_started -> in_progress
      await act(async () => {
        await result.current.updateProgress('in_progress');
      });

      expect(result.current.progress?.status).toBe('in_progress');

      // Valid transition: in_progress -> completed
      await act(async () => {
        await result.current.updateProgress('completed');
      });

      expect(result.current.progress?.status).toBe('completed');

      // Valid transition: completed -> not_started (reset)
      await act(async () => {
        await result.current.updateProgress('not_started');
      });

      expect(result.current.progress?.status).toBe('not_started');
    });

    it('should return enhanced activity state', async () => {
      const { result } = renderHook(() => useActivityProgress(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.updateProgress('in_progress');
      });

      const activityState = result.current.getActivityState();
      expect(activityState.status).toBe('in_progress');
      expect(activityState.canProceed).toBe(false); // No responses yet
      expect(activityState.isLocked).toBe(false);
      expect(activityState.isCompleted).toBe(false);
    });

    it('should lock activity after too many attempts', async () => {
      const { result } = renderHook(() => useActivityProgress(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Add 5 attempts
      for (let i = 0; i < 5; i++) {
        await act(async () => {
          await result.current.saveResponse({
            id: `resp${i}`,
            question: 'test',
            answer: 'test',
            createdAt: new Date()
          });
        });
      }

      const activityState = result.current.getActivityState();
      expect(activityState.isLocked).toBe(true);
      expect(activityState.currentAttempt).toBe(5);
    });

    it('should allow proceeding when activity has responses', async () => {
      const { result } = renderHook(() => useActivityProgress(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.updateProgress('in_progress');
        await result.current.saveResponse({
          id: 'resp1',
          question: 'test',
          answer: 'test',
          createdAt: new Date()
        });
      });

      const activityState = result.current.getActivityState();
      expect(activityState.canProceed).toBe(true);
      expect(activityState.status).toBe('in_progress');
      expect(activityState.currentAttempt).toBe(1);
    });
  });

  describe('answer persistence and review', () => {
    it('should get answer history', async () => {
      const { result } = renderHook(() => useActivityProgress(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const responses = [
        { id: 'resp1', question: 'Who is the main character?', answer: 'Alice', createdAt: new Date() },
        { id: 'resp2', question: 'Where does the story take place?', answer: 'Wonderland', createdAt: new Date() }
      ];

      for (const response of responses) {
        await act(async () => {
          await result.current.saveResponse(response);
        });
      }

      const answerHistory = result.current.getAnswerHistory();
      expect(answerHistory).toHaveLength(2);
      expect(answerHistory[0].answer).toBe('Alice');
      expect(answerHistory[1].answer).toBe('Wonderland');
    });

    it('should get last answer', async () => {
      const { result } = renderHook(() => useActivityProgress(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const responses = [
        { id: 'resp1', question: 'First question', answer: 'First answer', createdAt: new Date() },
        { id: 'resp2', question: 'Second question', answer: 'Second answer', createdAt: new Date() }
      ];

      for (const response of responses) {
        await act(async () => {
          await result.current.saveResponse(response);
        });
      }

      const lastAnswer = result.current.getLastAnswer();
      expect(lastAnswer?.answer).toBe('Second answer');
    });

    it('should get answers by type', async () => {
      const { result } = renderHook(() => useActivityProgress(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const responses = [
        { id: 'resp1', question: 'Who is the main character?', answer: 'Alice', createdAt: new Date() },
        { id: 'resp2', question: 'Where does the story take place?', answer: 'Wonderland', createdAt: new Date() },
        { id: 'resp3', question: 'Who is the villain?', answer: 'Queen', createdAt: new Date() }
      ];

      for (const response of responses) {
        await act(async () => {
          await result.current.saveResponse(response);
        });
      }

      const whoAnswers = result.current.getAnswersByType('Who');
      expect(whoAnswers).toHaveLength(2); // "Who is the main character?" and "Who is the villain?"
    });

    it('should export answers as JSON', async () => {
      const { result } = renderHook(() => useActivityProgress(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const responses = [
        { id: 'resp1', question: 'Test question', answer: 'Test answer', createdAt: new Date() }
      ];

      for (const response of responses) {
        await act(async () => {
          await result.current.saveResponse(response);
        });
      }

      const exportedAnswers = result.current.exportAnswers();
      const parsedAnswers = JSON.parse(exportedAnswers);
      expect(parsedAnswers).toHaveLength(1);
      expect(parsedAnswers[0].answer).toBe('Test answer');
    });
  });

  describe('force sync functionality', () => {
    it('should force immediate sync', async () => {
      const { result } = renderHook(() => useActivityProgress(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.updateProgress('in_progress');
      });

      await act(async () => {
        await result.current.forceSync();
      });

      expect(result.current.isSaving).toBe(false);
      // Force sync should set lastSyncAttempt
      expect(result.current.lastSyncAttempt).toBeInstanceOf(Date);
    });

    it('should handle force sync errors', async () => {
      mockFetch.mockRejectedValue(new Error('Sync failed'));

      const { result } = renderHook(() => useActivityProgress(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.forceSync();
      });

      expect(result.current.error).toBe('Sync failed');
    });
  });
});
