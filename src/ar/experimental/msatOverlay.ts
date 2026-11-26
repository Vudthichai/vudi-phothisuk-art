import { MSAT_ENTRANCE_SECONDS, msatTagline } from '../msatConfig';
import { coverRect } from '../recording';

export type EmblemBounds = { left: number; top: number; right: number; bottom: number };
const lineHeight = 1.02;
const forest = '#12351d';
const breakAt = msatTagline.lastIndexOf(' ');
const oneLine = [msatTagline] as const;
const twoLines = [msatTagline.slice(0, breakAt), msatTagline.slice(breakAt + 1)] as const;

type CaptionFrame = {
  fontSize: number;
  width: number;
  rows: { width: number; glyphs: HTMLElement }[];
  caret: HTMLElement;
  busy: boolean;
  center: number;
  top: number;
};
const captionFrames = new WeakMap<HTMLElement, CaptionFrame>();

export function msatCaptionLines(width: number, wrapPortrait: boolean) {
  return wrapPortrait && width <= 430 ? twoLines : oneLine;
}

// CSS ease-in-out: cubic-bezier(.42, 0, .58, 1), also used by the homepage curtain.
function revealEase(position: number) {
  let low = 0, high = 1;
  for (let index = 0; index < 10; index++) {
    const t = (low + high) / 2;
    const x = 3 * (1 - t) * (1 - t) * t * .42 + 3 * (1 - t) * t * t * .58 + t * t * t;
    if (x === position) return t * t * (3 - 2 * t);
    if (x < position) low = t;
    else high = t;
  }
  const t = (low + high) / 2;
  return t * t * (3 - 2 * t);
}

export function msatTypewriter(elapsed: number, start: number, duration: number, reduced: boolean) {
  if (reduced || elapsed >= start + duration) {
    return { count: msatTagline.length, shown: true, complete: true, cursor: false };
  }
  if (elapsed < start) return { count: 0, shown: false, complete: false, cursor: false };
  const age = elapsed - start;
  const count = Math.floor(msatTagline.length * revealEase(age / duration));
  return { count, shown: true, complete: false, cursor: age % .84 < .59 };
}

export function mountMsatHud(host: HTMLElement, wrapPortrait = false) {
  host.dataset.msat = '';
  host.toggleAttribute('data-msat-wrap', wrapPortrait);
  const caption = document.createElement('p');
  caption.className = 'msat-tagline';
  caption.setAttribute('role', 'img');
  caption.setAttribute('aria-label', msatTagline);
  caption.hidden = true;
  host.querySelector('.ar-surface')!.append(caption);

  const nav = document.createElement('nav');
  nav.className = 'msat-nav';
  nav.setAttribute('aria-label', 'Artist links');
  for (const [label, href] of [
    ['Explore the Collection', 'https://vudiphothisukart.com/collections/forest-and-flowers'],
    ['Visit Website', 'https://vudiphothisukart.com/'],
  ]) {
    const link = document.createElement('a');
    link.textContent = label;
    link.href = href;
    nav.append(link);
  }
  const controls = host.querySelector('.ar-controls')!;
  const recording = document.createElement('div');
  recording.className = 'msat-record-row';
  recording.append(controls.querySelector('#ar-record')!, controls.querySelector('#ar-capture-help')!);
  controls.append(recording, nav);
}

export function createMsatOverlay(host: HTMLElement) {
  const caption = host.querySelector<HTMLElement>('.msat-tagline')!;
  const nav = host.querySelector<HTMLElement>('.msat-nav')!;
  const controls = host.querySelector<HTMLElement>('.ar-controls')!;
  const surface = host.querySelector<HTMLElement>('.ar-surface')!;
  const video = surface.querySelector('video')!;
  const style = getComputedStyle(host);
  const start = MSAT_ENTRANCE_SECONDS + (parseFloat(style.getPropertyValue('--signature-reveal-delay')) || .25);
  const duration = parseFloat(style.getPropertyValue('--signature-reveal-duration')) || 1.5;
  const caret = document.createElement('span');
  caret.className = 'msat-caret';
  caret.dataset.msatCaret = '';
  caret.setAttribute('aria-hidden', 'true');
  const wrapPortrait = host.hasAttribute('data-msat-wrap');
  let rows: { line: HTMLElement; container: HTMLElement; glyphs: HTMLElement; text: string; offset: number }[] = [];
  const sampler = document.createElement('canvas');
  sampler.width = 12;
  sampler.height = 6;
  let sampleContext = sampler.getContext('2d', { willReadFrequently: true });
  let sampleAt = -Infinity, busy = true, width = 0, height = 0, fontSize = 44;
  let leftEdge = 20, rightEdge = 20;
  let captionFrame: CaptionFrame | undefined;
  let lastCount = -1, lastCursor = false, shown = false, lastComplete = false;
  void document.fonts?.load('400 48px "Bodoni Moda"', msatTagline).then(() => {
    width = 0;
  }, () => {});

  function measure() {
    const w = surface.clientWidth || innerWidth;
    const h = surface.clientHeight || innerHeight;
    if (w === width && h === height) return;
    width = w;
    height = h;
    const rect = controls.getBoundingClientRect();
    leftEdge = rect.width ? Math.max(20, rect.left + 10) : 20;
    rightEdge = rect.width ? Math.min(w - 20, rect.right - 10) : w - 20;
    const lines = msatCaptionLines(w, wrapPortrait);
    fontSize = Math.min(68, w * (lines.length > 1 ? .125 : .104), h * .105);
    if (rows.length !== lines.length) {
      let offset = 0;
      rows = lines.map(text => {
        const line = document.createElement('span');
        line.className = 'msat-line';
        line.setAttribute('aria-hidden', 'true');
        const sizer = document.createElement('span');
        sizer.className = 'msat-line-sizing';
        sizer.textContent = text;
        const container = document.createElement('span');
        container.className = 'msat-glyphs';
        const glyphs = document.createElement('span');
        glyphs.dataset.msatTyped = '';
        container.append(glyphs);
        line.append(sizer, container);
        const row = { line, container, glyphs, text, offset };
        offset += text.length + 1;
        return row;
      });
      caption.replaceChildren(...rows.map(row => row.line));
      lastCount = -1;
    }
    caption.style.fontSize = `${fontSize}px`;
    captionFrame = undefined;
  }

  function sample(at: number, left: number, top: number, span: number, depth: number) {
    if (!sampleContext || video.readyState < 2 || at - sampleAt < .55) return;
    sampleAt = at;
    const crop = coverRect(video.videoWidth, video.videoHeight, width, height);
    const ratio = video.videoWidth / crop.width;
    try {
      sampleContext.drawImage(video, (left - crop.x) * ratio, (top - crop.y) * ratio,
        span * ratio, depth * ratio, 0, 0, sampler.width, sampler.height);
      const values = sampleContext.getImageData(0, 0, sampler.width, sampler.height).data;
      let sum = 0, square = 0;
      for (let i = 0; i < values.length; i += 4) {
        const luma = (.2126 * values[i] + .7152 * values[i + 1] + .0722 * values[i + 2]) / 255;
        sum += luma;
        square += luma * luma;
      }
      const mean = sum / (values.length / 4);
      const deviation = Math.sqrt(Math.max(0, square / (values.length / 4) - mean * mean));
      busy = mean < .62 || deviation > .125;
      caption.toggleAttribute('data-busy', busy);
    } catch {
      sampleContext = null;
      caption.setAttribute('data-busy', '');
      busy = true;
    }
  }

  return {
    captionHeight() {
      measure();
      return fontSize * (rows.length * lineHeight + .47);
    },
    update(elapsed: number, reduced: boolean, tracked: boolean, bounds?: EmblemBounds) {
      const phase = msatTypewriter(elapsed, start, duration, reduced);
      nav.toggleAttribute('data-ready', tracked && phase.complete);
      if (!(tracked && phase.shown && bounds)) {
        if (shown) caption.hidden = true;
        shown = false;
        captionFrames.delete(host);
        return reduced ? undefined : start + duration;
      }
      measure();
      if (!shown) caption.hidden = false;
      shown = true;
      if (lastCount !== phase.count || lastCursor !== phase.cursor || lastComplete !== phase.complete) {
        caption.dataset.typing = phase.complete ? 'complete' : 'typing';
        let active = rows[0];
        for (const { line, glyphs, text, offset } of rows) {
          const count = Math.max(0, phase.count - offset);
          glyphs.textContent = text.slice(0, count);
          line.toggleAttribute('data-painted', count > 0);
        }
        if (rows[1] && phase.count >= rows[1].offset) active = rows[1];
        if (caret.parentElement !== active.container) active.container.append(caret);
        caret.hidden = !phase.cursor;
        lastCount = phase.count;
        lastCursor = phase.cursor;
        lastComplete = phase.complete;
      }
      if (!captionFrame) {
        const textWidth = Math.max(...rows.map(row => row.line.getBoundingClientRect().width));
        const available = Math.max(1, rightEdge - leftEdge);
        if (textWidth > available) {
          fontSize *= available / textWidth;
          caption.style.fontSize = `${fontSize}px`;
        }
        const measured = rows.map(({ line, glyphs }) => ({ width: line.getBoundingClientRect().width, glyphs }));
        captionFrame = { fontSize, width: Math.max(...measured.map(row => row.width)), rows: measured,
          caret, busy, center: 0, top: 0 };
      }
      const span = captionFrame.width;
      const center = Math.max(leftEdge + span / 2,
        Math.min(rightEdge - span / 2, (bounds.left + bounds.right) / 2));
      const top = bounds.bottom + Math.min(14, fontSize * .24);
      if (center !== captionFrame.center) caption.style.left = `${center}px`;
      if (top !== captionFrame.top) caption.style.top = `${top}px`;
      sample(elapsed, center - span / 2, top, span, rows.length * fontSize * lineHeight);
      captionFrame.center = center;
      captionFrame.top = top;
      captionFrame.busy = busy;
      captionFrames.set(host, captionFrame);
      return reduced ? undefined : start + duration;
    },
    dispose() {
      caption.hidden = true;
      nav.removeAttribute('data-ready');
      captionFrames.delete(host);
      caption.replaceChildren();
    },
  };
}

export function drawMsatCaption(ctx: CanvasRenderingContext2D, width: number, height: number, host: HTMLElement) {
  const caption = captionFrames.get(host);
  const surface = host.querySelector<HTMLElement>('.ar-surface');
  if (!caption || !surface?.clientWidth || !surface.clientHeight) return;
  const { rows, caret, busy, fontSize, center, top } = caption;
  ctx.save();
  ctx.scale(width / surface.clientWidth, height / surface.clientHeight);
  ctx.font = `400 ${fontSize}px "Bodoni Moda", Didot, Georgia, serif`;
  ctx.letterSpacing = `${fontSize * -.035}px`;
  ctx.textBaseline = 'middle';
  const rowHeight = fontSize * lineHeight;
  for (const [index, { width: textWidth, glyphs }] of rows.entries()) {
    const text = glyphs.textContent;
    if (!text) continue;
    const left = center - textWidth / 2;
    const y = top + (index + .5) * rowHeight;
    ctx.save();
    ctx.translate(center, y);
    ctx.scale(textWidth / 2 + fontSize * .62, rowHeight * .75);
    const halo = ctx.createRadialGradient(0, 0, .16, 0, 0, 1);
    halo.addColorStop(0, `rgba(252,248,230,${busy ? .95 : .77})`);
    halo.addColorStop(.70, `rgba(252,248,230,${busy ? .84 : .59})`);
    halo.addColorStop(1, 'rgba(252,248,230,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(-1, -1, 2, 2);
    ctx.restore();
    ctx.strokeStyle = '#fcf8e6';
    ctx.lineJoin = 'round';
    ctx.lineWidth = fontSize * .045;
    ctx.strokeText(text, left, y);
    ctx.fillStyle = forest;
    ctx.fillText(text, left, y);
  }
  if (!caret.hidden) {
    const rect = caret.getBoundingClientRect();
    ctx.fillStyle = forest;
    ctx.fillRect(rect.left, rect.top, rect.width, rect.height);
  }
  ctx.restore();
}
