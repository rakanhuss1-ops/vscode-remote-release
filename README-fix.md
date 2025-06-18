# Podman Mount Fix

This directory contains the code implementation for fixing the Podman mount relabel issue in Dev Container CLI.

## Problem

The Dev Container CLI generates Dockerfiles with `RUN --mount=type=bind,...,z` syntax for features installation. The `z` flag is invalid for `--mount` in Podman (only valid for `--volume`), causing this error on systems without SELinux:

```
bind mounts cannot have any filesystem-specific options applied
```

## Solution

This code implementation provides the fix by:

1. **Removing `z` flag from `--mount`** for buildah/Podman (it's invalid)
2. **Adding `--security-opt=label=disable`** when building with Podman (proper equivalent)

## Code Structure

- `src/podman-mount-fix.ts` - Core fix implementation
- `src/podman-mount-fix.test.ts` - Tests demonstrating the fix
- `src/podman-fix-utility.ts` - CLI utility to apply the fix

## Usage

### Build the project

```bash
npm install
npm run build
```

### Run demonstrations

```bash
# Show how the fix works
npm run demo

# Show complete before/after example
npm run example

# Run tests
npm test
```

### Fix a Dockerfile

```bash
node dist/podman-fix-utility.js fix path/to/Dockerfile podman
```

## Key Changes

### Before (problematic):
```dockerfile
RUN --mount=type=bind,from=dev_containers_feature_content_source,source=hello_0,target=/tmp/build-features-src/hello_0,z \
    cp -ar /tmp/build-features-src/hello_0 /tmp/dev-container-features
```

```bash
podman build -f Dockerfile -t dev-container .
```

**Result**: ❌ Fails with "bind mounts cannot have any filesystem-specific options applied"

### After (fixed):
```dockerfile
RUN --mount=type=bind,from=dev_containers_feature_content_source,source=hello_0,target=/tmp/build-features-src/hello_0 \
    cp -ar /tmp/build-features-src/hello_0 /tmp/dev-container-features
```

```bash
podman build -f Dockerfile -t dev-container --security-opt=label=disable .
```

**Result**: ✅ Works on both SELinux and non-SELinux systems

## Integration

This code can be integrated into devcontainers/cli by:

1. Detecting the build engine (docker vs podman/buildah)
2. Using `PodmanMountFixer.generateMountOptions()` to generate correct mount syntax
3. Using `PodmanMountFixer.getBuildCommand()` to generate correct build commands
4. Using `PodmanMountFixer.applyFix()` to fix existing configurations

The fix ensures compatibility with both Docker and Podman while maintaining the same functionality.