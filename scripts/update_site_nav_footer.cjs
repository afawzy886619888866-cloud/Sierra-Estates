const fs = require('fs');
const path = require('path');

// 1. Update SiteChrome.tsx
const chromePath = path.resolve(__dirname, '../apps/sierra-estates-realty/components/site/SiteChrome.tsx');
let chromeCode = fs.readFileSync(chromePath, 'utf8');

if (!chromeCode.includes('nav-wa-pill')) {
  const waNavButton = `
            {/* Official WhatsApp Business Platform Quick Pill */}
            <a
              href="https://wa.me/201092048333?text=Hello%20Sierra%20Estates"
              target="_blank"
              rel="noopener noreferrer"
              className="nav-control-pill nav-wa-pill"
              title={isAr ? 'منصة واتساب للأعمال الرسمية (+20 109 204 8333)' : 'Official WhatsApp Business Platform (+20 109 204 8333)'}
              aria-label="WhatsApp Business Platform"
              style={{
                borderColor: 'rgba(16, 185, 129, 0.45)',
                color: '#10b981',
                textDecoration: 'none'
              }}
            >
              <Phone className="i" style={{ width: 14, height: 14, color: '#10b981' }} />
              <span className="pill-text">{isAr ? 'واتساب' : 'WhatsApp'}</span>
            </a>
`;
  chromeCode = chromeCode.replace(
    '            {/* Mobile Hamburger Menu Toggle */}',
    waNavButton + '\r\n            {/* Mobile Hamburger Menu Toggle */}'
  );
  if (!chromeCode.includes('nav-wa-pill')) {
    chromeCode = chromeCode.replace(
      '            {/* Mobile Hamburger Menu Toggle */}',
      waNavButton + '\n            {/* Mobile Hamburger Menu Toggle */}'
    );
  }

  // Also add in mobile drawer
  const waDrawerLink = `
              <a 
                href="https://wa.me/201092048333?text=Hello%20Sierra%20Estates" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="mobile-drawer-link" 
                style={{ color: '#10b981' }}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Phone className="i" style={{ width: 18, height: 18, color: '#10b981' }} />
                <span>{isAr ? 'واتساب بزنس (+20 109 204 8333)' : 'WhatsApp Business (+20 109 204 8333)'}</span>
              </a>
`;
  chromeCode = chromeCode.replace(
    '              <Link href="/#contact" className={`mobile-drawer-link',
    waDrawerLink + '              <Link href="/#contact" className={`mobile-drawer-link'
  );

  fs.writeFileSync(chromePath, chromeCode, 'utf8');
  console.log('Successfully updated SiteChrome.tsx');
} else {
  console.log('SiteChrome already contains WhatsApp link');
}

// 2. Update SiteFooter.tsx
const footerPath = path.resolve(__dirname, '../apps/sierra-estates-realty/components/site/SiteFooter.tsx');
let footerCode = fs.readFileSync(footerPath, 'utf8');

if (!footerCode.includes('WhatsApp Business')) {
  footerCode = footerCode.replace(
    '<div className="contact-line"><Phone className="i" /><span>+2 01092048333</span></div>',
    `<div className="contact-line">
              <Phone className="i" style={{ color: '#10b981' }} />
              <a href="https://wa.me/201092048333" target="_blank" rel="noopener noreferrer" style={{ color: '#10b981', fontWeight: 600 }}>
                +2 01092048333 (WhatsApp Business)
              </a>
            </div>
            <div className="contact-line">
              <ArrowRight className="i" style={{ color: '#c9a84c' }} />
              <a href="/downloads/sierra-whatsapp-business-card.png" download="Sierra-Estates-WhatsApp-QR.png" style={{ color: '#c9a84c', fontSize: 12 }}>
                {isAr ? 'كارت واتساب بزنس (QR VIP)' : 'VIP WhatsApp Business QR'}
              </a>
            </div>`
  );
  fs.writeFileSync(footerPath, footerCode, 'utf8');
  console.log('Successfully updated SiteFooter.tsx');
} else {
  console.log('SiteFooter already contains WhatsApp link');
}
