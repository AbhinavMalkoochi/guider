import Link from 'next/link';

export default function Marketing() {
  return (
    <main>
      <h1>Welcome to Acme</h1>
      <Link href="/dashboard">Open dashboard</Link>
      <Link href="/pricing">See pricing</Link>
    </main>
  );
}
