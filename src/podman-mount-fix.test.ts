import { PodmanMountFixer, BuildOptions, generateFeatureInstallCommand } from './podman-mount-fix';

describe('PodmanMountFixer', () => {
    
    test('generateMountOptions removes z flag for Podman', () => {
        const dockerMount = PodmanMountFixer.generateMountOptions('docker', '/src', '/dst');
        const podmanMount = PodmanMountFixer.generateMountOptions('podman', '/src', '/dst');
        const buildahMount = PodmanMountFixer.generateMountOptions('buildah', '/src', '/dst');
        
        expect(dockerMount).toBe('type=bind,source=/src,target=/dst,z');
        expect(podmanMount).toBe('type=bind,source=/src,target=/dst');
        expect(buildahMount).toBe('type=bind,source=/src,target=/dst');
    });
    
    test('getBuildCommand adds security-opt for Podman', () => {
        const dockerCmd = PodmanMountFixer.getBuildCommand('docker', 'Dockerfile', '.', 'test');
        const podmanCmd = PodmanMountFixer.getBuildCommand('podman', 'Dockerfile', '.', 'test');
        
        expect(dockerCmd).toEqual(['docker', 'build', '-f', 'Dockerfile', '-t', 'test', '.']);
        expect(podmanCmd).toEqual(['podman', 'build', '-f', 'Dockerfile', '-t', 'test', '--security-opt=label=disable', '.']);
    });
    
    test('fixDockerfileContent removes z flag from mount', () => {
        const problematicDockerfile = `
FROM ubuntu:latest
RUN --mount=type=bind,from=dev_containers_feature_content_source,source=hello_0,target=/tmp/build-features-src/hello_0,z \\
    cp -ar /tmp/build-features-src/hello_0 /tmp/dev-container-features
`;
        
        const fixedDockerfile = PodmanMountFixer.fixDockerfileContent(problematicDockerfile);
        
        expect(fixedDockerfile).not.toContain(',z ');
        expect(fixedDockerfile).toContain('target=/tmp/build-features-src/hello_0 \\');
    });
    
    test('applyFix removes z flag and adds security option for Podman', () => {
        const buildOptions: BuildOptions = {
            buildEngine: 'podman',
            mountOptions: ['type=bind,source=/src,target=/dst,z'],
            securityOptions: []
        };
        
        const fixed = PodmanMountFixer.applyFix(buildOptions);
        
        expect(fixed.mountOptions).toEqual(['type=bind,source=/src,target=/dst']);
        expect(fixed.securityOptions).toEqual(['label=disable']);
    });
    
    test('applyFix preserves Docker configuration', () => {
        const buildOptions: BuildOptions = {
            buildEngine: 'docker',
            mountOptions: ['type=bind,source=/src,target=/dst,z'],
            securityOptions: []
        };
        
        const fixed = PodmanMountFixer.applyFix(buildOptions);
        
        expect(fixed).toEqual(buildOptions); // Should be unchanged
    });
    
    test('generateFeatureInstallCommand produces correct output', () => {
        const dockerResult = generateFeatureInstallCommand('docker', 'hello', '/features/hello', '/tmp/features');
        const podmanResult = generateFeatureInstallCommand('podman', 'hello', '/features/hello', '/tmp/features');
        
        expect(dockerResult.dockerfile).toContain(',z ');
        expect(podmanResult.dockerfile).not.toContain(',z');
        
        expect(dockerResult.buildArgs).not.toContain('--security-opt=label=disable');
        expect(podmanResult.buildArgs).toContain('--security-opt=label=disable');
    });
});

// Example of how the fix would be integrated into devcontainers/cli
function exampleDevContainerImplementation() {
    // This shows how the fix would be integrated into the actual devcontainers/cli codebase
    
    const buildEngine = process.env.BUILD_ENGINE || 'docker';
    const featureName = 'hello-world';
    const sourceDir = '/tmp/dev-container-features-source';
    const targetDir = '/tmp/build-features-src';
    
    // Generate the corrected command
    const { dockerfile, buildArgs } = generateFeatureInstallCommand(
        buildEngine,
        featureName,
        sourceDir,
        targetDir
    );
    
    console.log('Generated Dockerfile line:');
    console.log(dockerfile);
    console.log('\\nBuild command:');
    console.log(buildArgs.join(' '));
    
    // Before fix (problematic):
    // RUN --mount=type=bind,source=/tmp/dev-container-features-source,target=/tmp/build-features-src,z \
    //     cp -ar /tmp/build-features-src/hello-world /tmp/dev-container-features
    // podman build -f Dockerfile -t dev-container .
    
    // After fix (working):
    // RUN --mount=type=bind,source=/tmp/dev-container-features-source,target=/tmp/build-features-src \
    //     cp -ar /tmp/build-features-src/hello-world /tmp/dev-container-features  
    // podman build -f Dockerfile -t dev-container --security-opt=label=disable .
}