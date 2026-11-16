import type { Metadata } from 'next';
import BannerShowcaseClient from './BannerShowcaseClient';

export const metadata: Metadata = {
  title: 'Unified Bilingual Hero Banner · Design System',
  description: 'Egypt’s #1 AI-Driven Real Estate Ecosystem — Unified Bilingual Hero Banner Studio & Sizing Formats (Desktop, Mobile, Billboard).',
};

export default function BannerShowcasePage() {
  return <BannerShowcaseClient />;
}
