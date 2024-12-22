import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import 'bootstrap/dist/css/bootstrap.min.css';

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN; // Replace with your Mapbox token

const Pollution = () => {
  const mapContainerRef = useRef(null);
  const [isDarkMode, setIsDarkMode] = useState(false); // State to track mode
  const [map, setMap] = useState(null); // State to hold the map instance
  const [isClickListenerEnabled, setIsClickListenerEnabled] = useState(false); // State for click listener

  useEffect(() => {
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
        intensity: 1.5,
        position: [200, 80],
      });

      // Add 3D buildings
      mapInstance.addLayer({
        id: '3d-buildings',
        source: 'composite',
        'source-layer': 'building',
        filter: ['==', 'extrude', 'true'],
        type: 'fill-extrusion',
        paint: {
          'fill-extrusion-color': '#444444',
          'fill-extrusion-height': ['get', 'height'],
          'fill-extrusion-base': ['get', 'min_height'],
          'fill-extrusion-opacity': 1,
        },
      });
    });

    return () => mapInstance.remove(); // Clean up the map on unmount
  }, [isDarkMode]); // Re-run the effect when mode changes

  useEffect(() => {
    if (map && isClickListenerEnabled) {
      const handleClick = async (event) => {
        const { lng, lat } = event.lngLat;
        console.log(`Clicked coordinates: Longitude ${lng}, Latitude ${lat}`);
      
        // API request to fetch air pollution data
        try {
          const response = await fetch(
            `http://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lng}&appid=${process.env.REACT_APP_OPENWEATHERMAP_API_KEY}`
          );
          const data = await response.json();
          const aqi = data.list[0]?.main?.aqi;
          console.log('Air Quality Index (AQI):', aqi);
        } catch (error) {
          console.error('Error fetching air pollution data:', error);
        }
      };
      
      map.on('click', handleClick);

      return () => map.off('click', handleClick); // Remove listener when disabled
    }
  }, [map, isClickListenerEnabled]);

  const toggleMode = () => {
    setIsDarkMode((prevMode) => !prevMode);
  };

  const toggleClickListener = () => {
    setIsClickListenerEnabled((prevState) => !prevState);
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

      {/* Floating panel */}
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

        {/* Switch for Dark Mode */}
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

        {/* Button to enable/disable click listener */}
        <button
          className={`btn ${isClickListenerEnabled ? 'btn-danger' : 'btn-success'}`}
          onClick={toggleClickListener}
        >
          {isClickListenerEnabled ? 'Disable Click Listener' : 'Enable Click Listener'}
        </button>
      </div>
    </div>
  );
};

export default Pollution;
