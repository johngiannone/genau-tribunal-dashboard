declare module 'mapbox-gl' {
  export class Map {
    constructor(options: any);
    addControl(control: any, position?: string): this;
    remove(): void;
    scrollZoom: { disable(): void; enable(): void };
    setFog(options: any): this;
    getZoom(): number;
    getCenter(): { lng: number; lat: number };
    easeTo(options: any): this;
    on(event: string, callback: () => void): this;
  }

  export class Marker {
    constructor(element?: HTMLElement);
    setLngLat(lngLat: [number, number]): this;
    setPopup(popup: Popup): this;
    addTo(map: Map): this;
    remove(): void;
  }

  export class Popup {
    constructor(options?: any);
    setHTML(html: string): this;
  }

  export class NavigationControl {
    constructor(options?: any);
  }

  export let accessToken: string;
}

declare module 'mapbox-gl/dist/mapbox-gl.css';
