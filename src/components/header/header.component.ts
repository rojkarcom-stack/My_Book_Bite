import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuizService } from '../../services/quiz.service';
import { TranslationService } from '../../services/translation.service';
import { SupabaseService } from '../../services/supabase.service';
import { ThemeSwitcherComponent } from '../theme-switcher/theme-switcher.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, ThemeSwitcherComponent],
  template: `
    <header class="w-full max-w-7xl mx-auto mb-8 animate-fade-in">
      <div class="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white/70 dark:bg-slate-800/70 backdrop-blur-md px-6 py-4 rounded-3xl border border-slate-200/50 dark:border-slate-700/50 shadow-md">
        
        <!-- Brand Signature -->
        <button (click)="goHome()" class="flex items-center gap-2.5 transition active:scale-95 group focus:outline-none">
          <div class="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
            </svg>
          </div>
          <div class="text-start">
            <span class="block text-base font-black tracking-tight text-slate-800 dark:text-white leading-none font-heading">{{ t.translate('landing.appName') }}</span>
            <span class="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">{{ t.translate('student.dashboard') || 'Student Space' }}</span>
          </div>
        </button>

        <!-- User Ident & Quick Actions -->
        <div class="flex items-center flex-wrap gap-4 sm:gap-6">
          @if (currentUser()) {
            <div class="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-700/50">
              <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span class="text-xs font-bold text-slate-600 dark:text-slate-400 truncate max-w-[150px] sm:max-w-[200px]">{{ currentUser()?.email }}</span>
            </div>
          }

          <div class="h-5 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>

          <div class="flex items-center gap-3">
            <!-- Home Link -->
            <button (click)="goHome()" class="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900/40 transition">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
              <span>{{ t.translate('home') }}</span>
            </button>

            <!-- Billing Link -->
            @if (currentUser()) {
              <button (click)="goToBilling()" class="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900/40 transition border border-indigo-500/20 bg-indigo-50/20 dark:bg-indigo-950/20">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4 text-indigo-500">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-19.5 5.25h3m-3 0h16.5m-16.5 4.5h16.5a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5H4.5a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 18Z" />
                </svg>
                <span>{{ t.translate('student.billing') || 'Billing' }}</span>
              </button>
            }

            <!-- Theme Switcher -->
            <app-theme-switcher />

            <!-- Sign Out -->
            <button (click)="signOut()" class="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900/40 transition">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-4 h-4">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              </svg>
              <span>{{ t.translate('auth.signOut') }}</span>
            </button>
          </div>
        </div>

      </div>
    </header>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  quizService = inject(QuizService);
  supabase = inject(SupabaseService);
  t = inject(TranslationService);

  currentUser = this.supabase.currentUser;

  goHome() {
    this.quizService.view.set('role_select');
  }

  goToBilling() {
    this.quizService.view.set('student_billing');
  }

  signOut() {
    this.quizService.signOut();
  }
}

