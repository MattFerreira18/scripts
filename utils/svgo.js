#!/usr/bin/env node
//! ATTENTION script not testes yet
const { exec: execCb } = require('node:child_process');
const fs = require('fs');
const path = require('node:path');
const util = require('node:util');

const OUTPUT_DIR = 'output';

const exec = util.promisify(execCb);

function getSvgsPath() {
  return process.argv[2];
}

function getGlobalLibsInstalled() {
  return exec('npm -g list');
}

function isSvgoInstalled(installedLibsStr) {
  return /svgo@/.test(installedLibsStr);
}

async function installSvgoAsGlobal() {
  await exec('npm -g svgo@latest');
}

function createTempDir(path) {
  const dir = path.resolve(path, OUTPUT_DIR);

  fs.mkdirSync(dir);
}

async function optimizeSvgs(path) {
  const outputPath = path.resolve(path, OUTPUT_DIR);

  await exec(`svgo -f ${path} -o ${outputPath}`)
}

async function replaceOptimizedSvgs(path) {
  const outputPath = path.resolve(path, OUTPUT_DIR);

  const files = fs.readdirSync(outputPath, { withFileTypes: true });

  files.forEach(file => {
    fs.renameSync(file, path.resolve(path, file.name));
  });
}

function removeTempDir(path) {
  const dir = path.resolve(path, OUTPUT_DIR);

  fs.rmSync(dir, { recursive: true });
}

async function main() {
  const svgsPath = getSvgsPath();

  if (!svgsPath) {
    console.log('missing SVGs dir!');
    return;
  }

  const installedLibs = await getGlobalLibsInstalled();

  if (!isSvgoInstalled(installedLibs)) {
    await installSvgoAsGlobal();
  }

  createTempDir(svgsPath);
  await optimizeSvgs(svgsPath);
  await replaceOptimizedSvgs(svgsPath);
  removeTempDir(svgsPath);
}

main();

