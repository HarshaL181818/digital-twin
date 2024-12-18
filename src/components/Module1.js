import React, { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import * as THREE from 'three';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN;

const Module1 = () => {
    const mapContainerRef = useRef(null);
  const [map, setMap] = useState(null);
  const [polygon, setPolygon] = useState(null);

  const rendererRef = useRef(null);


  useEffect(() => {
    // Initialize Mapbox map
    const mapInstance = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v11', // Map style
      center: [77.5946, 12.9716], // Bengaluru coordinates
      zoom: 15, // Initial zoom level
      pitch: 60, // Tilt the map for 3D view
      bearing: -45, // Rotate the map for perspective
      antialias: true, // Enable antialiasing for better visuals
    });

    // Add MapboxDraw for polygon drawing
    // Add MapboxDraw for polygon drawing
const draw = new MapboxDraw({
  displayControlsDefault: false,
  controls: {
    polygon: true,
    trash: true,
  },
});
mapInstance.addControl(draw);

// Handle polygon creation
mapInstance.on('draw.create', (e) => {
  const data = draw.getAll();
  if (data && data.features.length > 0) {
    const polygonData = data.features[0].geometry.coordinates;
    console.log('Polygon Coordinates:', polygonData);
    setPolygon(polygonData); // Save the new polygon data

    // Remove the drawn polygon after storing the coordinates
    draw.deleteAll();
    console.log('Polygon deleted after being saved');
  }
});

// Handle polygon updates
mapInstance.on('draw.update', (e) => {
  const data = draw.getAll();
  if (data && data.features.length > 0) {
    const polygonData = data.features[0].geometry.coordinates;
    console.log('Updated Polygon Coordinates:', polygonData);
    setPolygon(polygonData); // Update the polygon data in state

    // Remove the updated polygon after saving the new coordinates
    draw.deleteAll();
    console.log('Updated polygon deleted after being saved');
  }
});


    // Add 3D building layer
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

    // Set up Three.js renderer
    mapInstance.on('load', () => {
      const canvas = mapInstance.getCanvas();
      const renderer = new THREE.WebGLRenderer({
        canvas,
        context: mapInstance.painter.context.gl,
      });
      renderer.autoClear = false;
      rendererRef.current = renderer;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        75,
        canvas.clientWidth / canvas.clientHeight,
        0.1,
        1000
      );

      // Add a rotating cube for demo
      const geometry = new THREE.BoxGeometry(10, 10, 10);
      const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
      const cube = new THREE.Mesh(geometry, material);
      scene.add(cube);
      camera.position.set(0, 0, 50);

      // Synchronize Three.js rendering with Mapbox
      const animate = () => {
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;
        renderer.render(scene, camera);
      };

      mapInstance.on('render', animate);
    });

    setMap(mapInstance);

    return () => mapInstance.remove(); // Clean up on component unmount
  }, []);

  // Save polygon function
  const handleSavePolygon = () => {
    if (!polygon || !map) {
      console.log('No polygon selected or map is not initialized');
      return;
    }

    if (map.getSource('selected-polygon')) {
      map.removeLayer('selected-polygon-fill');
      map.removeLayer('selected-polygon-outline');
      map.removeSource('selected-polygon');
    }

    map.addSource('selected-polygon', {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: polygon,
        },
      },
    });

    map.addLayer({
      id: 'selected-polygon-fill',
      type: 'fill',
      source: 'selected-polygon',
      paint: {
        'fill-color': '#0080ff',
        'fill-opacity': 0.5,
      },
    });

    map.addLayer({
      id: 'selected-polygon-outline',
      type: 'line',
      source: 'selected-polygon',
      paint: {
        'line-color': '#000',
        'line-width': 3,
      },
    });

    console.log('Polygon saved and added to the map');
  };

  // Add building function
  const handleAddBuilding = () => {
    if (!polygon || !map) {
      console.log('No polygon selected or map is not initialized');
      return;
    }

    if (map.getSource('building-polygon')) {
      map.removeLayer('building-polygon-layer');
      map.removeSource('building-polygon');
    }

    map.addSource('building-polygon', {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: polygon,
        },
      },
    });

    map.addLayer({
      id: 'building-polygon-layer',
      type: 'fill-extrusion',
      source: 'building-polygon',
      paint: {
        'fill-extrusion-color': '#ff0000',
        'fill-extrusion-height': 50, // Set building height
        'fill-extrusion-opacity': 0.8,
      },
    });

    console.log('Building added to the map');
  };

  return (
    <div>
      <div ref={mapContainerRef} style={{ width: '100%', height: '500px' }} />
      <button onClick={handleSavePolygon}>Save Polygon</button>
      <button onClick={handleAddBuilding}>Add Building</button>
    </div>
  );
};

export default Module1;
