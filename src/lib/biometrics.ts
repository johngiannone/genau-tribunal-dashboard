/**
 * Behavioral Biometrics Tracking
 * Monitors mouse movements, keystroke timing, and click patterns for bot detection
 */

interface MouseEvent {
  x: number;
  y: number;
  timestamp: number;
}

interface KeystrokeEvent {
  key: string;
  timestamp: number;
}

interface ClickEvent {
  x: number;
  y: number;
  timestamp: number;
  target: string;
}

interface BiometricsData {
  // Mouse metrics
  avgMouseVelocity: number;
  mouseVelocityVariance: number;
  avgMouseAcceleration: number;
  mousePathCurvature: number;
  totalMouseEvents: number;
  
  // Keystroke metrics
  avgKeystrokeInterval: number;
  keystrokeIntervalVariance: number;
  totalKeystrokeEvents: number;
  
  // Click metrics
  timeToFirstClick: number | null;
  avgClickInterval: number;
  totalClickEvents: number;
  clickAccuracyScore: number;
  
  // Bot assessment
  botLikelihoodScore: number;
  botIndicators: string[];
}

export class BiometricsTracker {
  private mouseEvents: MouseEvent[] = [];
  private keystrokeEvents: KeystrokeEvent[] = [];
  private clickEvents: ClickEvent[] = [];
  private sessionStartTime: number;
  private isTracking = false;

  constructor() {
    this.sessionStartTime = Date.now();
  }

  /**
   * Start tracking user behavior
   */
  start() {
    if (this.isTracking) return;
    this.isTracking = true;

    // Track mouse movements (throttled to avoid performance issues)
    let lastMouseTime = 0;
    const mouseThrottle = 100; // ms
    
    document.addEventListener('mousemove', (e) => {
      const now = Date.now();
      if (now - lastMouseTime < mouseThrottle) return;
      lastMouseTime = now;

      this.mouseEvents.push({
        x: e.clientX,
        y: e.clientY,
        timestamp: now,
      });

      // Keep only last 100 events to prevent memory issues
      if (this.mouseEvents.length > 100) {
        this.mouseEvents.shift();
      }
    });

    // Track keystrokes
    document.addEventListener('keydown', (e) => {
      this.keystrokeEvents.push({
        key: e.key.length === 1 ? 'char' : e.key, // Don't log actual characters for privacy
        timestamp: Date.now(),
      });

      if (this.keystrokeEvents.length > 100) {
        this.keystrokeEvents.shift();
      }
    });

    // Track clicks
    document.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement).tagName || 'unknown';
      this.clickEvents.push({
        x: e.clientX,
        y: e.clientY,
        timestamp: Date.now(),
        target,
      });

      if (this.clickEvents.length > 50) {
        this.clickEvents.shift();
      }
    });
  }

  /**
   * Calculate mouse velocity between two events
   */
  private calculateVelocity(e1: MouseEvent, e2: MouseEvent): number {
    const dx = e2.x - e1.x;
    const dy = e2.y - e1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const timeDelta = (e2.timestamp - e1.timestamp) / 1000; // seconds
    return timeDelta > 0 ? distance / timeDelta : 0;
  }

  /**
   * Calculate mouse path curvature (straighter = more bot-like)
   */
  private calculateCurvature(events: MouseEvent[]): number {
    if (events.length < 3) return 0;

    let totalAngleChange = 0;
    for (let i = 1; i < events.length - 1; i++) {
      const prev = events[i - 1];
      const curr = events[i];
      const next = events[i + 1];

      const angle1 = Math.atan2(curr.y - prev.y, curr.x - prev.x);
      const angle2 = Math.atan2(next.y - curr.y, next.x - curr.x);
      const angleChange = Math.abs(angle2 - angle1);
      
      totalAngleChange += angleChange;
    }

    return totalAngleChange / (events.length - 2);
  }

  /**
   * Calculate variance
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Analyze collected data and return biometrics
   */
  analyze(): BiometricsData {
    const botIndicators: string[] = [];
    let botScore = 0;

    // Mouse analysis
    const velocities: number[] = [];
    for (let i = 1; i < this.mouseEvents.length; i++) {
      const velocity = this.calculateVelocity(this.mouseEvents[i - 1], this.mouseEvents[i]);
      velocities.push(velocity);
    }

    const avgMouseVelocity = velocities.length > 0
      ? velocities.reduce((sum, v) => sum + v, 0) / velocities.length
      : 0;
    
    const mouseVelocityVariance = this.calculateVariance(velocities);
    
    // Bots typically have very consistent velocity (low variance)
    if (mouseVelocityVariance < 100 && this.mouseEvents.length > 10) {
      botIndicators.push('Low mouse velocity variance (robotic movement)');
      botScore += 25;
    }

    // Calculate mouse acceleration
    const accelerations: number[] = [];
    for (let i = 1; i < velocities.length; i++) {
      const accel = Math.abs(velocities[i] - velocities[i - 1]);
      accelerations.push(accel);
    }
    
    const avgMouseAcceleration = accelerations.length > 0
      ? accelerations.reduce((sum, a) => sum + a, 0) / accelerations.length
      : 0;

    const mousePathCurvature = this.calculateCurvature(this.mouseEvents);

    // Very straight mouse paths (low curvature) indicate bot
    if (mousePathCurvature < 0.1 && this.mouseEvents.length > 10) {
      botIndicators.push('Unnaturally straight mouse movements');
      botScore += 20;
    }

    // Keystroke analysis
    const keystrokeIntervals: number[] = [];
    for (let i = 1; i < this.keystrokeEvents.length; i++) {
      const interval = this.keystrokeEvents[i].timestamp - this.keystrokeEvents[i - 1].timestamp;
      keystrokeIntervals.push(interval);
    }

    const avgKeystrokeInterval = keystrokeIntervals.length > 0
      ? keystrokeIntervals.reduce((sum, i) => sum + i, 0) / keystrokeIntervals.length
      : 0;
    
    const keystrokeIntervalVariance = this.calculateVariance(keystrokeIntervals);

    // Bots type at perfectly consistent intervals (low variance)
    if (keystrokeIntervalVariance < 100 && keystrokeIntervals.length > 5) {
      botIndicators.push('Perfectly consistent keystroke timing');
      botScore += 30;
    }

    // Very fast typing (< 50ms average) is suspicious
    if (avgKeystrokeInterval < 50 && keystrokeIntervals.length > 5) {
      botIndicators.push('Superhuman typing speed');
      botScore += 25;
    }

    // Click analysis
    const timeToFirstClick = this.clickEvents.length > 0
      ? this.clickEvents[0].timestamp - this.sessionStartTime
      : null;

    // Instant clicks (< 100ms) are suspicious
    if (timeToFirstClick !== null && timeToFirstClick < 100) {
      botIndicators.push('Instant first click');
      botScore += 20;
    }

    const clickIntervals: number[] = [];
    for (let i = 1; i < this.clickEvents.length; i++) {
      const interval = this.clickEvents[i].timestamp - this.clickEvents[i - 1].timestamp;
      clickIntervals.push(interval);
    }

    const avgClickInterval = clickIntervals.length > 0
      ? clickIntervals.reduce((sum, i) => sum + i, 0) / clickIntervals.length
      : 0;

    // Calculate click accuracy (did they click on actual elements?)
    const clicksOnElements = this.clickEvents.filter(c => c.target !== 'unknown').length;
    const clickAccuracyScore = this.clickEvents.length > 0
      ? (clicksOnElements / this.clickEvents.length) * 100
      : 100;

    // Low click accuracy might indicate automated clicking
    if (clickAccuracyScore < 50 && this.clickEvents.length > 5) {
      botIndicators.push('Low click accuracy (random clicks)');
      botScore += 15;
    }

    // No mouse movement at all is highly suspicious
    if (this.mouseEvents.length === 0 && this.clickEvents.length > 0) {
      botIndicators.push('Clicks without mouse movement');
      botScore += 40;
    }

    return {
      avgMouseVelocity: Math.round(avgMouseVelocity),
      mouseVelocityVariance: Math.round(mouseVelocityVariance),
      avgMouseAcceleration: Math.round(avgMouseAcceleration),
      mousePathCurvature: Math.round(mousePathCurvature * 100) / 100,
      totalMouseEvents: this.mouseEvents.length,
      
      avgKeystrokeInterval: Math.round(avgKeystrokeInterval),
      keystrokeIntervalVariance: Math.round(keystrokeIntervalVariance),
      totalKeystrokeEvents: this.keystrokeEvents.length,
      
      timeToFirstClick,
      avgClickInterval: Math.round(avgClickInterval),
      totalClickEvents: this.clickEvents.length,
      clickAccuracyScore: Math.round(clickAccuracyScore),
      
      botLikelihoodScore: Math.min(botScore, 100),
      botIndicators,
    };
  }

  /**
   * Stop tracking and return final analysis
   */
  stop(): BiometricsData {
    this.isTracking = false;
    return this.analyze();
  }
}
