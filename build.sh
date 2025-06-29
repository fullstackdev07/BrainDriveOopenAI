#!/bin/bash

# BrainDrive OpenAI Settings Plugin Build Script

set -e

echo "🚀 Building BrainDrive OpenAI Settings Plugin..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ and try again."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm and try again."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js version 16+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"
echo "✅ npm version: $(npm -v)"

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf dist/
rm -rf node_modules/

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Run tests
echo "🧪 Running tests..."
npm test

# Build the plugin
echo "🔨 Building plugin..."
npm run build

# Check if build was successful
if [ -d "dist" ] && [ -f "dist/remoteEntry.js" ]; then
    echo "✅ Build successful!"
    echo "📁 Build output: dist/"
    echo "📄 Main file: dist/remoteEntry.js"
    
    # Show build info
    echo ""
    echo "📊 Build Information:"
    echo "   - Plugin Name: BrainDriveOpenAISettings"
    echo "   - Version: $(node -p "require('./package.json').version")"
    echo "   - Entry Point: dist/remoteEntry.js"
    echo "   - Module Federation: Enabled"
    
    # List build files
    echo ""
    echo "📋 Build Files:"
    ls -la dist/
    
else
    echo "❌ Build failed! Check the error messages above."
    exit 1
fi

echo ""
echo "🎉 BrainDrive OpenAI Settings Plugin build completed successfully!"
echo "   You can now install this plugin in BrainDrive." 