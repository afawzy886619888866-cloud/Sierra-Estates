import type { Metadata } from 'next';
import CairoPlazaMeetingAgenda from '@/components/client/CairoPlazaMeetingAgenda';
import '../../site-styles/meeting-agenda.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'جدول أعمال الاجتماع الأسبوعي الأول — مشروع كايرو بلازا | Sierra Estates',
  description: 'مسودة جدول أعمال الاجتماع الأسبوعي الأول لمشروع كايرو بلازا: الهدف، الحضور، نقاط النقاش، القرارات المطلوبة، ومخرجات ما بعد الاجتماع.',
};

export default function CairoPlazaMeetingAgendaPage() {
  return <CairoPlazaMeetingAgenda />;
}
