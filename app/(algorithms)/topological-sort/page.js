"use client";
import { useRef, useState, useEffect } from 'react';
import { Play, RotateCcw, Plus, Trash } from 'lucide-react';

export default function TopologicalSortPage() {
  const [zoomPan, setZoomPan] = useState({
    scale: 1,
    x: 0,
    y: 0,
    isPanning: false,
    lastX: 0,
    lastY: 0
  });
  
  const [nodeStates, setNodeStates] = useState({});
  const [currentNode, setCurrentNode] = useState(null);
  const [resultOrder, setResultOrder] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasDeadlock, setHasDeadlock] = useState(false);
const svgRef = useRef(null);
  
  const [selectedExample, setSelectedExample] = useState('example1');
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [newNode, setNewNode] = useState('');
  const [newEdge, setNewEdge] = useState({ from: '', to: '' });
  const [nodePositions, setNodePositions] = useState({});

  const examples = {
    example1: {
      nodes: ['A', 'B', 'C', 'D'],
      edges: [
        { from: 'A', to: 'B' },
        { from: 'A', to: 'D' },
        { from: 'B', to: 'C' },
        { from: 'D', to: 'C' }
      ],
      positions: {
        A: { x: 100, y: 100 },
        B: { x: 250, y: 50 },
        C: { x: 400, y: 100 },
        D: { x: 250, y: 150 }
      }
    },
    example2: {
      nodes: ['X', 'Y', 'Z'],
      edges: [
        { from: 'X', to: 'Y' },
        { from: 'X', to: 'Z' },
        { from: 'Y', to: 'Z' }
      ],
      positions: {
        X: { x: 100, y: 100 },
        Y: { x: 250, y: 50 },
        Z: { x: 250, y: 150 }
      }
    },
    example3: {
      nodes: ['A', 'B', 'C'],
      edges: [
        { from: 'A', to: 'B' },
        { from: 'B', to: 'C' },
        { from: 'C', to: 'A' }
      ],
      positions: {
        A: { x: 100, y: 100 },
        B: { x: 250, y: 50 },
        C: { x: 250, y: 150 }
      }
    },
    custom: { nodes: [], edges: [], positions: {} }
  };

  useEffect(() => {
    const example = examples[selectedExample];
    setNodes(example.nodes);
    setEdges(example.edges);
    setNodePositions(example.positions);
    resetVisualization();
  }, [selectedExample]);

  useEffect(() => {
    const initialStates = {};
    const positions = { ...nodePositions };
    
    nodes.forEach((node, index) => {
      initialStates[node] = { 
        locked: true, 
        active: false, 
        visited: false,
        inDeadlock: false 
      };
      if (!positions[node]) {
        positions[node] = { 
          x: 100 + (index * 150),
          y: 100 + (index % 2 === 0 ? 0 : 50)
        };
      }
    });
    
    setNodeStates(initialStates);
    setNodePositions(positions);
  }, [nodes]);

  const handleWheel = (e) => {
    e.preventDefault();
    const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setZoomPan(prev => ({
      ...prev,
      scale: Math.min(Math.max(prev.scale * scaleFactor, 0.1), 3),
      x: mouseX - (mouseX - prev.x) * scaleFactor,
      y: mouseY - (mouseY - prev.y) * scaleFactor
    }));
  };

  const handleMouseDown = (e) => {
    setZoomPan(prev => ({
      ...prev,
      isPanning: true,
      lastX: e.clientX,
      lastY: e.clientY
    }));
  };

  const handleMouseMove = (e) => {
    if (!zoomPan.isPanning) return;
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
    setZoomPan(prev => ({ ...prev, isPanning: false }));
  };

  const handleAddNode = () => {
    if (newNode.trim() && !nodes.includes(newNode.trim())) {
      setNodes([...nodes, newNode.trim()]);
      setNewNode('');
    }
  };

  const handleAddEdge = () => {
    if (newEdge.from && newEdge.to && newEdge.from !== newEdge.to) {
      setEdges([...edges, { from: newEdge.from, to: newEdge.to }]);
      setNewEdge({ from: '', to: '' });
    }
  };

  const handleRemoveEdge = (index) => {
    setEdges(edges.filter((_, i) => i !== index));
  };

  const startTopologicalSort = async () => {
    setIsProcessing(true);
    setHasDeadlock(false);
    setResultOrder([]);
    
    const inDegree = {};
    const adjList = {};
    const localResult = [];
    
    nodes.forEach(node => {
      inDegree[node] = 0;
      adjList[node] = [];
    });

    edges.forEach(edge => {
      adjList[edge.from].push(edge.to);
      inDegree[edge.to]++;
    });

    const queue = nodes.filter(node => inDegree[node] === 0);
    
    while (queue.length > 0) {
      const node = queue.shift();
      
      setCurrentNode(node);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setNodeStates(prev => ({
        ...prev,
        [node]: { ...prev[node], visited: true, active: false }
      }));
      
      localResult.push(node);
      setResultOrder([...localResult]);
      
      for (const dependent of adjList[node]) {
        inDegree[dependent]--;
        if (inDegree[dependent] === 0) {
          queue.push(dependent);
          setNodeStates(prev => ({
            ...prev,
            [dependent]: { ...prev[dependent], locked: false, active: true }
          }));
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (localResult.length !== nodes.length) {
      setHasDeadlock(true);
      const remainingNodes = nodes.filter(n => !localResult.includes(n));
      setNodeStates(prev => {
        const newStates = { ...prev };
        remainingNodes.forEach(node => {
          newStates[node] = { ...newStates[node], inDeadlock: true };
        });
        return newStates;
      });
    }
    
    setIsProcessing(false);
    setCurrentNode(null);
  };

  const resetVisualization = () => {
    setNodeStates(prev => {
      const newStates = {};
      Object.keys(prev).forEach(node => {
        newStates[node] = { 
          locked: true, 
          active: false, 
          visited: false,
          inDeadlock: false 
        };
      });
      return newStates;
    });
    setResultOrder([]);
    setIsProcessing(false);
    setCurrentNode(null);
    setHasDeadlock(false);
    setZoomPan({ scale: 1, x: 0, y: 0, isPanning: false, lastX: 0, lastY: 0 });
  };

  return (
    <div className="flex h-screen bg-gray-900">
      <div className="w-1/4 p-4 border-r border-gray-700 overflow-y-auto">
        <h1 className="text-2xl font-bold mb-6 text-white">Topological Sort Visualizer</h1>
        
        <div className="mb-6">
          <label className="block mb-2 text-sm">Select Example:</label>
          <select
            value={selectedExample}
            onChange={(e) => setSelectedExample(e.target.value)}
            className="w-full p-2 bg-gray-800 rounded text-white"
          >
            <option value="example1">Example 1 (Valid)</option>
            <option value="example2">Example 2 (Valid)</option>
            <option value="example3">Example 3 (Cycle)</option>
            <option value="custom">Custom Graph</option>
          </select>
        </div>

        <div className="mb-6">
          <div className="mb-4">
            <label className="block mb-2 text-sm">Add Node:</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newNode}
                onChange={(e) => setNewNode(e.target.value.toUpperCase())}
                className="flex-1 p-2 bg-gray-800 rounded text-white"
                placeholder="Node name"
              />
              <button
                onClick={handleAddNode}
                className="p-2 bg-blue-600 rounded hover:bg-blue-700"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          <div className="mb-4">
            <label className="block mb-2 text-sm">Add Edge:</label>
            <div className="flex gap-2 mb-2">
              <select
                value={newEdge.from}
                onChange={(e) => setNewEdge(p => ({ ...p, from: e.target.value }))}
                className="flex-1 p-2 bg-gray-800 rounded text-white"
              >
                <option value="">From</option>
                {nodes.map(node => (
                  <option key={node} value={node}>{node}</option>
                ))}
              </select>
              <select
                value={newEdge.to}
                onChange={(e) => setNewEdge(p => ({ ...p, to: e.target.value }))}
                className="flex-1 p-2 bg-gray-800 rounded text-white"
              >
                <option value="">To</option>
                {nodes.map(node => (
                  <option key={node} value={node}>{node}</option>
                ))}
              </select>
              <button
                onClick={handleAddEdge}
                className="p-2 bg-blue-600 rounded hover:bg-blue-700"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          <div className="mb-4">
            <h3 className="text-sm font-semibold mb-2">Edges:</h3>
            <div className="space-y-1">
              {edges.map((edge, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-800 rounded">
                  <span className="text-white">{edge.from} → {edge.to}</span>
                  <button
                    onClick={() => handleRemoveEdge(index)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={startTopologicalSort}
            disabled={isProcessing || nodes.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 rounded hover:bg-green-700 disabled:opacity-50"
          >
            <Play size={16} /> Start
          </button>
          <button
            onClick={resetVisualization}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 rounded hover:bg-gray-700"
          >
            <RotateCcw size={16} /> Reset
          </button>
        </div>

        <div className="p-4 bg-gray-800 rounded">
          <h3 className="text-lg font-semibold mb-2 text-white">Execution Order:</h3>
          <div className="space-y-1">
            {hasDeadlock && (
              <div className="p-2 bg-red-600 rounded animate-pulse">Deadlock Detected!</div>
            )}
            {resultOrder.map((node, index) => (
              <div key={node} className="p-2 bg-gray-700 rounded text-white">
                {index + 1}. {node}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div 
        className="w-3/4 bg-gray-950 relative overflow-hidden"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: zoomPan.isPanning ? 'grabbing' : 'grab' }}
      >
        <svg ref={svgRef} className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
    <marker
      id="arrowhead"
      markerWidth="12"
      markerHeight="12"
      refX="9"
      refY="6"
      orient="auto"
    >
      <path d="M0,0 L0,12 L12,6 Z" fill="context-stroke" />
    </marker>
  </defs>

          <g transform={`translate(${zoomPan.x},${zoomPan.y}) scale(${zoomPan.scale})`}>
            {edges.map((edge, index) => {
              const from = nodePositions[edge.from];
              const to = nodePositions[edge.to];
              return (
                <line
                  key={index}
                  x1={from?.x || 0}
                  y1={from?.y || 0}
                  x2={to?.x || 0}
                  y2={to?.y || 0}
                  stroke={currentNode === edge.from ? '#3b82f6' : '#334155'}
                  strokeWidth="2"
                  markerEnd="url(#arrowhead)"
                />
              );
            })}

            {nodes.map(node => {
              const state = nodeStates[node] || {};
              return (
                <g
                  key={node}
                  transform={`translate(${nodePositions[node]?.x || 0},${nodePositions[node]?.y || 0})`}
                >
                  <circle
                    r="20"
                    fill={
                      state.inDeadlock ? '#ef4444' :
                      state.visited ? '#10b981' :
                      state.active ? '#3b82f6' :
                      state.locked ? '#64748b' : '#94a3b8'
                    }
                  />
                  <text
                    x="0"
                    y="0"
                    textAnchor="middle"
                    dy=".3em"
                    fill="white"
                    fontSize="14"
                    fontWeight="600"
                  >
                    {node}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}
