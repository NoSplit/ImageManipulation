const fs = require('fs').promises;
const path = require('path');
const im = require('imagemagick');

// Update these paths based on your ImageMagick installation
im.convert.path = `C:\\Program Files\\ImageMagick-7.1.1-Q16-HDRI\\magick.exe`;
im.identify.path = `C:\\Program Files\\ImageMagick-7.1.1-Q16-HDRI\\magick.exe`;
const name = 'silas_1h_r_e'
const directoryPath = path.join(__dirname, 'in', name); // Directory containing images
const outPath = path.join(__dirname, 'in', 'shadows', name);

// Function to ensure directory exists
const ensureDirExists = async (dirPath) => {
    try {
        await fs.access(dirPath);
    } catch (error) {
        await fs.mkdir(dirPath, { recursive: true });
        console.log(`Directory created: ${dirPath}`);
    }
};

const getImageSize = async (imagePath) => {
    return new Promise((resolve, reject) => {
        im.identify(['identify', '-format', '%wx%h', imagePath], (err, size) => {
            if (err) {
                reject(`Error getting image size: ${err}`);
            } else {
                const [width, height] = size.split('x').map(Number);
                resolve({ width, height });
            }
        });
    });
};

const flipShadow = (shadowPathInitial) => new Promise((resolve, reject) => {
    const shadowPath = shadowPathInitial;
    im.convert([shadowPathInitial, '-flip', shadowPath], function(err) {
        if (err) {
            reject(`Error flipping shadow: ${err}`);
        } else {
            console.log(`Flipped shadow generated at ${shadowPath}`);
            resolve(shadowPath);
        }
    });
});

const taperShadow = async ({ sourceImagePath, outputPath, flip = false }) => {
    const taperedShadowPath = outputPath;
    const fxValue = !flip ? 'j/h' : '1-j/h'; // Decide FX based on flip value

    try {
        return new Promise((resolve, reject) => {
            im.convert([
                sourceImagePath,
                '-write', 'MPR:orig',
                '-alpha', 'extract',
                '(',
                '+clone',
                '-colorspace', 'gray',
                '-fx', fxValue, // Use the FX value decided earlier
                ')',
                '-compose', 'multiply',
                '-composite',
                'MPR:orig',
                '+swap',
                '-compose', 'CopyOpacity',
                '-composite',
                taperedShadowPath
            ], function(err) {
                if (err) {
                    console.log(`Error applying gradient mask: ${err}`);
                    reject(err);
                    return;
                }
                resolve(taperedShadowPath);
            });
        });
    } catch (err) {
        throw new Error(`Failed to taper shadow: ${err}`);
    }
};

// Function to create a shadow, apply taper and gradient, and then skew it
const createShadowAndSkew = async (sourceImagePath) => {
    const fileName = path.basename(sourceImagePath, path.extname(sourceImagePath));
    const shadowDir = path.join(outPath, 'shadows');
    const taperedShadowDir = path.join(outPath, 'tapered_shadows');
    const skewedShadowDir = path.join(outPath, 'skewed_shadows');

    // Ensure directories exist
    await ensureDirExists(shadowDir);
    await ensureDirExists(taperedShadowDir);
    await ensureDirExists(skewedShadowDir);

    const shadowPath = path.join(shadowDir, `${fileName}_shadow.png`);
    const taperedShadowPath = path.join(taperedShadowDir, `${fileName}_tapered_shadow.png`);
    const skewedShadowPath = path.join(skewedShadowDir, `${fileName}_skewed_shadow.png`);

    // Create shadow
    await new Promise((resolve, reject) => {
        im.convert([sourceImagePath, '-fill', 'black', '-colorize', '100%', shadowPath], (err) => {
            if (err) {
                console.log(`Error creating shadow for ${sourceImagePath}: ${err}`);
                reject(err);
            } else {
                console.log(`Shadow created at ${shadowPath}`);
                resolve(shadowPath);
            }
        });
    });

    // flip shadow
    await flipShadow(shadowPath);

    const { width, height } = getImageSize(sourceImagePath);

    // Taper and apply gradient to shadow
    await taperShadow({sourceImagePath: shadowPath, outputPath: taperedShadowPath, flip: true});

    // Skew shadow
    const skewAmount = -20;
    await new Promise((resolve, reject) => {
        im.convert([
            taperedShadowPath,
            '-background', 'transparent',
            '-shear', `${skewAmount}x0`,
            '-geometry', 'x20%',
            skewedShadowPath
        ], function(err) {
            if (err) {
                console.log(`Error skewing shadow: ${err}`);
                reject(err);
                return;
            }
            resolve(skewedShadowPath);
        });
    });
};

// Function to process all images in a directory
const processDirectory = async (directoryPath) => {
    try {
        const files = await fs.readdir(directoryPath);
        for (const file of files) {
            const sourceImagePath = path.join(directoryPath, file);
            const stats = await fs.stat(sourceImagePath);
            if (stats.isFile() && /\.(jpg|jpeg|png|gif)$/i.test(file)) { // Check if file is an image
                await createShadowAndSkew(sourceImagePath);
            }
        }
        console.log('Finished processing directory.');
    } catch (err) {
        console.error(`Error processing directory ${directoryPath}:`, err);
    }
};

processDirectory(directoryPath);
