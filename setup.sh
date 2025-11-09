#!/bin/bash

echo "🚀 Setting up RemoteCC..."
echo ""

# Check Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js found: $(node --version)"
echo ""

# Install server dependencies
echo "📦 Installing server dependencies..."
cd server
npm install
if [ $? -ne 0 ]; then
    echo "❌ Failed to install server dependencies"
    exit 1
fi
echo "✅ Server dependencies installed"
echo ""

# Install mobile dependencies
echo "📱 Installing mobile dependencies..."
cd ../mobile
npm install
if [ $? -ne 0 ]; then
    echo "❌ Failed to install mobile dependencies"
    exit 1
fi
echo "✅ Mobile dependencies installed"
echo ""

cd ..

echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Start the server:"
echo "     cd server && npm start"
echo ""
echo "  2. In a new terminal, start the mobile app:"
echo "     cd mobile && npm start"
echo ""
echo "  3. Install Expo Go on your phone:"
echo "     iOS: https://apps.apple.com/app/expo-go/id982107779"
echo "     Android: https://play.google.com/store/apps/details?id=host.exp.exponent"
echo ""
echo "  4. Scan the Expo QR code with Expo Go"
echo "  5. In the app, scan the RemoteCC server QR code"
echo "  6. Start using Claude Code from your phone!"
echo ""
