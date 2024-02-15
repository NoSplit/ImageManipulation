// get the config from target path if it exists otherwise use the default config in root

const fs = require('fs');
const path = require('path');

// returns the config from the folder if it exists, otherwise returns the base config
const resolveConfig = ({ base, folderPath }) => {
    let configPath = base;
    const folderConfigPath = path.join(folderPath, 'spritesheetConfig.json');

    if (fs.existsSync(folderConfigPath)) {
        configPath = folderConfigPath;
    }

    // fail if no config exists
    if (!fs.existsSync(configPath)) {
        throw new Error(`No config found at ${configPath}`);
    }

    return require(configPath);
}

module.exports = {
    resolveConfig
}
