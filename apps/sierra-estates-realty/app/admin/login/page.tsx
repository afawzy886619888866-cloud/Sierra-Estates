import type { Metadata } from 'next';
import LoginFormShell from './LoginFormShell';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Staff Login · Admin' };

export default function AdminLoginPage() {
  return <LoginFormShell />;
}
