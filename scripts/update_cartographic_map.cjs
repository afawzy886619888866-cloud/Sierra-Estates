const fs = require('fs');
const path = require('path');

const mapPath = path.resolve(__dirname, '../apps/sierra-estates-realty/components/site/CartographicMap.tsx');
let code = fs.readFileSync(mapPath, 'utf8');

// 1. Update lucide imports
if (!code.includes('QrCode')) {
  code = code.replace(
    "  Flame\r\n} from 'lucide-react';",
    "  Flame,\r\n  QrCode,\r\n  MessageCircle,\r\n  ExternalLink,\r\n  Download,\r\n  X\r\n} from 'lucide-react';"
  );
  if (!code.includes('QrCode')) {
    code = code.replace(
      "  Flame\n} from 'lucide-react';",
      "  Flame,\n  QrCode,\n  MessageCircle,\n  ExternalLink,\n  Download,\n  X\n} from 'lucide-react';"
    );
  }
}

// 2. Add showWhatsAppModal state
if (!code.includes('showWhatsAppModal')) {
  code = code.replace(
    'const [isFullscreen, setIsFullscreen] = useState<boolean>(false);',
    'const [isFullscreen, setIsFullscreen] = useState<boolean>(false);\r\n  const [showWhatsAppModal, setShowWhatsAppModal] = useState<boolean>(false);'
  );
  if (!code.includes('showWhatsAppModal')) {
    code = code.replace(
      'const [isFullscreen, setIsFullscreen] = useState<boolean>(false);',
      'const [isFullscreen, setIsFullscreen] = useState<boolean>(false);\n  const [showWhatsAppModal, setShowWhatsAppModal] = useState<boolean>(false);'
    );
  }
}

// 3. Add WhatsApp button in toolbarControls right after the engineToggleGroup
const waButtonCode = `
          {/* Official WhatsApp Business Platform & VIP QR Code Trigger */}
          <button
            type="button"
            onClick={() => setShowWhatsAppModal(true)}
            className={\`\${styles.whatsAppBtn} \${activeDarkMode ? styles.whatsAppBtnDark : styles.whatsAppBtnLight}\`}
            title={isAr ? 'منصة واتساب للأعمال الرسمية ورمز الاستجابة السريعة (QR)' : 'Sierra Estates Official WhatsApp Business Platform & VIP QR Code'}
          >
            <QrCode style={{ width: 14, height: 14, color: '#10b981' }} />
            <span>{isAr ? 'واتساب بزنس (QR)' : 'WhatsApp QR'}</span>
          </button>
`;

if (!code.includes('setShowWhatsAppModal(true)')) {
  code = code.replace(
    '          {/* Prominent Dark & Light Edition Toggle Button */}',
    waButtonCode + '\r\n          {/* Prominent Dark & Light Edition Toggle Button */}'
  );
  if (!code.includes('setShowWhatsAppModal(true)')) {
    code = code.replace(
      '          {/* Prominent Dark & Light Edition Toggle Button */}',
      waButtonCode + '\n          {/* Prominent Dark & Light Edition Toggle Button */}'
    );
  }
}

// 4. Add WhatsApp Inquiry CTA inside popup card right after popupCtaRow
const waPopupRow = `
                        {/* WhatsApp Instant Inquiry CTA */}
                        <div 
                          className={styles.popupWaRow}
                          onClick={(e) => {
                            e.stopPropagation();
                            const text = isAr 
                              ? \`مرحباً سييرا استيتس، أود الاستفسار عن وحدات متاحة في مشروع \${compound.nameAr} (\${compound.nameEn})\`
                              : \`Hello Sierra Estates, I would like to inquire about available units in \${compound.nameEn}\`;
                            window.open(\`https://wa.me/201092048333?text=\${encodeURIComponent(text)}\`, '_blank');
                          }}
                          title={isAr ? 'بدء محادثة واتساب فورية عن هذا المشروع' : 'Start instant WhatsApp conversation about this compound'}
                        >
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#10b981' }}>
                            <MessageCircle style={{ width: 13, height: 13 }} />
                            <span>{isAr ? 'استفسار عبر واتساب' : 'WhatsApp Inquiry'}</span>
                          </span>
                          <ExternalLink style={{ width: 12, height: 12, color: '#10b981' }} />
                        </div>
`;

if (!code.includes('popupWaRow')) {
  code = code.replace(
    '                        {/* CTA Prompt */}',
    waPopupRow + '\r\n                        {/* CTA Prompt */}'
  );
  if (!code.includes('popupWaRow')) {
    code = code.replace(
      '                        {/* CTA Prompt */}',
      waPopupRow + '\n                        {/* CTA Prompt */}'
    );
  }
}

// 5. Update seal logo
code = code.replace(
  'src="/assets/aistudio/8e9559f6f_image__1__4350f848.png"',
  'src="/assets/logo-mark.png"'
);

// 6. Add VIP QR Modal before final closing </div>
const modalCode = `
      {/* Interactive WhatsApp Business VIP QR Modal */}
      {showWhatsAppModal && (
        <div 
          className={styles.qrModalOverlay}
          onClick={() => setShowWhatsAppModal(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Sierra Estates WhatsApp Business Platform"
        >
          <div 
            className={\`\${styles.qrModalCard} \${!activeDarkMode ? styles.qrModalCardLight : ''}\`}
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              type="button"
              className={styles.qrModalCloseBtn}
              onClick={() => setShowWhatsAppModal(false)}
              aria-label="Close"
            >
              <X style={{ width: 18, height: 18 }} />
            </button>

            <div className={styles.qrModalHeader}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/logo-mark.png" alt="Sierra Estates" className={styles.qrModalShield} />
              <div>
                <h3 className={styles.qrModalTitle}>SIERRA ESTATES</h3>
                <div className={styles.qrModalSub}>
                  {isAr ? 'منصة واتساب للأعمال الرسمية' : 'Official WhatsApp Business Platform'}
                </div>
              </div>
            </div>

            <div className={styles.qrModalPreview}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src="/assets/sierra-whatsapp-business-card.png" 
                alt="Sierra Estates WhatsApp Business QR Card" 
              />
            </div>

            <div className={styles.qrModalActions}>
              <a 
                href="https://wa.me/201092048333?text=Hello%20Sierra%20Estates"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.qrChatBtn}
              >
                <MessageCircle style={{ width: 18, height: 18 }} />
                <span>{isAr ? 'بدء المحادثة على واتساب (+20 109 204 8333)' : 'Open WhatsApp (+20 109 204 8333)'}</span>
                <ExternalLink style={{ width: 14, height: 14 }} />
              </a>

              <a 
                href="/downloads/sierra-whatsapp-business-card.png"
                download="Sierra-Estates-WhatsApp-Business-QR.png"
                className={styles.qrDownloadBtn}
              >
                <Download style={{ width: 15, height: 15 }} />
                <span>{isAr ? 'تحميل كارت VIP عالي الدقة (PNG)' : 'Download High-Res VIP QR Card (PNG)'}</span>
              </a>
            </div>
          </div>
        </div>
      )}
`;

if (!code.includes('qrModalOverlay')) {
  const lastDivIdx = code.lastIndexOf('</div>');
  code = code.slice(0, lastDivIdx) + modalCode + '\r\n    </div>\r\n  );\r\n};\r\n\r\nexport default CartographicMap;\r\n';
}

fs.writeFileSync(mapPath, code, 'utf8');
console.log('Successfully updated CartographicMap.tsx');
