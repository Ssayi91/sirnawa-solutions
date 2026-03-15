// src/utils/fareCalculator.js

/**
 * Calculate delivery fare based on distance and zones
 * @param {string} pickupZone - Zone ID (zone_a, zone_b, etc.)
 * @param {string} dropoffZone - Zone ID
 * @param {number} distanceKm - Estimated distance in kilometers
 * @param {object} fareConfig - Fare settings from Firestore
 * @returns {number} Final fare in KSH (rounded to nearest 10)
 */
export const calculateFare = (pickupZone, dropoffZone, distanceKm, fareConfig) => {
  const {
    baseFare = 250,        // ✅ CHANGED: Now 250 (was 150)
    perKmRate = 40,
    minimumFare = 250,     // ✅ Same as base - locked
    zoneMultipliers = {}
  } = fareConfig || {};

  // Use higher multiplier of the two zones (conservative pricing)
  const pickupMult = zoneMultipliers[pickupZone] || 1.0;
  const dropoffMult = zoneMultipliers[dropoffZone] || 1.0;
  const multiplier = Math.max(pickupMult, dropoffMult);

  // Calculate raw fare: Base + Distance
  const rawFare = baseFare + (distanceKm * perKmRate);

  // Apply minimum (same as base) and zone multiplier
  const finalFare = Math.max(minimumFare, rawFare) * multiplier;

  // Round to nearest 10 KSH for clean pricing
  return Math.round(finalFare / 10) * 10;
};

/**
 * Get zone ID from location text (simple keyword matching)
 * @param {string} location - Location string (e.g., "CBD, Moi Avenue")
 * @returns {string} Zone ID (zone_a, zone_b, etc.)
 */
export const getZoneFromLocation = (location) => {
  const loc = location?.toLowerCase() || '';
  
  if (loc.includes('cbd') || loc.includes('moi avenue') || loc.includes('tom mboya')) {
    return 'zone_a';
  }
  if (loc.includes('westlands') || loc.includes('kilimani') || loc.includes('lavington')) {
    return 'zone_b';
  }
  if (loc.includes('karen') || loc.includes('runda') || loc.includes('gigiri')) {
    return 'zone_c';
  }
  if (loc.includes('roysambu') || loc.includes('kasarani') || loc.includes('thika road')) {
    return 'zone_d';
  }
  
  // Default to Zone B if unknown
  return 'zone_b';
};