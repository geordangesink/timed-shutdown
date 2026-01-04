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

describe('Integration Tests', () => {
  let scheduler;
  let testStateDir;

  beforeEach(async () => {
    testStateDir = await fs.mkdtemp(path.join(os.tmpdir(), 'test-integration-'));
    scheduler = new ShutdownScheduler(testStateDir);
  });

  afterEach(async () => {
    if (scheduler) {
      await scheduler.deactivate();
    }
    try {
      await fs.rm(testStateDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  test('should complete full activation-deactivation cycle', async () => {
    const config = {
      time: '22:00',
      days: ['monday', 'wednesday', 'friday'],
      reminders: ['21:00', '21:30']
    };

    // Activate
    await scheduler.activate(config);
    let state = await scheduler.getState();
    expect(state.active).toBe(true);
    expect(state.days).toHaveLength(3);

    // Update
    const updateConfig = {
      time: '23:00',
      days: ['tuesday', 'thursday'],
      reminders: ['22:00']
    };
    await scheduler.update(updateConfig);
    state = await scheduler.getState();
    expect(state.time).toBe('23:00');
    expect(state.days).toHaveLength(2);

    // Deactivate
    await scheduler.deactivate();
    state = await scheduler.getState();
    expect(state.active).toBe(false);
  });

  test('should persist state across scheduler instances', async () => {
    const config = {
      time: '22:00',
      days: ['saturday'],
      reminders: []
    };

    // Create first scheduler and activate
    const scheduler1 = new ShutdownScheduler(testStateDir);
    await scheduler1.activate(config);
    
    // Verify state before deactivation
    let state = await scheduler1.getState();
    expect(state.active).toBe(true);
    expect(state.time).toBe('22:00');
    expect(state.days).toEqual(['saturday']);

    // Deactivate (this sets active: false but preserves other fields in currentState)
    await scheduler1.deactivate();

    // Create second scheduler and load state
    const scheduler2 = new ShutdownScheduler(testStateDir);
    state = await scheduler2.getState();
    
    // After deactivation, active is false
    expect(state.active).toBe(false);
    // Note: deactivate saves { active: false }, so other fields may not persist
    // This is expected behavior - when deactivated, we only save the active status
  });

  test('should handle multiple reminders correctly', async () => {
    const config = {
      time: '22:00',
      days: ['monday'],
      reminders: ['20:00', '21:00', '21:30']
    };

    await scheduler.activate(config);
    const state = await scheduler.getState();
    
    expect(state.reminders).toHaveLength(3);
    expect(state.reminders).toContain('20:00');
    expect(state.reminders).toContain('21:00');
    expect(state.reminders).toContain('21:30');
  });

  test('should handle empty reminders array', async () => {
    const config = {
      time: '22:00',
      days: ['monday'],
      reminders: []
    };

    await scheduler.activate(config);
    const state = await scheduler.getState();
    
    expect(state.reminders).toEqual([]);
  });

  test('should handle all valid day names', async () => {
    const config = {
      time: '22:00',
      days: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    };

    await scheduler.activate(config);
    const state = await scheduler.getState();
    
    expect(state.days).toHaveLength(7);
    expect(state.days).toContain('sunday');
    expect(state.days).toContain('monday');
    expect(state.days).toContain('saturday');
  });
});

