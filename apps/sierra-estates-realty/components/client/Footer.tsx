"use client";
/**
 * Footer — brand + columns + socials.
 */
import { Phone, Mail, MapPin, Share2 } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-navy-950 text-cream/90 mt-20">
      <div className="container-page py-14 grid gap-10 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="h-10 w-10 rounded-md bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center text-navy-950 font-bold text-lg">
              S
            </div>
            <div>
              <p className="font-serif text-xl font-bold">Sierra Estates</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-gold-300">New Cairo</p>
            </div>
          </div>
          <p className="text-sm text-cream/70 max-w-xs">
            The first exclusive destination for New Cairo properties. AI-driven
            matches, curated compounds, full-service concierge.
          </p>
          <div className="flex gap-3 mt-4">
            {['Facebook', 'Instagram', 'LinkedIn'].map((label, i) => (
              <a key={i} href="#" aria-label={label} className="h-9 w-9 rounded-full bg-cream/5 hover:bg-gold-500 hover:text-navy-950 flex items-center justify-center transition-colors">
                <Share2 className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-serif text-base font-bold mb-4 text-gold-300">Explore</h4>
          <ul className="space-y-2 text-sm text-cream/70">
            <li><a href="#listings" className="hover:text-gold-300">Listings</a></li>
            <li><a href="#compounds" className="hover:text-gold-300">Compounds map</a></li>
            <li><a href="#match" className="hover:text-gold-300">Smart Match quiz</a></li>
            <li><a href="#roi" className="hover:text-gold-300">ROI calculator</a></li>
            <li><a href="#concierge" className="hover:text-gold-300">Concierge</a></li>
          </ul>
        </div>

        <div>
          <h4 className="font-serif text-base font-bold mb-4 text-gold-300">Company</h4>
          <ul className="space-y-2 text-sm text-cream/70">
            <li><a href="#" className="hover:text-gold-300">About us</a></li>
            <li><a href="#" className="hover:text-gold-300">Careers</a></li>
            <li><a href="#" className="hover:text-gold-300">Press</a></li>
            <li><a href="#" className="hover:text-gold-300">Privacy</a></li>
            <li><a href="#" className="hover:text-gold-300">Terms</a></li>
          </ul>
        </div>

        <div>
          <h4 className="font-serif text-base font-bold mb-4 text-gold-300">Contact</h4>
          <ul className="space-y-3 text-sm text-cream/70">
            <li className="flex items-start gap-2">
              <Phone className="h-4 w-4 mt-0.5 text-gold-400" />
              <span>+20 100 123 4567</span>
            </li>
            <li className="flex items-start gap-2">
              <Mail className="h-4 w-4 mt-0.5 text-gold-400" />
              <span>hello@sierra-estates.net</span>
            </li>
            <li className="flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-0.5 text-gold-400" />
              <span>5th Settlement, New Cairo, Egypt</span>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-cream/10">
        <div className="container-page py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-cream/50">
          <p>© {new Date().getFullYear()} Sierra Estates. All rights reserved.</p>
          <p>Powered by AI · Made in Cairo</p>
        </div>
      </div>
    </footer>
  );
}
