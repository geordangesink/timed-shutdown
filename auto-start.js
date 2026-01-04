const { app } = require('electron');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class AutoStart {
  constructor() {
    this.platform = process.platform;
    this.appName = app.getName();
    // Use process.execPath for development, app.getPath('exe') for production
    this.appPath = process.execPath;
    if (app.isPackaged) {
      this.appPath = app.getPath('exe');
    }
  }

  async isEnabled() {
    if (this.platform === 'win32') {
      return this.isEnabledWindows();
    } else if (this.platform === 'darwin') {
      return this.isEnabledMacOS();
    } else {
      return this.isEnabledLinux();
    }
  }

  async enable() {
    if (this.platform === 'win32') {
      return this.enableWindows();
    } else if (this.platform === 'darwin') {
      return this.enableMacOS();
    } else {
      return this.enableLinux();
    }
  }

  async disable() {
    if (this.platform === 'win32') {
      return this.disableWindows();
    } else if (this.platform === 'darwin') {
      return this.disableMacOS();
    } else {
      return this.disableLinux();
    }
  }

  // Windows implementation
  async isEnabledWindows() {
    return new Promise((resolve) => {
      const regPath = `HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run`;
      exec(`reg query "${regPath}" /v "${this.appName}"`, (error) => {
        resolve(!error);
      });
    });
  }

  async enableWindows() {
    return new Promise((resolve, reject) => {
      const regPath = `HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run`;
      // Add --hidden flag for background startup
      const command = `reg add "${regPath}" /v "${this.appName}" /t REG_SZ /d "${this.appPath} --hidden" /f`;
      exec(command, (error) => {
        if (error) {
          reject(new Error(`Failed to enable auto-start: ${error.message}`));
        } else {
          resolve();
        }
      });
    });
  }

  async disableWindows() {
    return new Promise((resolve, reject) => {
      const regPath = `HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run`;
      const command = `reg delete "${regPath}" /v "${this.appName}" /f`;
      exec(command, (error) => {
        // Ignore error if key doesn't exist
        resolve();
      });
    });
  }

  // macOS implementation
  async isEnabledMacOS() {
    try {
      const plistPath = path.join(
        os.homedir(),
        'Library',
        'LaunchAgents',
        `com.${this.appName.toLowerCase()}.plist`
      );
      await fs.access(plistPath);
      return true;
    } catch {
      return false;
    }
  }

  async enableMacOS() {
    return new Promise((resolve, reject) => {
      const plistPath = path.join(
        os.homedir(),
        'Library',
        'LaunchAgents',
        `com.${this.appName.toLowerCase()}.plist`
      );
      const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.${this.appName.toLowerCase()}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${this.appPath}</string>
    <string>--hidden</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <false/>
</dict>
</plist>`;

      fs.writeFile(plistPath, plistContent)
        .then(() => {
          exec(`launchctl load "${plistPath}"`, (error) => {
            if (error) {
              reject(new Error(`Failed to enable auto-start: ${error.message}`));
            } else {
              resolve();
            }
          });
        })
        .catch(reject);
    });
  }

  async disableMacOS() {
    return new Promise((resolve) => {
      const plistPath = path.join(
        os.homedir(),
        'Library',
        'LaunchAgents',
        `com.${this.appName.toLowerCase()}.plist`
      );
      exec(`launchctl unload "${plistPath}"`, () => {
        // Try to delete the file
        fs.unlink(plistPath).catch(() => {
          // Ignore errors
        });
        resolve();
      });
    });
  }

  // Linux implementation
  async isEnabledLinux() {
    try {
      const autostartDir = path.join(os.homedir(), '.config', 'autostart');
      const desktopFile = path.join(autostartDir, `${this.appName.toLowerCase()}.desktop`);
      await fs.access(desktopFile);
      return true;
    } catch {
      return false;
    }
  }

  async enableLinux() {
    return new Promise((resolve, reject) => {
      const autostartDir = path.join(os.homedir(), '.config', 'autostart');
      const desktopFile = path.join(autostartDir, `${this.appName.toLowerCase()}.desktop`);
      const desktopContent = `[Desktop Entry]
Type=Application
Name=${this.appName}
Exec=${this.appPath} --hidden
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
StartupNotify=false
`;

      fs.mkdir(autostartDir, { recursive: true })
        .then(() => fs.writeFile(desktopFile, desktopContent))
        .then(() => resolve())
        .catch((error) => reject(new Error(`Failed to enable auto-start: ${error.message}`)));
    });
  }

  async disableLinux() {
    return new Promise((resolve) => {
      const autostartDir = path.join(os.homedir(), '.config', 'autostart');
      const desktopFile = path.join(autostartDir, `${this.appName.toLowerCase()}.desktop`);
      fs.unlink(desktopFile).catch(() => {
        // Ignore errors if file doesn't exist
      });
      resolve();
    });
  }
}

module.exports = { AutoStart };

