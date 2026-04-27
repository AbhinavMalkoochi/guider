'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { InviteDialog } from '@/components/InviteDialog';
import { TeamTable } from '../../components/TeamTable';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';

export default function Dashboard({ user }) {
  const [activeTab, setActiveTab] = useState('overview');
  const router = useRouter();

  const handleExport = () => {
    fetch('/api/export', { method: 'POST' });
  };

  return (
    <main>
      <header>
        <Link href="/billing">Billing</Link>
        <Link href="/team">Team</Link>
        <Link href="/settings">Settings</Link>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <h2>Welcome back</h2>
          <button onClick={() => router.push('/billing/upgrade')}>Upgrade plan</button>
          <button onClick={handleExport}>Export data</button>
          {user?.role === 'admin' && (
            <button aria-label="Open admin panel" onClick={() => router.push('/admin')}>
              Admin
            </button>
          )}
        </TabsContent>
        <TabsContent value="members">
          <InviteDialog />
          <TeamTable />
        </TabsContent>
      </Tabs>
    </main>
  );
}
