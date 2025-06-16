# Podman Mount Relabel Fix

## Issue Description

The Dev Container CLI generates Dockerfiles with invalid mount syntax when using Podman on systems without SELinux. Specifically, the CLI uses the `z` flag in `--mount` options:

```dockerfile
RUN --mount=type=bind,from=dev_containers_feature_content_source,source=hello_0,target=/tmp/build-features-src/hello_0,z
```

This causes the following error:
```
bind mounts cannot have any filesystem-specific options applied
```

## Root Cause

The `z` flag is only valid for `--volume` options in Podman, not for `--mount` options. This restriction is enforced more strictly in newer versions of containerd/buildah (1.7.24+).

## Solution

### Option 1: Use relabel=shared (Recommended)

Replace the `z` flag with `relabel=shared` in mount syntax:

```dockerfile
RUN --mount=type=bind,from=dev_containers_feature_content_source,source=hello_0,target=/tmp/build-features-src/hello_0,relabel=shared
```

### Option 2: Use --security-opt=label=disable

Add the security option to the build command:

```bash
podman build --security-opt=label=disable ...
```

## Implementation

The fix needs to be implemented in the [devcontainers/cli](https://github.com/devcontainers/cli) repository where the Dockerfile generation logic resides.

### Changes Required

1. **In devcontainers/cli**: Update the mount syntax generation to use `relabel=shared` instead of `z` when detecting Podman
2. **Version compatibility**: Ensure the fix works with buildah 1.31.0+ (where relabel was introduced)
3. **Fallback**: Consider `--security-opt=label=disable` as a fallback for older versions

## Testing

Test cases should verify:
- ✅ Docker compatibility (existing behavior)
- ✅ Podman with SELinux enabled
- ✅ Podman without SELinux (the failing case)
- ✅ Various buildah versions (1.31.0+)

## References

- [Issue #10585](https://github.com/microsoft/vscode-remote-release/issues/10585)
- [Original devcontainers/cli PR #548](https://github.com/devcontainers/cli/issues/548)
- [Buildah relabel support PR #4705](https://github.com/containers/buildah/pull/4705)
- [Podman mount documentation](https://docs.podman.io/en/stable/markdown/podman-create.1.html#mount-type-type-type-specific-option)