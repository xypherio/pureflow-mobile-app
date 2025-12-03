#!/bin/bash

# PureFlow FCM Server Deployment Script
# This script helps deploy the FCM server to Vercel

echo "🚀 PureFlow FCM Server Deployment Tool"
echo "========================================"

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "vercel.json" ]; then
    echo "❌ Not in the FCM server directory. Please run this script from the fcm-server folder."
    exit 1
fi

echo "📦 Installing dependencies..."
npm install

# Check if .env.local exists for local development
if [ ! -f ".env.local" ]; then
    echo "⚠️  .env.local not found. Creating from template..."
    cp .env.example .env.local
    echo "📝 Please edit .env.local with your actual values before continuing."
    echo "Press Enter to continue after editing..."
    read
fi

# Test local development server
echo "🧪 Testing local development server..."
npm run dev &
DEV_SERVER_PID=$!
sleep 3

# Check if server is running
if curl -f http://localhost:3001/ > /dev/null 2>&1; then
    echo "✅ Local server started successfully"
    kill $DEV_SERVER_PID
else
    echo "❌ Local server failed to start"
    kill $DEV_SERVER_PID
    exit 1
fi

# Deploy to Vercel
echo "🌍 Deploying to Vercel..."
if [ "$1" = "--prod" ]; then
    vercel --prod
else
    vercel
fi

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Copy your Vercel deployment URL"
echo "2. Update your Firebase service account credentials in Vercel dashboard"
echo "3. Set your API secret key in Vercel environment variables"
echo "4. Test the endpoints using the examples in the README"
echo ""
echo "📖 See README.md for detailed usage instructions"
