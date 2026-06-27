import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuizService } from '../../services/quiz.service';
import { TranslationService } from '../../services/translation.service';
import { SupabaseService } from '../../services/supabase.service';
import { ThemeSwitcherComponent } from '../theme-switcher/theme-switcher.component';
import { Language } from '../../models';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [CommonModule, ThemeSwitcherComponent],
  template: `
<div class="relative min-h-[96vh] -m-4 sm:-m-6 lg:-m-8 bg-gradient-to-b from-slate-50/50 via-white to-slate-50/30 dark:from-slate-900/40 dark:via-slate-950 dark:to-slate-900/60 transition-colors duration-300 text-slate-800 dark:text-slate-100 flex flex-col justify-between overflow-hidden">
  
  <!-- Sleek Top-Bar Navbar -->
  <header class="py-6 px-4 sm:px-6 lg:px-8 z-20 relative font-sans">
    <nav class="flex items-center justify-between max-w-5xl mx-auto backdrop-blur-md bg-white/40 dark:bg-slate-900/40 px-6 py-4 rounded-3xl border border-white/20 dark:border-slate-800/40 shadow-sm">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 transform hover:scale-105 transition duration-300">
          <svg class="h-5.5 w-5.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
          </svg>
        </div>
        <div>
          <span class="block text-base font-black text-slate-900 dark:text-slate-100 tracking-tight leading-none font-heading">School Quiz Pro</span>
          <span class="block text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mt-1">Multi-Lingual Hub</span>
        </div>
      </div>
      <div class="flex items-center gap-4">
        <app-theme-switcher />
        <button (click)="handlePrimaryAction()" 
                class="px-5 py-2.5 text-xs font-extrabold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl transition-all duration-300 cursor-pointer shadow-md hover:-translate-y-0.5">
          {{ isLoggedIn() ? (t.translate('student.dashboard') || 'Dashboard') : t.translate('auth.signIn') }}
        </button>
      </div>
    </nav>
  </header>

  <!-- Hero & Main Portal Layout -->
  <main class="flex-grow flex flex-col justify-center px-4 py-10 z-10 relative max-w-5xl mx-auto w-full">
    
    <!-- Hero Branding Header -->
    <div class="text-center space-y-6 max-w-3xl mx-auto mb-16 animate-fade-in">
      <div class="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-50/80 dark:bg-indigo-950/40 rounded-full border border-indigo-100/30 dark:border-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-extrabold text-[10px] uppercase tracking-widest leading-none shadow-xs">
        <span class="flex h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
        ✨ Professional Kurdish K-12 Syllabus Practice
      </div>
      
      <h1 class="text-4xl sm:text-6xl font-black text-slate-950 dark:text-white tracking-tight leading-[1.08] font-heading">
        {{ t.translate('landing.title.part1') }} <span class="bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-500 bg-clip-text text-transparent">{{ t.translate('landing.title.part2') }}</span>
      </h1>
      
      <p class="text-sm sm:text-base text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl mx-auto font-medium">
        {{ t.translate('landing.subtitle') }}
      </p>

      <div class="flex flex-col sm:flex-row justify-center items-center gap-4 pt-4">
        <button (click)="handlePrimaryAction()" 
                class="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-indigo-500/25 dark:shadow-indigo-950/40 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex items-center justify-center gap-2">
          <span>{{ isLoggedIn() ? (t.translate('student.dashboard') || 'Enter Dashboard') : t.translate('landing.getStarted') }}</span>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-4 h-4">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Stunning Premium Feature Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in-up mb-16" style="animation-delay: 100ms;">
      <!-- Card 1 -->
      <div class="bg-white/80 dark:bg-slate-900/60 backdrop-blur-md p-6 rounded-3xl border border-slate-200/50 dark:border-slate-800/60 hover:shadow-xl hover:border-indigo-500/30 transition-all duration-300 transform hover:-translate-y-1">
        <div class="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-5 border border-indigo-100/30 dark:border-indigo-900/30 shadow-xs">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5.5 h-5.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.303-1.2-.81-1.557l-1.32-.93a1.5 1.5 0 00-1.74 0l-1.32.93a2.25 2.25 0 01-1.215.357H9.75M12 3h.008v.008H12V3z" />
          </svg>
        </div>
        <h3 class="font-extrabold text-sm text-slate-900 dark:text-slate-100 mb-2 font-heading">{{ t.translate('landing.features.interactive.title') }}</h3>
        <p class="text-xs text-slate-500 dark:text-slate-450 leading-relaxed">{{ t.translate('landing.features.interactive.description') }}</p>
      </div>

      <!-- Card 2 -->
      <div class="bg-white/80 dark:bg-slate-900/60 backdrop-blur-md p-6 rounded-3xl border border-slate-200/50 dark:border-slate-800/60 hover:shadow-xl hover:border-violet-500/30 transition-all duration-300 transform hover:-translate-y-1">
        <div class="w-11 h-11 rounded-2xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-5 border border-violet-100/30 dark:border-violet-900/30 shadow-xs">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5.5 h-5.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 21l8.904-4.813L21 9l-3-3-8.187 9.904z" />
          </svg>
        </div>
        <h3 class="font-extrabold text-sm text-slate-900 dark:text-slate-100 mb-2 font-heading">{{ t.translate('landing.features.ai.title') }}</h3>
        <p class="text-xs text-slate-500 dark:text-slate-450 leading-relaxed">{{ t.translate('landing.features.ai.description') }}</p>
      </div>

      <!-- Card 3 -->
      <div class="bg-white/80 dark:bg-slate-900/60 backdrop-blur-md p-6 rounded-3xl border border-slate-200/50 dark:border-slate-800/60 hover:shadow-xl hover:border-amber-500/30 transition-all duration-300 transform hover:-translate-y-1">
        <div class="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-5 border border-amber-100/30 dark:border-amber-900/30 shadow-xs">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5.5 h-5.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
          </svg>
        </div>
        <h3 class="font-extrabold text-sm text-slate-900 dark:text-slate-100 mb-2 font-heading">{{ t.translate('landing.features.admin.title') }}</h3>
        <p class="text-xs text-slate-500 dark:text-slate-450 leading-relaxed">{{ t.translate('landing.features.admin.description') }}</p>
      </div>

      <!-- Card 4 -->
      <div class="bg-white/80 dark:bg-slate-900/60 backdrop-blur-md p-6 rounded-3xl border border-slate-200/50 dark:border-slate-800/60 hover:shadow-xl hover:border-emerald-500/30 transition-all duration-300 transform hover:-translate-y-1">
        <div class="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-5 border border-emerald-100/30 dark:border-emerald-900/30 shadow-xs">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5.5 h-5.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3" />
          </svg>
        </div>
        <h3 class="font-extrabold text-sm text-slate-900 dark:text-slate-100 mb-2 font-heading">{{ t.translate('landing.features.multilang.title') }}</h3>
        <p class="text-xs text-slate-500 dark:text-slate-450 leading-relaxed">{{ t.translate('landing.features.multilang.description') }}</p>
      </div>
    </div>

    <!-- Preferred Language Selector Panel -->
    <div class="mt-8 pt-8 border-t border-slate-200/60 dark:border-slate-800/60 flex flex-col items-center gap-4">
      <p class="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2 font-sans select-none">
        🌐 Preferred Language / زمانی دڵخواز
      </p>
      <div class="flex flex-wrap justify-center gap-3">
        <button (click)="selectLang('en')" 
                class="px-5 py-3 text-xs font-bold rounded-2xl transition duration-200 border cursor-pointer font-sans flex items-center gap-2 shadow-sm transition hover:scale-105 active:scale-95"
                [class]="quizService.selectedLanguage() === 'en' ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white border-transparent' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'">
          <span>🇬🇧</span> <span class="tracking-tight">English</span>
        </button>
        <button (click)="selectLang('ar')" 
                class="px-5 py-3 text-xs font-bold rounded-2xl transition duration-200 border cursor-pointer font-sans flex items-center gap-2 shadow-sm transition hover:scale-105 active:scale-95"
                [class]="quizService.selectedLanguage() === 'ar' ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white border-transparent' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'">
          <span>🇮🇶</span> <span class="tracking-tight">العربية</span>
        </button>
        <button (click)="selectLang('ku_sorani')" 
                class="px-5 py-3 text-xs font-bold rounded-2xl transition duration-200 border cursor-pointer font-sans flex items-center gap-2 shadow-sm transition hover:scale-105 active:scale-95"
                [class]="quizService.selectedLanguage() === 'ku_sorani' ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white border-transparent' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'">
          <span>☀️</span> <span class="tracking-tight">سۆرانی</span>
        </button>
        <button (click)="selectLang('ku_badini')" 
                class="px-5 py-3 text-xs font-bold rounded-2xl transition duration-200 border cursor-pointer font-sans flex items-center gap-2 shadow-sm transition hover:scale-105 active:scale-95"
                [class]="quizService.selectedLanguage() === 'ku_badini' ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white border-transparent' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'">
          <span>🏔️</span> <span class="tracking-tight">بادینی</span>
        </button>
      </div>
    </div>

    <!-- Discreet Admin Portal Login Gate -->
    <div class="mt-12 flex justify-center pb-4">
      <button (click)="quizService.view.set('admin_login')" class="px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/40 dark:hover:bg-slate-800/80 text-[10px] font-bold text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer flex items-center gap-2 shadow-xs border border-transparent hover:border-slate-200 dark:hover:border-slate-800">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-3 h-3 text-indigo-500 animate-pulse">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632" />
        </svg>
        <span>Access Administrator Office</span>
      </button>
    </div>
  </main>

  <!-- Clean Footer -->
  <footer class="py-6 px-4 text-center z-20 relative border-t border-slate-200/40 dark:border-slate-850/20 backdrop-blur-md bg-white/10 dark:bg-transparent">
    <p class="text-[10px] text-slate-400 dark:text-slate-500 font-bold font-sans tracking-wide">
      &copy; 2026 School Quiz Pro Inc. Crafted dynamically for official Kurdish curriculums.
    </p>
  </footer>
</div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingPageComponent {
  quizService = inject(QuizService);
  t = inject(TranslationService);
  supabase = inject(SupabaseService);

  isLoggedIn = computed(() => !!this.supabase.currentUser());

  selectLang(language: Language) {
    this.quizService.selectLanguage(language);
  }

  handlePrimaryAction() {
    if (this.isLoggedIn()) {
      this.quizService.view.set('role_select');
    } else {
      this.quizService.proceedToAuth();
    }
  }
}
