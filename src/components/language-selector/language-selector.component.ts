import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuizService } from '../../services/quiz.service';
import { TranslationService } from '../../services/translation.service';
import { Language } from '../../models';

@Component({
  selector: 'app-language-selector',
  standalone: true,
  template: `
<div class="bg-white dark:bg-slate-800/80 p-8 sm:p-12 rounded-3xl shadow-md border border-slate-200/60 dark:border-slate-700/60 text-center max-w-2xl mx-auto animate-fade-in-up backdrop-blur-sm">
  <div class="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6 text-indigo-600 dark:text-indigo-400">
    <svg class="h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" d="m10.5 21 5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 0 1 6-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 0 1-3.827-5.802" />
    </svg>
  </div>
  <h1 class="text-3xl font-extrabold text-slate-900 dark:text-white mb-3 font-heading tracking-tight">{{ t.translate('welcomeToApp') }}</h1>
  <p class="text-sm font-medium text-slate-500 dark:text-slate-400 mb-10 max-w-md mx-auto leading-relaxed">{{ t.translate('selectYourLanguage') }}</p>
  
  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
    @for(lang of languages; track lang.code) {
      <button (click)="selectLanguage(lang.code)" class="group text-start p-6 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 hover:border-indigo-500 hover:bg-indigo-50/45 dark:hover:bg-indigo-950/20 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 pointer-events-auto">
        <span class="block font-bold text-lg text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{{ lang.name }}</span>
        <span class="block text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">{{ lang.nativeName }}</span>
      </button>
    }
  </div>
</div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
})
export class LanguageSelectorComponent {
  quizService = inject(QuizService);
  t = inject(TranslationService);

  languages: { code: Language; name: string; nativeName: string }[] = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
    { code: 'ku_sorani', name: 'Kurdish (Sorani)', nativeName: 'کوردی (سۆرانی)' },
    { code: 'ku_badini', name: 'Kurdish (Badini)', nativeName: 'کوردی (بادینی)' },
  ];

  selectLanguage(language: Language) {
    this.quizService.selectLanguage(language);
  }
}
