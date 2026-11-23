import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { StudioSize } from './editions';

const endpoint = '/api/studio-print';

export function useStudioSandbox() {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    if (import.meta.env.VITE_STUDIO_SANDBOX !== 'true') return;
    const request = new AbortController();
    void fetch(endpoint + '/status', { signal: request.signal })
      .then(async response => { if (response.ok) setAvailable((await response.json()).sandbox === true); })
      .catch(() => {});
    return () => request.abort();
  }, []);
  return available;
}

export function StudioCheckout({ artwork, size }: { artwork: string; size: StudioSize }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const attempt = useRef<{ payload: string; id: string } | null>(null);
  const busy = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    const details = { ...fields, artwork, size: size.id, quantity: Number(fields.quantity), country: 'US' };
    const payload = JSON.stringify(details);
    if (attempt.current?.payload !== payload) attempt.current = { payload, id: crypto.randomUUID() };
    busy.current = true;
    setPending(true);
    setError('');
    try {
      const response = await fetch(endpoint + '/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...details, attemptId: attempt.current.id }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || 'Checkout is unavailable. Please try again.');
        return;
      }
      window.location.assign(result.url);
    } catch {
      setError('Checkout is unavailable. Please try again.');
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return <form className="studio-checkout" onSubmit={submit}>
    <fieldset disabled={pending}>
      <legend>Sandbox checkout</legend>
      <p>Use test details and a Square test card. Shipping and tax appear on Square before payment.</p>
      <label>Quantity <input name="quantity" type="number" min="1" max="10" defaultValue="1" required/></label>
      <label>Full name <input name="name" autoComplete="name" maxLength={100} required/></label>
      <label>Email <input name="email" type="email" autoComplete="email" maxLength={254} required/></label>
      <label>U.S. street address <input name="line1" autoComplete="address-line1" maxLength={100} required/></label>
      <label>Apartment or suite <input name="line2" autoComplete="address-line2" maxLength={100}/></label>
      <label>City <input name="city" autoComplete="address-level2" maxLength={80} required/></label>
      <label>State abbreviation <input name="state" autoComplete="address-level1" pattern="[A-Za-z]{2}" maxLength={2} required/></label>
      <label>ZIP code <input name="zip" autoComplete="postal-code" inputMode="numeric" pattern="[0-9]{5}(-[0-9]{4})?" maxLength={10} required/></label>
      <button type="submit">{pending ? 'Opening Square…' : 'Continue to Square sandbox'}</button>
    </fieldset>
    {error && <p role="alert">{error}</p>}
  </form>;
}
