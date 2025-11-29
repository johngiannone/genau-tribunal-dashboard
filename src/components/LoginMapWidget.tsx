import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface LoginLocation {
  lat: number;
  lon: number;
  city: string;
  country: string;
  ip: string;
  timestamp: string;
  isAnomalous?: boolean;
  isImpossibleTravel?: boolean;
  anomalyScore?: {
    overall: number;
    factors: {
      timeAnomaly: number;
      deviceAnomaly: number;
      locationAnomaly: number;
      ipAnomaly: number;
      velocityAnomaly: number;
    };
    reasons: string[];
    isImpossibleTravel?: boolean;
  };
}

interface LoginMapWidgetProps {
  locations: LoginLocation[];
}

export function LoginMapWidget({ locations }: LoginMapWidgetProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mapContainer.current || locations.length === 0) {
      setLoading(false);
      return;
    }

    const initializeMap = async () => {
      try {
        // Fetch Mapbox token
        const { data, error: tokenError } = await supabase.functions.invoke('get-mapbox-token');
        
        if (tokenError || !data?.token) {
          throw new Error('Failed to fetch Mapbox token');
        }

        mapboxgl.accessToken = data.token;

        // Initialize map
        map.current = new mapboxgl.Map({
          container: mapContainer.current!,
          style: 'mapbox://styles/mapbox/dark-v11',
          zoom: 1,
          center: [0, 20],
          projection: 'globe',
        });

        // Add navigation controls
        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

        map.current.on('load', () => {
          // Add markers for each login location
          locations.forEach((location) => {
            if (location.lat && location.lon) {
              const isImpossibleTravel = location.isImpossibleTravel || location.anomalyScore?.isImpossibleTravel;
              
              // Create a marker element
              const el = document.createElement('div');
              el.className = isImpossibleTravel ? 'login-marker impossible-travel' : 
                             location.isAnomalous ? 'login-marker anomalous' : 'login-marker';
              el.style.width = isImpossibleTravel ? '24px' : '20px';
              el.style.height = isImpossibleTravel ? '24px' : '20px';
              el.style.borderRadius = '50%';
              
              // Color based on anomaly status
              if (isImpossibleTravel) {
                el.style.backgroundColor = '#dc2626'; // Red for impossible travel
                el.style.border = '3px solid #fca5a5';
                el.style.boxShadow = '0 0 16px rgba(220, 38, 38, 0.7)';
              } else if (location.isAnomalous) {
                el.style.backgroundColor = '#f97316'; // Orange for anomalous
                el.style.border = '2px solid white';
                el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
              } else {
                el.style.backgroundColor = '#0071E3'; // Blue for normal
                el.style.border = '2px solid white';
                el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
              }
              
              el.style.cursor = 'pointer';
              el.style.zIndex = isImpossibleTravel ? '999' : 'auto';

              // Create popup with login details
              const statusBadge = isImpossibleTravel
                ? '<span style="background: #fee2e2; color: #991b1b; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; border: 1px solid #fca5a5;">🚨 IMPOSSIBLE TRAVEL</span>'
                : location.isAnomalous 
                ? '<span style="background: #fed7aa; color: #9a3412; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600;">⚠️ UNUSUAL BEHAVIOR</span>'
                : '<span style="background: #d1fae5; color: #065f46; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600;">✓ NORMAL</span>';
              
              const anomalyDetails = location.anomalyScore ? `
                <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
                  <div style="font-size: 11px; font-weight: 600; margin-bottom: 4px; color: ${isImpossibleTravel ? '#991b1b' : '#374151'};">
                    Risk Score: ${location.anomalyScore.overall}%
                  </div>
                  ${location.anomalyScore.reasons.length > 0 ? `
                    <div style="font-size: 10px; color: ${isImpossibleTravel ? '#991b1b' : '#6b7280'}; margin-top: 4px;">
                      ${location.anomalyScore.reasons.map(r => `<div style="margin-bottom: 2px; font-weight: ${isImpossibleTravel ? '600' : '400'};">• ${r}</div>`).join('')}
                    </div>
                  ` : ''}
                </div>
              ` : '';
              
              const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
                <div style="padding: 8px; min-width: 220px; max-width: 260px;">
                  <div style="margin-bottom: 6px;">${statusBadge}</div>
                  <div style="font-weight: bold; margin-bottom: 4px;">${location.city}, ${location.country}</div>
                  <div style="font-size: 12px; color: #666; margin-bottom: 2px;">IP: ${location.ip}</div>
                  <div style="font-size: 11px; color: #999;">${new Date(location.timestamp).toLocaleString()}</div>
                  ${anomalyDetails}
                </div>
              `);

              // Add marker to map
              new mapboxgl.Marker(el)
                .setLngLat([location.lon, location.lat])
                .setPopup(popup)
                .addTo(map.current!);
            }
          });

          // Fit map to show all markers
          if (locations.length > 1) {
            const bounds: any = new (mapboxgl as any).LngLatBounds();
            locations.forEach((location) => {
              if (location.lat && location.lon) {
                bounds.extend([location.lon, location.lat]);
              }
            });
            (map.current as any).fitBounds(bounds, { padding: 50, maxZoom: 10 });
          } else if (locations.length === 1) {
            const loc = locations[0];
            if (loc.lat && loc.lon) {
              (map.current as any).setCenter([loc.lon, loc.lat]);
              (map.current as any).setZoom(5);
            }
          }

          setLoading(false);
        });

        // Add atmosphere
        map.current.on('style.load', () => {
          map.current?.setFog({
            color: 'rgb(30, 30, 40)',
            'high-color': 'rgb(50, 50, 70)',
            'horizon-blend': 0.1,
          });
        });

      } catch (err) {
        console.error('Map initialization error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load map');
        setLoading(false);
      }
    };

    initializeMap();

    // Cleanup
    return () => {
      map.current?.remove();
    };
  }, [locations]);

  if (locations.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
        <p className="text-muted-foreground">No login location data available</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
        <p className="text-destructive">Error loading map: {error}</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-64 rounded-lg overflow-hidden border border-border">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}
      <div ref={mapContainer} className="absolute inset-0" />
      <style>
        {`
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
              transform: scale(1);
            }
            50% {
              opacity: 0.7;
              transform: scale(1.1);
            }
          }
          
          @keyframes pulse-critical {
            0%, 100% {
              opacity: 1;
              transform: scale(1);
              box-shadow: 0 0 16px rgba(220, 38, 38, 0.7);
            }
            50% {
              opacity: 0.8;
              transform: scale(1.2);
              box-shadow: 0 0 24px rgba(220, 38, 38, 1);
            }
          }
          
          .login-marker.anomalous {
            animation: pulse 2s ease-in-out infinite;
          }
          
          .login-marker.impossible-travel {
            animation: pulse-critical 1.2s ease-in-out infinite;
          }
        `}
      </style>
    </div>
  );
}
