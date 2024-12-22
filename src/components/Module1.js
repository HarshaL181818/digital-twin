import React, { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import * as THREE from 'three';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN;

// IndexedDB setup and helper functions
const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('BuildingsDB', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('buildings')) {
        const store = db.createObjectStore('buildings', { keyPath: 'id' });
        store.createIndex('location', 'location', { unique: false });
      }
    };
  });
};

const Module1 = () => {
  const mapContainerRef = useRef(null);
  const [map, setMap] = useState(null);
  const [clickedLocation, setClickedLocation] = useState(null);
  const [buildingWidth, setBuildingWidth] = useState(30);
  const [buildingHeight, setBuildingHeight] = useState(50);
  const [buildingColor, setBuildingColor] = useState('#ff0000');
  const [buildings, setBuildings] = useState([]);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [db, setDB] = useState(null);
  const [buildingRotation, setBuildingRotation] = useState(0);
  const rendererRef = useRef(null);

  // Initialize IndexedDB
  useEffect(() => {
    initDB().then(database => setDB(database));
  }, []);

  // Load buildings from IndexedDB
  const loadBuildings = async () => {
    if (!db || !map) return;

    const transaction = db.transaction(['buildings'], 'readonly');
    const store = transaction.objectStore('buildings');
    const request = store.getAll();

    request.onsuccess = () => {
      const loadedBuildings = request.result;
      setBuildings(loadedBuildings);
      
      // Display all buildings on the map
      loadedBuildings.forEach(building => {
        displayBuilding(building);
      });
    };
  };

  // Load buildings when db and map are ready
  useEffect(() => {
    if (db && map) {
      loadBuildings();
    }
  }, [db, map]);

  const displayBuilding = (building) => {
    if (!map) return;

    const buildingId = `building-${building.id}`;

    // Remove existing building if it exists
    if (map.getLayer(buildingId)) {
      map.removeLayer(buildingId);
      map.removeSource(buildingId);
    }

    // Add building to map
    map.addSource(buildingId, {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: building.coordinates
        }
      }
    });

    map.addLayer({
      id: buildingId,
      type: 'fill-extrusion',
      source: buildingId,
      paint: {
        'fill-extrusion-color': building.color,
        'fill-extrusion-height': building.height,
        'fill-extrusion-opacity': 0.8,
      }
    });
  };

  // Initialize map
  useEffect(() => {
    const mapInstance = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [77.5946, 12.9716],
      zoom: 15,
      pitch: 60,
      bearing: -45,
      antialias: true,
    });

    mapInstance.on('click', (e) => {
      const coordinates = [e.lngLat.lng, e.lngLat.lat];
      setClickedLocation(coordinates);
      updateClickMarker(mapInstance, coordinates);
    });

    mapInstance.on('style.load', () => {
      mapInstance.addLayer({
        id: '3d-buildings',
        source: 'composite',
        'source-layer': 'building',
        type: 'fill-extrusion',
        paint: {
          'fill-extrusion-color': '#aaa',
          'fill-extrusion-height': ['get', 'height'],
          'fill-extrusion-base': ['get', 'min_height'],
          'fill-extrusion-opacity': 0.6,
        },
      });
    });

    setMap(mapInstance);

    return () => mapInstance.remove();
  }, []);

  const updateClickMarker = (mapInstance, coordinates) => {
    if (mapInstance.getLayer('click-point')) {
      mapInstance.removeLayer('click-point');
      mapInstance.removeSource('click-point');
    }

    mapInstance.addSource('click-point', {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: coordinates
        }
      }
    });

    mapInstance.addLayer({
      id: 'click-point',
      type: 'circle',
      source: 'click-point',
      paint: {
        'circle-radius': 6,
        'circle-color': buildingColor
      }
    });
  };

  const handleAddBuilding = async () => {
    if (!clickedLocation || !map || !db) return;

    const size = buildingWidth / 111111;
    const coordinates = getRotatedCoordinates(clickedLocation, size, buildingRotation);

    const building = {
      id: Date.now().toString(),
      location: clickedLocation,
      coordinates,
      width: buildingWidth,
      height: buildingHeight,
      color: buildingColor,
      rotation: buildingRotation,
      createdAt: new Date().toISOString()
    };

    // Save to IndexedDB
    const transaction = db.transaction(['buildings'], 'readwrite');
    const store = transaction.objectStore('buildings');
    await store.add(building);

    // Update state and display
    setBuildings(prev => [...prev, building]);
    displayBuilding(building);
    setClickedLocation(null);

    // Remove click marker
    if (map.getLayer('click-point')) {
      map.removeLayer('click-point');
      map.removeSource('click-point');
    }
  }

  const handleDeleteBuilding = async (buildingId) => {
    if (!db || !map) return;

    // Remove from IndexedDB
    const transaction = db.transaction(['buildings'], 'readwrite');
    const store = transaction.objectStore('buildings');
    await store.delete(buildingId);

    // Remove from map
    if (map.getLayer(`building-${buildingId}`)) {
      map.removeLayer(`building-${buildingId}`);
      map.removeSource(`building-${buildingId}`);
    }

    // Update state
    setBuildings(prev => prev.filter(b => b.id !== buildingId));
    setSelectedBuilding(null);
  };

  const handleUpdateBuilding = async () => {
    if (!selectedBuilding || !db || !map) return;

    const size = buildingWidth / 111111;
    const coordinates = getRotatedCoordinates(
      selectedBuilding.location,
      size,
      buildingRotation
    );

    const updatedBuilding = {
      ...selectedBuilding,
      width: buildingWidth,
      height: buildingHeight,
      color: buildingColor,
      rotation: buildingRotation,
      coordinates
    };

    // Update in IndexedDB
    const transaction = db.transaction(['buildings'], 'readwrite');
    const store = transaction.objectStore('buildings');
    await store.put(updatedBuilding);

    // Update display
    displayBuilding(updatedBuilding);

    // Update state
    setBuildings(prev => prev.map(b => 
      b.id === selectedBuilding.id ? updatedBuilding : b
    ));
    setSelectedBuilding(null);
  };

  const handleSelectBuilding = (building) => {
    setSelectedBuilding(building);
    setBuildingWidth(building.width);
    setBuildingHeight(building.height);
    setBuildingColor(building.color);
    setBuildingRotation(building.rotation || 0);
  };

  const getRotatedCoordinates = (center, size, rotation) => {
    // Convert rotation to radians
    const rad = (rotation * Math.PI) / 180;
    
    // Calculate corner points before rotation
    const points = [
      [-size/2, -size/2], // top left
      [size/2, -size/2],  // top right
      [size/2, size/2],   // bottom right
      [-size/2, size/2],  // bottom left
    ];

    const rotatedPoints = points.map(([x, y]) => {
      const rotatedX = x * Math.cos(rad) - y * Math.sin(rad);
      const rotatedY = x * Math.sin(rad) + y * Math.cos(rad);
      return [
        center[0] + rotatedX,
        center[1] + rotatedY
      ];
    });

    return [
      [...rotatedPoints, rotatedPoints[0]]
    ];
  };

  // Styles
  const containerStyle = {
    display: 'flex',
    height: '100vh',
    gap: '20px',
    padding: '20px'
  };

  const mapStyle = {
    flexGrow: 1,
    height: '100%'
  };

  const sidebarStyle = {
    width: '300px',
    backgroundColor: '#f8f9fa',
    padding: '20px',
    borderRadius: '8px',
    overflowY: 'auto'
  };

  const controlStyle = {
    marginBottom: '15px'
  };

  const buttonStyle = {
    padding: '8px 16px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginTop: '10px'
  };

  const buildingListStyle = {
    listStyle: 'none',
    padding: 0
  };

  const buildingItemStyle = {
    padding: '10px',
    border: '1px solid #ddd',
    marginBottom: '5px',
    borderRadius: '4px',
    cursor: 'pointer'
  };

  return (
    <div style={containerStyle}>
      <div style={mapStyle} ref={mapContainerRef} />
      <div style={sidebarStyle}>
        <h3>Building Controls</h3>
        <div style={controlStyle}>
          <label>Width (m): </label>
          <input
            type="number"
            value={buildingWidth}
            onChange={(e) => setBuildingWidth(Number(e.target.value))}
            min="1"
            max="100"
          />
        </div>
        <div style={controlStyle}>
          <label>Height (m): </label>
          <input
            type="number"
            value={buildingHeight}
            onChange={(e) => setBuildingHeight(Number(e.target.value))}
            min="1"
            max="500"
          />
        </div>
        <div style={controlStyle}>
          <label>Rotation (degrees): </label>
          <input
            type="number"
            value={buildingRotation}
            onChange={(e) => setBuildingRotation(Number(e.target.value))}
            min="0"
            max="360"
            step="5"
          />
          <input
            type="range"
            value={buildingRotation}
            onChange={(e) => setBuildingRotation(Number(e.target.value))}
            min="0"
            max="360"
            step="5"
            style={{ width: '100%', marginTop: '5px' }}
          />
        </div>
        <div style={controlStyle}>
          <label>Color: </label>
          <input
            type="color"
            value={buildingColor}
            onChange={(e) => setBuildingColor(e.target.value)}
          />
        </div>
        {selectedBuilding ? (
          <>
            <button style={buttonStyle} onClick={handleUpdateBuilding}>
              Update Building
            </button>
            <button 
              style={{...buttonStyle, backgroundColor: '#dc3545', marginLeft: '10px'}} 
              onClick={() => handleDeleteBuilding(selectedBuilding.id)}
            >
              Delete Building
            </button>
          </>
        ) : (
          <button 
            style={buttonStyle} 
            onClick={handleAddBuilding}
            disabled={!clickedLocation}
          >
            Add Building
          </button>
        )}

        <h3>Buildings List</h3>
        <ul style={buildingListStyle}>
          {buildings.map(building => (
            <li 
              key={building.id} 
              style={{
                ...buildingItemStyle,
                backgroundColor: selectedBuilding?.id === building.id ? '#e9ecef' : 'white'
              }}
              onClick={() => handleSelectBuilding(building)}
            >
              Building {building.id.slice(-4)}
              <div style={{
                width: '20px',
                height: '20px',
                backgroundColor: building.color,
                display: 'inline-block',
                marginLeft: '10px',
                border: '1px solid #ddd',
                transform: `rotate(${building.rotation || 0}deg)`
              }} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Module1;