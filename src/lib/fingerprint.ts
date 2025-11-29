/**
 * Browser Fingerprinting Utility
 * Collects device characteristics for ban evasion detection
 */

export interface FingerprintData {
  screenResolution: string;
  cpuCores: number;
  deviceMemory: number | null;
  timezoneOffset: number;
  webglRenderer: string | null;
  canvasHash: string;
  userAgent: string;
  platform: string;
  fingerprintHash: string;
}

/**
 * Generate a canvas fingerprint by rendering text and shapes
 */
function generateCanvasFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return 'no-canvas';
    
    // Draw text with specific styling
    ctx.textBaseline = 'top';
    ctx.font = '14px "Arial"';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('Genau AI 🔒', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('Genau AI 🔒', 4, 17);
    
    // Get the canvas data and hash it
    const dataURL = canvas.toDataURL();
    return hashString(dataURL);
  } catch (error) {
    console.error('Canvas fingerprint error:', error);
    return 'canvas-error';
  }
}

/**
 * Get WebGL renderer info for GPU fingerprinting
 */
function getWebGLRenderer(): string | null {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) return null;
    
    const debugInfo = (gl as any).getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      return (gl as any).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    }
    
    return null;
  } catch (error) {
    console.error('WebGL error:', error);
    return null;
  }
}

/**
 * Simple hash function for strings
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Collect complete browser fingerprint
 */
export async function collectFingerprint(): Promise<FingerprintData> {
  const screenResolution = `${window.screen.width}x${window.screen.height}`;
  const cpuCores = navigator.hardwareConcurrency || 0;
  const deviceMemory = (navigator as any).deviceMemory || null;
  const timezoneOffset = new Date().getTimezoneOffset();
  const webglRenderer = getWebGLRenderer();
  const canvasHash = generateCanvasFingerprint();
  const userAgent = navigator.userAgent;
  const platform = navigator.platform;
  
  // Combine all data points to create a unique fingerprint hash
  const combinedString = [
    screenResolution,
    cpuCores,
    deviceMemory,
    timezoneOffset,
    webglRenderer,
    canvasHash,
    userAgent,
    platform,
  ].join('|');
  
  const fingerprintHash = hashString(combinedString);
  
  return {
    screenResolution,
    cpuCores,
    deviceMemory,
    timezoneOffset,
    webglRenderer,
    canvasHash,
    userAgent,
    platform,
    fingerprintHash,
  };
}
