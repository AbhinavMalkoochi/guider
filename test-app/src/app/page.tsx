export default function Dashboard() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 fade-in">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold mb-2">Platform Overview</h1>
          <p className="text-gray-400 text-sm">Welcome back. Here's what's happening in your infrastructure today.</p>
        </div>
        <div className="flex gap-3">
          <button data-guider="create-resource-btn" className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2">
            <span>+</span> Create Resource
          </button>
          <button data-guider="dashboard-settings" className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-2 rounded-lg text-sm transition-all border border-gray-700">⚙️</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Active Instances", value: "142", trend: "+12%", color: "text-green-400" },
          { label: "Monthly Spend", value: "$4,291.50", trend: "-2.4%", color: "text-red-400" },
          { label: "Open Alerts", value: "3", trend: "Needs Action", color: "text-amber-400" },
          { label: "Network Egress", value: "8.4 TB", trend: "+1.2 TB", color: "text-blue-400" }
        ].map((stat, i) => (
          <div key={i} className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 backdrop-blur-sm relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="text-sm text-gray-400 font-medium mb-1">{stat.label}</div>
            <div className="text-2xl font-bold tracking-tight mb-2">{stat.value}</div>
            <div className={`text-xs font-semibold ${stat.color}`}>{stat.trend}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-gray-900/50 border border-gray-800 rounded-xl p-6 backdrop-blur-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold">Compute Utilization</h2>
            <select data-guider="utilization-timeframe" className="bg-gray-800 border border-gray-700 text-sm rounded-lg px-3 py-1.5 outline-none focus:border-cyan-500">
              <option>Last 24 Hours</option>
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
          </div>
          <div className="h-64 border border-dashed border-gray-700 rounded-lg flex items-center justify-center bg-gray-800/30">
            <span className="text-gray-500 font-mono text-sm">Interactive Line Chart visualization</span>
          </div>
        </div>

        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 backdrop-blur-sm flex flex-col">
          <h2 className="text-lg font-bold mb-4">Quick Actions</h2>
          <div className="space-y-3 flex-1">
            <button data-guider="quick-scale-out" className="w-full bg-gray-800 hover:bg-gray-750 border border-gray-700 p-4 rounded-lg flex items-center gap-4 transition-all group text-left">
              <div className="bg-blue-500/10 text-blue-400 p-2 rounded-lg group-hover:bg-blue-500/20 transition-colors">📈</div>
              <div>
                <div className="font-semibold text-sm">Scale Out Cluster</div>
                <div className="text-xs text-gray-500">Add nodes to prod-eks</div>
              </div>
            </button>
            <button data-guider="quick-rotate-keys" className="w-full bg-gray-800 hover:bg-gray-750 border border-gray-700 p-4 rounded-lg flex items-center gap-4 transition-all group text-left">
              <div className="bg-amber-500/10 text-amber-400 p-2 rounded-lg group-hover:bg-amber-500/20 transition-colors">🔑</div>
              <div>
                <div className="font-semibold text-sm">Rotate Root Keys</div>
                <div className="text-xs text-gray-500">Last rotated 89 days ago</div>
              </div>
            </button>
            <button data-guider="quick-backup" className="w-full bg-gray-800 hover:bg-gray-750 border border-gray-700 p-4 rounded-lg flex items-center gap-4 transition-all group text-left">
              <div className="bg-purple-500/10 text-purple-400 p-2 rounded-lg group-hover:bg-purple-500/20 transition-colors">💾</div>
              <div>
                <div className="font-semibold text-sm">Trigger Snapshot</div>
                <div className="text-xs text-gray-500">Manual EBS backup</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
