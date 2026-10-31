import '../command-center.css';
import ApplicantsConsole from '@/components/admin/command-center/ApplicantsConsole';

export const metadata = {
  title: 'Recruitment · Sierra Estates Command Center',
  description: 'Applicant management, CV inspection and candidate onboarding.',
};

export const dynamic = 'force-dynamic';

/**
 * RECRUITMENT & APPLICANT MANAGEMENT — the hiring funnel over the `applicants`
 * view (public.career_applications): status workflow, CV links and onboarding
 * with WhatsApp dispatch. See /api/admin/applicants/*.
 */
export default function ApplicantsPage() {
  return <ApplicantsConsole />;
}
