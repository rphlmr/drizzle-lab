const { exec } = require("node:child_process");

function afterAllResolved(lockfile) {
  exec("pnpm dlx @biomejs/biome format --write package.json");
  return lockfile;
}

module.exports = {
  hooks: {
    afterAllResolved,
  },
};
