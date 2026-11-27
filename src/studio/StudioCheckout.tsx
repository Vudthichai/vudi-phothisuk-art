import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { StudioSize } from './editions';

const endpoint = '/api/studio-print';
const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
type CheckoutReview = {
  reviewId: string;
  printCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  expires: number;
};

function isReview(value: CheckoutReview) {
  return /^[a-f0-9-]{36}$/.test(value.reviewId) &&
    [value.printCents, value.shippingCents, value.taxCents, value.totalCents, value.expires]
      .every(amount => Number.isSafeInteger(amount) && amount >= 0) &&
    value.totalCents === value.printCents + value.shippingCents + value.taxCents;
}

export function useStudioCheckout(allowInvite = true) {
  const inviteRef = useRef<string | undefined>(undefined);
  const [access, setAccess] = useState<{ invite?: string } | null>(null);
  useEffect(() => {
    const fragment = allowInvite ? /^#studio-test=([a-f0-9]{64})$/.exec(window.location.hash)?.[1] : undefined;
    if (fragment) {
      inviteRef.current = fragment;
      window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
    }
    const invite = inviteRef.current;
    const request = new AbortController();
    void fetch(endpoint + '/status', { signal: request.signal })
      .then(async response => {
        if (!response.ok) return;
        const result = await response.json();
        if (result.checkout === true && (result.mode === 'live' || (result.mode === 'live-test' && invite))) {
          setAccess(result.mode === 'live-test' ? { invite } : {});
        }
      })
      .catch(() => {});
    return () => request.abort();
  }, [allowInvite]);
  return access;
}

export function StudioCheckout({ artwork, size, invite }: { artwork: string; size: StudioSize; invite?: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [quote, setQuote] = useState<(CheckoutReview & { size: string }) | null>(null);
  const busy = useRef(false);

  const currentQuote = quote?.size === size.id ? quote : null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    const details = { ...fields, artwork, size: size.id, quantity: 1, country: 'US' };
    if (currentQuote && currentQuote.expires <= Date.now()) {
      setQuote(null);
      setError('This order review has expired. Review shipping and tax again.');
      return;
    }
    busy.current = true;
    setPending(true);
    setError('');
    try {
      const response = await fetch(endpoint + (currentQuote ? '/checkout' : '/review'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...(currentQuote ? { reviewId: currentQuote.reviewId } : details), invite }),
      });
      if (response.status === 429) {
        setError('Too many requests. Wait a minute and try again.');
        return;
      }
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 409) setQuote(null);
        setError(result.error || 'Checkout is unavailable. Please try again.');
        return;
      }
      if (!currentQuote) {
        if (!isReview(result)) throw new Error('Invalid checkout review');
        setQuote({ ...result, size: size.id });
        return;
      }
      const checkout = new URL(result.url);
      if (checkout.origin !== 'https://square.link' || checkout.username || checkout.password ||
          !/^\/u\/[a-z\d_-]+$/i.test(checkout.pathname)) throw new Error('Unexpected checkout destination');
      window.location.assign(checkout.href);
    } catch {
      setError('Checkout is unavailable. Please try again.');
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return <form className="studio-checkout" aria-describedby="studio-returns-policy" onSubmit={submit} onChange={() => setQuote(null)}>
    <fieldset disabled={pending}>
      <legend>{invite ? 'Private checkout test' : 'Buy this Studio Print'}</legend>
      <p>{invite ? 'This private checkout uses a real payment.' : 'Standard shipping to eligible addresses in the contiguous U.S.'}</p>
      <label>Full name <input name="name" autoComplete="name" maxLength={100} required/></label>
      <label>Email <input name="email" type="email" autoComplete="email" maxLength={254} required/></label>
      <label>U.S. street address <input name="line1" autoComplete="address-line1" maxLength={100} required/></label>
      <label>Apartment or suite <input name="line2" autoComplete="address-line2" maxLength={100}/></label>
      <label>City <input name="city" autoComplete="address-level2" maxLength={80} required/></label>
      <label>State abbreviation <input name="state" autoComplete="address-level1" pattern="[A-Za-z]{2}" maxLength={2} required/></label>
      <label>ZIP code <input name="zip" autoComplete="postal-code" inputMode="numeric" pattern="[0-9]{5}(-[0-9]{4})?" maxLength={10} required/></label>
      {currentQuote && <dl className="studio-quote" aria-live="polite">
        <div><dt>Print subtotal</dt><dd>{usd.format(currentQuote.printCents / 100)}</dd></div>
        <div><dt>Standard shipping</dt><dd>{usd.format(currentQuote.shippingCents / 100)}</dd></div>
        <div><dt>Sales tax</dt><dd>{usd.format(currentQuote.taxCents / 100)}</dd></div>
        <div><dt>Total (USD)</dt><dd>{usd.format(currentQuote.totalCents / 100)}</dd></div>
      </dl>}
      {currentQuote && <p>Review and continue within 10 minutes.</p>}
      <button type="submit">
        {pending ? 'Working…' : currentQuote ? 'Continue to Square' : 'Review shipping and total'}
      </button>
    </fieldset>
    {error && <p role="alert">{error}</p>}
  </form>;
}
