#!/bin/bash
# Test script to verify Podman mount relabel fix
# This script tests the different mount syntax options with Podman

set -e

echo "Testing Podman mount relabel fix..."

# Test configurations
BASE_IMAGE="mcr.microsoft.com/devcontainers/base:ubuntu"
FEATURE_DIR="/tmp/test-feature"
TEST_DIR="/tmp/podman-mount-test"

# Create test environment
mkdir -p "$TEST_DIR"
mkdir -p "$FEATURE_DIR"

# Create a simple test feature
cat > "$FEATURE_DIR/devcontainer-features-install.sh" << 'EOF'
#!/bin/bash
echo "Test feature installed successfully"
touch /tmp/test-feature-marker
EOF

chmod +x "$FEATURE_DIR/devcontainer-features-install.sh"

# Test Case 1: Original problematic syntax (should fail)
echo "Test 1: Testing original problematic syntax (z flag)..."
cat > "$TEST_DIR/Dockerfile.original" << EOF
FROM ${BASE_IMAGE}
RUN --mount=type=bind,source=${FEATURE_DIR},target=/tmp/build-features-src/test_feature,z \\
    cp -ar /tmp/build-features-src/test_feature /tmp/test-features && \\
    chmod +x /tmp/test-features/devcontainer-features-install.sh && \\
    /tmp/test-features/devcontainer-features-install.sh
EOF

# Test Case 2: Fixed syntax with relabel=shared (should work)
echo "Test 2: Testing fixed syntax (relabel=shared)..."
cat > "$TEST_DIR/Dockerfile.fixed" << EOF
FROM ${BASE_IMAGE}
RUN --mount=type=bind,source=${FEATURE_DIR},target=/tmp/build-features-src/test_feature,relabel=shared \\
    cp -ar /tmp/build-features-src/test_feature /tmp/test-features && \\
    chmod +x /tmp/test-features/devcontainer-features-install.sh && \\
    /tmp/test-features/devcontainer-features-install.sh
EOF

# Test Case 3: Alternative syntax without relabel (should work)
echo "Test 3: Testing alternative syntax (no relabel)..."
cat > "$TEST_DIR/Dockerfile.alternative" << EOF
FROM ${BASE_IMAGE}
RUN --mount=type=bind,source=${FEATURE_DIR},target=/tmp/build-features-src/test_feature \\
    cp -ar /tmp/build-features-src/test_feature /tmp/test-features && \\
    chmod +x /tmp/test-features/devcontainer-features-install.sh && \\
    /tmp/test-features/devcontainer-features-install.sh
EOF

# Function to test build
test_build() {
    local dockerfile="$1"
    local test_name="$2"
    local expected_result="$3"  # "pass" or "fail"
    
    echo "Running $test_name..."
    
    if podman build -f "$dockerfile" -t "test-$test_name" "$TEST_DIR" 2>&1; then
        if [ "$expected_result" = "pass" ]; then
            echo "✅ $test_name: PASSED (build succeeded as expected)"
            return 0
        else
            echo "❌ $test_name: FAILED (build succeeded but was expected to fail)"
            return 1
        fi
    else
        if [ "$expected_result" = "fail" ]; then
            echo "✅ $test_name: PASSED (build failed as expected)"
            return 0
        else
            echo "❌ $test_name: FAILED (build failed but was expected to pass)"
            return 1
        fi
    fi
}

# Function to test with security-opt
test_build_with_security_opt() {
    local dockerfile="$1"
    local test_name="$2"
    
    echo "Running $test_name with --security-opt=label=disable..."
    
    if podman build --security-opt=label=disable -f "$dockerfile" -t "test-$test_name-security" "$TEST_DIR" 2>&1; then
        echo "✅ $test_name with security-opt: PASSED"
        return 0
    else
        echo "❌ $test_name with security-opt: FAILED"
        return 1
    fi
}

# Check if we're on a system with SELinux
if command -v getenforce >/dev/null 2>&1 && [ "$(getenforce)" = "Enforcing" ]; then
    echo "SELinux is enforcing - original syntax might work"
    SELINUX_ENABLED=true
else
    echo "SELinux is not enforcing - original syntax expected to fail"
    SELINUX_ENABLED=false
fi

# Run tests
echo "=========================================="
echo "Starting Podman mount syntax tests..."
echo "=========================================="

# Test 1: Original syntax (should fail on non-SELinux systems)
if [ "$SELINUX_ENABLED" = "true" ]; then
    test_build "$TEST_DIR/Dockerfile.original" "original-syntax" "pass"
else
    test_build "$TEST_DIR/Dockerfile.original" "original-syntax" "fail"
fi

# Test 2: Fixed syntax (should always work)
test_build "$TEST_DIR/Dockerfile.fixed" "fixed-syntax" "pass"

# Test 3: Alternative syntax (should always work)
test_build "$TEST_DIR/Dockerfile.alternative" "alternative-syntax" "pass"

# Test 4: Original syntax with security-opt (should work)
test_build_with_security_opt "$TEST_DIR/Dockerfile.original" "original-syntax"

echo "=========================================="
echo "Test Summary:"
echo "- Fixed syntax (relabel=shared): Should work on all systems"
echo "- Alternative syntax (no relabel): Should work on all systems"
echo "- Security-opt approach: Should work as fallback"
echo "- Original syntax (z flag): Only works on SELinux systems"
echo "=========================================="

# Cleanup
echo "Cleaning up..."
rm -rf "$TEST_DIR"
rm -rf "$FEATURE_DIR"

echo "Tests completed."