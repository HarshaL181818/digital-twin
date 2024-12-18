import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import MapboxDirections from '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions';

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN;

const Module2 = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const draw = useRef(null);
  const [customRoutes, setCustomRoutes] = useState([]);
  const directionsControl = useRef(null);

  useEffect(() => {
    if (map.current) return; // Initialize map only once

    // Initialize the map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [77.5946, 12.9716], // Example center (Bangalore)
      zoom: 14,
    });

    // Add drawing control for custom routes
    draw.current = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        line_string: true,
        trash: true,
      },
    });
    map.current.addControl(draw.current, 'top-left');

    // Handle custom route drawing
    map.current.on('draw.create', (e) => {
      const data = draw.current.getAll();
      if (data.features.length > 0) {
        const newRoute = data.features[0];
        setCustomRoutes((prevRoutes) => [...prevRoutes, newRoute]);
        console.log('Coordinates of the drawn line:', newRoute.geometry.coordinates);
      }
    });

    map.current.on('draw.delete', () => {
      console.log('Custom route deleted');
    });
  }, []);

  const enableRouting = () => {
    // Avoid enabling multiple times
    if (directionsControl.current) return;

    // Initialize and add the directions control
    directionsControl.current = new MapboxDirections({
      accessToken: mapboxgl.accessToken,
      unit: 'metric',
      profile: 'mapbox/driving',
    });
    map.current.addControl(directionsControl.current, 'top-left');
  };

  const handleDirections = (origin, destination) => {
    // Check if there are any custom routes available between origin and destination
    const customRoute = customRoutes.find(route => {
      // Here you would compare if the custom route intersects with the given origin and destination
      return isRouteBetween(route, origin, destination); // Replace with your actual logic
    });

    if (customRoute) {
      // Use the custom route
      console.log('Using custom route:', customRoute);
      // Here, you would add this custom route to the directions API
      directionsControl.current.setWaypoints([origin, destination]); // Ensure this works with custom routes if supported
    } else {
      // Use default Mapbox Directions API to find the route
      directionsControl.current.setWaypoints([origin, destination]);
    }
  };

  return (
    <div style={{ height: '100vh', width: '100%' }}>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
      <button
        onClick={() => console.log('Routes added:', customRoutes)}
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          zIndex: 1,
          padding: '10px 20px',
          backgroundColor: '#0078ff',
          color: '#fff',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
        }}
      >
        Log Routes
      </button>
      <button
        onClick={enableRouting}
        style={{
          position: 'absolute',
          top: 50,
          left: 10,
          zIndex: 1,
          padding: '10px 20px',
          backgroundColor: '#00cc66',
          color: '#fff',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
        }}
      >
        Enable Default Routing
      </button>
    </div>
  );
};

// Utility function to check if a route intersects the origin and destination
const isRouteBetween = (route, origin, destination) => {
  // Custom logic to check if the route intersects the origin and destination
  return true; // Return true if this is the case
};

export default Module2;
