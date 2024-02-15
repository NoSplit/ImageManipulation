const fs = require('fs');
const im = require('imagemagick');
const path = require('path');
const util = require('util');

im.convert.path = `C:\\Program Files\\ImageMagick-7.1.1-Q16-HDRI\\magick.exe`;
im.identify.path = `C:\\Program Files\\ImageMagick-7.1.1-Q16-HDRI\\magick.exe`;

// Promisify fs and ImageMagick functions for easier asynchronous handling
const readdir = util.promisify(fs.readdir);
const identify = util.promisify(im.identify);
const convert = util.promisify(im.convert);

// Configuration
const folderPath = './level_props'; // Folder containing images
const spriteSheetPath = './level_props.png'; // Output sprite sheet file

async function createSpriteSheet() {
    try {
        const files = await readdir(folderPath);
        const imageFiles = files.filter(file => /\.(png|gif|jpg|jpeg)$/i.test(file));

        let montageCommand = 'montage -background none -tile x1 -geometry +0+0';
        for (const file of imageFiles) {
            const filePath = path.join(folderPath, file);
            const imageSize = await identify(['identify', filePath]);
            montageCommand += ` "${filePath}[${imageSize.width}x${imageSize.height}]"`;
        }

        montageCommand += ` "${spriteSheetPath}"`;
        console.log(montageCommand);

        // Use ImageMagick to create the sprite sheet
        await convert(montageCommand.split(' '));
        console.log('Sprite sheet created:', spriteSheetPath);
    } catch (err) {
        console.error('Error creating sprite sheet:', err);
    }
}

createSpriteSheet();
