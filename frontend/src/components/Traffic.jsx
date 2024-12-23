import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxDirections from '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions';
import '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions.css';
import 'mapbox-gl/dist/mapbox-gl.css';
import 'bootstrap/dist/css/bootstrap.min.css';

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN; // Replace with your Mapbox token

const Traffic = () => {
  const mapContainerRef = useRef(null);
  const [map, setMap] = useState(null);
  const [route, setRoute] = useState([]); // Store the coordinates along the route
  const [isTrafficEnabled, setIsTrafficEnabled] = useState(false); // Track if traffic layer is enabled

  useEffect(() => {
    // Initialize the Mapbox map
    const mapInstance = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12', // Default style (regular map)
      center: [-74.009, 40.7128],
      zoom: 14,
      pitch: 60,
      bearing: -17.6,
    });

    // Add the default navigation controls
    mapInstance.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add the Mapbox Directions plugin
    const directions = new MapboxDirections({
      accessToken: mapboxgl.accessToken,
      unit: 'metric',
      profile: 'mapbox/driving', // Can be 'walking', 'cycling', etc.
    });
    mapInstance.addControl(directions, 'top-left'); // Add directions control to the map

    // Listen for the "route" event from the Directions plugin
    directions.on('route', (e) => {
      console.log('Route event triggered:', e); // Log the event object

      // Check if route data exists
      if (e.route && e.route.length > 0) {
        // Log the full route object to inspect its structure
        console.log('Full route object:', e.route);

        // Check if legs exist and extract coordinates
        const routeData = e.route[0].legs.flatMap(leg => leg.steps.map(step => step.maneuver.location));

        if (routeData && routeData.length > 0) {
          setRoute(routeData); // Store the coordinates
          console.log('Route coordinates:', routeData); // Log the route coordinates
        } else {
          console.log('No valid coordinates found in the route legs.');
        }

        // Add alternative routes if available
        if (e.route.length > 1) {
          e.route.forEach((altRoute, index) => {
            const altLayerId = `directions-route-line-alt-${index}`;
            if (!mapInstance.getLayer(altLayerId)) {
              mapInstance.addLayer({
                id: altLayerId,
                type: 'line',
                source: {
                  type: 'geojson',
                  data: altRoute.geometry,
                },
                paint: {
                  'line-color': '#ff7f00',
                  'line-width': 5,
                },
              });
            }
          });
        }
      } else {
        console.log('No valid route data found.');
      }
    });

    // Store map instance
    setMap(mapInstance);

    // Cleanup map instance on unmount
    return () => {
      if (mapInstance) mapInstance.remove();
    };
  }, []);

  // Function to toggle traffic layer on/off
  const toggleTrafficLayer = () => {
    if (map) {
      if (isTrafficEnabled) {
        // Remove the traffic layer
        map.setStyle('mapbox://styles/mapbox/streets-v12'); // Switch back to regular map style
      } else {
        // Add the traffic layer (day version)
        map.setStyle('mapbox://styles/mapbox/traffic-day-v2'); // Switch to day traffic map style
      }
      setIsTrafficEnabled(!isTrafficEnabled); // Toggle the state
    }
  };

  // Function to calculate the distance between two coordinates in meters
  const calculateDistance = (coord1, coord2) => {
    const [lng1, lat1] = coord1;
    const [lng2, lat2] = coord2;
    const R = 6371000; // Earth radius in meters
    const φ1 = lat1 * (Math.PI / 180); // Latitude in radians
    const φ2 = lat2 * (Math.PI / 180); // Latitude in radians
    const Δφ = (lat2 - lat1) * (Math.PI / 180);
    const Δλ = (lng2 - lng1) * (Math.PI / 180);

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in meters
  };

  // Function to create a vehicle element (it must be defined before usage)
  const createVehicleElement = () => {
    const vehicleElement = document.createElement('div');
    vehicleElement.className = 'vehicle';
    vehicleElement.style.width = '30px';
    vehicleElement.style.height = '30px';
    vehicleElement.style.backgroundColor = 'red';
    vehicleElement.style.borderRadius = '50%';
    vehicleElement.style.position = 'absolute';
    vehicleElement.style.transform = 'translate(-50%, -50%)';
    return vehicleElement;
  };

  // Function to animate the vehicle along the route
  const animateVehicle = () => {
    if (route.length === 0) {
      console.log("No route to animate.");
      return;
    }

    const vehicleElement = createVehicleElement(); // Create the vehicle element
    const vehicleMarker = new mapboxgl.Marker(vehicleElement)
      .setLngLat(route[0]) // Start at the first coordinate
      .addTo(map);

    let index = 0;
    const stepSize = 0.00005; // Fixed step size (in degrees, adjust as needed for smoother transition)
    const totalDistance = calculateDistance(route[0], route[route.length - 1]); // Total distance
    const speed = 1; // Distance to move per frame (higher values make the marker move faster)

    // Function to move the vehicle with constant speed
    const moveVehicle = () => {
      if (index < route.length - 1) {
        const start = route[index];
        const end = route[index + 1];
        
        // Calculate the total distance between the current and next point
        const distance = calculateDistance(start, end);
        const numSteps = Math.floor(distance / speed); // Number of steps for this segment

        let currentStep = 0;

        const animateStep = () => {
          if (currentStep < numSteps) {
            const progress = currentStep / numSteps;
            const interpolatedLng = start[0] + (end[0] - start[0]) * progress;
            const interpolatedLat = start[1] + (end[1] - start[1]) * progress;

            vehicleMarker.setLngLat([interpolatedLng, interpolatedLat]);

            currentStep++;
            requestAnimationFrame(animateStep); // Continue animation
          } else {
            index++; // Move to the next segment
            if (index < route.length - 1) {
              requestAnimationFrame(moveVehicle); // Continue the overall animation
            }
          }
        };

        requestAnimationFrame(animateStep); // Start animating this segment
      }
    };

    moveVehicle(); // Start moving the vehicle
  };

  return (
    <div style={{ position: 'relative', height: '100vh' }}>
      {/* Map Container */}
      <div
        ref={mapContainerRef}
        style={{
          width: '100%',
          height: '100vh',
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      />

      {/* Right Panel */}
      <div
        className="position-fixed top-0 end-0 p-4"
        style={{
          zIndex: 9999,
          background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.1), rgba(255, 255, 255, 0.9))',
          width: '250px',
          height: '100vh',
          borderRadius: '20px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          transition: 'transform 0.3s ease-in-out',
        }}
      >
        {/* Panel Content */}
        <h5>Traffic Simulation</h5>
        <button onClick={animateVehicle} className="btn btn-primary">Start Simulation</button>
        <button onClick={toggleTrafficLayer} className="btn btn-secondary mt-2">
          {isTrafficEnabled ? 'Switch to Regular Map' : 'Show Traffic Map'}
        </button>
      </div>
    </div>
  );
};

export default Traffic;
