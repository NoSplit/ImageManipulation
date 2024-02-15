const {join} = require('path');
const im = require('imagemagick');
// Explicitly specify the paths if needed
im.convert.path = `C:\\\Program Files\\ImageMagick-7.1.1-Q16-HDRI\\magick.exe`;
im.identify.path = `C:\\Program Files\\ImageMagick-7.1.1-Q16-HDRI\\magick.exe`;

const MAX_SKEW = 100;
const withCallback = (fn) => (arg, cb) => fn(arg).then(res => cb(null, res)).catch(cb);

const createShadow = async (sourceImagePath) => {
    const shadowPathInitial = join(__dirname, 'shadow.png');
    return new Promise((resolve, reject) => {
        im.convert([sourceImagePath, '-fill', 'black', '-colorize', '100%', shadowPathInitial], (err) => {
            if (err) {
                reject(`Error creating shadow: ${err}`);
            } else {
                console.log(`Initial shadow generated at ${shadowPathInitial}`);
                resolve(shadowPathInitial);
            }
        });
    });
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
    const shadowPath = join(__dirname, 'shadow_flipped.png');
    im.convert([shadowPathInitial, '-flip', shadowPath], function(err) {
        if (err) {
            reject(`Error flipping shadow: ${err}`);
        } else {
            console.log(`Flipped shadow generated at ${shadowPath}`);
            resolve(shadowPath);
        }
    });
});

// Return the maximum canvas size needed for both the shadow and sprite.
const getCanvasSize = ({ shadowSize, spriteSize }) => {
    const width = Math.max(shadowSize.width, spriteSize.width);
    const height = shadowSize.height + spriteSize.height;
    return { width, height };
}

// Generates an output path for the final composite image.
const createOutputPath = () => join(__dirname, 'final_output.png');

// Determine the light direction based on the degree.
const determineLightDirection = (degree) => (degree >= 0 && degree <= 180) ? 'top' : 'bottom';
const getWidthDifference = ([{ width: widthA}, { width: widthB }]) => widthA - widthB;
// Create a composite image with the shadow placed based on top light direction.
const compositeTopLight = async ({ shadowPath, imagePath, canvasSize, shadowSize, spriteSize, verticalOffset, horizontalOffset }) => {
    // const spriteCenterVertical = (canvasSize.height - spriteSize.height) / 2;
    // const shadowPosition = `+${horizontalOffset}+${spriteCenterVertical - shadowSize.height - verticalOffset}`;
    // const imagePathPosition = `+${horizontalOffset}+${spriteCenterVertical}`;
    const shadowPosition = `+0+${canvasSize.height - shadowSize.height - verticalOffset}`;
    const imagePathPosition = `+0+0`;

    return await compositeImage({
        shadowPath,
        imagePath,
        shadowPosition,
        imagePathPosition,
        canvasSize
    });
}

const compositeBottomLight = async ({ shadowPath, imagePath, canvasSize, shadowSize, spriteSize, verticalOffset, horizontalOffset }) => {
    // const spriteCenterVertical = (canvasSize.height - spriteSize.height) / 2;
    // const shadowPosition = `+${horizontalOffset}+${spriteCenterVertical + spriteSize.height + verticalOffset}`;
    // const imagePathPosition = `+${horizontalOffset}+${spriteCenterVertical}`;
    const shadowPosition = `+0+0`;
    const imagePathPosition = `+0+0`;

    return await compositeImage({
        shadowPath,
        imagePath,
        shadowPosition,
        imagePathPosition,
        canvasSize
    });
}

const compositeImage = async ({ shadowPath, imagePath, shadowPosition, imagePathPosition, canvasSize }) => {
    return new Promise((resolve, reject) => {
        const outputPath = createOutputPath();
        im.convert([
            '-size', `${canvasSize.width}x${canvasSize.height}`, 'xc:transparent',
            shadowPath, '-geometry', shadowPosition, '-composite',
            imagePath, '-geometry', imagePathPosition, '-composite',
            outputPath
        ], (err) => {
            if (err) {
                console.log(`Error creating final output: ${err}`);
                reject(err);
            } else resolve(outputPath);
        });
    });
}


const compositeImages = async (params) => {
    const direction = determineLightDirection(params.degree);
    return direction === 'top' ? await compositeTopLight(params) : await compositeBottomLight(params);
}

async function compositeShadowAndImage({ shadowPath, imagePath, verticalOffset, degree }) {
    try {
        const shadowSize = await getImageSize(shadowPath);
        const spriteSize = await getImageSize(imagePath);
        const canvasSize = getCanvasSize({ shadowSize, spriteSize });

        const widthDifference = getWidthDifference([shadowSize, spriteSize]);
        const horizontalOffset = (degree > 0 && degree <= 180) ? -widthDifference : widthDifference;

        const result = await compositeImages({
            shadowPath,
            imagePath,
            canvasSize,
            shadowSize,
            spriteSize,
            verticalOffset,
            degree,
            horizontalOffset
        });

        return result;

    } catch (error) {
        throw new Error(`Failed to composite shadow and image: ${error}`);
    }
}

const createGradientMask = async ({ height, flip = false }) => {
    const maskPath = join(__dirname, 'gradient_mask.png');
    const gradientType = flip ? 'gradient:white-black' : 'gradient:';

    return new Promise((resolve, reject) => {
        const command = [
            '-size', `1x${height}`,
            gradientType,
            maskPath
        ];

        im.convert(command, function(err) {
            if (err) {
                console.log(`Error creating gradient mask: ${err}`);
                reject(err);
                return;
            }
            resolve(maskPath);
        });
    });
};


const taperShadow = async ({ sourceImagePath, height, flip = false }) => {
    const taperedShadowPath = join(__dirname, 'tapered_shadow.png');
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


const getSkewAmount = (degree) => {
    // Normalize the angle, flip if it comes from the bottom
    const normalizedDegree = degree >= 180 ? 360 - degree : degree;

    // Check for invalid input
    if (normalizedDegree > 180 || normalizedDegree < 0) {
        throw new Error("Invalid angle input");
    }

    // Initialize skew as zero; we'll set it in the logic below
    let skew = 0;

    switch (normalizedDegree) {
        case 0:
            skew = MAX_SKEW;
            break;
        case 45:
            skew = degree === 45 ? -45 : 45;
            break;
        case 90:
            skew = 0;
            break;
        case 135:
            skew = degree === 135 ? 45 : -45;
            break;
        case 180:
            skew = -MAX_SKEW;
            break;
        default:
            throw new Error("Unhandled angle input");
    }

    // Return calculated skew
    return skew;
};


const skewShadow = async ({ sourceImagePath, degree, height }) => {
    const skewedShadowPath = join(__dirname, 'skewed_shadow.png');
    // const MAX_SKEW = 100;
    //
    // // Adjust the degree based on your new definitions
    // const adjustedDegree = (360 - (degree + 90)) % 360;
    //
    // let skewAmount;
    // if (adjustedDegree === 90 || adjustedDegree === 270) {
    //     skewAmount = 0;
    // } else {
    //     skewAmount = height * Math.tan(adjustedDegree * (Math.PI / 180));
    // }
    //
    // // Clamping the skew
    // skewAmount = Math.max(Math.min(skewAmount, MAX_SKEW), -MAX_SKEW);
    // const skewAmount = getSkewAmount(degree);
    const skewAmount = -20;

    return new Promise((resolve, reject) => {
        im.convert([
            sourceImagePath,
            '-background', 'transparent',
            '-shear', `${skewAmount}x0`,
            '-geometry', 'x35%',
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


const placeShadow = async (sourceImagePath, degree = 0, distance = 'sunlight') => {
    try {
        const outputImagePath = join(__dirname, 'output.png');
        const verticalOffset = 0.5 * (1 - Math.cos(degree * (Math.PI / 180)));

        const dimensions = await getImageSize(sourceImagePath);
        const spriteHeight = dimensions.height;

        const shadowPathInitial = await createShadow(sourceImagePath);
        const shouldFlip = !(degree >= 0 && degree <= 180)

        const processShadow = async (pathToProcess) => {
            const taperedShadowPath = await taperShadow({ sourceImagePath: pathToProcess, height: spriteHeight, flip: shouldFlip });
            const skewedShadowPath = await skewShadow({ sourceImagePath: taperedShadowPath, degree, height: spriteHeight });

            const result = await compositeShadowAndImage({
                shadowPath: skewedShadowPath,
                imagePath: sourceImagePath,
                verticalOffset: verticalOffset,
                degree: degree
            });

            console.log(`Final result available at ${result}`);
        };

        if (!shouldFlip) {
            await processShadow(shadowPathInitial);
        } else {
            const flippedShadowPath = await flipShadow(shadowPathInitial);
            await processShadow(flippedShadowPath);
        }
    } catch (err) {
        console.error("Error processing the shadow:", err);
    }
};

const sourceImagePath = join(__dirname, 'sprite.png');

// 30 degrees is the source of the light (bottom-right)
placeShadow(sourceImagePath, 225);

module.exports = {
    getSkewAmount
}