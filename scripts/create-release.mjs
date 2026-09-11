import { cp, mkdir, readFile, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { mkdtemp } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const projectRoot = resolve(import.meta.dirname, '..');
const packageJson = JSON.parse(
    await readFile(join(projectRoot, 'package.json'), 'utf8')
);
const archiveName = `${packageJson.name}-${packageJson.version}.tar.gz`;
const releaseDirectory = join(projectRoot, 'release');
const archivePath = join(releaseDirectory, archiveName);
const stagingRoot = await mkdtemp(join(tmpdir(), 'cad-discord-release-'));
const releaseRoot = join(stagingRoot, `${packageJson.name}-${packageJson.version}`);

await mkdir(releaseRoot, { recursive: true });

for (const file of [
    'package.json',
    'package-lock.json',
    '.env.example',
    'README.md'
]) {
    await cp(join(projectRoot, file), join(releaseRoot, file));
}

await cp(join(projectRoot, 'dist'), join(releaseRoot, 'dist'), {
    recursive: true
});

await mkdir(releaseDirectory, { recursive: true });
await rm(archivePath, { force: true });

execFileSync('tar', [
    '-czf',
    archivePath,
    '-C',
    stagingRoot,
    `${packageJson.name}-${packageJson.version}`
], { stdio: 'inherit' });

console.log(`Created ${archivePath}`);
