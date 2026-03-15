// src/utils/distance.js

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of point 1 (shop)
 * @param {number} lon1 - Longitude of point 1 (shop)
 * @param {number} lat2 - Latitude of point 2 (dropoff)
 * @param {number} lon2 - Longitude of point 2 (dropoff)
 * @returns {number} Distance in kilometers
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  // Round to 1 decimal place
  return Math.round(distance * 10) / 10;
};

/**
 * Geocode address to coordinates using Nominatim (free, no API key)
 * @param {string} address - Address to geocode
 * @returns {Promise<{lat: number, lon: number}>} Coordinates
 */
export const geocodeAddress = async (address) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address + ', Nairobi, Kenya')}&limit=1`,
      {
        headers: {
          'User-Agent': 'Sirnawa Solutions Delivery App'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error('Geocoding service unavailable');
    }
    
    const data = await response.json();
    
    if (data && data[0]) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon)
      };
    }
    throw new Error('Address not found');
  } catch (err) {
    console.error('Geocoding error:', err);
    throw err;
  }
};

/**
 * Calculate fare based on distance tiers
 * @param {number} distanceKm - Distance in kilometers
 * @returns {number} Fare in KSH
 */
export const calculateFareByDistance = (distanceKm) => {
  // ✅ YOUR PRICING TIERS
  const BASE_FARE = 210;   // 0-11 km
  const TIER_2_FARE = 350; // 11-20 km
  const TIER_3_FARE = 500; // 20+ km
  
  if (distanceKm <= 11) {
    return BASE_FARE;
  } else if (distanceKm <= 20) {
    return TIER_2_FARE;
  } else {
    return TIER_3_FARE;
  }
};

/**
 * Get pricing tier label based on distance
 * @param {number} distanceKm - Distance in kilometers
 * @returns {string} Tier label
 */
export const getPricingTier = (distanceKm) => {
  if (distanceKm <= 11) {
    return 'Base (0-11 km)';
  } else if (distanceKm <= 20) {
    return 'Tier 2 (11-20 km)';
  } else {
    return 'Tier 3 (20+ km)';
  }
};