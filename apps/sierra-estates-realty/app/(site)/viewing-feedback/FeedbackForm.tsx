'use client';

/**
 * /viewing-feedback — Phase 9 public client survey (token-gated).
 *
 * The link was sent to the visitor by WhatsApp when the agent marked the
 * viewing completed; the 48-hex token in the URL IS the capability. Everything
 * rendered comes from the real GET /api/viewing-feedback context — no invented
 * property data, honest loading / invalid / already-submitted states.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

type Phase =
  | { kind: 'loading' }
  | { kind: 'invalid'; reason: string }
  | { kind: 'form'; propertyCode: string | null; preferredDate: string | null; visitorFirstName: string | null }
  | { kind: 'submitting' }
  | { kind: 'done' }
  | { kind: 'error'; message: string };

export default function FeedbackForm() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';

  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [recommend, setRecommend] = useState(true);

  useEffect(() => {
    if (!/^[0-9a-f]{48}$/.test(token)) {
      setPhase({ kind: 'invalid', reason: 'This link is missing a valid feedback token.' });
      return;
    }
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/viewing-feedback?token=${encodeURIComponent(token)}`);
        const body = await res.json().catch(() => ({}));
        if (!alive) return;
        if (!res.ok) {
          setPhase({ kind: 'invalid', reason: body?.error || 'Survey link not found or expired.' });
          return;
        }
        setPhase({
          kind: 'form',
          propertyCode: body.propertyCode ?? null,
          preferredDate: body.preferredDate ?? null,
          visitorFirstName: body.visitorFirstName ?? null,
        });
      } catch {
        if (alive) setPhase({ kind: 'invalid', reason: 'Could not load the survey. Please check your connection.' });
      }
    })();
    return () => {
      alive = false;
    };
  }, [token]);

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (rating < 1) return; // the submit button is disabled below rating 1
      setPhase({ kind: 'submitting' });
      try {
        const res = await fetch('/api/viewing-feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token,
            clientRating: rating,
            ...(comment.trim() ? { clientComment: comment.trim().slice(0, 2000) } : {}),
            wouldRecommend: recommend,
          }),
        });
        const body = await res.json().catch(() => ({}));
        if (res.ok) {
          setPhase({ kind: 'done' });
        } else {
          setPhase({ kind: 'error', message: body?.error || 'Submission failed — please try again.' });
        }
      } catch {
        setPhase({ kind: 'error', message: 'Network error — please try again.' });
      }
    },
    [token, rating, comment, recommend]
  );

  const heroTitle = phase.kind === 'form' && phase.visitorFirstName ? `Thank you, ${phase.visitorFirstName}.` : 'How was your viewing?';

  return (
    <>
      <section className="vf-hero">
        <div className="wrap">
          <h1>{heroTitle}</h1>
          <p className="sub">
            Your feedback goes straight to the team that showed you the unit — it shapes which homes we
            match you with next. Thirty seconds, no account needed.
          </p>
        </div>
      </section>

      <div className="wrap">
        {phase.kind === 'loading' && (
          <div className="vf-state" role="status">
            <div className="vf-state-title">Loading your survey…</div>
            <p>One moment while we verify your link.</p>
          </div>
        )}

        {phase.kind === 'invalid' && (
          <div className="vf-state vf-error" role="alert">
            <div className="vf-state-title">This link isn&apos;t valid</div>
            <p>{phase.reason}</p>
          </div>
        )}

        {phase.kind === 'submitting' && (
          <div className="vf-state" role="status">
            <div className="vf-state-title">Sending your feedback…</div>
            <p>Hang tight.</p>
          </div>
        )}

        {phase.kind === 'done' && (
          <div className="vf-state vf-done" role="status">
            <div className="vf-state-title">Thank you — recorded ✓</div>
            <p>Your feedback is with the team. If you asked for a follow-up, your advisor will reach out shortly.</p>
          </div>
        )}

        {phase.kind === 'error' && (
          <div className="vf-state vf-error" role="alert">
            <div className="vf-state-title">Something went wrong</div>
            <p>{phase.message}</p>
          </div>
        )}

        {phase.kind === 'form' && (
          <form className="vf-card" onSubmit={submit}>
            <h2>Rate the viewing</h2>
            <div className="vf-meta">
              {phase.propertyCode ? <>Unit <b>{phase.propertyCode}</b></> : 'Your visited unit'}
              {phase.preferredDate ? <> · {phase.preferredDate}</> : null}
            </div>

            <div className="vf-field">
              <label htmlFor="vf-rating">Overall, how did it go? *</label>
              <div className="vf-stars" id="vf-rating" role="radiogroup" aria-label="Overall rating">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-label={`${n} star${n === 1 ? '' : 's'}`}
                    aria-checked={rating === n}
                    role="radio"
                    className={rating >= n ? 'on' : ''}
                    onClick={() => setRating(n)}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div className="vf-field">
              <label htmlFor="vf-comment">Anything you&apos;d like to add? (optional)</label>
              <textarea
                id="vf-comment"
                maxLength={2000}
                placeholder="What you loved, what didn&apos;t fit, what you&apos;d like to see next…"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>

            <label className="vf-toggle">
              <input type="checkbox" checked={recommend} onChange={(e) => setRecommend(e.target.checked)} />
              <span>I&apos;d recommend Sierra Estates to a friend</span>
            </label>

            <button className="vf-submit" type="submit" disabled={rating < 1}>
              {rating < 1 ? 'Pick a star rating first' : 'Submit feedback'}
            </button>
          </form>
        )}
      </div>
    </>
  );
}
