import * as esbuild from 'esbuild';

function createBuildSettings() {
  return {
    entryPoints: ['src/index.ts'],
    outfile: 'dist/index.cjs',
    bundle: true,
    minify: true,
    platform: 'node',
    target: 'node24',
  };
}

const settings = createBuildSettings();

esbuild.build(settings);
