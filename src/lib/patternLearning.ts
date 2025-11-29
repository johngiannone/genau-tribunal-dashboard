/**
 * Machine Learning Pattern Detection for User Behavior
 * Learns individual user patterns and detects anomalies across multiple dimensions
 */

export interface UserPattern {
  // Time-based patterns
  typicalHours: number[];  // Hours of day (0-23)
  typicalDays: number[];   // Days of week (0-6)
  avgLoginFrequency: number; // Average hours between logins
  
  // Device patterns
  commonDevices: string[];
  deviceConsistency: number; // 0-1 score
  
  // Location patterns
  homeLocations: { lat: number; lon: number; count: number }[];
  typicalCountries: string[];
  locationConsistency: number; // 0-1 score
  
  // IP patterns
  commonIPs: string[];
  ipConsistency: number;
}

export interface AnomalyScore {
  overall: number; // 0-100 (100 = highly anomalous)
  factors: {
    timeAnomaly: number;
    deviceAnomaly: number;
    locationAnomaly: number;
    ipAnomaly: number;
    velocityAnomaly: number; // Impossible travel
  };
  reasons: string[];
  isImpossibleTravel?: boolean; // Flag for critical impossible travel events
}

interface LoginData {
  id: string;
  created_at: string;
  ip_address: string;
  user_agent: string;
  location?: {
    city: string;
    country: string;
    lat: number;
    lon: number;
  };
}

/**
 * Learn patterns from historical login data using exponential moving averages
 * Recent data is weighted more heavily to adapt to changing legitimate patterns
 */
export function learnUserPatterns(logins: LoginData[]): UserPattern {
  if (logins.length < 3) {
    // Not enough data to learn patterns
    return {
      typicalHours: [],
      typicalDays: [],
      avgLoginFrequency: 0,
      commonDevices: [],
      deviceConsistency: 0,
      homeLocations: [],
      typicalCountries: [],
      locationConsistency: 0,
      commonIPs: [],
      ipConsistency: 0,
    };
  }

  // Sort logins by timestamp (oldest to newest)
  const sortedLogins = [...logins].sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  // Calculate time weights using exponential decay
  // Recent logins get higher weight (alpha = 0.3 means 30% weight on newest item)
  const alpha = 0.3;
  const weights = sortedLogins.map((_, idx) => 
    Math.pow(1 - alpha, sortedLogins.length - 1 - idx)
  );
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const normalizedWeights = weights.map(w => w / totalWeight);

  // Time patterns with EMA
  const hours = sortedLogins.map(l => new Date(l.created_at).getHours());
  const days = sortedLogins.map(l => new Date(l.created_at).getDay());
  const typicalHours = findFrequentValuesWeighted(hours, normalizedWeights, 0.15);
  const typicalDays = findFrequentValuesWeighted(days, normalizedWeights, 0.15);

  // Login frequency with time-weighted averaging
  const timestamps = sortedLogins.map(l => new Date(l.created_at).getTime());
  const intervals = [];
  const intervalWeights = [];
  for (let i = 1; i < timestamps.length; i++) {
    intervals.push((timestamps[i] - timestamps[i - 1]) / (1000 * 60 * 60)); // hours
    intervalWeights.push(normalizedWeights[i]);
  }
  const avgLoginFrequency = intervals.length > 0 
    ? intervals.reduce((sum, interval, idx) => sum + interval * intervalWeights[idx], 0) / 
      intervalWeights.reduce((a, b) => a + b, 0)
    : 24;

  // Device patterns with weighted consistency
  const devices = sortedLogins.map(l => l.user_agent || '');
  const commonDevices = findFrequentValuesWeighted(devices, normalizedWeights, 0.25);
  const deviceConsistency = calculateWeightedConsistency(devices, normalizedWeights);

  // Location patterns with adaptive clustering
  const locationsWithWeights = sortedLogins
    .filter(l => l.location?.lat && l.location?.lon)
    .map((l, idx) => ({ 
      lat: l.location!.lat, 
      lon: l.location!.lon,
      weight: normalizedWeights[idx]
    }));
  
  const homeLocations = clusterLocationsWeighted(locationsWithWeights);
  
  const countries = sortedLogins
    .filter(l => l.location?.country)
    .map(l => l.location!.country);
  const countryWeights = sortedLogins
    .filter(l => l.location?.country)
    .map((_, idx) => normalizedWeights[sortedLogins.findIndex(sl => sl.id === sortedLogins[idx].id)]);
  const typicalCountries = findFrequentValuesWeighted(countries, countryWeights, 0.25);
  const locationConsistency = calculateWeightedConsistency(countries, countryWeights);

  // IP patterns with weighted analysis
  const ips = sortedLogins.map(l => l.ip_address || '');
  const commonIPs = findFrequentValuesWeighted(ips, normalizedWeights, 0.25);
  const ipConsistency = calculateWeightedConsistency(ips, normalizedWeights);

  return {
    typicalHours,
    typicalDays,
    avgLoginFrequency,
    commonDevices,
    deviceConsistency,
    homeLocations,
    typicalCountries,
    locationConsistency,
    commonIPs,
    ipConsistency,
  };
}

/**
 * Calculate anomaly score for a specific login
 */
export function calculateAnomalyScore(
  login: LoginData,
  pattern: UserPattern,
  previousLogin?: LoginData
): AnomalyScore {
  const reasons: string[] = [];
  
  // Time anomaly
  const loginHour = new Date(login.created_at).getHours();
  const loginDay = new Date(login.created_at).getDay();
  const timeAnomaly = 
    (pattern.typicalHours.length > 0 && !pattern.typicalHours.includes(loginHour) ? 40 : 0) +
    (pattern.typicalDays.length > 0 && !pattern.typicalDays.includes(loginDay) ? 20 : 0);
  
  if (timeAnomaly > 30) {
    const hourLabel = loginHour < 12 ? `${loginHour}AM` : `${loginHour - 12}PM`;
    reasons.push(`Login at unusual time (${hourLabel})`);
  }

  // Device anomaly
  const deviceAnomaly = pattern.commonDevices.length > 0 && 
    !pattern.commonDevices.some(d => login.user_agent?.includes(d))
    ? 50
    : 0;
  
  if (deviceAnomaly > 0) {
    reasons.push('New or unusual device detected');
  }

  // Location anomaly
  let locationAnomaly = 0;
  if (login.location) {
    // Country check
    if (pattern.typicalCountries.length > 0 && 
        !pattern.typicalCountries.includes(login.location.country)) {
      locationAnomaly += 40;
      reasons.push(`Login from unusual country (${login.location.country})`);
    }

    // Distance from home locations
    if (pattern.homeLocations.length > 0 && login.location.lat && login.location.lon) {
      const minDistance = Math.min(
        ...pattern.homeLocations.map(home => 
          calculateDistance(login.location!.lat, login.location!.lon, home.lat, home.lon)
        )
      );
      
      if (minDistance > 500) { // More than 500km from any home location
        locationAnomaly += 30;
        reasons.push(`Login ${Math.round(minDistance)}km from typical location`);
      }
    }
  }

  // IP anomaly
  const ipAnomaly = pattern.commonIPs.length > 0 && 
    !pattern.commonIPs.includes(login.ip_address || '')
    ? 30
    : 0;
  
  if (ipAnomaly > 0) {
    reasons.push('New IP address');
  }

  // Velocity anomaly (impossible travel) with enhanced detection
  let velocityAnomaly = 0;
  if (previousLogin?.location && login.location && 
      previousLogin.location.lat && login.location.lat) {
    const distance = calculateDistance(
      previousLogin.location.lat,
      previousLogin.location.lon,
      login.location.lat,
      login.location.lon
    );
    
    const timeDiff = (new Date(login.created_at).getTime() - 
                     new Date(previousLogin.created_at).getTime()) / (1000 * 60 * 60); // hours
    
    // Skip if locations are very close (within 10km) - likely same city
    if (distance > 10) {
      const speed = distance / timeDiff; // km/h
      
      // Tiered impossible travel detection
      const maxCommercialFlightSpeed = 900; // km/h
      const maxPrivateJetSpeed = 1100; // km/h
      const supersonic = 2000; // km/h (theoretical max for civilian travel)
      
      if (speed > supersonic) {
        velocityAnomaly = 100;
        reasons.push(`🚨 CRITICAL: Impossible travel detected - ${Math.round(distance)}km in ${Math.round(timeDiff * 60)}min (${Math.round(speed)}km/h)`);
      } else if (speed > maxPrivateJetSpeed) {
        velocityAnomaly = 90;
        reasons.push(`⚠️ Highly suspicious: ${Math.round(distance)}km in ${Math.round(timeDiff)}h (${Math.round(speed)}km/h exceeds private jet speed)`);
      } else if (speed > maxCommercialFlightSpeed) {
        velocityAnomaly = 75;
        reasons.push(`⚠️ Suspicious: ${Math.round(distance)}km in ${Math.round(timeDiff)}h (${Math.round(speed)}km/h exceeds commercial flight speed)`);
      }
    }
  }

  // Calculate overall score (weighted average)
  const overall = Math.min(100, Math.round(
    timeAnomaly * 0.15 +
    deviceAnomaly * 0.25 +
    locationAnomaly * 0.30 +
    ipAnomaly * 0.10 +
    velocityAnomaly * 0.20
  ));

  return {
    overall,
    factors: {
      timeAnomaly,
      deviceAnomaly,
      locationAnomaly,
      ipAnomaly,
      velocityAnomaly,
    },
    reasons,
    isImpossibleTravel: velocityAnomaly >= 75, // Flag critical travel anomalies
  };
}

/**
 * Find values that appear frequently using weighted counts (EMA-based)
 */
function findFrequentValuesWeighted<T>(values: T[], weights: number[], threshold: number): T[] {
  const weightedCounts = new Map<T, number>();
  values.forEach((v, idx) => {
    weightedCounts.set(v, (weightedCounts.get(v) || 0) + weights[idx]);
  });
  
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const minWeight = totalWeight * threshold;
  
  return Array.from(weightedCounts.entries())
    .filter(([_, weight]) => weight >= minWeight)
    .sort((a, b) => b[1] - a[1]) // Sort by weight descending
    .map(([value]) => value);
}

/**
 * Find values that appear frequently (above threshold percentage) - Legacy method
 */
function findFrequentValues<T>(values: T[], threshold: number): T[] {
  const counts = new Map<T, number>();
  values.forEach(v => counts.set(v, (counts.get(v) || 0) + 1));
  
  const minCount = values.length * threshold;
  return Array.from(counts.entries())
    .filter(([_, count]) => count >= minCount)
    .map(([value]) => value);
}

/**
 * Calculate weighted consistency score (0-1) using EMA
 * Higher weight on recent values for adaptive learning
 */
function calculateWeightedConsistency<T>(values: T[], weights: number[]): number {
  if (values.length === 0) return 0;
  
  const weightedCounts = new Map<T, number>();
  values.forEach((v, idx) => {
    weightedCounts.set(v, (weightedCounts.get(v) || 0) + weights[idx]);
  });
  
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const maxWeight = Math.max(...Array.from(weightedCounts.values()));
  return maxWeight / totalWeight;
}

/**
 * Calculate consistency score (0-1) based on how often the most common value appears - Legacy
 */
function calculateConsistency<T>(values: T[]): number {
  if (values.length === 0) return 0;
  
  const counts = new Map<T, number>();
  values.forEach(v => counts.set(v, (counts.get(v) || 0) + 1));
  
  const maxCount = Math.max(...Array.from(counts.values()));
  return maxCount / values.length;
}

/**
 * Cluster nearby locations with weighted centroid calculation using EMA
 * Recent locations have more influence on home location determination
 */
function clusterLocationsWeighted(
  locations: { lat: number; lon: number; weight: number }[]
): { lat: number; lon: number; count: number }[] {
  if (locations.length === 0) return [];
  
  const clusters: { lat: number; lon: number; count: number; totalWeight: number }[] = [];
  const clusterRadius = 50; // 50km radius
  
  locations.forEach(loc => {
    // Find nearby cluster
    const nearbyCluster = clusters.find(c => 
      calculateDistance(loc.lat, loc.lon, c.lat, c.lon) < clusterRadius
    );
    
    if (nearbyCluster) {
      // Add to existing cluster with weighted centroid update
      const newWeight = nearbyCluster.totalWeight + loc.weight;
      nearbyCluster.lat = (nearbyCluster.lat * nearbyCluster.totalWeight + loc.lat * loc.weight) / newWeight;
      nearbyCluster.lon = (nearbyCluster.lon * nearbyCluster.totalWeight + loc.lon * loc.weight) / newWeight;
      nearbyCluster.totalWeight = newWeight;
      nearbyCluster.count++;
    } else {
      // Create new cluster
      clusters.push({ lat: loc.lat, lon: loc.lon, count: 1, totalWeight: loc.weight });
    }
  });
  
  // Sort by total weight (most significant locations first)
  return clusters
    .sort((a, b) => b.totalWeight - a.totalWeight)
    .map(({ lat, lon, count }) => ({ lat, lon, count }));
}

/**
 * Cluster nearby locations to find "home" locations - Legacy method
 */
function clusterLocations(
  locations: { lat: number; lon: number }[]
): { lat: number; lon: number; count: number }[] {
  if (locations.length === 0) return [];
  
  const clusters: { lat: number; lon: number; count: number }[] = [];
  const clusterRadius = 50; // 50km radius
  
  locations.forEach(loc => {
    // Find nearby cluster
    const nearbyCluster = clusters.find(c => 
      calculateDistance(loc.lat, loc.lon, c.lat, c.lon) < clusterRadius
    );
    
    if (nearbyCluster) {
      // Add to existing cluster (update centroid)
      nearbyCluster.lat = (nearbyCluster.lat * nearbyCluster.count + loc.lat) / (nearbyCluster.count + 1);
      nearbyCluster.lon = (nearbyCluster.lon * nearbyCluster.count + loc.lon) / (nearbyCluster.count + 1);
      nearbyCluster.count++;
    } else {
      // Create new cluster
      clusters.push({ ...loc, count: 1 });
    }
  });
  
  // Sort by count (most common first)
  return clusters.sort((a, b) => b.count - a.count);
}

/**
 * Calculate distance between two coordinates using Haversine formula (in km)
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}
