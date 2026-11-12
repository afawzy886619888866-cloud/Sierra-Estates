import type { Metadata } from 'next';
import Link from 'next/link';
import '../../site-styles/index.css';
import '../../site-styles/site-refinements.css';
import SiteShell from '@/components/site/SiteShell';
import InquiryForm from '@/components/client/InquiryForm';
import { Sparkles, ShieldCheck, Clock, Award } from 'lucide-react';

export const metadata: Metadata = {
  title: 'اطلب وحدتك · خصم 25% بلاك فرايداي | Request Your Property',
  description:
    'سجل رغبتك العقارية في القاهرة الجديدة واحصل فوراً على بطاقة خصم VIP ذهبية بنسبة 25% على كافة الخدمات العقارية والاستشارات وعمولات التعاقد.',
  alternates: {
    canonical: '/request',
  },
};

export default function RequestPage() {
  return (
    <SiteShell active="contact">
      <main className="request-portal-page" style={{ minHeight: '100vh', background: '#061122', paddingBottom: 80 }}>
        {/* Header Breadcrumb & Introduction */}
        <div className="wrap" style={{ paddingTop: 'clamp(100px, 12vw, 130px)', paddingBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#94a3b8', marginBottom: 16 }}>
            <Link href="/" style={{ color: '#cbd5e1', textDecoration: 'none' }}>
              الرئيسية
            </Link>
            <span>/</span>
            <span style={{ color: '#dfad3a', fontWeight: 700 }}>اطلب وحدتك (خصم 25%)</span>
          </div>

          <div style={{ textAlign: 'center', maxWidth: 840, margin: '0 auto 36px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 16px',
                borderRadius: 999,
                background: 'rgba(201, 168, 76, 0.15)',
                border: '1px solid rgba(201, 168, 76, 0.45)',
                color: '#fde047',
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: '0.04em',
                marginBottom: 16,
                boxShadow: '0 0 16px rgba(201, 168, 76, 0.3)',
              }}
            >
              <Sparkles style={{ width: 14, height: 14 }} />
              <span>SIERRA EXCLUSIVE · BLACK FRIDAY CAMPAIGN</span>
            </div>

            <h1
              style={{
                fontSize: 'clamp(28px, 4vw, 44px)',
                fontWeight: 900,
                color: '#ffffff',
                lineHeight: 1.25,
                marginBottom: 14,
                letterSpacing: '-0.02em',
              }}
            >
              اطلب وحدتك في أرقى كمبوندات القاهرة الجديدة
            </h1>

            <p style={{ fontSize: 'clamp(15px, 1.3vw, 17px)', color: '#94a3b8', lineHeight: 1.7, margin: 0 }}>
              فريق مستشارينا يطابق رغبتك مع قاعدة بيانات تضم أكثر من 1,900 وحدة معتمدة ومباشرة من الملاك.
              احصل على دراسة مقارنة للأسعار والعوائد مع كود خصم فوري بنسبة 25%.
            </p>

            {/* Trust Badges */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 'clamp(12px, 3vw, 28px)',
                marginTop: 22,
                flexWrap: 'wrap',
                fontSize: 12.5,
                color: '#cbd5e1',
                fontWeight: 600,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <ShieldCheck style={{ width: 16, height: 16, color: '#10b981' }} />
                <span>ملاك ووسطاء موثقون 100%</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock style={{ width: 16, height: 16, color: '#dfad3a' }} />
                <span>رد فوري ومعاينات خلال 24 ساعة</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Award style={{ width: 16, height: 16, color: '#00f0ff' }} />
                <span>خصم 25% معتمد عبر بطاقة VIP</span>
              </div>
            </div>
          </div>

          {/* Form Container */}
          <InquiryForm />
        </div>
      </main>
    </SiteShell>
  );
}
