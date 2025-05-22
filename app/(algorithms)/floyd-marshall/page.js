"use client";
import { useRef, useState, useEffect } from 'react';
import { Play, RotateCcw, Plus, Trash, ChevronRight, ChevronLeft } from 'lucide-react';

const deepCloneMatrix = (matrix) => {
  const clone = {};
  Object.keys(matrix).forEach(from => {
    clone[from] = {};
    Object.keys(matrix[from]).forEach(to => {
      clone[from][to] = matrix[from][to];
    });
  });
  return clone;
};

export default function FloydWarshallPage() {
  const svgRef = useRef(null);
  const [zoomPan, setZoomPan] = useState({
    scale: 1,
    x: 0,
    y: 0,
    isPanning: false,
    lastX: 0,
    lastY: 0
  });

  const [currentStep, setCurrentStep] = useState({ from: null, to: null, via: null });
  const [distanceMatrix, setDistanceMatrix] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasNegativeCycle, setHasNegativeCycle] = useState(false);
  const [selectedExample, setSelectedExample] = useState('example1');
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [newNode, setNewNode] = useState('');
  const [newEdge, setNewEdge] = useState({ from: '', to: '', weight: '' });
  const [nodePositions, setNodePositions] = useState({});
  const [showControls, setShowControls] = useState(true);

  const examples = {
    example1: {
      nodes: ['A', 'B', 'C', 'D'],
      edges: [
        { from: 'A', to: 'B', weight: 3 },
        { from: 'A', to: 'C', weight: 6 },
        { from: 'B', to: 'C', weight: 2 },
        { from: 'B', to: 'D', weight: 1 },
        { from: 'C', to: 'D', weight: 4 }
      ],
      positions: {
        A: { x: 100, y: 100 },
        B: { x: 250, y: 50 },
        C: { x: 250, y: 150 },
        D: { x: 400, y: 100 }
      }
    },
    example2: {
      nodes: ['X', 'Y', 'Z'],
      edges: [
        { from: 'X', to: 'Y', weight: 2 },
        { from: 'Y', to: 'Z', weight: -1 },
        { from: 'Z', to: 'X', weight: 3 }
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
        { from: 'A', to: 'B', weight: -1 },
        { from: 'B', to: 'C', weight: -2 },
        { from: 'C', to: 'A', weight: -3 }
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
    loadExample(selectedExample);
  }, [selectedExample]);

  const loadExample = (exampleKey) => {
    const example = examples[exampleKey];
    setNodes(example.nodes);
    setEdges(example.edges);
    setNodePositions(example.positions);
    initializeDistanceMatrix(example.nodes, example.edges);
    resetVisualization();
  };

  const initializeDistanceMatrix = (nodesArray, edgesArray) => {
    const matrix = {};
    nodesArray.forEach(from => {
      matrix[from] = {};
      nodesArray.forEach(to => {
        matrix[from][to] = from === to ? 0 : Infinity;
      });
    });

    edgesArray.forEach(edge => {
      if (matrix[edge.from] && matrix[edge.to]) {
        matrix[edge.from][edge.to] = Number(edge.weight);
      }
    });

    setDistanceMatrix(matrix);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const scale = zoomPan.scale * (e.deltaY > 0 ? 0.9 : 1.1);
    setZoomPan(prev => ({ ...prev, scale }));
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
    if (zoomPan.isPanning) {
      const dx = e.clientX - zoomPan.lastX;
      const dy = e.clientY - zoomPan.lastY;
      setZoomPan(prev => ({
        ...prev,
        x: prev.x + dx,
        y: prev.y + dy,
        lastX: e.clientX,
        lastY: e.clientY
      }));
    }
  };

  const handleMouseUp = () => {
    setZoomPan(prev => ({ ...prev, isPanning: false }));
  };

  const addNode = () => {
    if (newNode && !nodes.includes(newNode)) {
      const newNodes = [...nodes, newNode];
      setNodes(newNodes);
      setNodePositions(prev => ({
        ...prev,
        [newNode]: { x: 100 + newNodes.length * 50, y: 100 + newNodes.length * 50 }
      }));
      setNewNode('');
      initializeDistanceMatrix(newNodes, edges);
    }
  };

  const addEdge = () => {
    if (newEdge.from && newEdge.to && newEdge.weight && 
        nodes.includes(newEdge.from) && nodes.includes(newEdge.to)) {
      const newEdges = [...edges, newEdge];
      setEdges(newEdges);
      setNewEdge({ from: '', to: '', weight: '' });
      initializeDistanceMatrix(nodes, newEdges);
    }
  };

  const deleteNode = (node) => {
    const newNodes = nodes.filter(n => n !== node);
    const newEdges = edges.filter(e => e.from !== node && e.to !== node);
    setNodes(newNodes);
    setEdges(newEdges);
    initializeDistanceMatrix(newNodes, newEdges);
  };

  const deleteEdge = (index) => {
    const newEdges = edges.filter((_, i) => i !== index);
    setEdges(newEdges);
    initializeDistanceMatrix(nodes, newEdges);
  };

  const resetVisualization = () => {
    setCurrentStep({ from: null, to: null, via: null });
    setIsProcessing(false);
    setHasNegativeCycle(false);
  };

  const runFloydWarshall = async () => {
    setIsProcessing(true);
    setHasNegativeCycle(false);
    setCurrentStep({ from: null, to: null, via: null });
    
    let matrix = deepCloneMatrix(distanceMatrix);
    const nodesList = [...nodes];
    let hasNegative = false;

    for (let k = 0; k < nodesList.length; k++) {
      const via = nodesList[k];
      setCurrentStep({ via, from: null, to: null });
      
      for (let i = 0; i < nodesList.length; i++) {
        const from = nodesList[i];
        
        for (let j = 0; j < nodesList.length; j++) {
          const to = nodesList[j];
          
          setCurrentStep({ via, from, to });
          await new Promise(resolve => setTimeout(resolve, 300));
          
          const newDistance = matrix[from][via] + matrix[via][to];
          
          if (newDistance < matrix[from][to]) {
            const newMatrix = deepCloneMatrix(matrix);
            newMatrix[from][to] = newDistance;
            matrix = newMatrix;
            setDistanceMatrix(newMatrix);
          }
        }
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    nodesList.forEach(node => {
      if (matrix[node][node] < 0) hasNegative = true;
    });

    setHasNegativeCycle(hasNegative);
    setIsProcessing(false);
    setCurrentStep({ from: null, to: null, via: null });
  };

  return (
    <div className="min-h-screen bg-black text-gray-100 flex">
      <div className={`bg-gray-900 h-screen overflow-hidden transition-all duration-300 ${showControls ? 'w-96' : 'w-0'}`}>
        <div className="p-6 space-y-8 h-full overflow-y-auto">
          <h1 className="text-2xl font-bold">Floyd-Warshall Visualizer</h1>
          
          <div className="space-y-4">
            <div>
              <label className="block mb-2 text-sm font-medium">Select Example</label>
              <select
                value={selectedExample}
                onChange={(e) => setSelectedExample(e.target.value)}
                className="w-full p-2 bg-gray-800 rounded-md"
              >
                <option value="example1">Example 1 (Positive Weights)</option>
                <option value="example2">Example 2 (Negative Weights)</option>
                <option value="example3">Example 3 (Negative Cycle)</option>
                <option value="custom">Custom Graph</option>
              </select>
            </div>

            <div className="bg-gray-700 p-4 rounded-md">
              <h2 className="text-lg font-semibold mb-4">Node Management</h2>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newNode}
                  onChange={(e) => setNewNode(e.target.value.toUpperCase())}
                  placeholder="Add node"
                  className="flex-1 p-2 bg-gray-800 rounded-md border border-gray-500"
                />
                <button
                  onClick={addNode}
                  className="p-2 bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Plus size={20} />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {nodes.map((node) => (
                  <div key={node} className="bg-gray-800 px-3 py-1 rounded-full flex items-center gap-2">
                    <span>{node}</span>
                    <button
                      onClick={() => deleteNode(node)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-700 p-4 rounded-md">
              <h2 className="text-lg font-semibold mb-4">Edge Management</h2>
              <div className="flex gap-2 mb-4">
                <select
                  value={newEdge.from}
                  onChange={(e) => setNewEdge({ ...newEdge, from: e.target.value })}
                  className="flex-1 p-2 bg-gray-800 rounded-md border border-gray-500"
                >
                  <option value="">From</option>
                  {nodes.map((node) => (
                    <option key={`from-${node}`} value={node}>{node}</option>
                  ))}
                </select>
                <select
                  value={newEdge.to}
                  onChange={(e) => setNewEdge({ ...newEdge, to: e.target.value })}
                  className="flex-1 p-2 bg-gray-800 rounded-md border border-gray-500"
                >
                  <option value="">To</option>
                  {nodes.map((node) => (
                    <option key={`to-${node}`} value={node}>{node}</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={newEdge.weight}
                  onChange={(e) => setNewEdge({ ...newEdge, weight: e.target.value })}
                  placeholder="Weight"
                  className="w-20 p-2 bg-gray-800 rounded-md border border-gray-500"
                />
                <button
                  onClick={addEdge}
                  className="p-2 bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Plus size={20} />
                </button>
              </div>
              <div className="space-y-2">
                {edges.map((edge, index) => (
                  <div key={index} className="bg-gray-800 px-3 py-2 rounded-md flex items-center">
                    <span className="flex-1">{edge.from} → {edge.to} ({edge.weight})</span>
                    <button
                      onClick={() => deleteEdge(index)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-700 p-4 rounded-md">
              <h2 className="text-lg font-semibold mb-4">Algorithm Controls</h2>
              <div className="flex gap-2">
                <button
                  onClick={runFloydWarshall}
                  disabled={isProcessing}
                  className="flex-1 p-2 bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isProcessing ? 'Processing...' : 'Run Algorithm'}
                </button>
                <button
                  onClick={resetVisualization}
                  className="p-2 bg-gray-600 rounded-md hover:bg-gray-700 transition-colors"
                >
                  <RotateCcw size={20} />
                </button>
              </div>
              {hasNegativeCycle && (
                <div className="mt-4 p-3 bg-red-900 rounded-md text-sm">
                  ⚠️ Negative cycle detected! Some shortest paths may not exist.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 relative h-screen overflow-hidden">
        <button
          onClick={() => setShowControls(!showControls)}
          className="absolute top-4 left-4 z-10 bg-gray-800 p-2 rounded-full hover:bg-gray-700 transition-colors"
        >
          {showControls ? <ChevronLeft /> : <ChevronRight />}
        </button>

        <div
          className="w-full h-full bg-gray-950"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <svg
            ref={svgRef}
            className="w-full h-full"
            style={{
              transform: `translate(${zoomPan.x}px, ${zoomPan.y}px) scale(${zoomPan.scale})`,
            }}
          >
            {edges.map((edge, index) => {
              const fromPos = nodePositions[edge.from];
              const toPos = nodePositions[edge.to];
              if (!fromPos || !toPos) return null;

              const dx = toPos.x - fromPos.x;
              const dy = toPos.y - fromPos.y;
              const angle = Math.atan2(dy, dx);
              const headSize = 8;

              return (
                <g key={index}>
                  <line
                    x1={fromPos.x}
                    y1={fromPos.y}
                    x2={toPos.x - headSize * Math.cos(angle)}
                    y2={toPos.y - headSize * Math.sin(angle)}
                    stroke={
                      currentStep.via === edge.from && 
                      currentStep.from === edge.from &&
                      currentStep.to === edge.to
                        ? '#3b82f6'
                        : '#4b5563'
                    }
                    strokeWidth="2"
                  />
                  <path
                    d={`M ${toPos.x} ${toPos.y} L ${toPos.x - headSize * Math.cos(angle) + headSize * Math.cos(angle - Math.PI / 2)} ${toPos.y - headSize * Math.sin(angle) + headSize * Math.sin(angle - Math.PI / 2)} L ${toPos.x - headSize * Math.cos(angle) + headSize * Math.cos(angle + Math.PI / 2)} ${toPos.y - headSize * Math.sin(angle) + headSize * Math.sin(angle + Math.PI / 2)} Z`}
                    fill="#4b5563"
                  />
                  <text
                    x={(fromPos.x + toPos.x) / 2 + 10}
                    y={(fromPos.y + toPos.y) / 2 + 10}
                    fill="white"
                    fontSize="14"
                  >
                    {edge.weight}
                  </text>
                </g>
              );
            })}

            {nodes.map((node) => {
              const pos = nodePositions[node];
              if (!pos) return null;

              return (
                <g
                  key={node}
                  transform={`translate(${pos.x}, ${pos.y})`}
                >
                  <circle
                    r="20"
                    fill={
                      currentStep.from === node || currentStep.to === node || currentStep.via === node
                        ? '#3b82f6'
                        : '#4b5563'
                    }
                  />
                  <text
                    x="0"
                    y="5"
                    textAnchor="middle"
                    fill="white"
                    fontSize="16"
                    fontWeight="bold"
                  >
                    {node}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="absolute bottom-4 left-4 bg-gray-900 p-4 rounded-md shadow-lg">
          <h3 className="text-lg font-semibold mb-2">Distance Matrix</h3>
          <div className="overflow-x-auto">
            <table className="text-sm">
              <thead>
                <tr>
                  <th className="p-2"></th>
                  {nodes.map((node) => (
                    <th key={node} className="p-2 bg-gray-700">{node}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {nodes.map((from) => (
                  <tr key={from}>
                    <td className="p-2 bg-gray-700">{from}</td>
                    {nodes.map((to) => (
                      <td
                        key={to}
                        className={`p-2 text-center ${
                          currentStep.from === from && currentStep.to === to
                            ? 'bg-blue-900'
                            : 'bg-gray-600'
                        }`}
                      >
                        {distanceMatrix[from]?.[to] === Infinity 
                          ? '∞' 
                          : distanceMatrix[from]?.[to]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
// No additional code is required at the $PLACEHOLDER$ location as the component is complete.