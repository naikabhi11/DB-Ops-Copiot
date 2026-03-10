import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  Database, 
  Activity, 
  Search, 
  AlertTriangle, 
  TrendingUp, 
  MessageSquare, 
  Settings, 
  Plus, 
  Trash2, 
  ChevronRight, 
  Cpu, 
  HardDrive, 
  Zap, 
  Users, 
  Clock,
  Send,
  Upload,
  BarChart3,
  Eye,
  ShieldAlert,
  Server
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { cn, formatDuration } from './utils';
import { 
  DBConnection, 
  MetricData, 
  Alert, 
  SlowQueryAnalysis, 
  IncidentReport, 
  ExplainPlanNode,
  User,
  UserRole
} from './types';
import { 
  analyzeSlowQuery, 
  analyzeIncident, 
  chatWithAssistant, 
  visualizeExplainPlan 
} from './services/geminiService';

// --- Components ---

const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center w-full gap-3 px-4 py-3 text-sm font-medium transition-colors rounded-lg",
      active 
        ? "bg-emerald-500/10 text-emerald-400" 
        : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50"
    )}
  >
    <Icon size={18} />
    <span>{label}</span>
  </button>
);

const Card = ({ children, title, className, icon: Icon }: { children: React.ReactNode, title?: string, className?: string, icon?: any }) => (
  <div className={cn("bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden", className)}>
    {title && (
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
        {Icon && <Icon size={16} className="text-emerald-400" />}
        <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
      </div>
    )}
    <div className="p-4">{children}</div>
  </div>
);

const Stat = ({ label, value, subValue, icon: Icon, trend }: { label: string, value: string | number, subValue?: string, icon: any, trend?: 'up' | 'down' }) => (
  <Card className="flex-1">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{label}</p>
        <h4 className="text-2xl font-bold text-zinc-100 mt-1">{value}</h4>
        {subValue && <p className="text-xs text-zinc-400 mt-1">{subValue}</p>}
      </div>
      <div className="p-2 bg-zinc-800 rounded-lg text-emerald-400">
        <Icon size={20} />
      </div>
    </div>
    {trend && (
      <div className={cn("mt-3 text-xs flex items-center gap-1", trend === 'up' ? "text-red-400" : "text-emerald-400")}>
        <TrendingUp size={12} className={trend === 'down' ? "rotate-180" : ""} />
        <span>{trend === 'up' ? "+12%" : "-5%"} from last hour</span>
      </div>
    )}
  </Card>
);

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authForm, setAuthForm] = useState({ email: '', password: '', role: 'viewer' as UserRole });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [connections, setConnections] = useState<DBConnection[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<DBConnection | null>(null);
  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newConn, setNewConn] = useState({ name: '', type: 'postgres' as any, environment: 'development', connectionString: '' });

  // Fetch connections
  useEffect(() => {
    if (user) {
      fetch('/api/connections')
        .then(res => res.json())
        .then(data => {
          setConnections(data);
          if (data.length > 0) setSelectedConnection(data[0]);
        });
    }
  }, [user]);

  const handleAuth = async () => {
    const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(authForm)
    });
    if (res.ok) {
      const data = await res.json();
      setUser(data);
    } else {
      alert('Authentication failed');
    }
  };

  const handleAddConnection = async () => {
    const res = await fetch('/api/connections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newConn)
    });
    const data = await res.json();
    setConnections([...connections, data]);
    setSelectedConnection(data);
    setShowAddModal(false);
  };

  // Fetch metrics when connection changes
  useEffect(() => {
    if (selectedConnection) {
      fetch(`/api/metrics/${selectedConnection.id}`)
        .then(res => res.json())
        .then(setMetrics);
    }
  }, [selectedConnection]);

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl"
        >
          <div className="flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
              <ShieldAlert size={24} className="text-black" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">DB Ops Copilot</h1>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Email</label>
              <input 
                type="email" 
                value={authForm.email}
                onChange={e => setAuthForm({...authForm, email: e.target.value})}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 focus:border-emerald-500 outline-none"
                placeholder="admin@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Password</label>
              <input 
                type="password" 
                value={authForm.password}
                onChange={e => setAuthForm({...authForm, password: e.target.value})}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 focus:border-emerald-500 outline-none"
                placeholder="••••••••"
              />
            </div>
            {authMode === 'register' && (
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Role</label>
                <select 
                  value={authForm.role}
                  onChange={e => setAuthForm({...authForm, role: e.target.value as any})}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 focus:border-emerald-500 outline-none"
                >
                  <option value="viewer">Viewer (Read Only)</option>
                  <option value="operator">Operator (Manage Alerts)</option>
                  <option value="admin">Admin (Full Access)</option>
                </select>
              </div>
            )}
            <button 
              onClick={handleAuth}
              className="w-full py-3 bg-emerald-500 text-black rounded-lg font-bold hover:bg-emerald-400 transition-all mt-4"
            >
              {authMode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
            <button 
              onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
              className="w-full text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              {authMode === 'login' ? "Don't have an account? Register" : "Already have an account? Login"}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-black text-zinc-100 font-sans selection:bg-emerald-500/30">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-800 flex flex-col bg-zinc-950">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
            <ShieldAlert size={20} className="text-black" />
          </div>
          <h1 className="font-bold text-lg tracking-tight">DB Ops Copilot</h1>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          <SidebarItem icon={LayoutDashboard} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <SidebarItem icon={Activity} label="Monitoring" active={activeTab === 'monitoring'} onClick={() => setActiveTab('monitoring')} />
          <SidebarItem icon={Search} label="Slow Query Analyzer" active={activeTab === 'slow-query'} onClick={() => setActiveTab('slow-query')} />
          <SidebarItem icon={AlertTriangle} label="Incident Detection" active={activeTab === 'incidents'} onClick={() => setActiveTab('incidents')} />
          <SidebarItem icon={TrendingUp} label="Capacity Planning" active={activeTab === 'capacity'} onClick={() => setActiveTab('capacity')} />
          <SidebarItem icon={Eye} label="Plan Visualizer" active={activeTab === 'visualizer'} onClick={() => setActiveTab('visualizer')} />
          <SidebarItem icon={MessageSquare} label="AI Assistant" active={activeTab === 'ai'} onClick={() => setActiveTab('ai')} />
          <SidebarItem icon={Settings} label="Alerting & Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <div className="flex items-center gap-3 p-3 bg-zinc-900 rounded-xl">
            <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold">
              {user.email.substring(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.email}</p>
              <p className="text-xs text-zinc-500 truncate capitalize">{user.role}</p>
            </div>
            <button onClick={() => setUser(null)} className="text-zinc-500 hover:text-red-400">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-zinc-800 flex items-center justify-between px-8 bg-zinc-950/50 backdrop-blur-md z-10">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg">
              <Server size={14} className="text-zinc-500" />
              <select 
                value={selectedConnection?.id || ''} 
                onChange={(e) => setSelectedConnection(connections.find(c => c.id === e.target.value) || null)}
                className="bg-transparent text-sm font-medium focus:outline-none cursor-pointer"
              >
                {connections.length === 0 && <option value="">No databases</option>}
                {connections.map(c => (
                  <option key={c.id} value={c.id} className="bg-zinc-900">{c.name} ({c.environment})</option>
                ))}
              </select>
            </div>
            {user.role === 'admin' && (
              <button 
                onClick={() => setShowAddModal(true)}
                className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-100 transition-colors"
              >
                <Plus size={18} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-zinc-400 uppercase tracking-widest font-bold">System Healthy</span>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && <DashboardView metrics={metrics} connection={selectedConnection} />}
            {activeTab === 'monitoring' && <MonitoringView metrics={metrics} />}
            {activeTab === 'slow-query' && <SlowQueryView connection={selectedConnection} />}
            {activeTab === 'incidents' && <IncidentView metrics={metrics} connection={selectedConnection} />}
            {activeTab === 'capacity' && <CapacityView metrics={metrics} />}
            {activeTab === 'visualizer' && <VisualizerView connection={selectedConnection} />}
            {activeTab === 'ai' && <AIChatView connection={selectedConnection} metrics={metrics} />}
            {activeTab === 'settings' && <SettingsView connections={connections} user={user} />}
          </AnimatePresence>
        </div>
      </main>

      {/* Add Connection Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl"
          >
            <h2 className="text-xl font-bold mb-6">Add New Database</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Name</label>
                <input 
                  type="text" 
                  value={newConn.name} 
                  onChange={e => setNewConn({...newConn, name: e.target.value})}
                  placeholder="e.g. Production Postgres"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 focus:border-emerald-500 outline-none transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Type</label>
                  <select 
                    value={newConn.type} 
                    onChange={e => setNewConn({...newConn, type: e.target.value as any})}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 focus:border-emerald-500 outline-none transition-colors"
                  >
                    <option value="postgres">PostgreSQL</option>
                    <option value="mongodb">MongoDB</option>
                    <option value="mysql">MySQL</option>
                    <option value="redis">Redis</option>
                    <option value="sqlserver">SQL Server</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Env</label>
                  <select 
                    value={newConn.environment} 
                    onChange={e => setNewConn({...newConn, environment: e.target.value as any})}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 focus:border-emerald-500 outline-none transition-colors"
                  >
                    <option value="development">Development</option>
                    <option value="staging">Staging</option>
                    <option value="production">Production</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Connection String</label>
                <textarea 
                  value={newConn.connectionString} 
                  onChange={e => setNewConn({...newConn, connectionString: e.target.value})}
                  placeholder="postgres://user:pass@host:port/db"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 focus:border-emerald-500 outline-none transition-colors h-24 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button 
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2.5 rounded-lg border border-zinc-800 hover:bg-zinc-800 transition-colors font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddConnection}
                className="flex-1 py-2.5 rounded-lg bg-emerald-500 text-black hover:bg-emerald-400 transition-colors font-bold"
              >
                Add Connection
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// --- Views ---

const DashboardView = ({ metrics, connection }: { metrics: MetricData[], connection: DBConnection | null }) => {
  const latest = metrics[metrics.length - 1] || { cpu: 0, memory: 0, latency: 0, connections: 0 } as Partial<MetricData>;
  
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Stat label="CPU Usage" value={`${latest.cpu?.toFixed(1)}%`} icon={Cpu} trend="up" />
        <Stat label="Memory" value={connection?.type === 'redis' ? `${latest.memoryUsage?.toFixed(1)}MB` : `${latest.memory?.toFixed(1)}%`} icon={HardDrive} />
        <Stat label="Latency" value={`${latest.latency?.toFixed(1)}ms`} icon={Clock} trend="down" />
        <Stat label={connection?.type === 'redis' ? "Hits/sec" : "Connections"} value={connection?.type === 'redis' ? latest.hits?.toFixed(0) || 0 : latest.connections || 0} icon={Users} />
      </div>

      {connection?.type === 'redis' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Stat label="Frag. Ratio" value={latest.fragmentationRatio?.toFixed(2) || '1.0'} icon={Zap} />
          <Stat label="Cache Misses" value={latest.misses?.toFixed(0) || 0} icon={AlertTriangle} />
          <Stat label="Memory Usage" value={`${latest.memoryUsage?.toFixed(1)} MB`} icon={HardDrive} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Performance Trends" icon={Activity}>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics}>
                <defs>
                  <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={(t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  stroke="#71717a"
                  fontSize={12}
                />
                <YAxis stroke="#71717a" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                  itemStyle={{ color: '#10b981' }}
                />
                <Area type="monotone" dataKey="cpu" stroke="#10b981" fillOpacity={1} fill="url(#colorCpu)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Query Throughput" icon={BarChart3}>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={(t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  stroke="#71717a"
                  fontSize={12}
                />
                <YAxis stroke="#71717a" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                />
                <Bar dataKey="iops" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </motion.div>
  );
};

const MonitoringView = ({ metrics }: { metrics: MetricData[] }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
    <div className="flex items-center justify-between mb-2">
      <h2 className="text-2xl font-bold">Real-time Metrics</h2>
      <div className="flex gap-2">
        <span className="px-3 py-1 bg-zinc-800 rounded-full text-xs font-medium">Last 1 Hour</span>
        <span className="px-3 py-1 bg-zinc-800 rounded-full text-xs font-medium">Refresh: 30s</span>
      </div>
    </div>
    
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card title="Disk I/O (OPS)" icon={HardDrive} className="lg:col-span-2">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={metrics}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="timestamp" hide />
              <YAxis stroke="#71717a" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a' }} />
              <Line type="monotone" dataKey="iops" stroke="#f59e0b" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card title="Replication Lag" icon={Zap}>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={metrics}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="timestamp" hide />
              <YAxis stroke="#71717a" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a' }} />
              <Area type="monotone" dataKey="replicationLag" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  </motion.div>
);

const SlowQueryView = ({ connection }: { connection: DBConnection | null }) => {
  const [logs, setLogs] = useState('');
  const [analysis, setAnalysis] = useState<SlowQueryAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!logs || !connection) return;
    setLoading(true);
    try {
      const result = await analyzeSlowQuery(logs, connection.type);
      setAnalysis(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Slow Query Analyzer</h2>
        <button 
          onClick={handleAnalyze}
          disabled={loading || !logs}
          className="px-6 py-2 bg-emerald-500 text-black rounded-lg font-bold hover:bg-emerald-400 disabled:opacity-50 transition-all flex items-center gap-2"
        >
          {loading ? <Activity className="animate-spin" size={18} /> : <Zap size={18} />}
          {loading ? 'Analyzing...' : 'Analyze Logs'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Paste Query Logs" icon={Upload}>
          <textarea 
            value={logs}
            onChange={e => setLogs(e.target.value)}
            placeholder="Paste your PostgreSQL or MongoDB slow query logs here..."
            className="w-full h-[400px] bg-zinc-950 border border-zinc-800 rounded-lg p-4 font-mono text-xs outline-none focus:border-emerald-500 transition-colors resize-none"
          />
        </Card>

        <div className="space-y-6">
          {analysis ? (
            <>
              <Card title="AI Analysis" icon={MessageSquare} className="bg-emerald-500/5 border-emerald-500/20">
                <p className="text-sm text-zinc-300 leading-relaxed">{analysis.analysis}</p>
              </Card>
              <div className="space-y-4">
                <h4 className="text-sm font-bold uppercase tracking-widest text-zinc-500">Recommendations</h4>
                {analysis.recommendations.map((rec, i) => (
                  <Card key={i} className="border-l-4 border-l-emerald-500">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 bg-zinc-800 rounded text-[10px] font-bold uppercase text-emerald-400">{rec.impact} Impact</span>
                      </div>
                      <code className="block p-2 bg-black rounded text-[10px] text-zinc-400 overflow-x-auto whitespace-pre">{rec.query}</code>
                      <p className="text-sm font-semibold text-zinc-200">{rec.issue}</p>
                      <p className="text-xs text-zinc-400">{rec.suggestion}</p>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-zinc-600 border-2 border-dashed border-zinc-800 rounded-xl p-12">
              <Search size={48} className="mb-4 opacity-20" />
              <p className="text-center font-medium">Upload logs to see AI-powered optimization suggestions</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const IncidentView = ({ metrics, connection }: { metrics: MetricData[], connection: DBConnection | null }) => {
  const [report, setReport] = useState<IncidentReport | null>(null);
  const [loading, setLoading] = useState(false);

  const handleDetect = async () => {
    if (!metrics.length || !connection) return;
    setLoading(true);
    try {
      const result = await analyzeIncident(metrics, connection.type);
      setReport(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Incident Detection</h2>
        <button 
          onClick={handleDetect}
          disabled={loading}
          className="px-6 py-2 bg-red-500 text-white rounded-lg font-bold hover:bg-red-400 transition-all flex items-center gap-2"
        >
          {loading ? <Activity className="animate-spin" size={18} /> : <ShieldAlert size={18} />}
          {loading ? 'Detecting...' : 'Scan for Anomalies'}
        </button>
      </div>

      {report ? (
        <div className="space-y-6">
          <div className={cn(
            "p-4 rounded-xl border flex items-center gap-4",
            report.status === 'Healthy' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"
          )}>
            <div className="w-10 h-10 rounded-full bg-current/10 flex items-center justify-center">
              {report.status === 'Healthy' ? <Activity size={20} /> : <AlertTriangle size={20} />}
            </div>
            <div>
              <h3 className="font-bold">System Status: {report.status}</h3>
              <p className="text-sm opacity-80">AI has completed the scan of current metrics.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {report.issues.map((issue, i) => (
              <Card key={i} title={issue.title} icon={AlertTriangle} className={cn(
                "border-l-4",
                issue.severity === 'critical' ? "border-l-red-500" : 
                issue.severity === 'high' ? "border-l-orange-500" : "border-l-yellow-500"
              )}>
                <div className="space-y-4">
                  <p className="text-sm text-zinc-300">{issue.description}</p>
                  <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800">
                    <h4 className="text-xs font-bold uppercase text-zinc-500 mb-2 flex items-center gap-2">
                      <ChevronRight size={14} /> DBA Runbook
                    </h4>
                    <div className="text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap">
                      {issue.runbook}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-20 border-2 border-dashed border-zinc-800 rounded-2xl">
          <Activity size={48} className="mx-auto mb-4 text-zinc-700" />
          <p className="text-zinc-500">Run a scan to detect anomalies and get troubleshooting suggestions</p>
        </div>
      )}
    </motion.div>
  );
};

const CapacityView = ({ metrics }: { metrics: MetricData[] }) => {
  // Mock capacity data
  const capacityData = Array.from({ length: 12 }).map((_, i) => ({
    month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
    actual: i < 3 ? 400 + i * 50 : null,
    forecast: 400 + i * 55,
    indexSize: 100 + i * 15
  }));

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <h2 className="text-2xl font-bold">Capacity Planning</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Storage Growth Forecast" icon={TrendingUp} className="lg:col-span-2">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={capacityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="month" stroke="#71717a" fontSize={12} />
                <YAxis stroke="#71717a" fontSize={12} unit="GB" />
                <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a' }} />
                <Area type="monotone" dataKey="forecast" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} strokeDasharray="5 5" />
                <Area type="monotone" dataKey="actual" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <div className="space-y-4">
          <Card title="Scaling Recommendations" icon={Zap}>
            <div className="space-y-4">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <p className="text-xs font-bold text-emerald-400 uppercase mb-1">Current Strategy</p>
                <p className="text-sm font-medium">Vertical Scaling (r6g.xlarge)</p>
              </div>
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-xs font-bold text-blue-400 uppercase mb-1">AI Forecast</p>
                <p className="text-sm font-medium">Switch to Horizontal Sharding in 4 months</p>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold text-zinc-500 uppercase">Predicted Index Size</p>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-[65%]"></div>
                </div>
                <p className="text-[10px] text-zinc-400">Reaching 80% of memory in ~3 months</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </motion.div>
  );
};

const VisualizerView = ({ connection }: { connection: DBConnection | null }) => {
  const [query, setQuery] = useState('');
  const [plan, setPlan] = useState<ExplainPlanNode | null>(null);
  const [expensive, setExpensive] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleVisualize = async () => {
    if (!query || !connection) return;
    setLoading(true);
    try {
      const result = await visualizeExplainPlan(query, connection.type);
      setPlan(result.nodes);
      setExpensive(result.expensiveOperations);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const renderNode = (node: ExplainPlanNode, depth = 0) => (
    <div key={node.name + depth} className="ml-6 border-l border-zinc-800 pl-4 py-2">
      <div className={cn(
        "p-3 rounded-lg border transition-all hover:border-emerald-500/50",
        node.type.includes('Scan') ? "bg-red-500/5 border-red-500/20" : "bg-zinc-900 border-zinc-800"
      )}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-bold text-zinc-100">{node.name}</span>
          <span className="text-[10px] font-mono text-zinc-500">{node.type}</span>
        </div>
        <div className="flex gap-4 text-[10px] text-zinc-400">
          <span>Cost: {node.cost}</span>
          <span>Rows: {node.rows}</span>
        </div>
      </div>
      {node.children?.map(child => renderNode(child, depth + 1))}
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <h2 className="text-2xl font-bold">Query Plan Visualizer</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Input Explain Plan" icon={Eye}>
          <textarea 
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Paste EXPLAIN (FORMAT JSON) output or MongoDB explain() result..."
            className="w-full h-[300px] bg-zinc-950 border border-zinc-800 rounded-lg p-4 font-mono text-xs outline-none focus:border-emerald-500 transition-colors resize-none mb-4"
          />
          <button 
            onClick={handleVisualize}
            disabled={loading || !query}
            className="w-full py-2.5 bg-emerald-500 text-black rounded-lg font-bold hover:bg-emerald-400 disabled:opacity-50 transition-all"
          >
            {loading ? 'Processing...' : 'Visualize Plan'}
          </button>
        </Card>

        <Card title="Visual Execution Tree" icon={Activity} className="min-h-[400px]">
          {plan ? (
            <div className="overflow-x-auto">
              <div className="mb-6 flex flex-wrap gap-2">
                {expensive.map((op, i) => (
                  <span key={i} className="px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded text-[10px] font-bold">
                    Expensive: {op}
                  </span>
                ))}
              </div>
              {renderNode(plan)}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-zinc-600">
              <Eye size={48} className="mb-4 opacity-20" />
              <p>Paste an explain plan to visualize the execution tree</p>
            </div>
          )}
        </Card>
      </div>
    </motion.div>
  );
};

const AIChatView = ({ connection, metrics }: { connection: DBConnection | null, metrics: MetricData[] }) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([
    { role: 'assistant', content: "Hello! I'm your DB Ops Copilot. I have access to your current database metrics and configuration. How can I help you today?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  const handleSend = async () => {
    if (!input || loading) return;
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const response = await chatWithAssistant(userMsg, { connection, metrics: metrics.slice(-5) });
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="h-[calc(100vh-12rem)] flex flex-col">
      <div className="flex-1 overflow-y-auto space-y-6 pr-4 custom-scrollbar" ref={scrollRef}>
        {messages.map((msg, i) => (
          <div key={i} className={cn(
            "flex gap-4 max-w-3xl",
            msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
          )}>
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
              msg.role === 'user' ? "bg-zinc-800" : "bg-emerald-500 text-black"
            )}>
              {msg.role === 'user' ? <Users size={16} /> : <ShieldAlert size={16} />}
            </div>
            <div className={cn(
              "p-4 rounded-2xl text-sm leading-relaxed",
              msg.role === 'user' ? "bg-zinc-900 border border-zinc-800" : "bg-zinc-800/50"
            )}>
              <div className="prose prose-invert prose-sm max-w-none">
                <Markdown>
                  {msg.content}
                </Markdown>
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 text-black flex items-center justify-center">
              <ShieldAlert size={16} />
            </div>
            <div className="p-4 rounded-2xl bg-zinc-800/50 flex gap-1">
              <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 relative">
        <input 
          type="text" 
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Ask anything about your database..."
          className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-6 py-4 pr-16 focus:border-emerald-500 outline-none transition-all shadow-xl"
        />
        <button 
          onClick={handleSend}
          disabled={!input || loading}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-emerald-500 text-black rounded-xl hover:bg-emerald-400 disabled:opacity-50 transition-all"
        >
          <Send size={20} />
        </button>
      </div>
    </motion.div>
  );
};

const SettingsView = ({ connections, user }: { connections: DBConnection[], user: User }) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [newAlert, setNewAlert] = useState({ connectionId: '', metric: 'cpu', threshold: 80, operator: '>', channel: 'email' });

  useEffect(() => {
    fetch('/api/alerts').then(res => res.json()).then(setAlerts);
  }, []);

  const handleAddAlert = async () => {
    if (user.role === 'viewer') return alert('Insufficient permissions');
    const res = await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newAlert)
    });
    const data = await res.json();
    setAlerts([...alerts, data]);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <h2 className="text-2xl font-bold">Alerting & Settings</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Configured Alerts" icon={AlertTriangle}>
            <div className="space-y-3">
              {alerts.map(alert => (
                <div key={alert.id} className="flex items-center justify-between p-3 bg-zinc-950 border border-zinc-800 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-zinc-800 rounded text-zinc-400">
                      {alert.channel === 'email' ? <MessageSquare size={16} /> : <Activity size={16} />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {alert.metric.toUpperCase()} {alert.operator} {alert.threshold}%
                      </p>
                      <p className="text-xs text-zinc-500">Notify via {alert.channel}</p>
                    </div>
                  </div>
                  {user.role !== 'viewer' && (
                    <button className="p-2 text-zinc-600 hover:text-red-400 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
              {alerts.length === 0 && <p className="text-center py-8 text-zinc-600 text-sm">No alerts configured yet</p>}
            </div>
          </Card>

          {user.role !== 'viewer' && (
            <Card title="Create New Alert" icon={Plus}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Database</label>
                  <select 
                    value={newAlert.connectionId}
                    onChange={e => setNewAlert({...newAlert, connectionId: e.target.value})}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500"
                  >
                    <option value="">Select Database</option>
                    {connections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Metric</label>
                  <select 
                    value={newAlert.metric}
                    onChange={e => setNewAlert({...newAlert, metric: e.target.value})}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500"
                  >
                    <option value="cpu">CPU Usage</option>
                    <option value="memory">Memory Usage</option>
                    <option value="latency">Query Latency</option>
                    <option value="lag">Replication Lag</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Threshold (%)</label>
                  <input 
                    type="number"
                    value={newAlert.threshold}
                    onChange={e => setNewAlert({...newAlert, threshold: Number(e.target.value)})}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Channel</label>
                  <select 
                    value={newAlert.channel}
                    onChange={e => setNewAlert({...newAlert, channel: e.target.value as any})}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500"
                  >
                    <option value="email">Email</option>
                    <option value="slack">Slack</option>
                  </select>
                </div>
              </div>
              <button 
                onClick={handleAddAlert}
                className="w-full mt-6 py-2 bg-zinc-100 text-black rounded-lg font-bold hover:bg-white transition-all"
              >
                Add Alert Rule
              </button>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card title="Role-Based Access" icon={ShieldAlert}>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">Your Role</span>
                <span className="text-emerald-400 font-bold capitalize">{user.role}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">Permissions</span>
                <span className="text-zinc-500">{user.role === 'admin' ? 'Full Access' : user.role === 'operator' ? 'Manage Alerts' : 'Read Only'}</span>
              </div>
              {user.role === 'admin' && (
                <button className="w-full py-2 border border-zinc-800 rounded-lg text-xs font-bold hover:bg-zinc-800 transition-colors">
                  Manage Users
                </button>
              )}
            </div>
          </Card>
        </div>
      </div>
    </motion.div>
  );
};
