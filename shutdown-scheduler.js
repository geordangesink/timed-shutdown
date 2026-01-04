const { exec, spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const cron = require('node-cron');
const { app } = require('electron');

class ShutdownScheduler {
  constructor(stateFileDir = null) {
    // Use userData directory when packaged, or provided directory, or __dirname for development
    if (stateFileDir) {
      this.stateFile = path.join(stateFileDir, 'shutdown-state.json');
    } else if (app && app.isPackaged) {
      this.stateFile = path.join(app.getPath('userData'), 'shutdown-state.json');
    } else {
      this.stateFile = path.join(__dirname, 'shutdown-state.json');
    }
    this.currentState = { active: false };
    this.cronJobs = [];
    this.platform = process.platform;
  }

  async loadState() {
    try {
      const data = await fs.readFile(this.stateFile, 'utf8');
      this.currentState = JSON.parse(data);
      return this.currentState;
    } catch (error) {
      return { active: false };
    }
  }

  async saveState(state) {
    this.currentState = state;
    // Ensure directory exists
    const dir = path.dirname(this.stateFile);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(this.stateFile, JSON.stringify(state, null, 2));
  }

  async getState() {
    return await this.loadState();
  }

  async activate(config) {
    // Deactivate any existing schedule first
    await this.deactivate();

    const { time, days, reminders } = config;
    
    // Validate config
    if (!time || !days || days.length === 0) {
      throw new Error('Time and at least one day must be selected');
    }

    // Parse time
    const [hours, minutes] = time.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) {
      throw new Error('Invalid time format');
    }

    // Schedule shutdown for each selected day
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const cronDayNumbers = days
      .map(day => dayNames.indexOf(day.toLowerCase()))
      .filter(dayNum => dayNum !== -1); // Remove invalid days
    
    if (cronDayNumbers.length === 0) {
      throw new Error('No valid days selected');
    }

    const cronDays = cronDayNumbers.join(',');

    // Create cron expression: minute hour * * dayOfWeek
    const cronExpression = `${minutes} ${hours} * * ${cronDays}`;

    // Schedule shutdown
    const shutdownJob = cron.schedule(cronExpression, async () => {
      await this.executeShutdown();
    }, {
      scheduled: true,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });

    this.cronJobs.push(shutdownJob);

    // Schedule reminders
    if (reminders && reminders.length > 0) {
      for (const reminderTime of reminders) {
        if (!reminderTime) continue;
        
        const [remHours, remMinutes] = reminderTime.split(':').map(Number);
        if (isNaN(remHours) || isNaN(remMinutes)) continue;

        const reminderCron = `${remMinutes} ${remHours} * * ${cronDays}`;
        const reminderJob = cron.schedule(reminderCron, async () => {
          await this.showReminder(time);
        }, {
          scheduled: true,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        });

        this.cronJobs.push(reminderJob);
      }
    }

    // Save state
    await this.saveState({
      active: true,
      time,
      days,
      reminders: reminders || []
    });

    return true;
  }

  async update(config) {
    if (!this.currentState.active) {
      throw new Error('Cannot update: shutdown is not active');
    }
    await this.activate(config);
  }

  async deactivate() {
    // Stop all cron jobs
    this.cronJobs.forEach(job => {
      if (job && typeof job.stop === 'function') {
        job.stop();
      }
    });
    this.cronJobs = [];

    // Cancel any scheduled shutdowns on the OS level
    await this.cancelOSShutdown();

    // Save state
    await this.saveState({ active: false });
  }

  async executeShutdown() {
    return new Promise((resolve, reject) => {
      let command;
      let useSudo = false;
      
      if (this.platform === 'win32') {
        command = 'shutdown /s /t 0';
      } else if (this.platform === 'darwin') {
        // macOS requires sudo for shutdown
        command = 'shutdown -h now';
        useSudo = true;
      } else {
        // Linux - try without sudo first, fallback to sudo if needed
        command = 'shutdown -h now';
      }

      const execCommand = useSudo ? `sudo -n ${command}` : command;
      
      exec(execCommand, { timeout: 5000 }, (error, stdout, stderr) => {
        if (error) {
          // On Linux, if non-sudo fails, try with sudo
          if (this.platform === 'linux' && !useSudo && error.code !== 0) {
            exec(`sudo -n shutdown -h now`, { timeout: 5000 }, (sudoError) => {
              if (sudoError) {
                console.error(`Shutdown error: ${sudoError.message}`);
                reject(new Error(`Shutdown failed. You may need to configure passwordless sudo for shutdown command.`));
              } else {
                resolve();
              }
            });
          } else {
            console.error(`Shutdown error: ${error.message}`);
            if (useSudo || (this.platform === 'linux' && error.code !== 0)) {
              reject(new Error(`Shutdown failed. You may need to configure passwordless sudo. Error: ${error.message}`));
            } else {
              reject(error);
            }
          }
        } else {
          resolve();
        }
      });
    });
  }

  async cancelOSShutdown() {
    return new Promise((resolve) => {
      let command;
      
      if (this.platform === 'win32') {
        command = 'shutdown /a';
      } else if (this.platform === 'darwin') {
        // macOS doesn't have a cancel command, but we can try
        command = 'sudo killall shutdown';
      } else {
        // Linux
        command = 'shutdown -c';
      }

      exec(command, (error) => {
        // Ignore errors - shutdown might not be scheduled
        resolve();
      });
    });
  }

  async showReminder(shutdownTime) {
    const now = new Date();
    const [shutdownHours, shutdownMinutes] = shutdownTime.split(':').map(Number);
    
    // Find the next occurrence of shutdown time
    const shutdownDate = new Date();
    shutdownDate.setHours(shutdownHours, shutdownMinutes, 0, 0);
    
    // If shutdown time has passed today, find next scheduled day
    // For weekly schedules, we need to find the next scheduled day
    if (shutdownDate < now && this.currentState.days) {
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const currentDay = now.getDay();
      const scheduledDays = this.currentState.days.map(d => dayNames.indexOf(d.toLowerCase()));
      
      // Find next scheduled day
      let daysToAdd = 0;
      let found = false;
      for (let i = 0; i < 7; i++) {
        const checkDay = (currentDay + i) % 7;
        if (scheduledDays.includes(checkDay)) {
          daysToAdd = i;
          found = true;
          break;
        }
      }
      
      if (found) {
        shutdownDate.setDate(shutdownDate.getDate() + daysToAdd);
        // If it's today but time passed, move to next week
        if (daysToAdd === 0 && shutdownDate < now) {
          shutdownDate.setDate(shutdownDate.getDate() + 7);
        }
      } else {
        // Fallback: add 1 day
        shutdownDate.setDate(shutdownDate.getDate() + 1);
      }
    } else if (shutdownDate < now) {
      // No days info, just add 1 day
      shutdownDate.setDate(shutdownDate.getDate() + 1);
    }

    const diffMs = shutdownDate - now;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const diffDays = Math.floor(diffHours / 24);

    let message = `System will shut down`;
    if (diffDays === 0) {
      message += ` today at ${shutdownTime}`;
    } else if (diffDays === 1) {
      message += ` tomorrow at ${shutdownTime}`;
    } else {
      const dayName = shutdownDate.toLocaleDateString('en-US', { weekday: 'long' });
      message += ` on ${dayName} at ${shutdownTime}`;
    }
    
    if (diffHours > 0 || diffMinutes > 0) {
      message += ` (in `;
      if (diffDays > 0) {
        message += `${diffDays} day${diffDays > 1 ? 's' : ''} `;
      }
      const remainingHours = diffHours % 24;
      if (remainingHours > 0) {
        message += `${remainingHours} hour${remainingHours > 1 ? 's' : ''} `;
      }
      if (diffMinutes > 0 && diffDays === 0) {
        message += `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
      }
      message += ')';
    }

    await this.showNotification('Shutdown Reminder', message);
  }

  async showNotification(title, message) {
    return new Promise((resolve) => {
      // Escape special characters for shell commands
      const escapeShell = (str) => {
        return str.replace(/'/g, "'\\''").replace(/"/g, '\\"');
      };

      if (this.platform === 'win32') {
        // Windows 10+ toast notification using PowerShell
        const escapedTitle = title.replace(/'/g, "''").replace(/"/g, '`"');
        const escapedMessage = message.replace(/'/g, "''").replace(/"/g, '`"');
        const script = `[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, Windows.Data.Xml.Dom]::LoadAssembly('Windows.UI.Notifications'); $template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02); $textNodes = $template.GetElementsByTagName('text'); $textNodes.Item(0).AppendChild($template.CreateTextNode('${escapedTitle}')) | Out-Null; $textNodes.Item(1).AppendChild($template.CreateTextNode('${escapedMessage}')) | Out-Null; $toast = [Windows.UI.Notifications.ToastNotification]::new($template); [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('Timed Shutdown').Show($toast)`;
        exec(`powershell -Command "${script}"`, (error) => {
          if (error) {
            // Fallback to msg command
            const safeMsg = `${title}: ${message}`.replace(/"/g, '\\"');
            exec(`msg * "${safeMsg}"`, () => resolve());
          } else {
            resolve();
          }
        });
      } else if (this.platform === 'darwin') {
        // macOS notification - escape properly
        const safeTitle = escapeShell(title);
        const safeMessage = escapeShell(message);
        exec(`osascript -e 'display notification "${safeMessage}" with title "${safeTitle}"'`, () => resolve());
      } else {
        // Linux notification - use notify-send with proper escaping
        const safeTitle = escapeShell(title);
        const safeMessage = escapeShell(message);
        exec(`notify-send "${safeTitle}" "${safeMessage}"`, () => resolve());
      }
    });
  }
}

module.exports = { ShutdownScheduler };

