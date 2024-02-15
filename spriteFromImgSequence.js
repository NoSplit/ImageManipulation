const im = require("imagemagick");
const fs = require('fs');
const path = require('path');
const envConfig = require('./environment.json');

im.convert.path = envConfig.imConvertPath;
im.identify.path = envConfig.imIdentifyPath;

const validateEnvironmentConfig = (config) => {
    if (!config.imConvertPath || !config.imIdentifyPath) {
        throw new Error('Invalid environment config');
    }
}

validateEnvironmentConfig(envConfig);

const config = require('./resolve')
    .resolveConfig({
        base: path.join(__dirname, 'spritesheetConfig.json'),
        folderPath: path.join(__dirname, 'in', 'silas_1h_r_e')
    });

// Configuration
// const name = 'silas_1h_r_e';
// const folderPath = `./in/shadows/${name}/skewed_shadows`; // Folder containing images
// const spriteSheetPath = `./out/shadows/${name}.png`; // Output sprite sheet file
const {
    folderPath,
    spriteSheetPath,
    columns,
    rows,
    cellWidth,
    cellHeight
} = config;

const CONFIG_KEYS = {
    FOLDER_PATH: "folderPath",
    SPRITE_SHEET_PATH: "spriteSheetPath",
    COLUMNS: "columns",
    ROWS: "rows",
    CELL_WIDTH: "cellWidth",
    CELL_HEIGHT: "cellHeight"
};

// returns string if an error, otherwise false
const typeValidator = (value, type) => {
    if (typeof value !== type) {
        return `Expected ${type}, got ${typeof value}`;
    }
    return false;
}

const stringTypeValidator = (value) => typeValidator(value, 'string');
const numberTypeValidator = (value) => typeValidator(value, 'number');
const validateConfig = (config) => {
    const {
        FOLDER_PATH,
        SPRITE_SHEET_PATH,
        COLUMNS,
        ROWS,
        CELL_WIDTH,
        CELL_HEIGHT
    } = CONFIG_KEYS;
    const schema = {
        [FOLDER_PATH]: stringTypeValidator,
        [SPRITE_SHEET_PATH]: stringTypeValidator,
        [COLUMNS]: numberTypeValidator,
        [ROWS]: numberTypeValidator,
        [CELL_WIDTH]: numberTypeValidator,
        [CELL_HEIGHT]: numberTypeValidator,
    };
    const requiredKeys = {
        [FOLDER_PATH]: true,
        [SPRITE_SHEET_PATH]: true,
        [COLUMNS]: true,
        [ROWS]: true,
        [CELL_WIDTH]: true,
        [CELL_HEIGHT]: true
    };

    const missingKeys = Object.keys(requiredKeys).filter(key => !config[key]);

    const typeErrors = Object.keys(schema).reduce((errors, key) => {
        const error = schema[key](config[key]);
        if (error) {
            errors[key] = error;
        }
        return errors;
    }, {});

    const errors = {
        ...typeErrors,
        ...missingKeys.reduce((errors, key) => {
            errors[key] = 'Missing required key';
            return errors;
        }, {})
    };

    if (Object.keys(errors).length) {
        throw new Error(`Invalid config: ${JSON.stringify(errors, null, 2)}
        ${JSON.stringify(config, null, 2)}`);
    }
}

validateConfig(config);

// Read files from the folder
fs.readdir(folderPath, (err, files) => {
    if (err) throw err;

    const imageFiles = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
    let montageCommand = 'montage -background none';

    imageFiles.forEach(file => {
        montageCommand += ` ${path.join(folderPath, file)}`;
    });

    montageCommand += ` -tile ${columns}x${rows}`;
    montageCommand += ` -geometry ${cellWidth}x${cellHeight}+0+0`;
    montageCommand += ` ${spriteSheetPath}`;

    const parsedMontageCommand = montageCommand.split(' ');

    if(parsedMontageCommand === undefined) {
        throw new Error('Invalid montage command');
    }

    console.log('parsedMontageCommand:', parsedMontageCommand);

    // Use ImageMagick to create the sprite sheet
    im.convert(parsedMontageCommand, (err, stdout) => {
        if (err) throw err;
        console.log('Sprite sheet created:', spriteSheetPath);
    });
});
