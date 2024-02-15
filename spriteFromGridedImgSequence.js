const im = require("imagemagick");
const fs = require('fs');
const path = require('path');

im.convert.path = `C:\\\Program Files\\ImageMagick-7.1.1-Q16-HDRI\\magick.exe`;
im.identify.path = `C:\\Program Files\\ImageMagick-7.1.1-Q16-HDRI\\magick.exe`;

// Configuration for the source images
const folderPath = './in/waveless'; // Folder containing images
const gridRows = 2; // Rows in each image's grid
const gridColumns = 2; // Columns in each image's grid

// Configuration for the sprite sheet
const spriteSheetBasePath = './out/waveless'; // Base path for output sprite sheets
const cellWidth = 32; // Width of each cell in the sprite sheet
const cellHeight = 32; // Height of each cell in the sprite sheet
const spriteSheetColumns = 12; // Number of columns in the sprite sheet
const spriteSheetRows = 2; // Number of rows in the sprite sheet

fs.readdir(folderPath, (err, files) => {
    if (err) throw err;

    const imageFiles = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));

    // Process each cell
    for (let row = 0; row < gridRows; row++) {
        for (let col = 0; col < gridColumns; col++) {
            let montageCommand = 'montage -background none';
            imageFiles.forEach(file => {
                const filePath = path.join(folderPath, file);
                const cropGeometry = `${cellWidth}x${cellHeight}+${col * cellWidth}+${row * cellHeight}`;
                montageCommand += ` ${filePath}[${cropGeometry}]`;
            });

            const spriteSheetPath = `${spriteSheetBasePath}_cell_${row * gridColumns + col + 1}.png`;
            montageCommand += ` -tile ${spriteSheetColumns}x${spriteSheetRows}`;
            montageCommand += ` -geometry ${cellWidth}x${cellHeight}+0+0`;
            montageCommand += ` ${spriteSheetPath}`;

            // Use ImageMagick to create the sprite sheet
            im.convert(montageCommand.split(' '), (err, stdout) => {
                if (err) throw err;
                console.log('Sprite sheet created:', spriteSheetPath);
            });
        }
    }
});
