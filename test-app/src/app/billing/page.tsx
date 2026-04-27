export default function Billing() {
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
