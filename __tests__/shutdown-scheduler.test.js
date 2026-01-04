const { ShutdownScheduler } = require('../shutdown-scheduler');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

// Mock electron app
jest.mock('electron', () => {
  const os = require('os');
  return {
    app: {
      isPackaged: false,
      getPath: jest.fn(() => os.tmpdir())
    }
  };
});

describe('ShutdownScheduler', () => {
  let scheduler;
  let testStateDir;

  beforeEach(async () => {
    // Create a temporary directory for each test
    testStateDir = await fs.mkdtemp(path.join(os.tmpdir(), 'test-shutdown-'));
    scheduler = new ShutdownScheduler(testStateDir);
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testStateDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
    if (scheduler) {
      await scheduler.deactivate();
    }
  });

  describe('State Management', () => {
    test('should save and load state', async () => {
      const testState = {
        active: true,
        time: '22:00',
        days: ['monday', 'wednesday'],
        reminders: ['21:00']
      };

      await scheduler.saveState(testState);
      const loadedState = await scheduler.loadState();

      expect(loadedState).toEqual(testState);
    });

    test('should return inactive state if file does not exist', async () => {
      const state = await scheduler.loadState();
      expect(state).toEqual({ active: false });
    });

    test('should get current state', async () => {
      const testState = { active: true, time: '23:00', days: ['friday'] };
      await scheduler.saveState(testState);
      
      const state = await scheduler.getState();
      expect(state.active).toBe(true);
      expect(state.time).toBe('23:00');
    });
  });

  describe('Activation', () => {
    test('should activate with valid config', async () => {
      const config = {
        time: '22:00',
        days: ['monday', 'friday'],
        reminders: ['21:00']
      };

      await expect(scheduler.activate(config)).resolves.toBe(true);
      
      const state = await scheduler.getState();
      expect(state.active).toBe(true);
      expect(state.time).toBe('22:00');
      expect(state.days).toEqual(['monday', 'friday']);
    });

    test('should throw error if time is missing', async () => {
      const config = {
        days: ['monday']
      };

      await expect(scheduler.activate(config)).rejects.toThrow('Time and at least one day must be selected');
    });

    test('should throw error if days are missing', async () => {
      const config = {
        time: '22:00',
        days: []
      };

      await expect(scheduler.activate(config)).rejects.toThrow('Time and at least one day must be selected');
    });

    test('should throw error for invalid time format', async () => {
      const config = {
        time: 'invalid',
        days: ['monday']
      };

      await expect(scheduler.activate(config)).rejects.toThrow('Invalid time format');
    });

    test('should deactivate existing schedule before activating new one', async () => {
      const config1 = {
        time: '22:00',
        days: ['monday']
      };

      const config2 = {
        time: '23:00',
        days: ['tuesday']
      };

      await scheduler.activate(config1);
      await scheduler.activate(config2);

      const state = await scheduler.getState();
      expect(state.time).toBe('23:00');
      expect(state.days).toEqual(['tuesday']);
    });
  });

  describe('Update', () => {
    test('should update active schedule', async () => {
      const initialConfig = {
        time: '22:00',
        days: ['monday']
      };

      await scheduler.activate(initialConfig);

      const updateConfig = {
        time: '23:00',
        days: ['tuesday', 'wednesday']
      };

      await expect(scheduler.update(updateConfig)).resolves.not.toThrow();
      
      const state = await scheduler.getState();
      expect(state.time).toBe('23:00');
      expect(state.days).toEqual(['tuesday', 'wednesday']);
    });

    test('should throw error when updating inactive schedule', async () => {
      const config = {
        time: '22:00',
        days: ['monday']
      };

      await expect(scheduler.update(config)).rejects.toThrow('Cannot update: shutdown is not active');
    });
  });

  describe('Deactivation', () => {
    test('should deactivate active schedule', async () => {
      const config = {
        time: '22:00',
        days: ['monday']
      };

      await scheduler.activate(config);
      await scheduler.deactivate();

      const state = await scheduler.getState();
      expect(state.active).toBe(false);
    });

    test('should handle deactivation when no schedule is active', async () => {
      await expect(scheduler.deactivate()).resolves.not.toThrow();
    });
  });

  describe('Platform Detection', () => {
    test('should detect platform correctly', () => {
      expect(['win32', 'darwin', 'linux']).toContain(scheduler.platform);
    });
  });
});

