const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const { ShutdownScheduler } = require('./shutdown-scheduler');
const { AutoStart } = require('./auto-start');

let mainWindow = null;
let tray = null;
let scheduler = null;
let autoStart = null;

function createWindow(showWindow = true) {
  // Create system tray first (needed for background operation)
  if (!tray) {
    createTray();
  }

  mainWindow = new BrowserWindow({
    width: 600,
    height: 1000,
    show: showWindow, // Don't show window on startup if auto-starting
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    icon: path.join(__dirname, 'assets', 'icon.png')
  });

  mainWindow.loadFile('index.html');
  
  // If hidden, keep it hidden - user can show via tray
  if (!showWindow) {
    mainWindow.once('ready-to-show', () => {
      // Keep it hidden - user can show via tray icon click
    });
  }

  // Initialize scheduler with userData directory for state file
  const userDataPath = app.getPath('userData');
  scheduler = new ShutdownScheduler(userDataPath);

  // Initialize and enable auto-start
  autoStart = new AutoStart();
  autoStart.enable().catch(err => {
    console.log('Auto-start setup failed (non-critical):', err.message);
  });

  // Load saved state on startup
  scheduler.loadState().then(state => {
    if (state && state.active) {
      // Reactivate with saved config
      scheduler.activate({
        time: state.time,
        days: state.days,
        reminders: state.reminders || []
      }).catch(err => {
        console.error('Failed to reactivate schedule:', err);
        // Update state to inactive if reactivation fails
        scheduler.saveState({ active: false });
        state = { active: false };
      });
      updateTrayMenu(state.active);
    } else {
      updateTrayMenu(false);
    }
    if (mainWindow) {
      mainWindow.webContents.send('state-updated', state || { active: false });
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Hide window on close instead of quitting
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
  let trayIcon;
  
  try {
    trayIcon = nativeImage.createFromPath(iconPath);
  } catch (e) {
    // Create a simple icon if file doesn't exist
    trayIcon = nativeImage.createEmpty();
  }

  if (trayIcon.isEmpty()) {
    // Create a simple colored icon
    trayIcon = nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
  }

  tray = new Tray(trayIcon);
  updateTrayMenu(false);

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });
}

function updateTrayMenu(isActive) {
  const contextMenu = Menu.buildFromTemplate([
    {
      label: isActive ? 'Shutdown Active' : 'Shutdown Inactive',
      enabled: false
    },
    { type: 'separator' },
    {
      label: 'Show Window',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
  tray.setToolTip(isActive ? 'Timed Shutdown: Active' : 'Timed Shutdown: Inactive');
}

// Suppress Vulkan warnings on Linux (these are typically harmless)
if (process.platform === 'linux') {
  // Use ANGLE backend instead of native Vulkan to avoid driver issues
  app.commandLine.appendSwitch('use-angle', 'gl');
  // Suppress unnecessary warnings
  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = '1';
}

// Check if app was launched automatically (auto-start) or manually
const isAutoStart = process.argv.includes('--hidden') || 
                    (process.env.DESKTOP_AUTOSTART === 'true') ||
                    !process.env.DISPLAY; // No display = likely auto-start

app.whenReady().then(() => {
  // Start hidden if auto-started, visible if manually launched
  createWindow(!isAutoStart);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(true);
    } else if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
});

app.on('window-all-closed', () => {
  // Don't quit on window close - keep running in tray
  if (process.platform !== 'darwin') {
    // On Windows/Linux, keep running
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
  if (scheduler) {
    scheduler.deactivate();
  }
});

// IPC handlers
ipcMain.handle('get-state', async () => {
  return scheduler ? await scheduler.getState() : { active: false };
});

ipcMain.handle('activate', async (event, config) => {
  try {
    if (!scheduler) {
      scheduler = new ShutdownScheduler();
    }
    await scheduler.activate(config);
    updateTrayMenu(true);
    return { success: true, message: 'Shutdown scheduled successfully!' };
  } catch (error) {
    return { success: false, message: `Failed to activate: ${error.message}` };
  }
});

ipcMain.handle('update', async (event, config) => {
  try {
    if (!scheduler) {
      return { success: false, message: 'Scheduler not initialized' };
    }
    await scheduler.update(config);
    return { success: true, message: 'Shutdown schedule updated successfully!' };
  } catch (error) {
    return { success: false, message: `Failed to update: ${error.message}` };
  }
});

ipcMain.handle('deactivate', async () => {
  try {
    if (scheduler) {
      await scheduler.deactivate();
      updateTrayMenu(false);
      return { success: true, message: 'Shutdown deactivated successfully!' };
    }
    return { success: false, message: 'No active shutdown to deactivate' };
  } catch (error) {
    return { success: false, message: `Failed to deactivate: ${error.message}` };
  }
});

ipcMain.on('state-changed', () => {
  if (scheduler) {
    scheduler.getState().then(state => {
      if (mainWindow) {
        mainWindow.webContents.send('state-updated', state);
      }
      updateTrayMenu(state.active);
    });
  }
});

