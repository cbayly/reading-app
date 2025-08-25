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

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ progress: { who: serverProgress } }),
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

      // Mock localStorage to return the progress data
      mockLocalStorage.getItem
        .mockReturnValueOnce(null) // First call for sync queue
        .mockReturnValueOnce(JSON.stringify(localProgress)); // Second call for progress
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useActivityProgress(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.progress).toEqual(localProgress);
    });

    it('should handle initialization errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Server error'));
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const { result } = renderHook(() => useActivityProgress(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should still create new progress even with errors
      expect(result.current.progress).toEqual({
        id: 'student123_plan456_1_who',
        activityType: 'who',
        status: 'not_started',
        attempts: 0,
        responses: [],
      });
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
        responses: [
          {
            id: 'resp1',
            question: 'test',
            answer: 'test',
            createdAt: '2023-01-01T00:00:00.000Z',
          },
        ],
        startedAt: '2023-01-01T00:00:00.000Z',
        completedAt: '2023-01-01T01:00:00.000Z',
      };

      mockLocalStorage.getItem
        .mockReturnValueOnce(null) // First call for sync queue
        .mockReturnValueOnce(JSON.stringify(storedProgress)); // Second call for progress
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

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
      // Start offline
      Object.defineProperty(navigator, 'onLine', { value: false });

      const { result } = renderHook(() => useActivityProgress(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Queue an update while offline
      await act(async () => {
        await result.current.updateProgress('in_progress');
      });

      // Come back online
      Object.defineProperty(navigator, 'onLine', { value: true });
      
      // Simulate online event
      act(() => {
        window.dispatchEvent(new Event('online'));
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/enhanced-activities/progress', expect.any(Object));
      });
    });
  });

  describe('cross-device synchronization', () => {
    it('should sync with server when server has more recent data', async () => {
      const serverProgress = {
        id: 'student123_plan456_1_who',
        activityType: 'who',
        status: 'completed',
        attempts: 2,
        responses: [{ id: 'resp1', question: 'test', answer: 'test', createdAt: new Date() }],
        startedAt: new Date('2023-01-01T10:00:00Z'),
        completedAt: new Date('2023-01-01T11:00:00Z'),
      };

      const localProgress = {
        id: 'student123_plan456_1_who',
        activityType: 'who',
        status: 'in_progress',
        attempts: 1,
        responses: [],
        startedAt: new Date('2023-01-01T09:00:00Z'),
      };

      // Mock server response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ progress: { who: serverProgress } }),
      });

      // Mock localStorage to return local progress
      mockLocalStorage.getItem
        .mockReturnValueOnce(null) // First call for sync queue
        .mockReturnValueOnce(JSON.stringify(localProgress)); // Second call for progress

      const { result } = renderHook(() => useActivityProgress(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Trigger cross-device sync
      await act(async () => {
        await result.current.syncCrossDevice();
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
        startedAt: new Date('2023-01-01T09:00:00Z'),
      };

      const localProgress = {
        id: 'student123_plan456_1_who',
        activityType: 'who',
        status: 'completed',
        attempts: 2,
        responses: [{ id: 'resp1', question: 'test', answer: 'test', createdAt: new Date() }],
        startedAt: new Date('2023-01-01T10:00:00Z'),
        completedAt: new Date('2023-01-01T11:00:00Z'),
      };

      // Mock server response for GET call (fetch progress) - return 404 so local progress is used
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      // Mock server response for POST call (save progress)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      // Mock server response for third call (likely from processSyncQueue)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
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

      // Should make GET call to fetch progress first
      expect(mockFetch).toHaveBeenCalledWith('/api/enhanced-activities/progress/student123/plan456/1');
      
      // Should push local progress to server since it's more recent
      expect(mockFetch).toHaveBeenCalledWith('/api/enhanced-activities/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"status":"completed"'),
      });

      // Verify that exactly 3 fetch calls were made (GET + POST + sync queue)
      expect(mockFetch).toHaveBeenCalledTimes(3);
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
        isCompleted: false,
        currentAttempt: 0,
        timeSpent: 0,
        answers: [],
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
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ progress: {} }),
      }).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const { result } = renderHook(() => useActivityProgress(defaultProps));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.updateProgress('in_progress');
      });

      // Should still save to localStorage
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
      
      // Should queue for retry
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

      await act(async () => {
        await result.current.updateProgress('in_progress');
      });

      // Should not crash, just log warning
      expect(result.current.progress?.status).toBe('in_progress');
    });
  });

  describe('progress restoration', () => {
    it('should restore progress from server when available', async () => {
      const serverProgress = {
        id: 'student123_plan456_1_who',
        activityType: 'who',
        status: 'in_progress',
        attempts: 2,
        responses: [{ id: 'resp1', question: 'test', answer: ['character1'], createdAt: new Date() }],
        startedAt: new Date('2023-01-01T10:00:00Z'),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ progress: { who: serverProgress } }),
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
        responses: [{ id: 'resp1', question: 'test', answer: ['character1'], createdAt: new Date() }],
        startedAt: new Date('2023-01-01T10:00:00Z'),
        completedAt: new Date('2023-01-01T11:00:00Z'),
      };

      // Mock server to return 404
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
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
      // Mock server to throw error during initialization
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      
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
});
