import mustache from 'mustache';
import html from '../templates/contact.html?raw';

export const contact = () => {
  const app = document.querySelector('#app');
  app.innerHTML = mustache.render(html);

  document
    .querySelector('#contact-form')
    .addEventListener('submit', e => {
      // イベント無効化
      e.preventDefault();

      /** @type {HTMLButtonElement} */
      const button = e.target.querySelector('button[type="submit"]');
      button.disabled = true;
      const data = Object.fromEntries(new FormData(e.target).entries());
      fetch('/api/v1/contact', {
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(data),
        method: 'POST',
      })
        .then(res =>
          new Promise((resolve, reject) => res.ok ? resolve(res.json()) : reject(res.text())))
        .then(json => console.log(json))
        .catch(err => console.error(err))
        .finally(() => {
          button.disabled = false;
        });
    });
};