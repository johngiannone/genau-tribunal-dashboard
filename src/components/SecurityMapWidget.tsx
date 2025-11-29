import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Globe, AlertTriangle } from "lucide-react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface DetectionEvent {
  ip_address: string;
  country_code: string | null;
  is_vpn: boolean | null;
  is_proxy: boolean | null;
  is_tor: boolean | null;
  fraud_score: number | null;
  blocked_at: string;
}

// Country code to coordinates mapping for major countries
const countryCoordinates: Record<string, [number, number]> = {
  US: [-95.7129, 37.0902],
  CN: [104.1954, 35.8617],
  IN: [78.9629, 20.5937],
  BR: [-47.8825, -15.7942],
  RU: [105.3188, 61.5240],
  GB: [-3.4360, 55.3781],
  DE: [10.4515, 51.1657],
  FR: [2.2137, 46.2276],
  CA: [-106.3468, 56.1304],
  AU: [133.7751, -25.2744],
  JP: [138.2529, 36.2048],
  MX: [-102.5528, 23.6345],
  IT: [12.5674, 41.8719],
  ES: [-3.7492, 40.4637],
  KR: [127.7669, 35.9078],
  ID: [113.9213, -0.7893],
  TR: [35.2433, 38.9637],
  SA: [45.0792, 23.8859],
  AR: [-63.6167, -38.4161],
  PL: [19.1451, 51.9194],
  NG: [8.6753, 9.0820],
  NL: [5.2913, 52.1326],
  BE: [4.4699, 50.5039],
  SE: [18.6435, 60.1282],
  CH: [8.2275, 46.8182],
  AT: [14.5501, 47.5162],
  NO: [8.4689, 60.4720],
  DK: [9.5018, 56.2639],
  FI: [25.7482, 61.9241],
  IE: [-8.2439, 53.4129],
  PT: [-8.2245, 39.3999],
  GR: [21.8243, 39.0742],
  CZ: [15.4730, 49.8175],
  RO: [24.9668, 45.9432],
  Unknown: [0, 0],
};

export const SecurityMapWidget = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [recentDetections, setRecentDetections] = useState<DetectionEvent[]>([]);
  const [liveCount, setLiveCount] = useState(0);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Fetch Mapbox token and initialize map
    const initializeMap = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        
        if (error || !data?.token) {
          console.error('Failed to fetch Mapbox token:', error);
          return;
        }

        // Initialize Mapbox
        mapboxgl.accessToken = data.token;

        map.current = new mapboxgl.Map({
          container: mapContainer.current!,
          style: "mapbox://styles/mapbox/dark-v11",
          zoom: 1.5,
          center: [20, 20],
          projection: { name: "globe" },
        });

        // Add navigation controls
        map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

        // Disable scroll zoom for better UX
        map.current.scrollZoom.disable();
      } catch (err) {
        console.error('Error initializing map:', err);
      }
    };

    initializeMap();

    // Fetch initial detections
    fetchRecentDetections();

    // Set up real-time subscription
    const channel = supabase
      .channel("security-detections")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "blocked_ips",
        },
        (payload) => {
          const newDetection = payload.new as DetectionEvent;
          handleNewDetection(newDetection);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      map.current?.remove();
      markersRef.current.forEach((marker) => marker.remove());
    };
  }, []);

  const fetchRecentDetections = async () => {
    const { data, error } = await supabase
      .from("blocked_ips")
      .select("ip_address, country_code, is_vpn, is_proxy, is_tor, fraud_score, blocked_at")
      .order("blocked_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Failed to fetch recent detections:", error);
      return;
    }

    if (data) {
      setRecentDetections(data);
      setLiveCount(data.length);
      
      // Add markers for initial detections
      data.forEach((detection) => addMarker(detection));
    }
  };

  const handleNewDetection = (detection: DetectionEvent) => {
    // Add to recent detections list
    setRecentDetections((prev) => [detection, ...prev.slice(0, 9)]);
    setLiveCount((prev) => prev + 1);

    // Add animated marker to map
    addMarker(detection, true);
  };

  const addMarker = (detection: DetectionEvent, animated = false) => {
    if (!map.current) return;

    const coordinates = countryCoordinates[detection.country_code || "Unknown"] || [0, 0];

    // Create custom marker element
    const el = document.createElement("div");
    el.className = "custom-marker";
    el.style.width = "24px";
    el.style.height = "24px";
    el.style.borderRadius = "50%";
    
    // Color based on threat level
    if (detection.fraud_score && detection.fraud_score > 85) {
      el.style.backgroundColor = "#ef4444";
    } else if (detection.is_tor) {
      el.style.backgroundColor = "#dc2626";
    } else if (detection.is_vpn || detection.is_proxy) {
      el.style.backgroundColor = "#f59e0b";
    } else {
      el.style.backgroundColor = "#06b6d4";
    }

    el.style.border = "2px solid white";
    el.style.boxShadow = "0 2px 10px rgba(0,0,0,0.5)";

    if (animated) {
      el.style.animation = "pulse-marker 2s ease-in-out";
    }

    // Create popup
    const threatType = detection.is_tor
      ? "Tor"
      : detection.is_vpn
      ? "VPN"
      : detection.is_proxy
      ? "Proxy"
      : "Suspicious";

    const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
      <div style="padding: 8px; font-family: Inter;">
        <div style="font-weight: 600; margin-bottom: 4px;">
          ${detection.country_code || "Unknown"} - ${threatType}
        </div>
        <div style="font-size: 12px; color: #666;">
          IP: ${detection.ip_address}
        </div>
        ${
          detection.fraud_score
            ? `<div style="font-size: 12px; color: #666;">
              Fraud Score: ${detection.fraud_score}/100
            </div>`
            : ""
        }
        <div style="font-size: 11px; color: #999; margin-top: 4px;">
          ${new Date(detection.blocked_at).toLocaleString()}
        </div>
      </div>
    `);

    const marker = new mapboxgl.Marker(el)
      .setLngLat(coordinates as [number, number])
      .setPopup(popup)
      .addTo(map.current);

    markersRef.current.push(marker);

    // Remove old markers if too many
    if (markersRef.current.length > 50) {
      const oldMarker = markersRef.current.shift();
      oldMarker?.remove();
    }
  };

  const getCountryFlag = (countryCode: string | null) => {
    if (!countryCode) return "🌐";
    const codePoints = countryCode
      .toUpperCase()
      .split("")
      .map((char) => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  };

  return (
    <div className="space-y-4">
      {/* Map Container */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              <CardTitle>Live Security Map</CardTitle>
            </div>
            <Badge variant="outline" className="gap-2 animate-pulse">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              Live
            </Badge>
          </div>
          <CardDescription>Real-time VPN/proxy detection attempts worldwide</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div ref={mapContainer} className="h-[400px] w-full" />
          <style>
            {`
              @keyframes pulse-marker {
                0%, 100% {
                  transform: scale(1);
                  opacity: 1;
                }
                50% {
                  transform: scale(2);
                  opacity: 0.3;
                }
              }
            `}
          </style>
        </CardContent>
      </Card>

      {/* Recent Detections Feed */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-destructive" />
              <CardTitle>Recent Detections</CardTitle>
            </div>
            <Badge variant="secondary">{liveCount} Total</Badge>
          </div>
          <CardDescription>Latest blocked attempts from suspicious sources</CardDescription>
        </CardHeader>
        <CardContent>
          {recentDetections.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No recent detections</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentDetections.map((detection, index) => (
                <div
                  key={`${detection.ip_address}-${index}`}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors animate-fade-in"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">
                      {getCountryFlag(detection.country_code)}
                    </div>
                    <div>
                      <div className="font-mono text-sm font-medium">
                        {detection.ip_address}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(detection.blocked_at).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {detection.is_vpn && (
                      <Badge variant="destructive" className="text-xs">
                        VPN
                      </Badge>
                    )}
                    {detection.is_proxy && (
                      <Badge variant="destructive" className="text-xs">
                        Proxy
                      </Badge>
                    )}
                    {detection.is_tor && (
                      <Badge variant="destructive" className="text-xs">
                        Tor
                      </Badge>
                    )}
                    {detection.fraud_score && detection.fraud_score > 75 && (
                      <Badge
                        variant={detection.fraud_score > 85 ? "destructive" : "secondary"}
                        className="text-xs gap-1"
                      >
                        <AlertTriangle className="h-3 w-3" />
                        {detection.fraud_score}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
