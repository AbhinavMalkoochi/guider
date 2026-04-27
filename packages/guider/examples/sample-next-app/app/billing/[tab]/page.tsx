'use client';
import Link from 'next/link';

export default function BillingTabPage({ params, subscription }) {
  const onCancel = () => {
    if (confirm('Cancel?')) {
      fetch('/api/billing/cancel', { method: 'POST' });
    }
  };
  return (
    <div>
      <h1>Billing — {params.tab}</h1>
      <Link href="/billing">Overview</Link>
      <Link href="/billing/invoices">Invoices</Link>
      <Link href="/billing/upgrade">Upgrade</Link>
      <button data-testid="cancel-subscription" onClick={onCancel}>Cancel subscription</button>
      {subscription?.plan === 'pro' && <Badge>Pro</Badge>}
    </div>
  );
}

function Badge({ children }) {
  return <span className="badge">{children}</span>;
}
