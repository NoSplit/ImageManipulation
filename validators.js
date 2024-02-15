const envConfig = require("./environment.json");
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
const validateConfig = (config, { schema, requiredKeys }) => {
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
        return `Invalid config:
            ${JSON.stringify(errors, null, 2)}
            ${JSON.stringify(config, null, 2)}`;
    }

    return false;
}

const validateSpriteSheetConfig = (config) => {
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

    return validateConfig(config, { schema, requiredKeys });
}

// pathValidator checks if the path exists and if the path is a string
const pathValidator = (value) => {
    if (typeof value !== 'string') {
        return 'Path is not a string';
    }

    if (!fs.existsSync(value)) {
        return `Path does not exist: ${value}`;
    }

    return false;
}

const validateEnvironmentConfig = (config) => {
    const schema = {
        imConvertPath: pathValidator,
        imIdentifyPath: pathValidator
    };

    const requiredKeys = {
        imConvertPath: true,
        imIdentifyPath: true
    };

    return validateConfig(config, { schema, requiredKeys });
}

const thrower = (validator) => (value) => {
    const error = validator(value);
    if (error) {
        throw new Error(error);
    }
    return value;
}

module.exports = {
    validateConfig,
    validateSpriteSheetConfig,
    validateEnvironmentConfig,
    pathValidator,
    stringTypeValidator,
    numberTypeValidator,
    typeValidator,
    thrower
}