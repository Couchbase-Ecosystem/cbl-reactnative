#!/bin/bash
# Script to add Pure C++ TurboModule files to Xcode project

PROJECT_PATH="ios/expoexample.xcodeproj"
PROVIDER_H="ios/NativeCblBenchmarkProvider.h"
PROVIDER_MM="ios/NativeCblBenchmarkProvider.mm"
SHARED_H="../shared/NativeCblBenchmark.h"
SHARED_CPP="../shared/NativeCblBenchmark.cpp"

if [ ! -f "$PROJECT_PATH/project.pbxproj" ]; then
    echo "Error: Xcode project not found at $PROJECT_PATH"
    exit 1
fi

echo "Note: Please manually add these files to Xcode project:"
echo "  1. $PROVIDER_H"
echo "  2. $PROVIDER_MM"
echo "  3. $SHARED_H"
echo "  4. $SHARED_CPP"
echo ""
echo "Or run: npx expo prebuild --clean to regenerate"
