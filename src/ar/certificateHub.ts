import { artworkHubEntries, certificateEdition, finalCameraPath } from './finalExperiences';

const list = document.querySelector('#certificates')!;

for (const { title, certificates } of artworkHubEntries()) {
  const item = document.createElement('li');
  const heading = document.createElement('h2');
  heading.textContent = title;
  const link = document.createElement('a');
  link.className = 'ar-launch';
  link.href = finalCameraPath(certificates[0]);
  link.textContent = 'Experience in AR';
  link.setAttribute('aria-label', `Experience ${title} in AR`);
  const actions = document.createElement('div');
  actions.className = 'ar-actions';
  if (certificates.length > 1) {
    const label = document.createElement('label');
    label.textContent = 'Certificate edition';
    const edition = document.createElement('select');
    edition.setAttribute('aria-label', `${title} certificate edition`);
    for (const certificate of certificates) {
      const option = document.createElement('option');
      option.value = certificate.id;
      option.textContent = certificateEdition(certificate);
      edition.append(option);
    }
    edition.addEventListener('change', () => {
      const selected = certificates.find(certificate => certificate.id === edition.value);
      if (selected) link.href = finalCameraPath(selected);
    });
    label.append(edition);
    actions.append(label);
  }
  actions.append(link);
  item.append(heading, actions);
  list.append(item);
}
