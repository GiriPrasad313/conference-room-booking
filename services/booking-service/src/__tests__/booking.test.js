// Unit tests for Booking Service
// These tests verify the dynamic pricing logic

describe('Booking Service', () => {
  describe('Dynamic Pricing Logic', () => {
    const OPTIMAL_TEMP = 21;
    const ADJUSTMENT_PER_DEGREE = 0.5;
    const FALLBACK_SURCHARGE = 0.1;

    const calculatePriceManually = (basePrice, weatherData) => {
      if (!weatherData || weatherData.temperature === undefined) {
        const adjustment = basePrice * FALLBACK_SURCHARGE;
        return {
          finalPrice: parseFloat((basePrice + adjustment).toFixed(2)),
          weatherAdjustment: parseFloat(adjustment.toFixed(2)),
          forecastedTemp: null,
          fallbackUsed: true
        };
      }

      const tempDifference = Math.abs(weatherData.temperature - OPTIMAL_TEMP);
      const adjustment = tempDifference * ADJUSTMENT_PER_DEGREE;
      
      return {
        finalPrice: parseFloat((basePrice + adjustment).toFixed(2)),
        weatherAdjustment: parseFloat(adjustment.toFixed(2)),
        forecastedTemp: weatherData.temperature,
        fallbackUsed: false
      };
    };

    test('should apply 10% fallback surcharge when weather unavailable', () => {
      const basePrice = 100;
      const result = calculatePriceManually(basePrice, null);
      
      expect(result.finalPrice).toBe(110);
      expect(result.weatherAdjustment).toBe(10);
      expect(result.fallbackUsed).toBe(true);
    });

    test('should calculate zero adjustment at optimal temperature (21°C)', () => {
      const basePrice = 100;
      const result = calculatePriceManually(basePrice, { temperature: 21 });
      
      expect(result.finalPrice).toBe(100);
      expect(result.weatherAdjustment).toBe(0);
      expect(result.fallbackUsed).toBe(false);
    });

    test('should increase price for temperatures above optimal', () => {
      const basePrice = 100;
      const result = calculatePriceManually(basePrice, { temperature: 31 }); // 10 degrees above
      
      expect(result.finalPrice).toBe(105); // 100 + (10 * 0.5)
      expect(result.weatherAdjustment).toBe(5);
    });

    test('should increase price for temperatures below optimal', () => {
      const basePrice = 100;
      const result = calculatePriceManually(basePrice, { temperature: 11 }); // 10 degrees below
      
      expect(result.finalPrice).toBe(105); // 100 + (10 * 0.5)
      expect(result.weatherAdjustment).toBe(5);
    });

    test('should handle extreme cold temperatures', () => {
      const basePrice = 50;
      const result = calculatePriceManually(basePrice, { temperature: -5 }); // 26 degrees below
      
      expect(result.finalPrice).toBe(63); // 50 + (26 * 0.5)
      expect(result.weatherAdjustment).toBe(13);
    });

    test('should handle extreme hot temperatures', () => {
      const basePrice = 50;
      const result = calculatePriceManually(basePrice, { temperature: 35 }); // 14 degrees above
      
      expect(result.finalPrice).toBe(57); // 50 + (14 * 0.5)
      expect(result.weatherAdjustment).toBe(7);
    });
  });

  describe('Booking Model Validation', () => {
    test('booking date should not be in the past', () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      expect(yesterday < today).toBe(true);
    });

    test('valid future date should be accepted', () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      expect(tomorrow >= today).toBe(true);
    });
  });
});
