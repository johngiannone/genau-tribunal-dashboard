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
 * Learn patterns from historical login data
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

  // Time patterns
  const hours = logins.map(l => new Date(l.created_at).getHours());
  const days = logins.map(l => new Date(l.created_at).getDay());
  const typicalHours = findFrequentValues(hours, 0.2); // Top 20% of hours
  const typicalDays = findFrequentValues(days, 0.2);

  // Login frequency
  const timestamps = logins.map(l => new Date(l.created_at).getTime()).sort();
  const intervals = [];
  for (let i = 1; i < timestamps.length; i++) {
    intervals.push((timestamps[i] - timestamps[i - 1]) / (1000 * 60 * 60)); // hours
  }
  const avgLoginFrequency = intervals.length > 0 
    ? intervals.reduce((a, b) => a + b, 0) / intervals.length 
    : 24;

  // Device patterns
  const devices = logins.map(l => l.user_agent || '');
  const commonDevices = findFrequentValues(devices, 0.3);
  const deviceConsistency = calculateConsistency(devices);

  // Location patterns
  const locationsWithCoords = logins
    .filter(l => l.location?.lat && l.location?.lon)
    .map(l => ({ lat: l.location!.lat, lon: l.location!.lon }));
  
  const homeLocations = clusterLocations(locationsWithCoords);
  
  const countries = logins
    .filter(l => l.location?.country)
    .map(l => l.location!.country);
  const typicalCountries = findFrequentValues(countries, 0.3);
  const locationConsistency = calculateConsistency(countries);

  // IP patterns
  const ips = logins.map(l => l.ip_address || '');
  const commonIPs = findFrequentValues(ips, 0.3);
  const ipConsistency = calculateConsistency(ips);

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

  // Velocity anomaly (impossible travel)
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
    
    const speed = distance / timeDiff; // km/h
    const maxReasonableSpeed = 900; // 900 km/h (commercial flight speed)
    
    if (speed > maxReasonableSpeed) {
      velocityAnomaly = 80;
      reasons.push(`Impossible travel: ${Math.round(distance)}km in ${Math.round(timeDiff)}h`);
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
  };
}

/**
 * Find values that appear frequently (above threshold percentage)
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
 * Calculate consistency score (0-1) based on how often the most common value appears
 */
function calculateConsistency<T>(values: T[]): number {
  if (values.length === 0) return 0;
  
  const counts = new Map<T, number>();
  values.forEach(v => counts.set(v, (counts.get(v) || 0) + 1));
  
  const maxCount = Math.max(...Array.from(counts.values()));
  return maxCount / values.length;
}

/**
 * Cluster nearby locations to find "home" locations
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
