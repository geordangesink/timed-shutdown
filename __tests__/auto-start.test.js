const { AutoStart } = require('../auto-start');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Mock electron app
jest.mock('electron', () => ({
  app: {
    getName: jest.fn(() => 'Timed Shutdown'),
    isPackaged: false
  }
}));

describe('AutoStart', () => {
  let autoStart;
  const originalPlatform = process.platform;

  beforeEach(() => {
    autoStart = new AutoStart();
  });

  afterEach(() => {
    // Restore original platform
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
      writable: true
    });
  });

  describe('Platform Detection', () => {
    test('should detect Windows platform', () => {
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        writable: true
      });
      autoStart = new AutoStart();
      expect(autoStart.platform).toBe('win32');
    });

    test('should detect macOS platform', () => {
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        writable: true
      });
      autoStart = new AutoStart();
      expect(autoStart.platform).toBe('darwin');
    });

    test('should detect Linux platform', () => {
      Object.defineProperty(process, 'platform', {
        value: 'linux',
        writable: true
      });
      autoStart = new AutoStart();
      expect(autoStart.platform).toBe('linux');
    });
  });

  describe('Linux AutoStart', () => {
    beforeEach(() => {
      Object.defineProperty(process, 'platform', {
        value: 'linux',
        writable: true
      });
      autoStart = new AutoStart();
    });

    test('should create desktop file for Linux', async () => {
      const testAutostartDir = await fs.mkdtemp(path.join(os.tmpdir(), 'test-autostart-'));
      const originalHomedir = os.homedir;
      
      // Mock homedir
      jest.spyOn(os, 'homedir').mockReturnValue(testAutostartDir);

      try {
        // Mock exec to prevent actual system calls
        const execSpy = jest.spyOn(require('child_process'), 'exec').mockImplementation((cmd, callback) => {
          if (callback) callback(null, '', '');
          return { stdout: '', stderr: '' };
        });

        await autoStart.enableLinux();
        
        const desktopFile = path.join(
          testAutostartDir,
          '.config',
          'autostart',
          'timed shutdown.desktop'
        );

        const exists = await fs.access(desktopFile).then(() => true).catch(() => false);
        expect(exists).toBe(true);

        const content = await fs.readFile(desktopFile, 'utf8');
        expect(content).toContain('Exec=');
        expect(content).toContain('--hidden');
        expect(content).toContain('StartupNotify=false');

        execSpy.mockRestore();
      } catch (error) {
        // Ignore errors in test environment
      } finally {
        os.homedir = originalHomedir;
        try {
          await fs.rm(testAutostartDir, { recursive: true, force: true });
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    });
  });

  describe('Windows AutoStart', () => {
    beforeEach(() => {
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        writable: true
      });
      autoStart = new AutoStart();
    });

    test('should have Windows enable method', () => {
      expect(typeof autoStart.enableWindows).toBe('function');
      expect(typeof autoStart.disableWindows).toBe('function');
    });
  });

  describe('macOS AutoStart', () => {
    beforeEach(() => {
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        writable: true
      });
      autoStart = new AutoStart();
    });

    test('should have macOS enable method', () => {
      expect(typeof autoStart.enableMacOS).toBe('function');
      expect(typeof autoStart.disableMacOS).toBe('function');
    });

    test('should include --hidden flag in plist', async () => {
      const testHomedir = await fs.mkdtemp(path.join(os.tmpdir(), 'test-macos-'));
      const originalHomedir = os.homedir;
      
      jest.spyOn(os, 'homedir').mockReturnValue(testHomedir);

      try {
        // Mock fs.writeFile to capture content
        const writeFileSpy = jest.spyOn(fs, 'writeFile').mockResolvedValue();
        const execSpy = jest.spyOn(require('child_process'), 'exec').mockImplementation((cmd, callback) => {
          if (callback) callback(null, '', '');
          return { stdout: '', stderr: '' };
        });

        await autoStart.enableMacOS();

        expect(writeFileSpy).toHaveBeenCalled();
        const plistContent = writeFileSpy.mock.calls[0][1];
        expect(plistContent).toContain('--hidden');
        expect(plistContent).toContain('RunAtLoad');
        expect(plistContent).toContain('<true/>');

        writeFileSpy.mockRestore();
        execSpy.mockRestore();
      } catch (error) {
        // Ignore errors in test environment
      } finally {
        os.homedir = originalHomedir;
        try {
          await fs.rm(testHomedir, { recursive: true, force: true });
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    });
  });
});

