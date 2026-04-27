import os

pages = {
    "src/app/layout.tsx": """import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { GuiderWidget } from "guider";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "OmniCloud Console",
  description: "Enterprise Cloud Management",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-gray-950 text-gray-100 flex h-screen overflow-hidden`}>
        {/* Sidebar */}
        <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-full shrink-0">
          <div className="p-6 border-b border-gray-800">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent tracking-tight">OmniCloud</h1>
            <span className="text-xs text-gray-500 uppercase tracking-widest font-semibold mt-1 block">Enterprise Console</span>
          </div>
          <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
            <div className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-2 px-3 mt-4">Compute</div>
            <Link href="/" className="block px-3 py-2 text-sm rounded-lg hover:bg-gray-800 transition-colors">Dashboard</Link>
            <Link href="/compute/instances" className="block px-3 py-2 text-sm rounded-lg hover:bg-gray-800 transition-colors">Instances</Link>
            <Link href="/compute/clusters" className="block px-3 py-2 text-sm rounded-lg hover:bg-gray-800 transition-colors">Kubernetes Clusters</Link>
            
            <div className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-2 px-3 mt-6">Storage</div>
            <Link href="/storage/buckets" className="block px-3 py-2 text-sm rounded-lg hover:bg-gray-800 transition-colors">Object Storage</Link>
            <Link href="/database/clusters" className="block px-3 py-2 text-sm rounded-lg hover:bg-gray-800 transition-colors">Managed Databases</Link>

            <div className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-2 px-3 mt-6">Network</div>
            <Link href="/network/vpc" className="block px-3 py-2 text-sm rounded-lg hover:bg-gray-800 transition-colors">VPC Networks</Link>
            <Link href="/network/dns" className="block px-3 py-2 text-sm rounded-lg hover:bg-gray-800 transition-colors">DNS Zones</Link>

            <div className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-2 px-3 mt-6">Security & Identity</div>
            <Link href="/security/iam" className="block px-3 py-2 text-sm rounded-lg hover:bg-gray-800 transition-colors">IAM Users & Roles</Link>
            <Link href="/security/firewall" className="block px-3 py-2 text-sm rounded-lg hover:bg-gray-800 transition-colors">Firewall Rules</Link>

            <div className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-2 px-3 mt-6">Administration</div>
            <Link href="/billing" className="block px-3 py-2 text-sm rounded-lg hover:bg-gray-800 transition-colors">Billing & Usage</Link>
            <Link href="/settings/profile" className="block px-3 py-2 text-sm rounded-lg hover:bg-gray-800 transition-colors">Profile Settings</Link>
            <Link href="/settings/api-keys" className="block px-3 py-2 text-sm rounded-lg hover:bg-gray-800 transition-colors">API Keys</Link>
          </div>
          <div className="p-4 border-t border-gray-800 text-sm flex justify-between items-center bg-gray-900/50">
            <span className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div> System Status: OK
            </span>
            <button data-guider="global-help" className="text-gray-400 hover:text-white">❓</button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col h-full bg-[#0a0a0a] overflow-hidden relative">
          {/* Header */}
          <header className="h-16 border-b border-gray-800/60 bg-gray-900/40 backdrop-blur-md flex items-center justify-between px-8 shrink-0 z-10 sticky top-0">
            <div className="flex items-center gap-4 w-96">
              <div className="relative w-full">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">🔍</span>
                <input data-guider="global-search" type="text" placeholder="Search resources, services, docs..." className="w-full bg-gray-800/50 border border-gray-700/50 rounded-full py-1.5 pl-10 pr-4 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all" />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button data-guider="cloud-shell" className="p-2 text-gray-400 hover:text-cyan-400 transition-colors rounded-lg hover:bg-gray-800" title="Cloud Shell">⌨️</button>
              <button data-guider="notifications" className="p-2 text-gray-400 hover:text-cyan-400 transition-colors rounded-lg hover:bg-gray-800 relative" title="Alerts">
                🔔 <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <div className="h-6 w-px bg-gray-700"></div>
              <button data-guider="user-menu" className="flex items-center gap-2 hover:bg-gray-800 p-1.5 rounded-lg transition-colors">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-inner shadow-white/20">A</div>
                <span className="text-sm font-medium mr-1">Admin</span>
                <span className="text-xs text-gray-500">▼</span>
              </button>
            </div>
          </header>
          
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            {children}
          </div>
        </main>
        
        {/* We use proxyUrl for the widget. This connects to your SaaS backend proxy */}
        <GuiderWidget mapUrl="/guider.map.json" proxyUrl={process.env.NEXT_PUBLIC_PROXY_URL || "https://your-convex-site.convex.site/api/guider/plan"} />
      </body>
    </html>
  );
}
""",
    "src/app/page.tsx": """export default function Dashboard() {
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
""",
    "src/app/compute/instances/page.tsx": """export default function Instances() {
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
""",
    "src/app/settings/profile/page.tsx": """export default function ProfileSettings() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Profile Settings</h1>
        <p className="text-gray-400 text-sm">Manage your account details and preferences.</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {/* Fake Tabs */}
        <div className="flex border-b border-gray-800 bg-gray-800/30 overflow-x-auto">
          <button className="px-6 py-3 text-sm font-medium border-b-2 border-cyan-500 text-cyan-400">General</button>
          <button data-guider="tab-security" className="px-6 py-3 text-sm font-medium border-b-2 border-transparent text-gray-400 hover:text-gray-200">Security</button>
          <button data-guider="tab-notifications" className="px-6 py-3 text-sm font-medium border-b-2 border-transparent text-gray-400 hover:text-gray-200">Notifications</button>
          <button data-guider="tab-preferences" className="px-6 py-3 text-sm font-medium border-b-2 border-transparent text-gray-400 hover:text-gray-200">Preferences</button>
        </div>

        <div className="p-8 space-y-8">
          <section>
            <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm text-gray-400 font-medium">First Name</label>
                <input data-guider="input-firstname" type="text" defaultValue="Admin" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:border-cyan-500 outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-400 font-medium">Last Name</label>
                <input data-guider="input-lastname" type="text" defaultValue="User" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:border-cyan-500 outline-none" />
              </div>
              <div className="space-y-2 col-span-2">
                <label className="text-sm text-gray-400 font-medium">Email Address</label>
                <div className="flex gap-3">
                  <input data-guider="input-email" type="email" defaultValue="admin@omnicloud.local" className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:border-cyan-500 outline-none" disabled />
                  <button data-guider="change-email-btn" className="bg-gray-800 hover:bg-gray-700 border border-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">Change</button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Changing your email requires verifying the new address.</p>
              </div>
            </div>
          </section>

          <hr className="border-gray-800" />

          <section>
            <h3 className="text-lg font-semibold mb-4">Two-Factor Authentication</h3>
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-5 flex items-center justify-between">
              <div>
                <div className="font-medium flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  Authenticator App
                </div>
                <div className="text-sm text-gray-400">Configured via Google Authenticator.</div>
              </div>
              <button data-guider="manage-mfa" className="bg-gray-800 hover:bg-gray-700 border border-gray-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors">Manage</button>
            </div>
          </section>

          <hr className="border-gray-800" />

          <section className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-red-400">Danger Zone</h3>
              <p className="text-sm text-gray-400">Permanently delete your account and all resources.</p>
            </div>
            <button data-guider="delete-account" className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 px-4 py-2 rounded-lg text-sm font-medium transition-colors">Delete Account</button>
          </section>
        </div>
        
        <div className="p-6 bg-gray-800/30 border-t border-gray-800 flex justify-end gap-3">
          <button data-guider="cancel-profile" className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white">Cancel</button>
          <button data-guider="save-profile" className="bg-cyan-600 hover:bg-cyan-500 px-6 py-2 rounded-lg text-sm font-medium text-white shadow-lg shadow-cyan-500/20">Save Changes</button>
        </div>
      </div>
    </div>
  );
}
""",
    "src/app/billing/page.tsx": """export default function Billing() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold mb-6">Billing & Cost Management</h1>
      
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl">
          <div className="text-gray-400 text-sm mb-2">Current Month-to-Date</div>
          <div className="text-4xl font-bold font-mono">$4,291.50</div>
          <div className="text-sm text-red-400 mt-2">+12% vs last month</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl">
          <div className="text-gray-400 text-sm mb-2">Forecasted End of Month</div>
          <div className="text-4xl font-bold font-mono">$5,120.00</div>
          <div className="text-sm text-gray-500 mt-2">Based on current usage rate</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl flex flex-col justify-between">
          <div>
            <div className="text-gray-400 text-sm mb-2">Payment Method</div>
            <div className="font-medium text-lg flex items-center gap-2">💳 Visa ending in 4242</div>
          </div>
          <button data-guider="update-payment" className="text-cyan-400 text-sm text-left hover:underline">Update payment method →</button>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-gray-800 flex justify-between items-center">
          <h2 className="text-xl font-bold">Invoices</h2>
          <button data-guider="download-all-invoices" className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg text-sm font-medium">Download All PDF</button>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-800/50 text-gray-400 uppercase tracking-wider text-xs">
            <tr>
              <th className="px-6 py-4">Invoice ID</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Amount</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Download</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {['INV-2025-10', 'INV-2025-09', 'INV-2025-08'].map((inv, i) => (
              <tr key={inv} className="hover:bg-gray-800/20">
                <td className="px-6 py-4 font-mono">{inv}</td>
                <td className="px-6 py-4 text-gray-400">Oct 1, 2025</td>
                <td className="px-6 py-4 font-medium">${(4000 - i*200).toFixed(2)}</td>
                <td className="px-6 py-4"><span className="text-green-400 bg-green-500/10 px-2 py-1 rounded text-xs font-bold">PAID</span></td>
                <td className="px-6 py-4 text-right">
                  <button data-guider={`download-invoice-${inv}`} className="text-cyan-500 hover:text-cyan-400">PDF</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
"""
}

for path, content in pages.items():
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        f.write(content)

print("Created 5 complex pages. Generating 7 more empty but distinct layout pages...")

other_routes = [
    "compute/clusters", "storage/buckets", "database/clusters", 
    "network/vpc", "network/dns", "security/iam", "security/firewall",
    "settings/api-keys"
]

for route in other_routes:
    path = f"src/app/{route}/page.tsx"
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        f.write(f'''export default function {route.replace("/","").capitalize()}() {{
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">{route.replace("/", " ").title()}</h1>
      <div className="bg-gray-900 p-8 rounded-xl border border-gray-800 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-4xl mb-4">🚧</div>
          <h2 className="text-xl font-bold mb-2">Module Loaded</h2>
          <p className="text-gray-500 mb-6">This section is ready for detailed configuration.</p>
          <button data-guider="create-{route.replace("/","-")}" className="bg-cyan-600 px-4 py-2 rounded text-sm text-white">Create New Resource</button>
        </div>
      </div>
    </div>
  )
}}''')

print("Done generating pages.")
