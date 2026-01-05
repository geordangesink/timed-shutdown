# ⏰ Timed Shutdown

A beautiful, cross-platform desktop application for scheduling automatic system shutdowns at specific times. Built with Electron, featuring a modern UI and system tray integration.

## ✨ Features

- **🕐 Scheduled Shutdowns**: Set automatic shutdown times for specific days of the week
- **🔔 Reminders**: Configure up to 3 reminder notifications before shutdown
- **🔄 Auto-Start**: Automatically launches on system startup (runs in background)
- **📱 System Tray**: Runs quietly in the system tray with quick access
- **💾 State Persistence**: Remembers your schedule across app restarts
- **🎨 Modern UI**: Beautiful gradient interface with intuitive controls
- **🌍 Cross-Platform**: Works on Windows, Linux, and macOS

## 📸 Overview

Timed Shutdown provides a simple yet powerful way to manage automatic system shutdowns. Perfect for:
- Scheduling regular shutdowns to save energy
- Automating shutdowns at the end of your workday
- Setting reminders before important shutdowns
- Running silently in the background

## 🚀 Installation

### Pre-built Releases

Download the latest release for your platform:
- **Windows**: `.exe` installer (NSIS)
- **Linux**: `.AppImage` executable
- **macOS**: `.dmg` disk image

### Building from Source

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd timed-shutdown
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run in development mode**
   ```bash
   npm start
   ```

4. **Build for production**
   ```bash
   npm run build
   ```
   The built application will be in the `dist/` directory.

## 📖 Usage

### Setting Up a Shutdown Schedule

1. **Launch the application** - The app will appear in your system tray
2. **Click the tray icon** or launch the app to open the main window
3. **Set the shutdown time** - Use the time picker to select when you want the system to shut down
4. **Select days** - Choose which days of the week the shutdown should occur
5. **Add reminders (optional)** - Set up to 3 reminder times before the shutdown
6. **Click "Activate"** - Your schedule is now active!

### Managing Your Schedule

- **Update**: Modify your time, days, or reminders and click "Update"
- **Deactivate**: Click "Deactivate" to stop the scheduled shutdowns
- **System Tray**: Right-click the tray icon for quick access to show/hide the window or quit

### Auto-Start

The application automatically enables auto-start on first launch, so it will:
- Start with your system
- Run in the background (hidden)
- Restore your previous schedule automatically
- Be accessible via the system tray

## 🧪 Testing

Run the test suite:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 🛠️ Technical Details

### Architecture

- **Framework**: Electron 28+
- **Scheduling**: node-cron for cross-platform cron-like scheduling
- **State Management**: JSON-based persistence in user data directory
- **Platform Detection**: Automatic detection and platform-specific implementations

### Project Structure

```
timed-shutdown/
├── main.js              # Main Electron process
├── preload.js           # Preload script for secure IPC
├── renderer.js          # Renderer process logic
├── shutdown-scheduler.js # Core scheduling functionality
├── auto-start.js        # Auto-start implementation
├── index.html           # UI markup
├── assets/              # Icons and images
└── __tests__/           # Test files
```

### Platform-Specific Features

- **Windows**: Registry-based auto-start, `shutdown.exe` command
- **Linux**: Desktop entry auto-start, `shutdown` command (requires sudo)
- **macOS**: LaunchAgent auto-start, `shutdown` command

## 🔒 Permissions

- **Linux**: The shutdown command requires sudo privileges. The app will prompt for your password when executing shutdowns.
- **Windows/macOS**: Standard user permissions are sufficient.

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🐛 Issues

If you encounter any bugs or have feature requests, please open an issue on the repository.

---

**Note**: Always save your work before scheduled shutdowns. The application will shut down your system at the specified time without additional confirmation.

