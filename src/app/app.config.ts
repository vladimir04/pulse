import { provideHttpClient } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideLucideConfig } from '@lucide/angular';
import { provideEchartsCore } from 'ngx-echarts';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(),
    provideRouter(routes),
    // ECharts arrives with the first chart, not with the sign-in page.
    provideEchartsCore({
      echarts: () => import('./ui/charts/echarts').then((module) => module.echarts),
    }),
    // Icons are 16px Lucide outlines with a 1.5 stroke, for navigation and actions only.
    provideLucideConfig({ size: 16, strokeWidth: 1.5 }),
  ],
};
