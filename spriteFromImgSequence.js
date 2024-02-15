const im = require("imagemagick");
const fs = require('fs');
const path = require('path');
const envConfig = require('./environment.json');
const config = require('./resolve')
    .resolveConfig({
        base: path.join(__dirname, 'spritesheetConfig.json'),
        folderPath: path.join(__dirname, 'in', 'silas_1h_r_e')
    });
const { validateSpriteSheetConfig, validateEnvironmentConfig, thrower } = require('./validators');
thrower(validateEnvironmentConfig)(envConfig);

im.convert.path = envConfig.imConvertPath;
im.identify.path = envConfig.imIdentifyPath;


const {
    folderPath,
    spriteSheetPath,
    columns,
    rows,
    cellWidth,
    cellHeight
} = config;

// if the config returns a string, then there is an error. Throw the error
thrower(validateSpriteSheetConfig)(config);

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

    // Use ImageMagick to create the sprite sheet
    im.convert(parsedMontageCommand, (err, stdout) => {
        if (err) throw err;
        console.log('Sprite sheet created:', spriteSheetPath);
    });
});
