const fs = require('fs');
const im = require('imagemagick');
const path = require('path');
const util = require('util');

im.convert.path = `C:\\\Program Files\\ImageMagick-7.1.1-Q16-HDRI\\magick.exe`;
im.identify.path = `C:\\Program Files\\ImageMagick-7.1.1-Q16-HDRI\\magick.exe`;

// Configuration
const folderPath = './in/debris'; // Folder containing images
const outputPath = './out/debris'; // Folder to save cropped images
const cropWidth = 32; // Width of the crop area
const cropHeight = 32; // Height of the crop area
const centerX = 112; // X-coordinate of the center point for the crop
const centerY = 144; // Y-coordinate of the center point for the crop

// Promisify fs and ImageMagick functions
const readdir = util.promisify(fs.readdir);
const convert = util.promisify(im.convert);

// Ensure output directory exists
if (!fs.existsSync(outputPath)){
    fs.mkdirSync(outputPath);
}

async function cropImages() {
    try {
        const files = await readdir(folderPath);
        const imageFiles = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));

        for (const file of imageFiles) {
            const filePath = path.join(folderPath, file);
            const outputFilePath = path.join(outputPath, file);
            const cropOptions = `${cropWidth}x${cropHeight}+${centerX - cropWidth / 2}+${centerY - cropHeight / 2}`;

            await convert([filePath, '-crop', cropOptions, outputFilePath]);
            console.log(`Cropped image saved: ${outputFilePath}`);
        }
    } catch (err) {
        console.error('Error cropping images:', err);
    }
}

cropImages();
