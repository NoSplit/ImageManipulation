const im = require('imagemagick');
const fs = require('fs');

// Explicitly specify the paths if needed
im.convert.path = `C:\\\Program Files\\ImageMagick-7.1.1-Q16-HDRI\\magick.exe`;
im.identify.path = `C:\\Program Files\\ImageMagick-7.1.1-Q16-HDRI\\magick.exe`;

const width = 1280;  // Width of the canvas
const height = 720;  // Height of the canvas
const gridSize = 32; // Grid size

// Function to generate the draw commands for the grid lines
function generateGridLines(gridSize, width, height) {
    let drawCommands = '';

    // Generate horizontal lines
    for (let y = gridSize; y < height; y += gridSize) {
        drawCommands += `M 0,${y} L ${width},${y} `;
    }

    // Generate vertical lines
    for (let x = gridSize; x < width; x += gridSize) {
        drawCommands += `M ${x},0 L ${x},${height} `;
    }

    return drawCommands;
}

// Generate the draw commands for the grid
const drawCommands = generateGridLines(gridSize, width, height);

// Construct the ImageMagick command to create the grid
const createGridArgs = [
    '-size', `${width}x${height}`,
    'xc:white',
    '-stroke', 'black',
    '-strokewidth', '1',
    '-draw', `path '${drawCommands}'`,
    'grid.png'
];

// Execute the command to create the grid
im.convert(createGridArgs, function(err) {
    if (err) throw err;
    console.log('Grid image created as grid.png');

    // Now apply the shear transformation to make it isometric
    const shearX = 26.565; // The X-axis shear angle
    const shearY = 0;  // The Y-axis shear angle (usually 0 for isometric grids)

    // Construct the ImageMagick command to shear the grid
    const shearGridArgs = [
        'grid.png',
        '-virtual-pixel', 'transparent',
        '-background', 'None',
        '-shear', `${shearX}x${shearY}`,
        '-scale', '58.578%,100%',
        'output.png'
    ];

    // Execute the command to shear the grid
    im.convert(shearGridArgs, function(err) {
        if (err) throw err;
        console.log('Isometric grid image created as output.png');
    });
});