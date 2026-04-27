/**
 * Tiny fixture Next.js app — used only to test the scanner end-to-end.
 * Not part of the published package.
 */
import Link from 'next/link';

export default function HomePage({ user }) {
  return (
    <div>
      <header>
        <Link href="/dashboard" data-guider='index-dashboard'>Dashboard</Link>
        <Link href="/billing" data-guider='index-billing'>Billing</Link>
        <Link href="/team" data-guider='index-team'>Team</Link>
      </header>
      <main>
        <h1>Welcome</h1>
        <button onClick={() => console.log('cta')} data-guider='index-el-3'>Get started</button>
        {user?.role === 'admin' && <button data-guider='index-el-4'>Admin tools</button>}
      </main>
    </div>
  );
}
