import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuizService } from '../../services/quiz.service';
import { TranslationService } from '../../services/translation.service';
import { Subject } from '../../models';

@Component({
  selector: 'app-student-subject-selector',
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
        {{ t.translate('student.selectASubject') }}
      </h1>
      <p class="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
        {{ t.translate('student.gradeSubjects', { grade: selectedGrade() || '' }) }}
      </p>
    </div>

    @if (subjects().length > 0) {
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        @for(subject of subjects(); track subject.id) {
          <button (click)="selectSubject(subject)" class="group relative p-6 h-32 flex flex-col items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 hover:border-indigo-500 hover:bg-indigo-50/45 dark:hover:bg-indigo-950/20 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <span class="font-bold text-lg text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors text-center shrink-0 font-heading leading-tight">{{ subject.name }}</span>
          </button>
        }
      </div>
    } @else {
      <div class="text-center py-12">
        <div class="w-16 h-16 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        </div>
        <p class="text-slate-500 dark:text-slate-400 font-medium text-lg">{{ t.translate('student.noSubjectsAvailable') }}</p>
      </div>
    }
  </div>
</div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentSubjectSelectorComponent {
  quizService = inject(QuizService);
  t = inject(TranslationService);
  subjects = this.quizService.subjectsForSelectedGrade;
  selectedGrade = this.quizService.selectedGrade;

  selectSubject(subject: Subject) {
    this.quizService.selectSubject(subject);
  }
}
