import type { Metadata } from "next";
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
