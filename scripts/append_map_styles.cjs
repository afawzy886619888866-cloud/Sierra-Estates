const fs = require('fs');
const path = require('path');

const cssPath = path.resolve(__dirname, '../apps/sierra-estates-realty/components/site/CartographicMap.module.css');
let content = fs.readFileSync(cssPath, 'utf8');

const newStyles = `

/* ============================================================================
   SIERRA ESTATES · WhatsApp Business Platform & VIP QR Code Modal Styles
   ============================================================================ */

.whatsAppBtn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 13px;
  border-radius: 8px;
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  border: 1px solid;
  outline: none;
  white-space: nowrap;
}

.whatsAppBtnDark {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(6, 11, 19, 0.95));
  border-color: rgba(16, 185, 129, 0.45);
  color: #6ee7b7;
  box-shadow: 0 0 12px rgba(16, 185, 129, 0.2);
}

.whatsAppBtnDark:hover {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.28), rgba(11, 25, 44, 0.98));
  border-color: #10b981;
  color: #a7f3d0;
  box-shadow: 0 0 18px rgba(16, 185, 129, 0.35);
  transform: translateY(-1px);
}

.whatsAppBtnLight {
  background: #f0fdf4;
  border-color: #86efac;
  color: #065f46;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.12);
}

.whatsAppBtnLight:hover {
  background: #dcfce7;
  border-color: #10b981;
  color: #047857;
  transform: translateY(-1px);
}

.popupWaRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 10px;
  margin-top: 6px;
  border-radius: 6px;
  background: rgba(16, 185, 129, 0.12);
  border: 1px solid rgba(16, 185, 129, 0.35);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.popupWaRow:hover {
  background: rgba(16, 185, 129, 0.26);
  border-color: #10b981;
}

/* WhatsApp Business VIP QR Modal */
.qrModalOverlay {
  position: fixed;
  inset: 0;
  background: rgba(4, 8, 15, 0.88);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  display: grid;
  place-items: center;
  z-index: 99999;
  padding: 16px;
  animation: qrFadeIn 0.2s ease-out;
}

@keyframes qrFadeIn {
  from { opacity: 0; transform: scale(0.98); }
  to { opacity: 1; transform: scale(1); }
}

.qrModalCard {
  width: 100%;
  max-width: 460px;
  background: linear-gradient(145deg, #091322, #050b13);
  border: 1.5px solid rgba(201, 168, 76, 0.6);
  border-radius: 20px;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.75), 0 0 30px rgba(201, 168, 76, 0.2);
  padding: 24px;
  position: relative;
  overflow: hidden;
}

.qrModalCardLight {
  background: linear-gradient(145deg, #ffffff, #faf8f5);
  border: 1.5px solid rgba(200, 150, 26, 0.5);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.15), 0 0 20px rgba(200, 150, 26, 0.15);
}

.qrModalCardLight .qrModalTitle {
  color: #0f172a;
}

.qrModalCardLight .qrModalSub {
  color: #b45309;
}

.qrModalCloseBtn {
  position: absolute;
  top: 14px;
  right: 14px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #94a3b8;
  border-radius: 10px;
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.qrModalCloseBtn:hover {
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
}

.qrModalHeader {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.qrModalShield {
  width: 44px;
  height: 44px;
  object-fit: contain;
  filter: drop-shadow(0 0 8px rgba(201, 168, 76, 0.4));
}

.qrModalTitle {
  font-family: var(--font-playfair, Georgia, serif);
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: #ffffff;
  margin: 0;
}

.qrModalSub {
  font-size: 11px;
  color: #c9a84c;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-top: 2px;
}

.qrModalPreview {
  width: 100%;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid rgba(201, 168, 76, 0.3);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
  background: #060b13;
  margin-bottom: 18px;
}

.qrModalPreview img {
  width: 100%;
  height: auto;
  display: block;
}

.qrModalActions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.qrChatBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 12px;
  border-radius: 10px;
  background: linear-gradient(135deg, #10b981, #059669);
  color: #ffffff;
  font-weight: 700;
  font-size: 13.5px;
  text-decoration: none;
  box-shadow: 0 4px 15px rgba(16, 185, 129, 0.35);
  transition: all 0.2s ease;
  border: none;
  cursor: pointer;
}

.qrChatBtn:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(16, 185, 129, 0.45);
}

.qrDownloadBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 10px;
  border-radius: 10px;
  background: rgba(201, 168, 76, 0.12);
  border: 1px solid rgba(201, 168, 76, 0.4);
  color: #dfad3a;
  font-weight: 600;
  font-size: 12.5px;
  text-decoration: none;
  transition: all 0.2s ease;
}

.qrDownloadBtn:hover {
  background: rgba(201, 168, 76, 0.22);
  border-color: #dfad3a;
  color: #f6d88b;
}
`;

if (!content.includes('.whatsAppBtn')) {
  fs.writeFileSync(cssPath, content + newStyles, 'utf8');
  console.log('Appended WhatsApp QR & Modal styles to CartographicMap.module.css');
} else {
  console.log('Styles already present');
}
