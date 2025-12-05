#!/bin/bash
echo "Monitoring Replicator OLD API logs..."
echo "================================================"
adb logcat -c  # Clear old logs
adb logcat | grep -E "\[ReplicatorHelper\]|\[ReplicatorManager\]|\[JS Step\]|\[OLD API\]|\[ReplicatorConfiguration\]|ReactNativeJS"
