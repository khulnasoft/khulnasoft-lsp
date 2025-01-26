const path = require('path');
const glob = require('glob');

const rulesDir = path.join(__dirname, '../../lib/configs');

function getRule(fullPath) {
  const relative = path.relative(rulesDir, fullPath);
  const name = path.basename(relative, '.js');
  return {
    ...require(fullPath).meta,
    name,
    relative,
    fullPath,
  };
}

module.exports = function getRules() {
  return glob.sync(path.join(rulesDir, '**/*.js')).map(getRule);
};
