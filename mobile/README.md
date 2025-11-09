# RemoteCC Mobile

React Native mobile app for viewing and controlling remote terminal sessions.

## Installation

```bash
npm install
```

## Running the App

### With Expo Go (Recommended for Testing)

1. Install Expo Go on your phone:
   - iOS: https://apps.apple.com/app/expo-go/id982107779
   - Android: https://play.google.com/store/apps/details?id=host.exp.exponent

2. Start the dev server:
   ```bash
   npm start
   ```

3. Scan the QR code with:
   - iOS: Camera app
   - Android: Expo Go app

### With Simulators

```bash
npm run ios      # iOS simulator (requires Xcode)
npm run android  # Android emulator (requires Android Studio)
```

## Features

- **QR Code Scanner**: Scan server QR codes to connect
- **Terminal Display**: View terminal output in real-time
- **Input Controls**: Send text input and quick actions
- **Auto-Reconnect**: Handles network interruptions
- **Connection Status**: Visual indicator of connection state

## Screens

### QR Scanner Screen

- Camera view for scanning QR codes
- Validates WebSocket URLs
- Shows helpful instructions

### Terminal Screen

- Scrollable terminal output display
- Text input field for commands
- Quick action buttons (y, n, Tab, Ctrl+C, Ctrl+D)
- Connection status indicator
- Disconnect button

## Quick Actions

The quick action bar provides one-tap access to common inputs:

- **y**: Send "y" + Enter
- **n**: Send "n" + Enter
- **Tab**: Send tab character
- **Ctrl+C**: Send interrupt signal (^C)
- **Ctrl+D**: Send EOF signal (^D)

## Permissions

The app requires camera permission for QR code scanning. Permission is requested on first use.

## Building for Production

### iOS

```bash
expo build:ios
```

### Android

```bash
expo build:android
```

## Troubleshooting

### Camera Permission Denied

Go to your device Settings → RemoteCC → Enable Camera

### Connection Fails

- Ensure your phone and computer are on the same WiFi network
- Check that the server is running
- Try rescanning the QR code

### App Crashes

- Make sure all dependencies are installed: `npm install`
- Clear Expo cache: `expo start -c`
- Restart the Metro bundler

## Development

The app uses:

- **React Navigation**: Screen navigation
- **Expo Camera**: QR code scanning
- **WebSocket API**: Server communication
- **React Native**: UI components
