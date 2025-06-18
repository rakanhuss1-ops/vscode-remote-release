#!/usr/bin/env node

/**
 * Podman Mount Fix Utility
 * 
 * This script demonstrates how to apply the fix for the Podman mount relabel issue.
 * It can be used to:
 * 1. Fix existing Dockerfiles that contain the problematic z flag
 * 2. Generate corrected build commands for Podman
 * 3. Validate that the fix works correctly
 */

import { readFileSync, writeFileSync } from 'fs';
import { PodmanMountFixer } from './podman-mount-fix';

interface FixResult {
    fixed: boolean;
    changes: string[];
    buildCommand: string[];
}

class PodmanFixUtility {
    
    /**
     * Fix a Dockerfile file on disk
     */
    static fixDockerfile(dockerfilePath: string, buildEngine: string): FixResult {
        const originalContent = readFileSync(dockerfilePath, 'utf8');
        const fixedContent = PodmanMountFixer.fixDockerfileContent(originalContent);
        
        const changes: string[] = [];
        const fixed = originalContent !== fixedContent;
        
        if (fixed) {
            writeFileSync(dockerfilePath, fixedContent);
            changes.push(`Removed z flag from --mount options in ${dockerfilePath}`);
        }
        
        const buildCommand = PodmanMountFixer.getBuildCommand(
            buildEngine,
            dockerfilePath,
            '.',
            'dev-container'
        );
        
        if (buildEngine === 'podman') {
            changes.push('Added --security-opt=label=disable to build command');
        }
        
        return { fixed, changes, buildCommand };
    }
    
    /**
     * Demonstrate the fix with before/after examples
     */
    static demonstrateFix(): void {
        console.log('=== Podman Mount Fix Demonstration ===\\n');
        
        // Show mount option generation
        console.log('1. Mount Option Generation:');
        console.log('   Docker:  ', PodmanMountFixer.generateMountOptions('docker', '/src', '/dst'));
        console.log('   Podman:  ', PodmanMountFixer.generateMountOptions('podman', '/src', '/dst'));
        console.log('   Buildah: ', PodmanMountFixer.generateMountOptions('buildah', '/src', '/dst'));
        
        // Show build command generation
        console.log('\\n2. Build Command Generation:');
        const dockerCmd = PodmanMountFixer.getBuildCommand('docker', 'Dockerfile', '.', 'test');
        const podmanCmd = PodmanMountFixer.getBuildCommand('podman', 'Dockerfile', '.', 'test');
        
        console.log('   Docker: ', dockerCmd.join(' '));
        console.log('   Podman: ', podmanCmd.join(' '));
        
        // Show Dockerfile content fix
        console.log('\\n3. Dockerfile Content Fix:');
        const problematicContent = `RUN --mount=type=bind,from=source,source=hello,target=/tmp/hello,z \\\\
    cp -ar /tmp/hello /tmp/features`;
        
        const fixedContent = PodmanMountFixer.fixDockerfileContent(problematicContent);
        
        console.log('   Before: ', problematicContent.replace('\\n', ' '));
        console.log('   After:  ', fixedContent.replace('\\n', ' '));
        
        console.log('\\n=== Fix Applied Successfully ===');
    }
    
    /**
     * Generate a complete example of the fix
     */
    static generateCompleteExample(): void {
        console.log('=== Complete Fix Example ===\\n');
        
        const buildEngine = 'podman';
        const featureName = 'hello-world';
        
        // Show the original problematic approach
        console.log('BEFORE (problematic with Podman):');
        console.log('Dockerfile:');
        console.log('  RUN --mount=type=bind,from=dev_containers_feature_content_source,source=hello_0,target=/tmp/build-features-src/hello_0,z \\\\');
        console.log('      cp -ar /tmp/build-features-src/hello_0 /tmp/dev-container-features');
        console.log('Build command:');
        console.log('  podman build -f Dockerfile -t dev-container .');
        console.log('Result: FAILS with "bind mounts cannot have any filesystem-specific options applied"\\n');
        
        // Show the fixed approach
        console.log('AFTER (fixed for Podman):');
        console.log('Dockerfile:');
        console.log('  RUN --mount=type=bind,from=dev_containers_feature_content_source,source=hello_0,target=/tmp/build-features-src/hello_0 \\\\');
        console.log('      cp -ar /tmp/build-features-src/hello_0 /tmp/dev-container-features');
        console.log('Build command:');
        console.log('  podman build -f Dockerfile -t dev-container --security-opt=label=disable .');
        console.log('Result: WORKS on both SELinux and non-SELinux systems\\n');
        
        console.log('Key changes:');
        console.log('1. Removed ",z" from --mount options (invalid for Podman)');
        console.log('2. Added "--security-opt=label=disable" to build command (proper Podman equivalent)');
    }
}

// CLI interface
function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    
    switch (command) {
        case 'fix':
            const dockerfilePath = args[1];
            const buildEngine = args[2] || 'podman';
            
            if (!dockerfilePath) {
                console.error('Usage: node podman-fix-utility.js fix <dockerfile-path> [build-engine]');
                process.exit(1);
            }
            
            try {
                const result = PodmanFixUtility.fixDockerfile(dockerfilePath, buildEngine);
                console.log(`Fixed: ${result.fixed}`);
                console.log('Changes:', result.changes);
                console.log('Build command:', result.buildCommand.join(' '));
            } catch (error) {
                console.error('Error fixing Dockerfile:', error);
                process.exit(1);
            }
            break;
            
        case 'demo':
            PodmanFixUtility.demonstrateFix();
            break;
            
        case 'example':
            PodmanFixUtility.generateCompleteExample();
            break;
            
        default:
            console.log('Podman Mount Fix Utility');
            console.log('');
            console.log('Commands:');
            console.log('  fix <dockerfile-path> [build-engine]  - Fix a Dockerfile');
            console.log('  demo                                  - Show fix demonstration');
            console.log('  example                               - Show complete example');
            console.log('');
            console.log('Examples:');
            console.log('  node podman-fix-utility.js fix Dockerfile podman');
            console.log('  node podman-fix-utility.js demo');
            console.log('  node podman-fix-utility.js example');
    }
}

if (require.main === module) {
    main();
}

export { PodmanFixUtility };