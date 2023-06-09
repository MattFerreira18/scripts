#!/usr/bin/env node
const { exec: execCb } = require('node:child_process');
const fs = require('fs');
const path = require('node:path');
const util = require('node:util');

const PACKAGE_JSON_FILE = 'package.json';

const exec = util.promisify(execCb);

async function getLatestPkgVersion(pkgName) {
  return (await exec(`npm view ${pkgName} version`)).stdout.replace('\n', '');
}

function getPackageJson() {
  const filepath = path.resolve(process.cwd(), PACKAGE_JSON_FILE);
  const packageJsonBuffer = fs.readFileSync(filepath);
  const result = JSON.parse(packageJsonBuffer.toString());

  return result;
}

function removeVersionDecorations(version) {
  return findLastItem(version.split(/\^|\~/));
}

function isVersionPinned(version) {
  return !version.includes('^');
}

function splitSemVer(version) {
  const [major, minor, patch] = version.split('.');

  return {
    major: Number(major),
    minor: Number(minor),
    patch: Number(patch),
  };
}

function convertToSemVer(version) {
  return Object.values(version).join('.');
}

function findLastItem(arr) {
  return arr.at(-1);
}

function getDeps(json) {
  const { dependencies } = json;

  return Object.entries(dependencies).map(([pkg, version]) => ({
    name: pkg,
    installedVersion: splitSemVer(removeVersionDecorations(version)),
    isPinned: isVersionPinned(version),
  }));
}

function getDevDeps(json) {
  const { devDependencies } = json;

  return Object.entries(devDependencies).map(([pkg, version]) => ({
    name: pkg,
    installedVersion: splitSemVer(removeVersionDecorations(version)),
    isPinned: isVersionPinned(version),
  }));
}

async function insertLatestVersionOfPkgs(deps) {
  const result = [];

  for (const dep of deps) {
    const latestVersion = splitSemVer(await getLatestPkgVersion(dep.name));

    result.push({
      ...dep,
      latestVersion,
    });
  }

  return result;
}

function removePinnedPkgs(pkgs) {
  return pkgs.filter((pkg) => !pkg.isPinned);
}

function isOutOfTheDate(installed, latest) {
  return (
    latest.major > installed.major ||
    latest.minor > installed.minor ||
    latest.patch > installed.patch
  );
}

function getBumpType(installed, latest) {
  if (latest.major > installed.major) {
    return 'major';
  }

  if (latest.minor > installed.minor) {
    return 'minor';
  }

  if (latest.patch > installed.patch) {
    return 'patch';
  }

  return null;
}

function getOutOfTheDatePkgs(pkgs) {
  return pkgs
    .map((pkg) => {
      const { name, installedVersion, latestVersion } = pkg;

      if (!isOutOfTheDate(installedVersion, latestVersion)) {
        return null;
      }

      return {
        bumpType: getBumpType(installedVersion, latestVersion),
        installed: convertToSemVer(installedVersion),
        latest: convertToSemVer(latestVersion),
        name,
      };
    })
    .filter((pkg) => !!pkg);
}

function showOutTheDatePkgs(pkgs) {
  const { deps, devDeps } = pkgs;

  const tableItems = [...deps, ...devDeps].map(({
    name,
    installed,
    latest,
    bumpType,
  }) => ({
    name,
    installed,
    latest,
    bumpType
  }));

  console.table(tableItems);
}

async function main() {
  const packageJson = getPackageJson();
  const deps = removePinnedPkgs(getDeps(packageJson));
  const devDeps = removePinnedPkgs(getDevDeps(packageJson));


  const depsWithLatestVersion = await insertLatestVersionOfPkgs(deps);
  const devDepsWithLatestVersion = await insertLatestVersionOfPkgs(devDeps);

  const outOfTheDateDeps = getOutOfTheDatePkgs(depsWithLatestVersion);
  const outOfTheDateDevDeps = getOutOfTheDatePkgs(devDepsWithLatestVersion);

  showOutTheDatePkgs({
    deps: outOfTheDateDeps,
    devDeps: outOfTheDateDevDeps,
  });
}

main();
