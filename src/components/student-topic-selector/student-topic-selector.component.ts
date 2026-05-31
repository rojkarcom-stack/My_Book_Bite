import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuizService } from '../../services/quiz.service';
import { TranslationService } from '../../services/translation.service';
import { Chapter, Subchapter } from '../../models';

@Component({
  selector: 'app-student-topic-selector',
  standalone: true,
  imports: [CommonModule],
  template: `
<div class="max-w-4xl mx-auto space-y-8 animate-fade-in-up">
  <!-- Header Section -->
  <div class="bg-white dark:bg-slate-800 rounded-3xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 sm:p-8">
    <div class="flex flex-col sm:flex-row items-center justify-between gap-6">
      <button (click)="quizService.backToSubjectSelect()" 
        class="group flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/50">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-4 h-4 transition-transform group-hover:-translate-x-1" [class.rotate-180]="t.isRtl()">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
        </svg>
        {{ t.translate('student.backToSubjects') }}
      </button>
      
      <div class="text-center">
        <h1 class="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white font-heading tracking-tight">
          {{ selectedSubject()?.name }}
        </h1>
        <p class="text-slate-500 dark:text-slate-400 mt-1 font-medium">{{ t.translate('student.selectATopic') }}</p>
      </div>

      <div class="hidden sm:block w-36"></div>
    </div>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
    <!-- Left Column: Settings -->
    <div class="lg:col-span-4 space-y-6">
      <!-- Quiz Mode Selection -->
      <section class="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <h2 class="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">{{ t.translate('student.quizMode') }}</h2>
        <div class="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 dark:bg-slate-900/50 rounded-2xl">
          <button (click)="setMode('test')"
            class="px-4 py-3 text-sm font-bold rounded-xl transition-all duration-200"
            [class.bg-white]="quizMode() === 'test'"
            [class.dark:bg-indigo-600]="quizMode() === 'test'"
            [class.text-indigo-600]="quizMode() === 'test'"
            [class.dark:text-white]="quizMode() === 'test'"
            [class.shadow-md]="quizMode() === 'test'"
            [class.text-slate-500]="quizMode() !== 'test'">
            {{ t.translate('student.modes.test') }}
          </button>
          <button (click)="setMode('practice')"
            class="px-4 py-3 text-sm font-bold rounded-xl transition-all duration-200"
            [class.bg-white]="quizMode() === 'practice'"
            [class.dark:bg-indigo-600]="quizMode() === 'practice'"
            [class.text-indigo-600]="quizMode() === 'practice'"
            [class.dark:text-white]="quizMode() === 'practice'"
            [class.shadow-md]="quizMode() === 'practice'"
            [class.text-slate-500]="quizMode() !== 'practice'">
            {{ t.translate('student.modes.practice') }}
          </button>
        </div>
        <p class="text-xs font-medium text-slate-500 dark:text-slate-400 mt-4 leading-relaxed">
          {{ quizMode() === 'test' ? t.translate('student.modes.test_desc') : t.translate('student.modes.practice_desc') }}
        </p>
      </section>

      <!-- Timer Settings -->
      <section class="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 p-6" [class.opacity-50]="quizMode() === 'practice'">
        <h2 class="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">{{ t.translate('student.timerSettings') }}</h2>
        <div class="grid grid-cols-2 gap-2">
          @for(duration of timerOptions; track duration.value) {
            <button (click)="setDuration(duration.value)"
              [disabled]="quizMode() === 'practice'"
              class="px-3 py-2.5 text-xs font-bold rounded-xl border-2 transition-all"
              [class.bg-indigo-600]="selectedDuration() === duration.value"
              [class.text-white]="selectedDuration() === duration.value"
              [class.border-indigo-600]="selectedDuration() === duration.value"
              [class.bg-transparent]="selectedDuration() !== duration.value"
              [class.border-slate-200]="selectedDuration() !== duration.value"
              [class.dark:border-slate-700]="selectedDuration() !== duration.value"
              [class.text-slate-600]="selectedDuration() !== duration.value"
              [class.dark:text-slate-400]="selectedDuration() !== duration.value"
              [class.hover:border-indigo-400]="selectedDuration() !== duration.value">
              {{ t.translate(duration.labelKey) }}
            </button>
          }
        </div>
        @if (quizMode() === 'practice') {
          <p class="text-xs font-medium text-amber-600 dark:text-amber-400 mt-4 italic">
            {{ t.translate('student.modes.timer_disabled_in_practice') }}
          </p>
        }
      </section>

      <!-- Question Count -->
      <section class="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <h2 class="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">{{ t.translate('student.questionCount') }}</h2>
        <div class="flex flex-wrap gap-2">
          @for(count of questionCountOptions; track count) {
            <button (click)="setQuestionCount(count)"
              class="px-4 py-2 text-xs font-bold rounded-xl border-2 transition-all"
              [class.bg-indigo-600]="selectedQuestionCount() === count"
              [class.text-white]="selectedQuestionCount() === count"
              [class.border-indigo-600]="selectedQuestionCount() === count"
              [class.bg-transparent]="selectedQuestionCount() !== count"
              [class.border-slate-200]="selectedQuestionCount() !== count"
              [class.dark:border-slate-700]="selectedQuestionCount() !== count"
              [class.text-slate-600]="selectedQuestionCount() !== count"
              [class.dark:text-slate-400]="selectedQuestionCount() !== count"
              [class.hover:border-indigo-400]="selectedQuestionCount() !== count">
              {{ count === Infinity ? t.translate('student.allQuestions') : count }}
            </button>
          }
        </div>
      </section>
    </div>

    <!-- Right Column: Topics List -->
    <div class="lg:col-span-8 space-y-4">
      @if (chapters().length > 0) {
        @for(chapter of chapters(); track chapter.id) {
          @let isExpanded = quizService.selectedChapter()?.id === chapter.id;
          <div class="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-all duration-300"
            [class.ring-2]="isExpanded" [class.ring-indigo-500]="isExpanded" [class.shadow-xl]="isExpanded">
            
            <button (click)="toggleChapter(chapter)" 
              class="w-full flex justify-between items-center p-6 text-start transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/30">
              <div class="flex items-center gap-4">
                <div class="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                  </svg>
                </div>
                <span class="text-lg font-bold text-slate-800 dark:text-slate-100 font-heading">{{ chapter.name }}</span>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-slate-400 transition-transform duration-300" [class.rotate-180]="isExpanded" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            @if (isExpanded) {
              <div class="px-6 pb-6 space-y-3 animate-fade-in">
                <div class="h-px bg-slate-100 dark:bg-slate-700 mb-4"></div>
                @for(subchapter of subchaptersByChapterId().get(chapter.id) || []; track subchapter.id; let subchapterIndex = $index) {
                  @let isAllowed = hasActiveSubscription() && allowedSubjectIds().has(selectedSubject()!.id);
                  @if (isAllowed || subchapterIndex === 0) {
                    <div class="group flex justify-between items-center p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800 transition-all">
                      <span class="text-slate-700 dark:text-slate-200 font-bold">{{ subchapter.name }}</span>
                      <button (click)="startQuiz(chapter, subchapter)" 
                        class="px-6 py-2 text-sm font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-500/20 transition-all hover:-translate-y-0.5 active:translate-y-0">
                        {{ t.translate('student.quiz') }}
                      </button>
                    </div>
                  } @else {
                    <button (click)="goToBilling()" class="w-full flex justify-between items-center p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/20 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-400 group/premium text-start">
                      <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center text-amber-500">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M8 1a3.5 3.5 0 0 0-3.5 3.5V7A1.5 1.5 0 0 0 3 8.5v5A1.5 1.5 0 0 0 4.5 15h7a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 11.5 7V4.5A3.5 3.5 0 0 0 8 1Zm2 6V4.5a2 2 0 1 0-4 0V7h4Z" clip-rule="evenodd" /></svg>
                        </div>
                        <span class="text-slate-500 dark:text-slate-400 font-bold group-hover/premium:text-indigo-500 transition-colors">{{ subchapter.name }}</span>
                      </div>
                      <span class="text-[10px] font-black uppercase tracking-widest bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-400 px-3.5 py-1.5 rounded-full border border-amber-200 dark:border-amber-800 group-hover/premium:bg-indigo-600 group-hover/premium:text-white group-hover/premium:border-indigo-600 transition-all">
                        {{ t.translate('student.unlock') || 'Unlock' }}
                      </span>
                    </button>
                  }
                }
              </div>
            }
          </div>
        }
      } @else {
        <div class="bg-slate-100 dark:bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-12 text-center">
          <div class="w-16 h-16 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <h3 class="text-lg font-bold text-slate-600 dark:text-slate-400 font-heading">{{ t.translate('student.noChaptersAvailable') }}</h3>
        </div>
      }
    </div>
  </div>
</div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentTopicSelectorComponent {
  quizService = inject(QuizService);
  t = inject(TranslationService);
  chapters = this.quizService.chaptersForSelectedSubject;
  selectedSubject = this.quizService.selectedSubject;
  selectedDuration = this.quizService.selectedQuizDuration;
  quizMode = this.quizService.quizMode;

  hasActiveSubscription = this.quizService.hasActiveSubscription;
  allowedSubjectIds = this.quizService.allowedSubjectIds;

  timerOptions = [
    { labelKey: 'student.timer.15s', value: 15 },
    { labelKey: 'student.timer.30s', value: 30 },
    { labelKey: 'student.timer.60s', value: 60 },
    { labelKey: 'student.timer.untimed', value: null },
  ];

  questionCountOptions = [5, 10, 15, 20, Infinity];
  selectedQuestionCount = this.quizService.selectedQuestionCount;
  
  subchaptersByChapterId = computed(() => {
    const map = new Map<string, Subchapter[]>();
    const subchapters = this.quizService.allSubchapters().filter(sc => sc.isPublished !== false);
    for (const subchapter of subchapters) {
        if (!map.has(subchapter.chapter_id)) {
            map.set(subchapter.chapter_id, []);
        }
        map.get(subchapter.chapter_id)!.push(subchapter);
    }
    // Sort subchapters within each chapter
    for (const chapterSubchapters of map.values()) {
        chapterSubchapters.sort((a, b) => a.name.localeCompare(b.name));
    }
    return map;
  });

  setDuration(duration: number | null) {
    this.selectedDuration.set(duration);
  }

  setQuestionCount(count: number) {
    this.quizService.setQuestionCount(count);
  }

  setMode(mode: 'test' | 'practice') {
    this.quizService.setQuizMode(mode);
  }

  toggleChapter(chapter: Chapter) {
    if (this.quizService.selectedChapter()?.id === chapter.id) {
      this.quizService.selectedChapter.set(null);
    } else {
      this.quizService.selectedChapter.set(chapter);
    }
  }

  startQuiz(chapter: Chapter, subchapter: Subchapter) {
    this.quizService.selectTopic(chapter, subchapter);
  }

  goToBilling() {
    this.quizService.view.set('student_billing');
  }
}
