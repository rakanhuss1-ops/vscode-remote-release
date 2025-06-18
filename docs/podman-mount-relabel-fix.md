# Podman Mount Relabel Issue - Technical Fix

## Problem Description

The Dev Container CLI generates Dockerfiles with `RUN --mount=type=bind,...,z` syntax for features installation. The `z` flag is invalid for `--mount` in Podman (only valid for `--volume`), causing build failures on systems without SELinux:

```
bind mounts cannot have any filesystem-specific options applied
```

## Root Cause

- Docker supports the `z` flag in `--mount` for SELinux relabeling
- Podman/Buildah only supports the `z` flag in `--volume`, not in `--mount`
- When SELinux is disabled, Podman rejects any filesystem-specific options in bind mounts

## Technical Solution

### For devcontainers/cli Implementation

The fix should be implemented in the Dev Container CLI to detect when building with Podman/Buildah and adjust the mount syntax accordingly:

#### 1. Remove `z` flag from `--mount` for Buildah/Podman

**Current (problematic) syntax:**
```dockerfile
RUN --mount=type=bind,from=dev_containers_feature_content_source,source=hello_0,target=/tmp/build-features-src/hello_0,z \
    cp -ar /tmp/build-features-src/hello_0 /tmp/dev-container-features
```

**Corrected syntax for Buildah/Podman:**
```dockerfile
RUN --mount=type=bind,from=dev_containers_feature_content_source,source=hello_0,target=/tmp/build-features-src/hello_0 \
    cp -ar /tmp/build-features-src/hello_0 /tmp/dev-container-features
```

#### 2. Add `--security-opt=label=disable` when building with Podman

When the build engine is detected as Podman, add the security option to the build command:

```bash
podman buildx build --security-opt=label=disable [other-options]
```

### Detection Logic

The CLI should detect the build engine and adjust accordingly:

```typescript
// Pseudo-code for the fix
function generateMountOptions(buildEngine: string): string {
    if (buildEngine === 'buildah' || buildEngine === 'podman') {
        // Don't add 'z' flag for Podman/Buildah
        return 'type=bind,source=...,target=...';
    } else {
        // Keep 'z' flag for Docker
        return 'type=bind,source=...,target=...,z';
    }
}

function getBuildCommand(buildEngine: string): string[] {
    const baseCommand = [buildEngine, 'buildx', 'build'];
    
    if (buildEngine === 'podman') {
        baseCommand.push('--security-opt=label=disable');
    }
    
    return baseCommand;
}
```

## Implementation Areas

### Files to Modify in devcontainers/cli

1. **Dockerfile generation logic**: Remove `z` flag from `--mount` when using Buildah
2. **Build command construction**: Add `--security-opt=label=disable` for Podman builds
3. **Build engine detection**: Detect when Podman/Buildah is being used

### Expected Behavior

- **With Docker**: Continue using `--mount=...,z` (no change)
- **With Podman**: Use `--mount=...` (no z) + `--security-opt=label=disable`
- **Cross-compatibility**: Works on both SELinux and non-SELinux systems

## Testing

The fix should be tested with:

1. **Docker builds**: Ensure existing functionality is preserved
2. **Podman builds on SELinux systems**: Verify security context handling
3. **Podman builds on non-SELinux systems**: Verify no bind mount errors
4. **Feature installation**: Confirm features install correctly with both engines

## Benefits

- **Universal compatibility**: Works with both Docker and Podman
- **Minimal impact**: No changes to existing Docker workflows
- **Proper security handling**: Uses appropriate security options for each engine
- **Standards compliance**: Follows each tool's documented best practices