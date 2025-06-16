# Workaround for Podman "bind mounts cannot have any filesystem-specific options applied" Error

If you're encountering this error when using Dev Containers with Podman:

```
bind mounts cannot have any filesystem-specific options applied
```

This is a known issue with the Dev Container CLI when using features on Podman systems without SELinux enabled.

## Check If You're Affected

Run the compatibility check script to see if your system is likely to experience this issue:

```bash
./docs/check-podman-compatibility.sh
```

## Temporary Workarounds

### Option 1: Manually Edit Generated Dockerfile

1. Run `devcontainer build` to generate the Dockerfile
2. When the build fails, locate the generated Dockerfile (usually in a temp directory like `/tmp/user/*/devcontainercli-*/container-features/*/Dockerfile.extended`)
3. Edit the file to remove the `,z` flag from the `RUN --mount` lines
4. Re-run the build command manually:

```bash
podman buildx build --load --build-context dev_containers_feature_content_source=/path/to/temp/dir --build-arg _DEV_CONTAINERS_BASE_IMAGE=your-base-image --target dev_containers_target_stage -f /path/to/Dockerfile.extended -t your-tag /path/to/context
```

### Option 2: Use Docker Instead

If available, use Docker instead of Podman for Dev Container builds:

```bash
# Use Docker for the build
docker buildx build ...
```

### Option 3: Disable SELinux Label Checking (Advanced)

If you're comfortable with container security implications, you can disable SELinux labeling:

```bash
# This approach would need to be implemented in the CLI
podman build --security-opt=label=disable ...
```

## Permanent Fix Status

This issue is being tracked in:
- [microsoft/vscode-remote-release#10585](https://github.com/microsoft/vscode-remote-release/issues/10585)
- The fix will be implemented in the [devcontainers/cli](https://github.com/devcontainers/cli) repository

The permanent fix will replace the invalid `z` flag with the correct `relabel=shared` syntax for Podman mount options.

## Affected Versions

- Dev Container CLI 0.72.0
- Podman with containerd 1.7.24+
- Systems without SELinux enabled

## See Also

- [Technical details and solution](podman-mount-relabel-fix.md)
- [Podman mount documentation](https://docs.podman.io/en/stable/markdown/podman-create.1.html#mount-type-type-type-specific-option)