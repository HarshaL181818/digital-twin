import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN; // Ensure you have your Mapbox token

const Visualization = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);

  useEffect(() => {
    if (map.current) return; // Avoid reinitializing map

    // Initialize the Mapbox map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11', // Map style
      center: [-74.006, 40.7128], // Coordinates for New York City
      zoom: 14.5,
      pitch: 60, // Adds the 3D effect
      bearing: -17.6, // Optional tilt direction
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl());

    // Wait for map to load before adding any custom layers (like traffic data)
    map.current.on('load', () => {
      // Add traffic congestion areas (polygon data source)
      map.current.addSource('congestion-areas', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: {
                type: 'Polygon',
                coordinates: [
                  [
                    [-74.010, 40.710], // Example coordinates for a congested area
                    [-74.005, 40.710],
                    [-74.005, 40.715],
                    [-74.010, 40.715],
                    [-74.010, 40.710],
                  ],
                ],
              },
              properties: {
                congestion: 'high', // Example property for high congestion
              },
            },
            {
              type: 'Feature',
              geometry: {
                type: 'Polygon',
                coordinates: [
                  [
                    [-74.012, 40.712],
                    [-74.008, 40.712],
                    [-74.008, 40.717],
                    [-74.012, 40.717],
                    [-74.012, 40.712],
                  ],
                ],
              },
              properties: {
                congestion: 'medium', // Example property for medium congestion
              },
            },
            // Add more features as needed with different congestion levels
          ],
        },
      });

      // Add the congestion layer with solid color
      map.current.addLayer({
        id: 'congestion-layer',
        type: 'fill',
        source: 'congestion-areas',
        paint: {
          // Solid colors for different congestion levels
          'fill-color': [
            'match',
            ['get', 'congestion'],
            'high', '#FF0000', // Red for high congestion
            'medium', '#FFFF00', // Yellow for medium congestion
            'low', '#00FF00', // Green for low congestion
            '#FFFFFF', // Default color if no match
          ],
          'fill-opacity': 0.7, // Adjust opacity to allow map features to be visible beneath
        },
      });
    });
  }, []);

  return (
    <div
      ref={mapContainer}
      style={{
        width: '100%',
        height: '100vh', // Full screen map
      }}
    />
  );
};

export default Visualization;
