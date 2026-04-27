export default function Instances() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Compute Instances</h1>
          <p className="text-gray-400 text-sm">Manage your virtual machines across all regions.</p>
        </div>
        <div className="flex gap-3">
          <button data-guider="launch-instance" className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg text-sm font-medium">
            Launch Instance
          </button>
          <button data-guider="instance-actions" className="bg-gray-800 border border-gray-700 hover:bg-gray-700 px-4 py-2 rounded-lg text-sm font-medium">
            Actions ▾
          </button>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-gray-800 flex gap-4 bg-gray-800/50">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">🔍</span>
            <input data-guider="search-instances" type="text" placeholder="Filter instances by name, ID, or tag..." className="w-full bg-gray-900 border border-gray-700 rounded-lg py-1.5 pl-9 pr-4 text-sm focus:border-cyan-500 outline-none" />
          </div>
          <select data-guider="filter-region" className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm outline-none">
            <option>All Regions</option>
            <option>us-east-1</option>
            <option>eu-west-2</option>
          </select>
          <select data-guider="filter-state" className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm outline-none">
            <option>Any State</option>
            <option>Running</option>
            <option>Stopped</option>
          </select>
        </div>
        
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-900 border-b border-gray-800 text-gray-400 uppercase tracking-wider text-xs font-semibold">
            <tr>
              <th className="px-6 py-4 w-12"><input type="checkbox" className="rounded bg-gray-800 border-gray-600" /></th>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Instance ID</th>
              <th className="px-6 py-4">State</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">Public IP</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {[1, 2, 3, 4, 5].map(i => (
              <tr key={i} className="hover:bg-gray-800/30 transition-colors group">
                <td className="px-6 py-4"><input type="checkbox" className="rounded bg-gray-800 border-gray-600" /></td>
                <td className="px-6 py-4 font-medium flex items-center gap-2">
                  web-frontend-prod-{i}
                  {i===1 && <span className="px-2 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-400 font-bold uppercase">Primary</span>}
                </td>
                <td className="px-6 py-4 text-gray-400 font-mono text-xs">i-0a1b2c3d4e5f{i}</td>
                <td className="px-6 py-4">
                  <span className={`flex items-center gap-2 ${i===3 ? 'text-gray-500' : 'text-green-400'}`}>
                    <div className={`w-2 h-2 rounded-full ${i===3 ? 'bg-gray-500' : 'bg-green-400'}`}></div>
                    {i===3 ? 'Stopped' : 'Running'}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-400">t4g.xlarge</td>
                <td className="px-6 py-4 text-gray-400 font-mono text-xs">{i===3 ? '-' : `203.0.113.${i*10}`}</td>
                <td className="px-6 py-4 text-right">
                  <button data-guider={`manage-instance-${i}`} className="text-cyan-500 hover:text-cyan-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">Manage</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        <div className="p-4 border-t border-gray-800 bg-gray-800/30 flex justify-between items-center text-xs text-gray-500">
          <div>Showing 1 to 5 of 142 instances</div>
          <div className="flex gap-1">
            <button className="px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 disabled:opacity-50" disabled>Prev</button>
            <button className="px-2 py-1 rounded bg-cyan-600 text-white">1</button>
            <button className="px-2 py-1 rounded bg-gray-800 hover:bg-gray-700">2</button>
            <button className="px-2 py-1 rounded bg-gray-800 hover:bg-gray-700">3</button>
            <span className="px-2 py-1">...</span>
            <button className="px-2 py-1 rounded bg-gray-800 hover:bg-gray-700">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
