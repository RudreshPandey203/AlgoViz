'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Play, Pause } from 'lucide-react';

const exampleGraphs = [
  {
    name: "Global Network",
    edges: [
      { from: "London", to: "New York", weight: 7 },
      { from: "Tokyo", to: "Los Angeles", weight: 11 },
      { from: "Paris", to: "Montreal", weight: 7 },
      { from: "Sydney", to: "Vancouver", weight: 15 },
      { from: "Dubai", to: "Singapore", weight: 5 },
      { from: "New York", to: "Chicago", weight: 2 },
      { from: "Chicago", to: "Denver", weight: 3 },
      { from: "Denver", to: "Los Angeles", weight: 4 },
      { from: "Toronto", to: "Chicago", weight: 2 },
      { from: "San Francisco", to: "Denver", weight: 3 },
    ]
  },
  {
    name: "Simple Network",
    edges: [
      { from: "A", to: "B", weight: 4 },
      { from: "A", to: "C", weight: 2 },
      { from: "B", to: "C", weight: 5 },
      { from: "B", to: "D", weight: 10 },
      { from: "C", to: "D", weight: 3 },
      { from: "D", to: "E", weight: 4 },
      { from: "E", to: "F", weight: 2 },
    ]
  }
];

const bellmanFord = (edges, source, destination) => {
    
  const distances = {};
  const predecessors = {};
  const nodes = new Set(edges.flatMap(e => [e.from, e.to]));

  nodes.forEach(node => distances[node] = Infinity);
  distances[source] = 0;

  for (let i = 0; i < nodes.size - 1; i++) {
    edges.forEach(edge => {
      if (distances[edge.from] + edge.weight < distances[edge.to]) {
        distances[edge.to] = distances[edge.from] + edge.weight;
        predecessors[edge.to] = edge.from;
      }
    });
  }

  edges.forEach(edge => {
    if (distances[edge.from] + edge.weight < distances[edge.to]) {
      throw new Error("Negative-weight cycle detected");
    }
  });

  const path = [destination];
  while (path[0] !== source) {
    if (!predecessors[path[0]]) return { distance: Infinity, path: [] };
    path.unshift(predecessors[path[0]]);
  }

  return { distance: distances[destination], path };
};

const Page = () => {
    const [zoomPan, setZoomPan] = useState({ 
        scale: 1, 
        x: 0, 
        y: 0,
        isPanning: false,
        lastX: 0,
        lastY: 0
      });
    
      // Mouse wheel handler for zoom
      const handleWheel = (e) => {
        e.preventDefault();
        const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
        const rect = e.currentTarget.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
    
        setZoomPan(prev => {
          const newScale = prev.scale * scaleFactor;
          if (newScale < 0.1 || newScale > 3) return prev;
    
          return {
            ...prev,
            scale: newScale,
            x: mouseX - (mouseX - prev.x) * scaleFactor,
            y: mouseY - (mouseY - prev.y) * scaleFactor
          };
        });
      };
    
      // Mouse handlers for panning
      const handleMouseDown = (e) => {
        e.preventDefault();
        setZoomPan(prev => ({
          ...prev,
          isPanning: true,
          lastX: e.clientX,
          lastY: e.clientY
        }));
      };
    
      const handleMouseMove = (e) => {
        if (!zoomPan.isPanning) return;
        e.preventDefault();
        
        const dx = e.clientX - zoomPan.lastX;
        const dy = e.clientY - zoomPan.lastY;
    
        setZoomPan(prev => ({
          ...prev,
          x: prev.x + dx,
          y: prev.y + dy,
          lastX: e.clientX,
          lastY: e.clientY
        }));
      };
    
      const handleMouseUp = () => {
        setZoomPan(prev => ({
          ...prev,
          isPanning: false
        }));
      };
  const [graph, setGraph] = useState([]);
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [path, setPath] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(500);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [result, setResult] = useState(null);
  const [nodePositions, setNodePositions] = useState({});
  const svgRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const animationRef = useRef(null);

  // Dynamic layout calculation
  useEffect(() => {
    const nodes = Array.from(new Set(graph.flatMap(e => [e.from, e.to])));
    if (nodes.length === 0) return;

    const positions = {};
    const center = { x: dimensions.width/2, y: dimensions.height/2 };
    nodes.forEach((node, i) => {
      const angle = (i * 2 * Math.PI) / nodes.length;
      positions[node] = {
        x: center.x + Math.cos(angle) * Math.min(dimensions.width, dimensions.height)/3,
        y: center.y + Math.sin(angle) * Math.min(dimensions.width, dimensions.height)/3
      };
    });

    const iterations = 100;
    const strength = 0.1;
    
    for(let iter = 0; iter < iterations; iter++) {
      graph.forEach(edge => {
        const fromPos = positions[edge.from];
        const toPos = positions[edge.to];
        const dx = toPos.x - fromPos.x;
        const dy = toPos.y - fromPos.y;
        const distance = Math.hypot(dx, dy);
        const targetDistance = edge.weight * 30;

        if (distance > 0) {
          const force = (distance - targetDistance) * strength / distance;
          fromPos.x += dx * force;
          fromPos.y += dy * force;
          toPos.x -= dx * force;
          toPos.y -= dy * force;
        }
      });
    }
    
    setNodePositions(positions);
  }, [graph, dimensions]);

  // Responsive sizing
  useEffect(() => {
    const updateSize = () => {
      if (svgRef.current) {
        setDimensions({
          width: svgRef.current.clientWidth,
          height: svgRef.current.clientHeight
        });
      }
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Dynamic path calculation
  useEffect(() => {
    try {
      if (source && destination && graph.length > 0) {
        const newResult = bellmanFord(graph, source, destination);
        setResult(newResult);
        setPath(newResult.path);
        setCurrentPosition(null);
        if (isPlaying) {
          cancelAnimationFrame(animationRef.current);
          animatePath(newResult.path);
        }
      } else {
        setResult(null);
        setPath([]);
        setCurrentPosition(null);
      }
    } catch (error) {
      alert(error.message);
      setResult(null);
      setPath([]);
      setCurrentPosition(null);
      setIsPlaying(false);
    }
  }, [graph, source, destination]);

  // Animation system
  const animatePath = useCallback((path) => {
    const positions = path.map(node => nodePositions[node]);
    let currentIndex = 0;

    const animateStep = () => {
      if (currentIndex >= positions.length - 1) {
        setIsPlaying(false);
        return;
      }

      const start = positions[currentIndex];
      const end = positions[currentIndex + 1];
      const totalSteps = speed / 16;
      let step = 0;

      const interpolate = () => {
        if (step >= totalSteps) {
          currentIndex++;
          animationRef.current = requestAnimationFrame(animateStep);
          return;
        }

        const t = step / totalSteps;
        setCurrentPosition({
          x: start.x + (end.x - start.x) * t,
          y: start.y + (end.y - start.y) * t
        });

        step++;
        animationRef.current = requestAnimationFrame(interpolate);
      };

      interpolate();
    };

    animateStep();
  }, [nodePositions, speed]);

  const toggleAnimation = () => {
    if (isPlaying) {
      cancelAnimationFrame(animationRef.current);
      setIsPlaying(false);
    } else {
      if (result?.path) {
        animatePath(result.path);
        setIsPlaying(true);
      }
    }
  };

  const handleExampleChange = (exampleName) => {
    const example = exampleGraphs.find(e => e.name === exampleName);
    if (example) {
      setGraph(example.edges);
      setSource(example.edges[0].from);
      setDestination(example.edges[example.edges.length - 1].to);
    }
  };

  const addEdge = () => {
    setGraph([...graph, { from: "", to: "", weight: 1 }]);
  };

  const updateEdge = (index, field, value) => {
    const newEdges = [...graph];
    newEdges[index][field] = field === 'weight' ? Number(value) : value;
    setGraph(newEdges);
  };

  const removeEdge = (index) => {
    setGraph(graph.filter((_, i) => i !== index));
  };

  const isEdgeInPath = (edge) => {
    if (!result) return false;
    for (let i = 0; i < result.path.length - 1; i++) {
      if (result.path[i] === edge.from && result.path[i + 1] === edge.to) {
        return true;
      }
    }
    return false;
  };

  return (
    <div className="h-screen text-white w-full flex">
      {/* Control Panel */}
      <div className="w-1/4 p-4 bg-gray-900 border-r overflow-y-auto">
        <div className="space-y-6">
          <h1 className="text-2xl font-bold">Bellman-Ford Visualizer</h1>

          <div>
            <label className="block text-sm font-medium mb-2">Examples</label>
            <select
              onChange={(e) => handleExampleChange(e.target.value)}
              className="w-full p-2  rounded bg-gray-800"
            >
              <option value="">Select an example...</option>
              {exampleGraphs.map((example) => (
                <option key={example.name} value={example.name}>
                  {example.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Source</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full p-2  bg-gray-800 rounded"
              >
                {Object.keys(nodePositions).map((node) => (
                  <option key={node} value={node}>{node}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block  text-sm font-medium mb-1">Destination</label>
              <select
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full p-2  bg-gray-800 rounded"
              >
                {Object.keys(nodePositions).map((node) => (
                  <option key={node} value={node}>{node}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Speed: {2000 - speed + 100}ms/step
            </label>
            <input
              type="range"
              min="100"
              max="2000"
              value={speed}
              onChange={(e) => setSpeed(e.target.value)}
              className="w-full"
            />
          </div>

          <button
            onClick={toggleAnimation}
            className="w-full p-2 bg-blue-500 text-white rounded flex items-center justify-center gap-2 hover:bg-blue-600 transition-colors"
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            {isPlaying ? 'Pause' : 'Start'} Simulation
          </button>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h2 className="font-semibold">Edges</h2>
              <button
                onClick={addEdge}
                className="p-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-1"
              >
                <Plus size={14} /> Add Edge
              </button>
            </div>
            
            <div className="space-y-2">
              {graph.map((edge, index) => (
                <div key={index} className="flex gap-2 items-center bg-gray-900 text-center p-2 rounded ">
                  <input
                    type="text"
                    value={edge.from}
                    onChange={(e) => updateEdge(index, 'from', e.target.value)}
                    className="w-20 p-1 border rounded text-center text-sm"
                    placeholder="From"
                  />
                  <span>→</span>
                  <input
                    type="text"
                    value={edge.to}
                    onChange={(e) => updateEdge(index, 'to', e.target.value)}
                    className="w-20 p-1 border rounded text-center text-sm"
                    placeholder="To"
                  />
                  <input
                    type="number"
                    value={edge.weight}
                    onChange={(e) => updateEdge(index, 'weight', e.target.value)}
                    className="w-16 p-1 border text-center rounded text-sm"
                  />
                  <button
                    onClick={() => removeEdge(index)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {result && (
            <div className="p-4 bg-gray-800 rounded">
              <h3 className="font-semibold mb-2">Results</h3>
              <div className="text-sm space-y-1">
                <p><span className="font-medium">Path:</span> {result.path.join(' → ')}</p>
                <p><span className="font-medium">Total Cost:</span> {result.distance}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Visualization Area */}
      <div 
        className="w-3/4 h-full bg-gray-950 border-l overflow-hidden"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: zoomPan.isPanning ? 'grabbing' : 'grab' }}
      >
  <svg ref={svgRef} className="w-full h-full">
    <defs>
      {/* Active (blue) arrowhead */}
      <marker
        id="arrowhead-active"
        markerWidth="6"
        markerHeight="6"
        refX="5.5"
        refY="3"
        orient="auto"
      >
        <path d="M0,0 L0,6 L6,3 Z" fill="#3b82f6" />
      </marker>
      
      {/* Inactive (gray) arrowhead */}
      <marker
        id="arrowhead-inactive"
        markerWidth="6"
        markerHeight="6"
        refX="5.5"
        refY="3"
        orient="auto"
      >
        <path d="M0,0 L0,6 L6,3 Z" fill="#e2e8f0" />
      </marker>
      
      {/* Bus icon symbol */}
      <symbol id="bus-icon" viewBox="0 0 24 24">
        <path 
          d="M5 4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-2v2h-2v-2H7a2 2 0 0 1-2-2V4zm2 0v2h10V4H7zm10 4H7v4h10V8zm-8 6H7v2h2v-2zm6 0h-2v2h2v-2z" 
          fill="#facc15"
        />
        <path 
          d="M9 8h2v2H9V8zm4 0h2v2h-2V8z" 
          fill="#ffffff"
        />
      </symbol>
    </defs>

    <g transform={`translate(${zoomPan.x},${zoomPan.y}) scale(${zoomPan.scale})`}>
    {graph.map((edge, index) => {
        const from = nodePositions[edge.from];
        const to = nodePositions[edge.to];
        if (!from || !to) return null;

        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const adjust = 20;

        const adjustedFrom = {
          x: from.x + (dx * adjust) / distance,
          y: from.y + (dy * adjust) / distance
        };
        const adjustedTo = {
          x: to.x - (dx * adjust) / distance,
          y: to.y - (dy * adjust) / distance
        };

        const isActive = isEdgeInPath(edge);
        
        return (
          <g key={`edge-${index}`}>
            <line
              x1={adjustedFrom.x}
              y1={adjustedFrom.y}
              x2={adjustedTo.x}
              y2={adjustedTo.y}
              stroke={isActive ? "#3b82f6" : "#e2e8f0"}
              strokeWidth={isActive ? 3 : 2}
              className="transition-all duration-300"
              markerEnd={isActive ? "url(#arrowhead-active)" : "url(#arrowhead-inactive)"}
            />
            <text
              x={(adjustedFrom.x + adjustedTo.x)/2}
              y={(adjustedFrom.y + adjustedTo.y)/2}
              textAnchor="middle"
              fill={isActive ? "#3b82f6" : "#64748b"}
              fontSize="12"
              dy="-5"
            >
              {edge.weight}
            </text>
          </g>
        );
      })}

      {Object.entries(nodePositions).map(([node, pos]) => (
        <g
          key={node}
          transform={`translate(${pos.x},${pos.y})`}
          className="cursor-pointer hover:scale-105 transition-transform"
        >
          <circle
            r="20"
            fill={path.includes(node) ? "#3b82f6" : "#94a3b8"}
            className="transition-colors duration-300 shadow-md"
          />
          <text
            x="0"
            y="0"
            textAnchor="middle"
            dy=".3em"
            fill="white"
            fontSize="12"
            fontWeight="600"
          >
            {node}
          </text>
        </g>
      ))}

      {currentPosition && (
        <g transform={`translate(${currentPosition.x},${currentPosition.y})`}>
          <use 
            href="#bus-icon" 
            x="-12" 
            y="-12" 
            width="24" 
            height="24"
            className="animate-pulse"
          />
        </g>
      )}
    </g>
  </svg>
</div>
    </div>
  );
};

export default Page;
