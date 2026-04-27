import Link from 'next/link';

export default function BillingPage() {
  return (
    <div>
      <h1>Billing</h1>
      <p>Manage your subscription, invoices, and payment method.</p>
      <Link href="/billing/invoices">View invoices</Link>
      <button>Update payment method</button>
      <button data-testid="upgrade-plan-btn">Upgrade plan</button>
      <div className="usage-card">
        <span>API calls this month: 12,403</span>
      </div>
    </div>
  );
}
