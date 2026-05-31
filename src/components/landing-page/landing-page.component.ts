import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuizService } from '../../services/quiz.service';
import { TranslationService } from '../../services/translation.service';
import { ThemeSwitcherComponent } from '../theme-switcher/theme-switcher.component';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [CommonModule, ThemeSwitcherComponent],
  template: `
<div class="relative min-h-screen -m-4 sm:-m-6 lg:-m-8 overflow-hidden bg-slate-900 text-white">
  <!-- Animated Gradient Background -->
  <div class="absolute inset-0 bg-gradient-to-br from-indigo-900 via-slate-900 to-sky-900 animate-background-pan" style="background-size: 200% 200%;"></div>

  <!-- Decorative Floating Blobs -->
  <div class="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-500 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-float" aria-hidden="true"></div>
  <div class="absolute bottom-1/4 -right-32 w-96 h-96 bg-sky-500 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-float" style="animation-delay: -3s;" aria-hidden="true"></div>

  <!-- Main Content Wrapper -->
  <div class="relative z-10 flex flex-col min-h-screen">
    <!-- Header -->
    <header class="py-6 px-4 sm:px-6 lg:px-8 animate-fade-in-down">
      <nav class="flex items-center justify-between max-w-7xl mx-auto">
        <div class="flex items-center gap-2">
            <svg class="h-8 w-auto text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
            </svg>
          <span class="text-xl font-bold text-slate-200">{{ t.translate('landing.appName') }}</span>
        </div>
        <div class="flex items-center gap-4">
          <app-theme-switcher />
          <button (click)="changeLanguage()" class="text-sm font-medium text-indigo-400 hover:text-white transition-colors">
            {{ t.translate('buttons.changeLanguage') }}
          </button>
        </div>
      </nav>
    </header>

    <!-- Hero Section -->
    <main class="flex-grow flex items-center">
      <div class="w-full text-center px-4 py-12 sm:py-20">
        <div class="max-w-4xl mx-auto">
          <h1 class="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-400 animate-fade-in-up" style="animation-delay: 0.2s;">
            {{ t.translate('landing.title.part1') }}
            <span class="text-indigo-400 block sm:inline-block">{{ t.translate('landing.title.part2') }}</span>
          </h1>
          <p class="mt-6 max-w-2xl mx-auto text-lg text-slate-300 animate-fade-in-up" style="animation-delay: 0.4s;">
            {{ t.translate('landing.subtitle') }}
          </p>
          <div class="mt-10 flex justify-center animate-fade-in-up" style="animation-delay: 0.6s;">
            <button (click)="getStarted()"
              class="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white transition-all duration-200 bg-indigo-600 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500 hover:bg-indigo-700 overflow-hidden">
              <span class="absolute -inset-full top-0 block -translate-y-full transform bg-gradient-to-r from-transparent via-white to-transparent opacity-20 group-hover:translate-y-full group-hover:duration-1000"></span>
              {{ t.translate('landing.getStarted') }}
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>

  <!-- Features Section -->
  <section class="relative z-10 w-full py-20 sm:py-32 bg-slate-50 dark:bg-slate-800">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <!-- Feature 1 -->
        <div class="text-center p-8 bg-white dark:bg-slate-900/50 rounded-2xl shadow-lg transition-transform duration-300 hover:-translate-y-2 animate-fade-in-up" style="animation-delay: 0.8s;">
          <div class="flex items-center justify-center h-16 w-16 rounded-full bg-indigo-100 dark:bg-indigo-900/80 mx-auto mb-5 border-4 border-white dark:border-indigo-800/50">
             <svg class="h-8 w-8 text-indigo-500 dark:text-indigo-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0h9.75m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" /></svg>
          </div>
          <h3 class="text-xl font-semibold text-slate-800 dark:text-slate-100">{{ t.translate('landing.features.interactive.title') }}</h3>
          <p class="mt-2 text-slate-600 dark:text-slate-400">{{ t.translate('landing.features.interactive.description') }}</p>
        </div>
        <!-- Feature 2 -->
        <div class="text-center p-8 bg-white dark:bg-slate-900/50 rounded-2xl shadow-lg transition-transform duration-300 hover:-translate-y-2 animate-fade-in-up" style="animation-delay: 1.0s;">
          <div class="flex items-center justify-center h-16 w-16 rounded-full bg-sky-100 dark:bg-sky-900/80 mx-auto mb-5 border-4 border-white dark:border-sky-800/50">
              <svg class="h-8 w-8 text-sky-500 dark:text-sky-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" /></svg>
          </div>
          <h3 class="text-xl font-semibold text-slate-800 dark:text-slate-100">{{ t.translate('landing.features.ai.title') }}</h3>
          <p class="mt-2 text-slate-600 dark:text-slate-400">{{ t.translate('landing.features.ai.description') }}</p>
        </div>
        <!-- Feature 3 -->
        <div class="text-center p-8 bg-white dark:bg-slate-900/50 rounded-2xl shadow-lg transition-transform duration-300 hover:-translate-y-2 animate-fade-in-up" style="animation-delay: 1.2s;">
          <div class="flex items-center justify-center h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/80 mx-auto mb-5 border-4 border-white dark:border-emerald-800/50">
             <svg class="h-8 w-8 text-emerald-500 dark:text-emerald-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M10.343 3.94c.09-.542.56-1.007 1.11-1.226M10.343 3.94a2.25 2.25 0 0 1 3.314 0c.55.219 1.02.684 1.11 1.226M10.343 3.94c0 .633-.271 1.223-.742 1.622M16.5 7.5h-9a2.25 2.25 0 0 0-2.25 2.25v9a2.25 2.25 0 0 0 2.25 2.25h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25Z" /></svg>
          </div>
          <h3 class="text-xl font-semibold text-slate-800 dark:text-slate-100">{{ t.translate('landing.features.admin.title') }}</h3>
          <p class="mt-2 text-slate-600 dark:text-slate-400">{{ t.translate('landing.features.admin.description') }}</p>
        </div>
        <!-- Feature 4 -->
        <div class="text-center p-8 bg-white dark:bg-slate-900/50 rounded-2xl shadow-lg transition-transform duration-300 hover:-translate-y-2 animate-fade-in-up" style="animation-delay: 1.4s;">
          <div class="flex items-center justify-center h-16 w-16 rounded-full bg-rose-100 dark:bg-rose-900/80 mx-auto mb-5 border-4 border-white dark:border-rose-800/50">
              <svg class="h-8 w-8 text-rose-500 dark:text-rose-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 0 1 6-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 0 1-3.827-5.802" /></svg>
          </div>
          <h3 class="text-xl font-semibold text-slate-800 dark:text-slate-100">{{ t.translate('landing.features.multilang.title') }}</h3>
          <p class="mt-2 text-slate-600 dark:text-slate-400">{{ t.translate('landing.features.multilang.description') }}</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer class="relative z-10 w-full text-center py-8 px-4 bg-slate-50 dark:bg-slate-800">
    <p class="text-sm text-slate-500 dark:text-slate-400 animate-fade-in" style="animation-delay: 1.6s;">
      {{ t.translate('landing.footer') }}
    </p>
  </footer>
</div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingPageComponent {
  quizService = inject(QuizService);
  t = inject(TranslationService);

  getStarted() {
    this.quizService.proceedToAuth();
  }

  changeLanguage() {
    this.quizService.view.set('language_select');
  }
}
