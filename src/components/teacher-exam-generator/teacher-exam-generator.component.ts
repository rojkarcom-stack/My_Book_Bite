
import { Component, ChangeDetectionStrategy, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { QuizService } from '../../services/quiz.service';
import { TranslationService } from '../../services/translation.service';
import { Subject, Chapter, Subchapter } from '../../models';

@Component({
  selector: 'app-teacher-exam-generator',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
<div class="max-w-5xl mx-auto animate-fade-in-up">
  <!-- Header Section -->
  <div class="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 sm:p-8 mb-8">
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 class="text-3xl font-bold text-slate-900 dark:text-white font-heading mb-2">
          {{ t.translate('teacher.examGeneratorTitle') }}
        </h1>
        <p class="text-slate-500 dark:text-slate-400 max-w-2xl">
          {{ t.translate('teacher.examGeneratorSubtitle') || 'Create professional, customized exams for your students in minutes.' }}
        </p>
      </div>
      <button (click)="quizService.goBack()" class="group flex items-center gap-2 px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5 group-hover:-translate-x-1 transition-transform" [class.rotate-180]="t.isRtl()">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
        </svg>
        <span class="font-bold">{{ t.translate('back') }}</span>
      </button>
    </div>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
    <!-- Left Column: Configuration -->
    <div class="lg:col-span-7 space-y-8">
      <!-- Step 1: Select Class & Subject -->
      <section class="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 sm:p-8">
        <div class="flex items-center gap-4 mb-8">
          <div class="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <span class="text-xl font-bold font-heading">1</span>
          </div>
          <div>
            <h2 class="text-xl font-bold text-slate-900 dark:text-white font-heading">{{ t.translate('teacher.selectClass') }}</h2>
            <p class="text-sm text-slate-500 dark:text-slate-400">{{ t.translate('teacher.selectClassDesc') || 'Choose the grade and subject for your exam.' }}</p>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div class="space-y-2">
            <label class="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">{{ t.translate('admin.selectGrade') }}</label>
            <div class="relative">
              <select (change)="selectGrade($event)" class="w-full pl-4 pr-10 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl appearance-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-800 dark:text-slate-200 font-medium">
                <option value="" disabled [selected]="!selectedGrade()">{{ t.translate('admin.selectGrade') }}</option>
                @for(grade of grades; track grade) { <option [value]="grade">{{ grade }}</option> }
              </select>
              <div class="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg>
              </div>
            </div>
          </div>
          
          @if(selectedGrade() && [10, 11, 12].includes(selectedGrade()!)) {
            <div class="space-y-2">
              <label class="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">{{ t.translate('admin.selectBranch') }}</label>
              <div class="relative">
                <select (change)="selectBranch($event)" class="w-full pl-4 pr-10 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl appearance-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-800 dark:text-slate-200 font-medium">
                  <option value="" [selected]="!selectedBranch()">{{ t.translate('admin.selectBranch') }}</option>
                  <option value="scientific">{{ t.translate('student.scientific') }}</option>
                  <option value="literary">{{ t.translate('student.literary') }}</option>
                </select>
                <div class="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-400">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg>
                </div>
              </div>
            </div>
          }
          
          <div class="space-y-2 sm:col-span-2">
            <label class="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">{{ t.translate('admin.selectSubject') }}</label>
            <div class="relative">
              <select (change)="selectSubject($event)" [disabled]="!selectedGrade()" class="w-full pl-4 pr-10 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl appearance-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-800 dark:text-slate-200 font-medium disabled:opacity-40 disabled:cursor-not-allowed">
                <option value="" disabled [selected]="!selectedSubject()">{{ t.translate('admin.selectSubject') }}</option>
                @for(subject of availableSubjects(); track subject.id) { <option [value]="subject.id">{{ subject.name }}</option> }
              </select>
              <div class="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Step 2: Select Topics -->
      @if(selectedSubject()) {
        <section class="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 sm:p-8 animate-fade-in-up">
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                <span class="text-xl font-bold font-heading">2</span>
              </div>
              <div>
                <h2 class="text-xl font-bold text-slate-900 dark:text-white font-heading">{{ t.translate('teacher.selectTopics') }}</h2>
                <p class="text-sm text-slate-500 dark:text-slate-400">{{ t.translate('teacher.selectTopicsDesc') || 'Select the chapters and subchapters to include.' }}</p>
              </div>
            </div>
            <button (click)="toggleAllChapters()" class="px-4 py-2 text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-colors">
              {{ isAllChaptersSelected() ? t.translate('teacher.deselectAll') : t.translate('teacher.selectAll') }}
            </button>
          </div>
          
          <div class="max-h-[500px] overflow-y-auto space-y-4 p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-700/50">
            @for(chapter of chaptersForSubject(); track chapter.id) {
              <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <label class="flex items-center gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors border-b border-slate-100 dark:border-slate-700">
                  <input type="checkbox"
                         [checked]="selectedChapters().has(chapter.id)"
                         (change)="toggleChapter(chapter.id)"
                         class="h-5 w-5 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-slate-700">
                  <span class="font-bold text-slate-800 dark:text-slate-100">{{ chapter.name }}</span>
                </label>
                <div class="p-4 bg-slate-50/50 dark:bg-slate-900/20 space-y-2">
                  @for(subchapter of subchaptersForChapter().get(chapter.id); track subchapter.id) {
                    <label class="flex items-center gap-3 p-2 rounded-lg hover:bg-white dark:hover:bg-slate-700 cursor-pointer transition-all">
                      <input type="checkbox"
                             [checked]="selectedSubchapters().has(subchapter.id)"
                             (change)="toggleSubchapter(subchapter.id)"
                             class="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-slate-700">
                      <span class="text-sm font-medium text-slate-700 dark:text-slate-300">{{ subchapter.name }}</span>
                    </label>
                  }
                </div>
              </div>
            }
          </div>
        </section>
      }
    </div>

    <!-- Right Column: Form & Summary -->
    <div class="lg:col-span-5 space-y-8">
      @if(selectedSubchapters().size > 0) {
        <section class="bg-white dark:bg-slate-800 rounded-3xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 sm:p-8 sticky top-8 animate-fade-in-up">
          <div class="flex items-center gap-4 mb-8">
            <div class="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <span class="text-xl font-bold font-heading">3</span>
            </div>
            <div>
              <h2 class="text-xl font-bold text-slate-900 dark:text-white font-heading">{{ t.translate('teacher.configureExam') }}</h2>
              <p class="text-sm text-slate-500 dark:text-slate-400">{{ t.translate('teacher.configureExamDesc') || 'Set the title, instructions, and length.' }}</p>
            </div>
          </div>

          <form [formGroup]="examForm" (ngSubmit)="generateExam()" class="space-y-6">
            <div class="space-y-2">
              <label for="examTitle" class="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">{{ t.translate('teacher.examTitle') }}</label>
              <input id="examTitle" formControlName="title" class="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all text-slate-800 dark:text-slate-200 font-medium">
            </div>

            <div class="space-y-2">
              <label for="examInstructions" class="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">{{ t.translate('teacher.examInstructions') }}</label>
              <textarea id="examInstructions" formControlName="instructions" rows="3" class="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all text-slate-800 dark:text-slate-200 font-medium"></textarea>
            </div>

            <div class="space-y-2">
              <label for="questionCount" class="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">{{ t.translate('teacher.numQuestions') }}</label>
              <div class="flex items-center gap-4">
                <input id="questionCount" formControlName="questionCount" type="number" min="1" [max]="availableQuestions().length" class="w-32 px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all text-slate-800 dark:text-slate-200 font-bold text-center">
                <div class="flex-1 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800">
                  <p class="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">{{ t.translate('teacher.availableQuestions') || 'Available Pool' }}</p>
                  <p class="text-lg font-bold text-indigo-900 dark:text-indigo-200">{{ availableQuestions().length }}</p>
                </div>
              </div>
            </div>

            <div class="pt-6">
              <button type="submit" [disabled]="examForm.invalid || availableQuestions().length === 0" 
                class="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-1 disabled:bg-slate-400 disabled:shadow-none disabled:translate-y-0 disabled:cursor-not-allowed flex items-center justify-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
                <span class="text-lg">{{ t.translate('teacher.generateExam') }}</span>
              </button>
            </div>
          </form>
        </section>
      } @else {
        <div class="bg-slate-100 dark:bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-12 text-center">
          <div class="w-16 h-16 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <h3 class="text-lg font-bold text-slate-600 dark:text-slate-400 font-heading">{{ t.translate('teacher.startConfiguring') || 'Ready to start?' }}</h3>
          <p class="text-sm text-slate-500 dark:text-slate-500 max-w-xs mx-auto mt-2">{{ t.translate('teacher.startConfiguringDesc') || 'Select a subject and topics to begin generating your exam.' }}</p>
        </div>
      }
    </div>
  </div>
</div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherExamGeneratorComponent {
  quizService = inject(QuizService);
  t = inject(TranslationService);
  // FIX: Explicitly type FormBuilder to prevent type inference issues.
  fb: FormBuilder = inject(FormBuilder);

  // Filters
  selectedGrade = signal<number | null>(null);
  selectedBranch = signal<'scientific' | 'literary' | null>(null);
  selectedSubject = signal<Subject | null>(null);

  // Selections
  selectedChapters = signal<Set<string>>(new Set());
  selectedSubchapters = signal<Set<string>>(new Set());

  // Exam Config Form
  examForm = this.fb.group({
    title: ['Mid-term Exam', Validators.required],
    instructions: ['Read each question carefully and select the best answer.', ''],
    questionCount: [10, [Validators.required, Validators.min(1)]],
  });

  // Data from service
  allSubjects = this.quizService.allSubjects;
  allChapters = this.quizService.allChapters;
  allSubchapters = this.quizService.allSubchapters;
  allQuestions = this.quizService.allQuestions;

  constructor() {
    effect(() => {
      const selectedIds = this.selectedSubchapters();
      for (const id of selectedIds) {
        this.quizService.fetchQuestionsForSubchapter(id);
      }
    });
  }

  grades = Array.from({ length: 12 }, (_, i) => i + 1);

  // Computed properties for UI filtering
  availableSubjects = computed(() => {
    const grade = this.selectedGrade();
    if (!grade) return [];
    const branch = this.selectedBranch();
    const lang = this.quizService.selectedLanguage();

    return this.allSubjects().filter(s => 
      s.grade === grade &&
      s.language === lang &&
      (grade < 10 || !branch || s.branch === branch)
    );
  });

  chaptersForSubject = computed(() => {
    const subject = this.selectedSubject();
    if (!subject) return [];
    return this.allChapters().filter(c => c.subject_id === subject.id).sort((a,b) => a.name.localeCompare(b.name));
  });

  subchaptersForChapter = computed(() => {
    const chapters = this.chaptersForSubject();
    const subchaptersMap = new Map<string, Subchapter[]>();
    for (const chapter of chapters) {
        const subchapters = this.allSubchapters().filter(sc => sc.chapter_id === chapter.id).sort((a,b) => a.name.localeCompare(b.name));
        subchaptersMap.set(chapter.id, subchapters);
    }
    return subchaptersMap;
  });

  availableQuestions = computed(() => {
    const selectedSubchapterIds = this.selectedSubchapters();
    if (selectedSubchapterIds.size === 0) return [];
    return this.allQuestions().filter(q => selectedSubchapterIds.has(q.subchapter_id));
  });

  isAllChaptersSelected = computed(() => {
    const chapterIds = this.chaptersForSubject().map(c => c.id);
    const selected = this.selectedChapters();
    return chapterIds.length > 0 && chapterIds.every(id => selected.has(id));
  });

  // --- Methods ---

  selectGrade(event: Event) {
    const grade = parseInt((event.target as HTMLSelectElement).value, 10);
    this.selectedGrade.set(grade);
    this.selectedBranch.set(null);
    this.selectedSubject.set(null);
    this.resetSelections();
  }

  selectBranch(event: Event) {
    const branch = (event.target as HTMLSelectElement).value as 'scientific' | 'literary' | '';
    this.selectedBranch.set(branch === '' ? null : branch);
    this.selectedSubject.set(null);
    this.resetSelections();
  }

  selectSubject(event: Event) {
    const subjectId = (event.target as HTMLSelectElement).value;
    const subject = this.availableSubjects().find(s => s.id === subjectId) || null;
    this.selectedSubject.set(subject);
    this.resetSelections();
  }
  
  toggleChapter(chapterId: string) {
    const isSelected = this.selectedChapters().has(chapterId);
    this.selectedChapters.update(set => {
      isSelected ? set.delete(chapterId) : set.add(chapterId);
      return new Set(set);
    });
    // Also toggle all subchapters within this chapter
    const subchapters = this.subchaptersForChapter().get(chapterId) || [];
    this.selectedSubchapters.update(set => {
        const shouldSelect = !isSelected;
        for(const sc of subchapters) {
            shouldSelect ? set.add(sc.id) : set.delete(sc.id);
        }
        return new Set(set);
    });
  }
  
  toggleAllChapters() {
    const shouldSelectAll = !this.isAllChaptersSelected();
    const chapterIds = this.chaptersForSubject().map(c => c.id);
    this.selectedChapters.set(shouldSelectAll ? new Set(chapterIds) : new Set());
    
    // Also toggle all subchapters
    const allSubchapterIds = this.chaptersForSubject().flatMap(c => 
        (this.subchaptersForChapter().get(c.id) || []).map(sc => sc.id)
    );
    this.selectedSubchapters.set(shouldSelectAll ? new Set(allSubchapterIds) : new Set());
  }

  toggleSubchapter(subchapterId: string) {
    this.selectedSubchapters.update(set => {
      set.has(subchapterId) ? set.delete(subchapterId) : set.add(subchapterId);
      return new Set(set);
    });
  }

  generateExam() {
    if (this.examForm.invalid) return;

    const { title, instructions, questionCount } = this.examForm.value;
    let questions = this.availableQuestions();
    
    // Shuffle and slice
    questions = questions.sort(() => 0.5 - Math.random());
    const finalQuestions = questions.slice(0, questionCount!);

    const gradeStr = this.selectedGrade()?.toString() || '';
    const subjectName = this.selectedSubject()?.name || '';

    this.quizService.generateExam(finalQuestions, { 
      title: title!, 
      instructions: instructions!,
      grade: gradeStr,
      subject: subjectName
    });
  }
  
  private resetSelections() {
    this.selectedChapters.set(new Set());
    this.selectedSubchapters.set(new Set());
  }
}
