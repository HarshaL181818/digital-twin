import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import { Graph, alg } from 'graphlib'; // Import both Graph and alg from graphlib

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN;

const ShortestRouteFinder = () => {
  const mapContainerRef = useRef(null);
  const [map, setMap] = useState(null);
  const [draw, setDraw] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);

  // States for source and destination coordinates
  const [sourceCoordinates, setSourceCoordinates] = useState('');
  const [destinationCoordinates, setDestinationCoordinates] = useState('');

  const [viewport, setViewport] = useState({
    center: [-74.009, 40.7128],
    zoom: 14,
    pitch: 60,
    bearing: -17.6
  });

  // New state to control if source/destination selection is enabled
  const [enableSelection, setEnableSelection] = useState(false);

  // State to store graph data
  const [graph, setGraph] = useState(new Graph());

  // Map initialization and event handling
  useEffect(() => {
    // Initialize the map only once (on first render)
    const mapInstance = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: viewport.center,
      zoom: viewport.zoom,
      pitch: viewport.pitch,
      bearing: viewport.bearing,
    });
  
    // Initialize MapboxDraw control
    const drawInstance = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        line_string: true,
        trash: true,
      },
    });
    
    mapInstance.addControl(drawInstance);
    setDraw(drawInstance);
    setMap(mapInstance);
  
    // Update viewport state when the map is moved
    mapInstance.on('moveend', () => {
      setViewport({
        center: mapInstance.getCenter(),
        zoom: mapInstance.getZoom(),
        pitch: mapInstance.getPitch(),
        bearing: mapInstance.getBearing(),
      });
    });
  
    return () => mapInstance.remove(); // Cleanup on component unmount
  }, []); // Empty dependency array ensures this useEffect only runs once
  
  

  const setRoute = () => {
    if (draw) {
      const data = draw.getAll();
      if (data.features.length > 0) {
        const route = data.features[0];
        setSelectedRoute(route);
        const coordinates = route.geometry.coordinates;

        setRoutes((prevRoutes) => [...prevRoutes, coordinates]);

        if (map) {
          map.addSource('route' + routes.length, {
            type: 'geojson',
            data: route,
          });
          map.addLayer({
            id: 'route' + routes.length,
            type: 'line',
            source: 'route' + routes.length,
            paint: {
              'line-color': '#FF0000',
              'line-width': 4,
            },
          });
        }

        draw.deleteAll();
      }
    }
  };

  const convertRoutesToGraph = () => {
    const newGraph = new Graph();

    routes.forEach((route) => {
      for (let i = 0; i < route.length - 1; i++) {
        const from = route[i];
        const to = route[i + 1];

        newGraph.setNode(`${from[0]},${from[1]}`);
        newGraph.setNode(`${to[0]},${to[1]}`);
        newGraph.setEdge(`${from[0]},${from[1]}`, `${to[0]},${to[1]}`, {
          weight: Math.sqrt(
            Math.pow(to[0] - from[0], 2) + Math.pow(to[1] - from[1], 2)
          ),
        });
      }
    });

    setGraph(newGraph);
    console.log('Graph:', newGraph);
  };

  const findShortestPath = () => {
    // Ensure both source and destination coordinates are set and are not empty
    if (!sourceCoordinates || !destinationCoordinates) {
      alert('Please select both source and destination coordinates.');
      return;
    }
  
    // Log the coordinates to check their format before splitting
    console.log('Source Coordinates:', sourceCoordinates);
    console.log('Destination Coordinates:', destinationCoordinates);
  
    // Split the coordinates into lat/lng (ensure they are properly formatted)
    const sourceNode = sourceCoordinates.split(',').map(Number);
    const destinationNode = destinationCoordinates.split(',').map(Number);
  
    // Log the parsed coordinates to verify the split works
    console.log('Parsed Source Node:', sourceNode);
    console.log('Parsed Destination Node:', destinationNode);
  
    if (sourceNode.length !== 2 || destinationNode.length !== 2) {
      alert('Invalid coordinates format.');
      return;
    }
  
    const start = `${sourceNode[0]},${sourceNode[1]}`;
    const end = `${destinationNode[0]},${destinationNode[1]}`;
  
    try {
      // Using Dijkstra to find the shortest path
      const dijkstraResult = alg.dijkstra(graph, start);  // Use alg.dijkstra here
      const path = [];
  
      let currentNode = end;
      while (currentNode !== start) {
        path.unshift(currentNode);  // Prepend to get the correct order
        currentNode = dijkstraResult.predecessors[currentNode];
        if (!currentNode) {
          alert('No path found.');
          return;
        }
      }
  
      path.unshift(start);  // Add the start node at the beginning
  
      console.log('Shortest Path:', path);
    } catch (error) {
      alert('Error finding the shortest path.');
      console.log(error);
    }
  };
  

  const logWaypoints = () => {
    console.log('All previously added waypoints:');
    routes.forEach((route, index) => {
      console.log(`Route ${index + 1}:`, route);
    });
  };

  const toggleSelectionMode = () => {
    setEnableSelection(!enableSelection);
  };

  const handleMapClick = (event) => {
    if (enableSelection) {
      const { lngLat } = event;

      // Check if source or destination should be set based on which one is empty
      if (!sourceCoordinates) {
        setSourceCoordinates(`${lngLat.lng.toFixed(4)}, ${lngLat.lat.toFixed(4)}`);
      } else if (!destinationCoordinates) {
        setDestinationCoordinates(`${lngLat.lng.toFixed(4)}, ${lngLat.lat.toFixed(4)}`);
      }
      setEnableSelection(false); // Disable selection after both coordinates are set
    }
  };

  useEffect(() => {
    if (map) {
      map.on('click', handleMapClick);
    }

    return () => {
      if (map) {
        map.off('click', handleMapClick);
      }
    };
  }, [map, enableSelection]);

  return (
    <div>
      <div
        ref={mapContainerRef}
        style={{
          width: '100%',
          height: '100vh',
        }}
      />

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
        <div className="mb-3">
          <label htmlFor="source" className="form-label">Source Coordinates</label>
          <input
            type="text"
            className="form-control"
            id="source"
            value={sourceCoordinates}
            readOnly
            onClick={toggleSelectionMode} // Enable selecting after clicking
          />
        </div>

        <div className="mb-3">
          <label htmlFor="destination" className="form-label">Destination Coordinates</label>
          <input
            type="text"
            className="form-control"
            id="destination"
            value={destinationCoordinates}
            readOnly
            onClick={toggleSelectionMode} // Enable selecting after clicking
          />
        </div>

        <button className="btn btn-success mb-3" onClick={setRoute}>
          Set Route
        </button>
        <button className="btn btn-primary mb-3" onClick={convertRoutesToGraph}>
          Convert Routes to Graph
        </button>
        <button className="btn btn-info mb-3" onClick={findShortestPath}>
          Find Shortest Path
        </button>
        <button className="btn btn-info" onClick={logWaypoints}>
          Log All Waypoints
        </button>
      </div>
    </div>
  );
};

export default ShortestRouteFinder;
