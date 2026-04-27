import Link from 'next/link';
import { TeamTable } from '../components/TeamTable';

export default function TeamPage({ subscription }) {
  return (
    <div>
      <h1>Team</h1>
      <Link href="/team/invite" data-guider='team-team-invite'>Invite member</Link>
      <button aria-label="open-billing-modal" data-guider='team-open-billing-modal'>Manage seats</button>
      {subscription?.plan === 'pro' && <button data-guider='team-el-2'>Add SSO</button>}
      <TeamTable />
    </div>
  );
}
