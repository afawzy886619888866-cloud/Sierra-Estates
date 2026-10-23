'use client';

/**
 * Shared frame for the AI tool pages (matches / pricing / roi / advice /
 * ai-engine). Each page supplies its own hero copy and body; the crumbs,
 * hero and closing CTA are identical across them in the source pages.
 */
import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import SiteShell from '@/components/site/SiteShell';
import { Reveal } from '@/components/site/Reveal';
import { useSite } from '@/lib/site/SiteContext';

export default function AiToolPage({
  crumb,
  title,
  sub,
  children,
}: {
  crumb: string;
  title: string;
  sub: string;
  children: React.ReactNode;
}) {
  const { t, isAr } = useSite();

  return (
    <SiteShell active={null}>
      <header className="page-hero">
        <div className="wrap">
          <div className="crumbs">
            <Link href="/">{t('crumbHome')}</Link>
            <span className="sep">/</span>
            <Link href="/#ai">{t('navAI')}</Link>
            <span className="sep">/</span>
            <span>{crumb}</span>
          </div>
          <h1>{title}</h1>
          <p className="sub">{sub}</p>
        </div>
      </header>

      {children}

      <section className="block">
        <div className="wrap">
          <Reveal className="cta">
            <div className="ct-txt">
              <h2>{isAr ? 'محتاج رأي بشري؟' : 'Want a human read on it?'}</h2>
              <p>
                {isAr
                  ? 'مستشارونا يراجعون النتيجة معك ويقارنوها بالمعروض الفعلي في السوق.'
                  : 'Our advisors walk you through the numbers and check them against live inventory.'}
              </p>
            </div>
            <div className="ct-act">
              <a
                href="https://wa.me/201092048333"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-white"
              >
                <span>{isAr ? 'تحدث مع مستشار' : 'Talk to an advisor'}</span>
                <ArrowRight className="i" />
              </a>
              <Link href="/properties" className="btn btn-out">
                <span>{isAr ? 'تصفح الوحدات' : 'Browse listings'}</span>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </SiteShell>
  );
}
