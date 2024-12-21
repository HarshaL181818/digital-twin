import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Base from './components/Base';  // The home page with buttons
import Module1 from './components/Module1';  // The page for Module1
import Module2 from './components/Module2';  // The page for Module2
import Visualization from './components/Visualization';  // Your Visualization page
import ShortestRouteFinder from './components/ShortestRouteFinder';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Base />} />
        <Route path="/module1" element={<Module1 />} />
        <Route path="/module2" element={<Module2 />} />
        <Route path="/Visualization" element={<Visualization />} />
        <Route path="/Shortest" element={<ShortestRouteFinder />} />
      </Routes>
    </Router>
  );
}

export default App;
