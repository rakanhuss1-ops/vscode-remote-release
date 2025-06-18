/**
 * Fix for Podman mount relabel issue
 * 
 * The Dev Container CLI generates Dockerfiles with `RUN --mount=type=bind,...,z` syntax
 * which is invalid for Podman (z flag only valid for --volume, not --mount).
 * 
 * This module provides the fix by:
 * 1. Removing 'z' flag from --mount for buildah/Podman
 * 2. Adding --security-opt=label=disable when building with Podman
 */

export interface BuildOptions {
    buildEngine: 'docker' | 'podman' | 'buildah';
    mountOptions: string[];
    securityOptions: string[];
}

export class PodmanMountFixer {
    
    /**
     * Generates mount options compatible with the specified build engine
     */
    static generateMountOptions(buildEngine: string, source: string, target: string): string {
        const baseOptions = `type=bind,source=${source},target=${target}`;
        
        if (buildEngine === 'buildah' || buildEngine === 'podman') {
            // Don't add 'z' flag for Podman/Buildah - it's invalid for --mount
            return baseOptions;
        } else {
            // Keep 'z' flag for Docker
            return `${baseOptions},z`;
        }
    }
    
    /**
     * Generates build command with appropriate security options
     */
    static getBuildCommand(buildEngine: string, dockerfile: string, context: string, tag: string): string[] {
        const baseCommand = [buildEngine, 'build', '-f', dockerfile, '-t', tag];
        
        if (buildEngine === 'podman') {
            // Add security option to disable SELinux labeling for Podman
            baseCommand.push('--security-opt=label=disable');
        }
        
        baseCommand.push(context);
        return baseCommand;
    }
    
    /**
     * Fixes existing Dockerfile content by removing z flag from --mount
     */
    static fixDockerfileContent(content: string): string {
        // Pattern to match RUN --mount with z flag
        const mountPattern = /(RUN\s+--mount=[^\\]*),z(\s|\\)/g;
        
        // Remove the z flag from mount options
        return content.replace(mountPattern, '$1$2');
    }
    
    /**
     * Detects if the current system is affected by the Podman mount issue
     */
    static isSystemAffected(buildEngine: string): boolean {
        return buildEngine === 'podman' || buildEngine === 'buildah';
    }
    
    /**
     * Applies the complete fix for a build configuration
     */
    static applyFix(buildOptions: BuildOptions): BuildOptions {
        const { buildEngine } = buildOptions;
        
        if (!this.isSystemAffected(buildEngine)) {
            return buildOptions;
        }
        
        // Remove z flag from mount options
        const fixedMountOptions = buildOptions.mountOptions.map(option => 
            option.replace(/,z($|,)/, '$1')
        );
        
        // Add security option for Podman
        const fixedSecurityOptions = [...buildOptions.securityOptions];
        if (buildEngine === 'podman' && !fixedSecurityOptions.includes('label=disable')) {
            fixedSecurityOptions.push('label=disable');
        }
        
        return {
            ...buildOptions,
            mountOptions: fixedMountOptions,
            securityOptions: fixedSecurityOptions
        };
    }
}

// Example usage for devcontainers/cli integration
export function generateFeatureInstallCommand(
    buildEngine: string,
    featureName: string,
    sourceDir: string,
    targetDir: string
): { dockerfile: string; buildArgs: string[] } {
    
    const mountOptions = PodmanMountFixer.generateMountOptions(
        buildEngine, 
        sourceDir, 
        targetDir
    );
    
    const dockerfile = `RUN --mount=${mountOptions} \\
    cp -ar ${targetDir}/${featureName} /tmp/dev-container-features`;
    
    const buildArgs = PodmanMountFixer.getBuildCommand(
        buildEngine,
        'Dockerfile',
        '.',
        'dev-container'
    );
    
    return { dockerfile, buildArgs };
}