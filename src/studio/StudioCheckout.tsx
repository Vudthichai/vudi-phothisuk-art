import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { studioPrice, type StudioSize } from './editions';

const endpoint = '/api/studio-print';
type Quote = {
  quoteId: string;
  printCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  expires: number;
};

function isQuote(value: Quote) {
  return /^[a-f0-9-]{36}$/.test(value.quoteId) &&
    [value.printCents, value.shippingCents, value.taxCents, value.totalCents, value.expires]
      .every(amount => Number.isSafeInteger(amount) && amount >= 0) &&
    value.totalCents === value.printCents + value.shippingCents + value.taxCents;
}

export function useStudioSandbox() {
  const [maxQuantity, setMaxQuantity] = useState<number | null>(null);
  useEffect(() => {
    if (import.meta.env.VITE_STUDIO_SANDBOX !== 'true') return;
    const request = new AbortController();
    void fetch(endpoint + '/status', { signal: request.signal })
      .then(async response => {
        if (!response.ok) return;
        const result = await response.json();
        if (result.sandbox === true && Number.isInteger(result.maxQuantity) && result.maxQuantity >= 1 && result.maxQuantity <= 10) {
          setMaxQuantity(result.maxQuantity);
        }
      })
      .catch(() => {});
    return () => request.abort();
  }, []);
  return maxQuantity;
}

export function StudioCheckout({ artwork, size, maxQuantity }: { artwork: string; size: StudioSize; maxQuantity: number }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [quote, setQuote] = useState<(Quote & { size: string }) | null>(null);
  const busy = useRef(false);

  const currentQuote = quote?.size === size.id ? quote : null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    const details = { ...fields, artwork, size: size.id, quantity: Number(fields.quantity), country: 'US' };
    if (currentQuote && currentQuote.expires <= Date.now()) {
      setQuote(null);
      setError('This shipping quote has expired. Review a new quote before paying.');
      return;
    }
    busy.current = true;
    setPending(true);
    setError('');
    try {
      const response = await fetch(endpoint + (currentQuote ? '/checkout' : '/quote'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentQuote ? { quoteId: currentQuote.quoteId } : details),
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
        if (!isQuote(result)) throw new Error('Invalid shipping quote');
        setQuote({ ...result, size: size.id });
        return;
      }
      const checkout = new URL(result.url);
      if (checkout.origin !== 'https://sandbox.square.link' || checkout.username || checkout.password ||
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
      <legend>Sandbox checkout</legend>
      <p>Use test details and a Square test card. Standard shipping is quoted for eligible U.S. destinations.</p>
      <label>Quantity <input name="quantity" type="number" min="1" max={maxQuantity} defaultValue="1" required/></label>
      <label>Full name <input name="name" autoComplete="name" maxLength={100} required/></label>
      <label>Email <input name="email" type="email" autoComplete="email" maxLength={254} required/></label>
      <label>U.S. street address <input name="line1" autoComplete="address-line1" maxLength={100} required/></label>
      <label>Apartment or suite <input name="line2" autoComplete="address-line2" maxLength={100}/></label>
      <label>City <input name="city" autoComplete="address-level2" maxLength={80} required/></label>
      <label>State abbreviation <input name="state" autoComplete="address-level1" pattern="[A-Za-z]{2}" maxLength={2} required/></label>
      <label>ZIP code <input name="zip" autoComplete="postal-code" inputMode="numeric" pattern="[0-9]{5}(-[0-9]{4})?" maxLength={10} required/></label>
      {currentQuote && <dl className="studio-quote" aria-live="polite">
        <div><dt>Print subtotal</dt><dd>{studioPrice(currentQuote.printCents)}</dd></div>
        <div><dt>Standard shipping</dt><dd>{studioPrice(currentQuote.shippingCents)}</dd></div>
        <div><dt>Sales tax</dt><dd>{studioPrice(currentQuote.taxCents)}</dd></div>
        <div><dt>Total (USD)</dt><dd>{studioPrice(currentQuote.totalCents)}</dd></div>
      </dl>}
      {currentQuote && <p>Shipping is quoted at the U.S. country level. Review and continue within 10 minutes.</p>}
      <button type="submit">
        {pending ? 'Working…' : currentQuote ? 'Continue to Square sandbox' : 'Review shipping and total'}
      </button>
    </fieldset>
    {error && <p role="alert">{error}</p>}
  </form>;
}
