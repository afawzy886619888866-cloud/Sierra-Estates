'use client';

import React, { useState } from 'react';
import { NegotiationOutcome } from '@sierra-estates/agents-core/src/negotiation-engine';

export function NegotiationSimulator() {
  const [askingPrice, setAskingPrice] = useState('38000000');
  const [buyerOffer, setBuyerOffer] = useState('34000000');
  const [sellerFloor, setSellerFloor] = useState('35500000');
  const [maxYears, setMaxYears] = useState('7');
  const [loading, setLoading] = useState(false);
  const [outcome, setOutcome] = useState<NegotiationOutcome | null>(null);

  const handleSimulate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/negotiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          askingPrice: Number(askingPrice),
          buyerOffer: Number(buyerOffer),
          sellerFloor: Number(sellerFloor),
          maxYears: Number(maxYears),
        }),
      });
      const data = await res.json();
      if (data?.outcome) {
        setOutcome(data.outcome);
      }
    } catch (e) {
      console.error('Simulation error', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ padding: 20, marginBottom: 20 }}>
      <div className="card-hd" style={{ marginBottom: 16 }}>
        <span className="card-title">🤝 Stage-9 Autonomous Negotiation Simulator</span>
        <span className="chip chip-gold">AI Closer Leila</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 16 }}>
        <div>
          <label style={{ fontSize: 11, color: 'var(--tx-m)', display: 'block', marginBottom: 4 }}>
            Asking Price (EGP)
          </label>
          <input
            type="number"
            value={askingPrice}
            onChange={(e) => setAskingPrice(e.target.value)}
            className="f-in"
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--tx-m)', display: 'block', marginBottom: 4 }}>
            Buyer Offer (EGP)
          </label>
          <input
            type="number"
            value={buyerOffer}
            onChange={(e) => setBuyerOffer(e.target.value)}
            className="f-in"
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--tx-m)', display: 'block', marginBottom: 4 }}>
            Seller Floor Price (EGP)
          </label>
          <input
            type="number"
            value={sellerFloor}
            onChange={(e) => setSellerFloor(e.target.value)}
            className="f-in"
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--tx-m)', display: 'block', marginBottom: 4 }}>
            Installment Tenure (Years)
          </label>
          <input
            type="number"
            value={maxYears}
            onChange={(e) => setMaxYears(e.target.value)}
            className="f-in"
            style={{ width: '100%' }}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={handleSimulate}
        disabled={loading}
        className="btn btn-gold"
        style={{ width: '100%', marginBottom: 16, height: 42, fontSize: 13 }}
      >
        {loading ? 'Brokering Counter-Offers…' : '⚡ Run Stage-9 Multi-Party Simulation'}
      </button>

      {outcome && (
        <div style={{ background: 'var(--bg-e)', borderRadius: 12, padding: 16, border: '1px solid var(--bd)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
            <span className={`chip ${outcome.status === 'agreement_reached' ? 'chip-green' : 'chip-amber'}`}>
              {outcome.status === 'agreement_reached' ? '✓ Agreement Reached' : outcome.status}
            </span>
            <div style={{ display: 'flex', gap: 12 }}>
              {outcome.finalPrice && (
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: 13, color: 'var(--gold)', fontWeight: 700 }}>
                  Final Price: EGP {(outcome.finalPrice / 1e6).toFixed(2)}M ({outcome.totalDiscountPercent.toFixed(1)}% discount)
                </span>
              )}
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: 'var(--tx-m)' }}>
                Est. Commission (2.5%): EGP {outcome.commissionFeeEGP.toLocaleString()}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {outcome.rounds.map((round) => (
              <div
                key={round.round}
                style={{
                  borderLeft: `3px solid ${round.proposedBy === 'closer' ? 'var(--gold)' : round.proposedBy === 'buyer' ? '#3B82F6' : '#10B981'}`,
                  padding: '8px 12px',
                  background: 'var(--surf)',
                  borderRadius: '0 8px 8px 0',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--tx)' }}>
                    Round {round.round} · {round.proposedBy}
                  </span>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: 'var(--gold)' }}>
                    EGP {(round.price / 1e6).toFixed(2)}M · {round.downPaymentPercent}% DP · {round.tenureYears} yrs
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--tx-m)', marginBottom: 2 }}>{round.englishRationale}</div>
                <div style={{ fontSize: 12, color: 'var(--gold-lt)', direction: 'rtl', textAlign: 'right' }}>{round.arabicScript}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 12, fontSize: 12, color: 'var(--tx-f)', fontStyle: 'italic' }}>
            Summary: {outcome.closingSummary}
          </div>
        </div>
      )}
    </div>
  );
}
