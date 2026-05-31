import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuizService } from '../../services/quiz.service';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-student-branch-selector',
  standalone: true,
  imports: [CommonModule],
  template: `
<div class="animate-fade-in-up max-w-4xl mx-auto space-y-6">
  <div class="flex items-center justify-between">
    <button (click)="quizService.goBack()" class="group flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all rounded-xl hover:bg-white dark:hover:bg-slate-800 border border-slate-200/40 dark:border-slate-700/40 hover:shadow-sm">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-4 h-4 transition-transform group-hover:-translate-x-1" [class.rotate-180]="t.isRtl()">
        <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
      </svg>
      {{ t.translate('student.backToGrades') }}
    </button>
  </div>
  
  <div class="text-center p-8 sm:p-12 bg-white dark:bg-slate-800 rounded-3xl shadow-md border border-slate-200/60 dark:border-slate-700/60">
    <div class="max-w-xl mx-auto mb-10">
      <h1 class="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mb-3 font-heading tracking-tight">
        {{ t.translate('student.selectYourBranch') }}
      </h1>
      <p class="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
        {{ t.translate('student.youSelectedGrade', { grade: quizService.selectedGrade() || '' }) }}
      </p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
      
      <!-- Scientific Branch -->
      <button (click)="selectBranch('scientific')" class="group text-start p-8 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 hover:border-indigo-500 hover:bg-indigo-50/45 dark:hover:bg-indigo-950/20 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-sm">
        <div class="w-14 h-14 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
          <svg class="h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
          </svg>
        </div>
        <span class="block font-bold text-xl text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors font-heading">{{ t.translate('student.scientific') }}</span>
        <span class="block text-sm text-slate-400 dark:text-slate-500 mt-2 font-medium">Mathematics, Physics, Chemistry, Biology and general scientific methodologies.</span>
      </button>

      <!-- Literary Branch -->
      <button (click)="selectBranch('literary')" class="group text-start p-8 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 hover:border-indigo-500 hover:bg-indigo-50/45 dark:hover:bg-indigo-950/20 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-sm">
        <div class="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
          <svg class="h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
          </svg>
        </div>
        <span class="block font-bold text-xl text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors font-heading">{{ t.translate('student.literary') }}</span>
        <span class="block text-sm text-slate-400 dark:text-slate-500 mt-2 font-medium">Literature, History, Philosophy, Social Sciences and linguistic fields.</span>
      </button>

    </div>
  </div>
</div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentBranchSelectorComponent {
  quizService = inject(QuizService);
  t = inject(TranslationService);

  selectBranch(branch: 'scientific' | 'literary') {
    this.quizService.selectBranch(branch);
  }
}
