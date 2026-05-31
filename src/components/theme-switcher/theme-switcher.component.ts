import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuizService } from '../../services/quiz.service';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-theme-switcher',
  standalone: true,
  imports: [CommonModule],
  template: `
<div class="flex items-center p-1 bg-slate-200 dark:bg-slate-700 rounded-full">
  @for (theme of themes; track theme.name) {
    <button (click)="setTheme(theme.name)"
            [title]="t.translate('theme.' + theme.name)"
            class="p-1.5 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-800"
            [class.bg-white]="quizService.theme() === theme.name"
            [class.dark:bg-indigo-500]="quizService.theme() === theme.name"
            [class.text-indigo-600]="quizService.theme() === theme.name"
            [class.dark:text-white]="quizService.theme() === theme.name"
            [class.text-slate-500]="quizService.theme() !== theme.name"
            [class.dark:text-slate-400]="quizService.theme() !== theme.name"
            [class.hover:bg-slate-300]="quizService.theme() !== theme.name"
            [class.dark:hover:bg-slate-600]="quizService.theme() !== theme.name">
      @switch (theme.name) {
        @case ('light') {
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M10 2a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 2ZM10 15a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 15ZM10 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM15.657 4.343a.75.75 0 0 1 0 1.06l-1.06 1.061a.75.75 0 1 1-1.06-1.06l1.06-1.06a.75.75 0 0 1 1.06 0ZM6.464 13.536a.75.75 0 0 1 0 1.06l-1.06 1.06a.75.75 0 0 1-1.06-1.06l1.06-1.06a.75.75 0 0 1 1.06 0ZM18 10a.75.75 0 0 1 .75.75h1.5a.75.75 0 0 1 0 1.5h-1.5a.75.75 0 0 1-.75-.75A.75.75 0 0 1 18 10ZM2 10a.75.75 0 0 1 .75.75h1.5a.75.75 0 0 1 0 1.5h-1.5a.75.75 0 0 1-.75-.75A.75.75 0 0 1 2 10ZM13.536 6.464a.75.75 0 0 1 1.06 0l1.06 1.06a.75.75 0 1 1-1.06 1.06l-1.06-1.06a.75.75 0 0 1 0-1.06ZM4.343 15.657a.75.75 0 0 1 1.06 0l1.06 1.061a.75.75 0 1 1-1.06 1.06l-1.06-1.06a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg>
        }
        @case ('dark') {
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M7.455 2.164A8.967 8.967 0 0 1 10 2c4.953 0 8.967 4.014 8.967 8.967 0 1.833-.553 3.538-1.488 4.965a.75.75 0 0 1-1.258-.813 6.967 6.967 0 0 0-7.14-7.14.75.75 0 0 1-.813-1.258A8.967 8.967 0 0 1 7.455 2.164Z" clip-rule="evenodd" /></svg>
        }
        @case ('system') {
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path d="M2.5 4.5A2.5 2.5 0 0 1 5 2h10a2.5 2.5 0 0 1 2.5 2.5v5A2.5 2.5 0 0 1 15 12H5a2.5 2.5 0 0 1-2.5-2.5v-5Z" /><path d="M4 14.25a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H4.75a.75.75 0 0 1-.75-.75Z" /></svg>
        }
      }
    </button>
  }
</div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeSwitcherComponent {
  quizService = inject(QuizService);
  t = inject(TranslationService);

  themes: { name: 'light' | 'dark' | 'system' }[] = [
    { name: 'light' },
    { name: 'dark' },
    { name: 'system' },
  ];

  setTheme(theme: 'light' | 'dark' | 'system') {
    this.quizService.setTheme(theme);
  }
}
