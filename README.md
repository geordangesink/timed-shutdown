# ⏰ Timed Shutdown

A cross-platform desktop application for scheduling automatic system shutdowns at specific times. Built with Electron, featuring a minimalistic UI and system tray integration.

## ✨ Features

- **🕐 Scheduled Shutdowns**: Set automatic shutdown times for specific days of the week
- **🔔 Reminders**: Configure up to 3 reminder notifications before shutdown
- **🔄 Auto-Start**: Automatically launches on system startup (runs in background)
- **💾 State Persistence**: Remembers your schedule across app restarts
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

### Code Signing

Code signing is recommended for distribution to avoid security warnings for users.

#### macOS

Code signing is **required** for macOS distribution. To set up:

1. **Get a Developer ID certificate** from Apple Developer (required for distribution outside the App Store)

2. **Set environment variables** before building:
   ```bash
   # Your Developer ID certificate name (find it in Keychain Access)
   export CSC_NAME="Developer ID Application: Your Name (TEAM_ID)"
   
   # For notarization (required for distribution)
   export APPLE_ID="your-apple-id@example.com"
   export APPLE_ID_PASSWORD="app-specific-password"  # Generate at appleid.apple.com
   export APPLE_TEAM_ID="YOUR_TEAM_ID"
   ```

3. **Build with signing**:
   ```bash
   npm run build
   ```

**Note**: Without code signing, macOS users will see a warning about the app being from an unidentified developer. Distribution requires proper signing and notarization.

#### Windows

Code signing is **highly recommended** for Windows to avoid "Unknown publisher" warnings from Windows Defender SmartScreen.

1. **Get a code signing certificate** from a trusted Certificate Authority (e.g., DigiCert, Sectigo, GlobalSign)

2. **Set environment variables** before building:
   ```bash
   # Path to your .pfx certificate file
   export CSC_LINK="/path/to/certificate.pfx"
   export CSC_KEY_PASSWORD="your-certificate-password"
   ```

   Or use base64-encoded certificate:
   ```bash
   export CSC_LINK="base64-encoded-certificate-string"
   export CSC_KEY_PASSWORD="your-certificate-password"
   ```

3. **Build with signing**:
   ```bash
   npm run build
   ```

**Note**: Without code signing, Windows users will see security warnings. For distribution, code signing is strongly recommended.

#### Linux

Code signing is **not required** for Linux AppImage builds. AppImages are typically distributed without code signing, though some distributions may use GPG signing for package repositories.

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

### Platform-Specific Features

- **Windows**: Registry-based auto-start, `shutdown.exe` command
- **Linux**: Desktop entry auto-start, `shutdown` command (requires sudo)
- **macOS**: LaunchAgent auto-start, `shutdown` command

## 🔒 Permissions

- **Linux**: The shutdown command requires sudo privileges. The app will prompt for your password when executing shutdowns.
- **Windows/macOS**: Standard user permissions are sufficient.

## 📝 License

Apache-2.0 License - see LICENSE file for details

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🐛 Issues

If you encounter any bugs or have feature requests, please open an issue on the repository.

---

**Note**: Always save your work before scheduled shutdowns. The application will shut down your system at the specified time without additional confirmation.

