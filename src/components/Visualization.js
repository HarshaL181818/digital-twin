import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import 'bootstrap/dist/css/bootstrap.min.css'; // Ensure Bootstrap is imported

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN; // Replace with your Mapbox token

const Visualization = () => {
  const mapContainerRef = useRef(null);
  const [isDarkMode, setIsDarkMode] = useState(false); // State to track mode
  const [pollutionData, setPollutionData] = useState(null); // State to store pollution data
  const [heatmapVisible, setHeatmapVisible] = useState(false); // State to control heatmap visibility
  const [map, setMap] = useState(null); // State to hold the map instance

  // Function to fetch pollution data and convert it to GeoJSON
  const fetchPollutionData = async () => {
    try {
      const response = await fetch('https://api.openaq.org/v2/measurements?parameter=pm25&limit=1000');
      const data = await response.json();
      if (data && data.results) {
        const geoJsonData = {
          type: 'FeatureCollection',
          features: data.results.map((result) => ({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [result.coordinates.longitude, result.coordinates.latitude], // Longitude, Latitude
            },
            properties: {
              pollution_level: result.value, // Pollution level (e.g., PM2.5 value)
            },
          })),
        };
        setPollutionData(geoJsonData); // Store the data in state
      } else {
        console.error('No pollution data available.');
      }
    } catch (error) {
      console.error('Error fetching pollution data:', error);
    }
  };

  useEffect(() => {
    // Fetch pollution data on component mount
    fetchPollutionData();

    // Initialize Mapbox map
    const mapInstance = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: isDarkMode ? 'mapbox://styles/mapbox/streets-v12' : 'mapbox://styles/mapbox/light-v11', // Switch styles
      center: [-74.009, 40.7128],
      zoom: 14,
      pitch: 60,
      bearing: -17.6,
    });

    // Set map instance to state
    setMap(mapInstance);

    mapInstance.on('load', () => {
      // Set directional light for the 3D scene
      mapInstance.setLight({
        anchor: 'viewport',
        color: 'white',
        intensity: 1.5, // Stronger light
        position: [200, 80], // Simulate sunlight
      });

      // Add 3D buildings with distinct colors and lighting
      mapInstance.addLayer({
        id: '3d-buildings',
        source: 'composite',
        'source-layer': 'building',
        filter: ['==', 'extrude', 'true'],
        type: 'fill-extrusion',
        paint: {
          'fill-extrusion-color': '#444444', // Slightly lighter black for buildings
          'fill-extrusion-height': ['get', 'height'],
          'fill-extrusion-base': ['get', 'min_height'],
          'fill-extrusion-opacity': 1, // Fully opaque
        },
      });

      // Simulate shadows for the buildings
      mapInstance.addLayer({
        id: 'building-shadows',
        source: 'composite',
        'source-layer': 'building',
        filter: ['==', 'extrude', 'true'],
        type: 'fill-extrusion',
        paint: {
          'fill-extrusion-color': 'rgba(0, 0, 0, 0.5)', // Shadow color
          'fill-extrusion-height': ['get', 'height'],
          'fill-extrusion-base': ['get', 'min_height'],
          'fill-extrusion-translate': [10, 10], // Offset to simulate shadow direction
          'fill-extrusion-opacity': 0.3, // Subtle shadow effect
        },
        before: '3d-buildings', // Place shadows behind buildings
      });
    });

    return () => mapInstance.remove(); // Clean up the map on unmount
  }, [isDarkMode]); // Re-run the effect when mode changes

  // Function to toggle heatmap visibility
  const toggleHeatmap = () => {
    if (map && pollutionData) {
      if (heatmapVisible) {
        // Remove heatmap layer if visible
        map.removeLayer('heatmap');
        setHeatmapVisible(false);
      } else {
        // Add heatmap layer if not visible
        map.addLayer({
          id: 'heatmap',
          type: 'heatmap',
          source: {
            type: 'geojson',
            data: pollutionData, // Set the GeoJSON data for the pollution points
          },
          paint: {
            'heatmap-weight': ['get', 'pollution_level'], // Map pollution level to intensity
            'heatmap-intensity': 1.5,
            'heatmap-radius': 20,
            'heatmap-opacity': 0.8,
          },
        });
        setHeatmapVisible(true);
      }
    }
  };

  // Toggle between dark and light mode
  const toggleMode = () => {
    setIsDarkMode((prevMode) => !prevMode);
  };

  return (
    <div>
      <div
        ref={mapContainerRef}
        style={{
          width: '100%',
          height: '100vh',
        }}
      />

      {/* Floating panel with improved CSS */}
      <div
        className="position-fixed top-0 start-0 p-4"
        style={{
          zIndex: 9999,
          background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.1), rgba(255, 255, 255, 0.9))',
          width: '250px',
          height: '100vh',
          borderRadius: '20px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          transition: 'transform 0.3s ease-in-out',
          transform: 'translateX(0)',
        }}
      >
        <h5 className="mb-4">Settings Panel</h5>
        {/* Button 1 to toggle the heatmap visibility */}
        <button className="btn btn-primary mb-3 w-100" onClick={toggleHeatmap}>
          Toggle Heatmap
        </button>

        {/* Switch inside the panel */}
        <div className="form-check form-switch mb-3">
          <input
            className="form-check-input"
            type="checkbox"
            checked={isDarkMode}
            onChange={toggleMode}
            id="darkModeSwitch"
          />
          <label className="form-check-label" htmlFor="darkModeSwitch">
            {isDarkMode ? 'Dark Mode' : 'Light Mode'}
          </label>
        </div>
      </div>
    </div>
  );
};

export default Visualization;
