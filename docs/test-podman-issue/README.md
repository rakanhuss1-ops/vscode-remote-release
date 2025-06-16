# Test Case for Podman Mount Issue

This directory contains a minimal devcontainer configuration that reproduces the Podman mount issue described in [issue #10585](https://github.com/microsoft/vscode-remote-release/issues/10585).

## Reproduction Steps

1. Ensure you have Podman installed and configured
2. Make sure you're on a system without SELinux enabled (or with SELinux in permissive mode)
3. Run the devcontainer build command:

```bash
devcontainer build
```

## Expected Behavior

On affected systems, you should see an error similar to:
```
bind mounts cannot have any filesystem-specific options applied
```

## Testing the Fix

Once the fix is implemented in the devcontainer CLI, this same configuration should build successfully without errors.

## System Requirements for Reproducing

- Podman 4.9.3+
- containerd.io 1.7.24+
- buildah 1.33.7+
- System without SELinux enforcement

## Files

- `.devcontainer.json` - Minimal configuration that triggers the issue
- `README.md` - This file