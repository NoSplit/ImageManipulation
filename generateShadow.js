const im = require('imagemagick');
const path = require('path');

// Explicitly specify the paths if needed
im.convert.path = `C:\\\Program Files\\ImageMagick-7.1.1-Q16-HDRI\\magick.exe`;
im.identify.path = `C:\\Program Files\\ImageMagick-7.1.1-Q16-HDRI\\magick.exe`;


const createShadow = (sourceImagePath, callback) => {
    const shadowPathInitial = path.join(__dirname, 'shadow.png');

    // Convert the entire image to black while preserving its alpha channel
    im.convert([sourceImagePath, '-fill', 'black', '-colorize', '100%', shadowPathInitial], function(err) {
        if (err) {
            console.log(`Error creating shadow: ${err}`);
            callback(err);
            return;
        }
        console.log(`Initial shadow generated at ${shadowPathInitial}`);
        callback(null, shadowPathInitial);
    });
};

function getImageSize(imagePath, callback) {
    im.identify(['identify', '-format', '%wx%h', imagePath], function(err, size) {
        if (err) {
            console.error(`Error getting image size: ${err}`);
            console.log(imagePath);
            return callback(err);
        }

        const [width, height] = size.split('x').map(Number);
        console.log(size);
        callback(null, { width, height });
    });
}

const flipShadow = (shadowPathInitial, callback) => {
    const shadowPath = path.join(__dirname, 'shadow_flipped.png');

    im.convert([shadowPathInitial, '-flip', shadowPath], function(err) {
        if (err) {
            console.log(`Error flipping shadow: ${err}`);
            callback(err);
            return;
        }
        console.log(`Flipped shadow generated at ${shadowPath}`);
        callback(null, shadowPath);
    });
};

function getCanvasSize(shadowSize, spriteSize) {
    const width = Math.max(shadowSize.width, spriteSize.width);
    const height = shadowSize.height + spriteSize.height;
    return { width, height };
}
function compositeShadowAndImage(shadowPath, imagePath, verticalOffset, degree, callback) {
    getImageSize(shadowPath, (err, shadowSize) => {
        if (err) return callback(err);

        getImageSize(imagePath, (err, spriteSize) => {
            if (err) return callback(err);

            const canvasSize = getCanvasSize(shadowSize, spriteSize);
            compositeImages(shadowPath, imagePath, canvasSize, shadowSize, verticalOffset, degree, callback);
        });
    });
}

function compositeImages(shadowPath, imagePath, canvasSize, shadowSize, verticalOffset, degree, callback) {
    const outputPath = path.join(__dirname, 'final_output.png');

    if (degree >= 0 && degree <= 180) { // light from the top
        im.convert([
            '-size', `${canvasSize.width}x${canvasSize.height}`, 'xc:transparent',
            shadowPath, '-geometry', `+0+${canvasSize.height - shadowSize.height - verticalOffset}`, '-composite',  // Position shadow below
            imagePath, '-geometry', '+0+0', '-composite',  // Overlay sprite at the top of the canvas
            outputPath
        ], function(err) {
            if (err) {
                console.log(`Error creating final output: ${err}`);
                callback(err);
                return;
            }
            callback(null, outputPath);
        });
    } else { // light from the bottom
        const overlapAmount = verticalOffset / 2; // Adjust as needed to achieve the desired overlap effect
        im.convert([
            '-size', `${canvasSize.width}x${canvasSize.height}`, 'xc:transparent',
            shadowPath, '-geometry', `+0+0`, '-composite',  // Position shadow at the top of the canvas
            imagePath, '-geometry', `+0+0`, '-composite',  // Overlay the sprite overlapping part of the shadow
            outputPath
        ], function(err) {
            if (err) {
                console.log(`Error creating final output: ${err}`);
                callback(err);
                return;
            }
            callback(null, outputPath);
        });
    }
}



const createGradientMask = (height, callback) => {
    const maskPath = path.join(__dirname, 'gradient_mask.png');
    im.convert([
        '-size', `1x${height}`,
        'gradient:',
        maskPath
    ], function(err) {
        if (err) {
            console.log(`Error creating gradient mask: ${err}`);
            callback(err);
            return;
        }
        callback(null, maskPath);
    });
};

const taperShadow = (sourceImagePath, height, callback) => {
    const taperedShadowPath = path.join(__dirname, 'tapered_shadow.png');

    createGradientMask(height, (err, maskPath) => {
        if (err) {
            return callback(err);
        }

        im.convert([
            sourceImagePath,
            '-write', 'MPR:orig',
            '-alpha', 'extract',
            '(',
            '+clone',
            '-colorspace', 'gray',
            '-fx', '1-j/h',
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
                callback(err);
                return;
            }
            callback(null, taperedShadowPath);
        });
    });
};


const skewShadow = (sourceImagePath, degree, height, callback) => {
    const skewedShadowPath = path.join(__dirname, 'skewed_shadow.png');
    // const MAX_SKEW = 100; // or whatever maximum skew you're comfortable with
    // let skewAmount = h * Math.tan(degree * (Math.PI / 180));
    //
    // // Clamping the skew
    // if (skewAmount > MAX_SKEW) {
    //     skewAmount = MAX_SKEW;
    // } else if (skewAmount < -MAX_SKEW) {
    //     skewAmount = -MAX_SKEW;
    // }

    const MAX_SKEW = 100;

    // Adjust the degree based on your new definitions
    const adjustedDegree = (360 - (degree + 90)) % 360;

    let skewAmount;
    if (adjustedDegree === 90 || adjustedDegree === 270) {
        skewAmount = 0;
    } else {
        skewAmount = height * Math.tan(adjustedDegree * (Math.PI / 180));
    }

    // Clamping the skew
    skewAmount = Math.max(Math.min(skewAmount, MAX_SKEW), -MAX_SKEW);

    im.convert([
        sourceImagePath,
        '-background', 'transparent', // Ensure the background remains transparent during skewing
        '-shear', `${skewAmount}x0`,
        skewedShadowPath
    ], function(err) {
        if (err) {
            console.log(`Error skewing shadow: ${err}`);
            callback(err);
            return;
        }
        callback(null, skewedShadowPath);
    });
};

const placeShadow = (sourceImagePath, degree = 0, distance = 'sunlight') => {
    const outputImagePath = path.join(__dirname, 'output.png');
    const verticalOffset = 0.5 * (1 - Math.cos(degree * (Math.PI / 180)));

    getImageSize(sourceImagePath, (err, dimensions) => {
        if (err) {
            console.log("Error getting image dimensions:", err);
            return;
        }

        const spriteHeight = dimensions.height;

        createShadow(sourceImagePath, (err, shadowPathInitial) => {
            if (err) return;

            const processShadow = (pathToProcess, callback) => {
                // Then taper the shadow
                taperShadow(pathToProcess, spriteHeight, (err, taperedShadowPath) => {
                    if (err) {
                        console.log(err);
                        return;
                    }

                    // Then skew the tapered shadow
                    skewShadow(taperedShadowPath, degree, spriteHeight, (err, skewedShadowPath) => {
                        if (err) return;

                        compositeShadowAndImage(skewedShadowPath, sourceImagePath, verticalOffset, degree, (err, result) => {
                            if (err) return;
                            console.log(`Final result available at ${result}`);
                            callback(null);
                        });
                    });
                });
            };

            if (degree >= 0 && degree <= 180) {
                flipShadow(shadowPathInitial, (err, flippedShadowPath) => {
                    if (err) {
                        console.log(err);
                        return;
                    }
                    processShadow(flippedShadowPath, (err) => {
                        if (err) {
                            console.log("Error in shadow processing:", err);
                        }
                    });
                });
            } else {
                processShadow(shadowPathInitial, (err) => {
                    if (err) {
                        console.log("Error in shadow processing:", err);
                    }
                });
            }
        });
    });
};


const sourceImagePath = path.join(__dirname, 'sprite.png');

// 30 degrees is the source of the light (bottom-right)
placeShadow(sourceImagePath, 30);
