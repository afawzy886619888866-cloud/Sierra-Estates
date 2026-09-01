import type { Metadata } from 'next';
import LoginFormShell from './LoginFormShell';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Executive Staff Login · Sierra Estates 3.0',
  description: 'Secure authentication gateway for Sierra Estates Intelligence OS and Staff Portal.',
};

export default function AdminLoginPage() {
  return <LoginFormShell />;
}
