const { getSkewAmount } = require('./appendShadow');

describe('getSkewAmount function', () => {

    it('should return correct skew amount for 0° light source', () => {
        const result = getSkewAmount(0);
        const expected = 100;  // Max negative skew for direct left
        expect(result).toBeCloseTo(expected, 1);
    });

    it('should return correct skew amount for 45° light source', () => {
        const result = getSkewAmount(45);
        const expected = -45;  // Moderate negative skew for top left
        expect(result).toBeCloseTo(expected, 1);
    });

    it('should return correct skew amount for 90° light source', () => {
        const result = getSkewAmount(90);
        const expected = 0;    // No skew for top
        expect(result).toBeCloseTo(expected, 1);
    });

    it('should return correct skew amount for 135° light source', () => {
        const result = getSkewAmount(135);
        const expected = 45;   // Moderate positive skew for top right
        expect(result).toBeCloseTo(expected, 1);
    });

    it('should return correct skew amount for 180° light source', () => {
        const result = getSkewAmount(180);
        const expected = -100;   // Max positive skew for direct right
        expect(result).toBeCloseTo(expected, 1);
    });

    it('should return correct skew amount for 225° light source', () => {
        const result = getSkewAmount(225);
        const expected = -45;   // Moderate positive skew for bottom right
        expect(result).toBeCloseTo(expected, 1);
    });

    it('should return correct skew amount for 270° light source', () => {
        const result = getSkewAmount(270);
        const expected = 0;    // No skew for bottom
        expect(result).toBeCloseTo(expected, 1);
    });

    it('should return correct skew amount for 315° light source', () => {
        const result = getSkewAmount(315);
        const expected = 45;  // Moderate negative skew for bottom left
        expect(result).toBeCloseTo(expected, 1);
    });

});

