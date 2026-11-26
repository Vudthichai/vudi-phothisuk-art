import { certificateARPreviews } from './config';

const list = document.querySelector('#certificates')!;
const entries = [...certificateARPreviews].sort((a, b) => a.certificatePaths[0].localeCompare(b.certificatePaths[0]));

for (const experience of entries) {
  const item = document.createElement('li');
  const link = document.createElement('a');
  const mode = document.createElement('small');
  const params = new URLSearchParams({ hub: '1', experience: experience.id });
  const sculpture = experience.rainforestV5 || Boolean(experience.modelAsset || experience.composition);
  const edition = experience.certificatePaths[0].includes('/collectors-edition/') ? 'Collector’s Edition' : 'Original';
  link.href = `/ar-camera.html?${params}`;
  link.textContent = `${experience.title} · ${edition}`;
  mode.textContent = sculpture ? 'Recognition and 3D sculpture' : 'Recognition outline';
  item.append(link, mode);
  if (experience.previewComposition) {
    const preview = document.createElement('a');
    params.set('variant', 'v2');
    preview.href = `/ar-camera.html?${params}`;
    preview.textContent = 'Preview Gilded Bloom V2';
    item.append(preview);
    params.delete('variant');
  }
  if (sculpture) {
    const outline = document.createElement('a');
    params.set('mode', 'recognition');
    outline.href = `/ar-camera.html?${params}`;
    outline.textContent = 'Test with outline';
    outline.setAttribute('aria-label', `Test ${experience.title} ${edition} with outline`);
    item.append(outline);
  }
  list.append(item);
}
