#!/bin/bash
# Check if system is affected by Podman mount relabel issue
# This script helps users determine if they might encounter the issue

set -e

echo "Checking system for Podman mount relabel issue compatibility..."
echo "================================================================="

# Check if podman is installed
if ! command -v podman >/dev/null 2>&1; then
    echo "❌ Podman is not installed or not in PATH"
    echo "   This issue only affects Podman users"
    exit 0
fi

echo "✅ Podman is installed"

# Get Podman version
PODMAN_VERSION=$(podman --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -n 1)
echo "   Podman version: $PODMAN_VERSION"

# Check for buildah
if command -v buildah >/dev/null 2>&1; then
    BUILDAH_VERSION=$(buildah --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -n 1)
    echo "   Buildah version: $BUILDAH_VERSION"
    
    # Check if buildah version is 1.33.7 or higher (versions known to have the issue)
    if dpkg --compare-versions "$BUILDAH_VERSION" "ge" "1.33.7" 2>/dev/null; then
        echo "⚠️  Buildah version may be affected by the mount issue"
    fi
else
    echo "   Buildah not found in PATH"
fi

# Check SELinux status
echo ""
echo "Checking SELinux status:"
if command -v getenforce >/dev/null 2>&1; then
    SELINUX_STATUS=$(getenforce)
    echo "   SELinux status: $SELINUX_STATUS"
    
    if [ "$SELINUX_STATUS" = "Enforcing" ]; then
        echo "✅ SELinux is enforcing - you may not be affected"
        echo "   (The 'z' flag works correctly with SELinux enabled)"
    elif [ "$SELINUX_STATUS" = "Permissive" ]; then
        echo "⚠️  SELinux is permissive - you may be affected"
    else
        echo "⚠️  SELinux is disabled - you are likely affected"
    fi
else
    echo "⚠️  SELinux not found - you are likely affected"
    echo "   (Non-SELinux systems are most commonly affected)"
fi

# Check containerd version if available
echo ""
echo "Checking container runtime:"
if command -v runc >/dev/null 2>&1; then
    RUNC_VERSION=$(runc --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -n 1)
    echo "   runc version: $RUNC_VERSION"
fi

# Check if devcontainer CLI is installed
echo ""
echo "Checking devcontainer CLI:"
if command -v devcontainer >/dev/null 2>&1; then
    DEVCONTAINER_VERSION=$(devcontainer --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -n 1)
    echo "✅ devcontainer CLI is installed"
    echo "   Version: $DEVCONTAINER_VERSION"
    
    if dpkg --compare-versions "$DEVCONTAINER_VERSION" "ge" "0.72.0" 2>/dev/null; then
        echo "⚠️  This version may generate problematic mount syntax"
    fi
else
    echo "❌ devcontainer CLI not found"
    echo "   Install it to use dev containers with features"
fi

# Summary
echo ""
echo "================================================================="
echo "SUMMARY:"
echo ""

# Determine risk level
RISK_LEVEL="LOW"
if command -v podman >/dev/null 2>&1; then
    if ! command -v getenforce >/dev/null 2>&1 || [ "$(getenforce 2>/dev/null)" != "Enforcing" ]; then
        RISK_LEVEL="HIGH"
    fi
fi

case $RISK_LEVEL in
    "HIGH")
        echo "🔴 HIGH RISK: You are likely affected by this issue"
        echo ""
        echo "Your system configuration suggests you may encounter the error:"
        echo "'bind mounts cannot have any filesystem-specific options applied'"
        echo ""
        echo "Recommendations:"
        echo "1. Review the workaround guide: docs/podman-mount-workaround.md"
        echo "2. Consider using Docker instead of Podman temporarily"
        echo "3. Monitor the issue for permanent fix updates"
        ;;
    "MEDIUM")
        echo "🟡 MEDIUM RISK: You may be affected depending on usage"
        echo ""
        echo "Monitor the issue if you plan to use dev containers with features"
        ;;
    "LOW")
        echo "🟢 LOW RISK: You are unlikely to be affected"
        echo ""
        echo "Your system configuration should handle the current mount syntax"
        ;;
esac

echo ""
echo "For more information:"
echo "- Issue details: https://github.com/microsoft/vscode-remote-release/issues/10585"
echo "- Technical documentation: docs/podman-mount-relabel-fix.md"
echo "- Workaround guide: docs/podman-mount-workaround.md"