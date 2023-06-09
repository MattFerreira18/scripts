#!/usr/bin/env node
/**
 * - To insert script in crontab, see https://medium.com/@gattermeier/cronjobs-for-your-node-js-apps-on-macos-20d129b42c0e
 */
const fs = require("node:fs");
const path = require("node:path");

const PROJECTS_ENTRYPOINT = path.resolve(__dirname, '..', '..');
const NODE_MODULES_DIRNAME = 'node_modules';

function getDirsFromPath(dirpath) {
  return fs
    .readdirSync(dirpath, { withFileTypes: true })
    .filter(dir => dir.isDirectory())
    .map(dir => dir.name);
}

function getMaxLastModifiedDateTime() {
  const currentDateTime = new Date();
  const currentYear = currentDateTime.getFullYear();
  const currentMonth = currentDateTime.getMonth();
  const currentDay = currentDateTime.getDay();

  const year = currentMonth < 3 ? currentYear - 1 : currentYear;
  const monthOfThreeMonthsAgo = currentMonth - 3 >= 1
    ? currentMonth - 3
    : 12 - ((currentMonth - 3) * -1);
  const day = currentDay;

  return new Date(`${year}-${monthOfThreeMonthsAgo}-${day}`);
}

function shouldNodeModulesDirBeRemoved(dir) {
  const lastModifiedDateTime = fs.statSync(dir).mtime;
  const currentDateTime = new Date();
  const maxLastModifiedDateTime = getMaxLastModifiedDateTime();
  const diff = lastModifiedDateTime.getTime() - currentDateTime.getTime();

  // return `true` when last modified is higher or equal than 3 months
  return diff >= maxLastModifiedDateTime.getTime();
}

function hasNodeModulesDir(dirs) {
  return dirs.includes(NODE_MODULES_DIRNAME);
}

function removeDir(dirpath) {
  fs.rmSync(dirpath, { recursive: true });
}

function main(dir = PROJECTS_ENTRYPOINT) {
  const dirs = getDirsFromPath(dir);

  if (dirs.length === 0) {
    return;
  }

  if (hasNodeModulesDir(dirs)) {
    const dirpath = path.resolve(dir, NODE_MODULES_DIRNAME);

    if (shouldNodeModulesDirBeRemoved(dirpath)) {
      removeDir(dirpath);
    }

    return;
  }

  dirs.forEach(dirChild => {
    main(path.resolve(dir, dirChild));
  });
}

main();
