import React, { useEffect, useState } from 'react';
import { Terminal, Cpu, Database, Activity } from 'lucide-react';

const TechVisualizer = () => {
  const [nodes, setNodes] = useState([]);
  const [activeConnections, setActiveConnections] = useState([]);

  useEffect(() => {
    // Generar nodos aleatorios
    const newNodes = Array.from({ length: 12 }).map((_, i) => ({
      id: i,
      x: Math.random() * 80 + 10,
      y: Math.random() * 80 + 10,
      type: ['cpu', 'database', 'activity', 'terminal'][Math.floor(Math.random() * 4)],
      pulse: Math.random() > 0.5
    }));
    setNodes(newNodes);

    const interval = setInterval(() => {
      // Activar conexiones aleatorias
      const connections = [];
      for(let i=0; i < 4; i++) {
        connections.push({
          from: Math.floor(Math.random() * 12),
          to: Math.floor(Math.random() * 12)
        });
      }
      setActiveConnections(connections);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-lg aspect-[4/3] rounded-3xl border border-neon-teal/20 bg-[#020203]/50 backdrop-blur-xl relative overflow-hidden flex items-center justify-center shadow-[0_0_50px_rgba(45,212,191,0.1)]">
      {/* Grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(45,212,191,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(45,212,191,0.05)_1px,transparent_1px)] bg-[size:20px_20px]" />
      
      {/* Radar Sweep */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[150%] h-[150%] animate-[spin_4s_linear_infinite] rounded-full border border-neon-teal/10 relative">
          <div className="absolute top-0 right-1/2 w-1/2 h-full bg-gradient-to-r from-transparent to-neon-teal/20" style={{ clipPath: 'polygon(100% 50%, 100% 0, 0 0)' }} />
        </div>
      </div>

      {/* Nodes */}
      {nodes.map(node => (
        <div 
          key={node.id}
          className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
          style={{ left: `${node.x}%`, top: `${node.y}%` }}
        >
          <div className={`p-2 rounded-lg bg-deep-dark border border-neon-teal/30 ${node.pulse ? 'animate-pulse' : ''} relative group`}>
            <div className="absolute inset-0 bg-neon-teal/20 blur-md rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" />
            {node.type === 'cpu' && <Cpu className="w-4 h-4 text-neon-teal relative z-10" />}
            {node.type === 'database' && <Database className="w-4 h-4 text-blue-400 relative z-10" />}
            {node.type === 'activity' && <Activity className="w-4 h-4 text-purple-400 relative z-10" />}
            {node.type === 'terminal' && <Terminal className="w-4 h-4 text-green-400 relative z-10" />}
          </div>
        </div>
      ))}

      {/* Code Stream */}
      <div className="absolute left-0 bottom-0 w-full h-32 bg-gradient-to-t from-[#020203] to-transparent z-0 flex items-end p-4">
        <div className="text-[10px] font-mono text-neon-teal/50 opacity-70 w-full overflow-hidden whitespace-nowrap">
          <div className="animate-[slideLeft_10s_linear_infinite] inline-block">
            {`> INITIALIZING AI CORE... [OK] > LOADING AGENT NEURAL NETWORKS... [OK] > CONNECTING TO DATABASE CLUSTER... [OK] > BYPASSING SECURITY PROTOCOLS... [DONE] > SYSTEM ONLINE AND READY.`}
          </div>
        </div>
      </div>
      
      {/* Central HUD */}
      <div className="absolute z-20 flex flex-col items-center justify-center p-6 bg-[#020203]/80 backdrop-blur-md rounded-2xl border border-neon-teal/40 shadow-2xl">
        <div className="w-12 h-12 rounded-full border-2 border-neon-teal border-t-transparent animate-spin mb-4" />
        <h3 className="text-neon-teal font-black tracking-[0.3em] uppercase text-xs mb-1">Red Inteligente</h3>
        <p className="text-white/60 text-[10px] uppercase font-bold tracking-widest">En Lnea</p>
      </div>

      <style jsx>{`
        @keyframes slideLeft {
          from { transform: translateX(100%); }
          to { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
};

export default TechVisualizer;
