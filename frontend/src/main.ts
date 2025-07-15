import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig)
  .then(() => {
    // Wait for the next frame to ensure the app is rendered
    requestAnimationFrame(() => {
      const loader = document.getElementById('global-loader');
      if (loader) {
        loader.remove();
      }
    });
  })
  .catch((err) => {
    // Log errors for debugging
    console.error('Bootstrap error:', err);
  });
