
import { Component, ChangeDetectionStrategy, inject, signal, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuizService } from '../../services/quiz.service';
import { TranslationService } from '../../services/translation.service';
import { PerformanceService } from '../../services/performance.service';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import { Question, QuizResult, PastQuiz, QuizAttempt, QuizAttemptResult } from '../../models';
import { MathJaxService } from '../../services/mathjax.service';
import confetti from 'canvas-confetti';

@Component({
  selector: 'app-student-results',
  standalone: true,
  imports: [CommonModule],
  template: `
<div class="max-w-3xl mx-auto space-y-8 animate-fade-in-up">
  
  <!-- Score Summary Section -->
  <div class="bg-white dark:bg-slate-800 p-8 sm:p-10 rounded-3xl shadow-xl border border-slate-200/50 dark:border-slate-700/50 text-center relative overflow-hidden">
    
    <!-- Design Accent Background Glows -->
    <div class="absolute -right-24 -top-24 w-48 h-48 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none"></div>
    <div class="absolute -left-24 -bottom-24 w-48 h-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none"></div>

    <span class="inline-flex items-center gap-1.5 px-4.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 text-xs font-bold uppercase tracking-widest mb-4">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
        <path d="M10 2a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 2ZM10 15a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 15ZM4 10a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5h-1.5A.75.75 0 0 1 4 10ZM13.5 10a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5h-1.5a.75.75 0 0 1-.75-.75Z" />
      </svg>
      {{ t.translate('student.quizComplete') }}
    </span>

    <h1 class="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white font-heading tracking-tight mb-2">
      {{ t.translate('student.yourResults') }}
    </h1>
    
    <div class="relative w-36 h-36 mx-auto my-6 flex items-center justify-center">
      <!-- High-Quality Circular Progress SVG -->
      <svg class="w-full h-full transform -rotate-90" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
        <!-- Inside Circle BG -->
        <circle cx="18" cy="18" r="16" class="fill-slate-50 dark:fill-slate-900/40"></circle>
        <!-- Outer Track Circle -->
        <path class="text-slate-100 dark:text-slate-700/60 stroke-current"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              stroke-width="2.5"
              fill="none"></path>
        <!-- Highlight Progress Ring -->
        <path class="text-indigo-600 dark:text-indigo-400 stroke-current transition-all duration-750 ease-out"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              stroke-width="2.5"
              fill="none"
              [attr.stroke-dasharray]="scorePercentage + ', 100'"
              stroke-linecap="round"></path>
      </svg>
      <div class="absolute flex flex-col items-center justify-center">
        <span class="text-4xl font-black text-slate-800 dark:text-white font-heading leading-none">
          {{ score() }}<span class="text-xl font-bold text-slate-400 dark:text-slate-500">/{{ totalQuestions }}</span>
        </span>
        <span class="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1.5">{{ t.translate('student.score') || 'Score' }}</span>
      </div>
    </div>
    
    <p class="text-lg font-bold text-slate-700 dark:text-slate-300">
      {{ t.translate('student.youAnsweredCorrectly', { percentage: scorePercentage.toFixed(0) }) }}
    </p>
  </div>

  <!-- Action Buttons -->
  <div class="flex flex-col sm:flex-row gap-4 justify-center">
    <button (click)="quizService.restartQuiz()" class="flex-1 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/20 active:translate-y-0.5 hover:-translate-y-0.5 transition-all text-base flex items-center justify-center gap-2">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-5 h-5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
      </svg>
      {{ t.translate('student.tryAgain') }}
    </button>
    <button (click)="quizService.changeGrade()" class="flex-1 px-8 py-4 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold rounded-2xl border border-slate-200 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-900/40 active:translate-y-0.5 hover:-translate-y-0.5 transition-all text-base flex items-center justify-center gap-2">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-5 h-5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-.778.099-1.533.284-2.253" />
      </svg>
      {{ t.translate('student.changeGrade') }}
    </button>
  </div>

  <!-- Review Answers Section -->
  <div class="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-3xl shadow-md border border-slate-200/60 dark:border-slate-700/60">
    <h2 class="text-xl font-bold text-slate-800 dark:text-slate-100 font-heading mb-6 pb-4 border-b border-slate-100 dark:border-slate-700/60 flex items-center gap-2">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5 text-indigo-500">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2Z" />
      </svg>
      {{ t.translate('student.reviewAnswers') }}
    </h2>
    
    <div class="space-y-8">
      @for (result of results(); track result?.question?.id || i; let i = $index) {
        <div class="p-5 border border-slate-200/50 dark:border-slate-700/50 rounded-2xl bg-slate-50/40 dark:bg-slate-900/10 space-y-4">
          
          <!-- Question Title with Pill Indicator -->
          <div class="flex items-start justify-between gap-3 flex-wrap">
            <div class="font-extrabold text-slate-800 dark:text-slate-100 text-base flex gap-2 flex-grow">
              <span class="text-indigo-500 dark:text-indigo-400 font-mono">{{ i + 1 }}.</span>
              <div class="prose prose-slate dark:prose-invert max-w-none" [innerHTML]="result.question.text"></div>
            </div>
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shrink-0"
                  [class.bg-emerald-50]="result.isCorrect"
                  [class.text-emerald-700]="result.isCorrect"
                  [class.dark:bg-emerald-950/20]="result.isCorrect"
                  [class.dark:text-emerald-400]="result.isCorrect"
                  [class.bg-rose-50]="!result.isCorrect"
                  [class.text-rose-700]="!result.isCorrect"
                  [class.dark:bg-rose-950/20]="!result.isCorrect"
                  [class.dark:text-rose-400]="!result.isCorrect">
              <span class="w-1.5 h-1.5 rounded-full" [class.bg-emerald-500]="result.isCorrect" [class.bg-rose-500]="!result.isCorrect"></span>
              {{ result.isCorrect ? (t.translate('student.resultsCorrect') || 'Correct') : (t.translate('student.needsReview') || 'Needs Review') }}
            </span>
          </div>
          
          <!-- Options Display Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            @for (option of result.question.options; track $index; let j = $index) {
              @let isCorrectAnswer = j === result.question.correctAnswerIndex;
              @let isUserAnswer = j === result.userAnswerIndex;

              <div class="flex items-start p-3.5 rounded-xl text-sm sm:text-base border transition-all"
                   [class.bg-emerald-50]="isCorrectAnswer"
                   [class.dark:bg-emerald-950/20]="isCorrectAnswer"
                   [class.border-emerald-200]="isCorrectAnswer"
                   [class.dark:border-emerald-900/40]="isCorrectAnswer"
                   
                   [class.bg-rose-50]="isUserAnswer && !result.isCorrect"
                   [class.dark:bg-rose-950/20]="isUserAnswer && !result.isCorrect"
                   [class.border-rose-200]="isUserAnswer && !result.isCorrect"
                   [class.dark:border-rose-900/40]="isUserAnswer && !result.isCorrect"
                   
                   [class.bg-white]="!isCorrectAnswer && !(isUserAnswer && !result.isCorrect)"
                   [class.dark:bg-slate-800/40]="!isCorrectAnswer && !(isUserAnswer && !result.isCorrect)"
                   [class.border-slate-200/50]="!isCorrectAnswer && !(isUserAnswer && !result.isCorrect)"
                   [class.dark:border-slate-700/60]="!isCorrectAnswer && !(isUserAnswer && !result.isCorrect)">
                
                <div class="w-6 shrink-0 mt-0.5" [class.text-emerald-600]="isCorrectAnswer" [class.text-rose-600]="isUserAnswer && !result.isCorrect">
                  @if (isCorrectAnswer) {
                    <!-- Success Check Circle -->
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.06 0l4-5.5Z" clip-rule="evenodd" />
                    </svg>
                  } @else if (isUserAnswer && !result.isCorrect) {
                    <!-- Dead End Cross Circle -->
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z" clip-rule="evenodd" />
                    </svg>
                  } @else {
                    <div class="w-4 h-4 rounded-full border-2 border-slate-300 dark:border-slate-600 mt-1"></div>
                  }
                </div>
                
                <span class="flex-grow font-medium leading-relaxed"
                      [class.font-bold]="isCorrectAnswer"
                      [class.text-emerald-800]="isCorrectAnswer"
                      [class.dark:text-emerald-300]="isCorrectAnswer"
                      [class.line-through]="isUserAnswer && !result.isCorrect"
                      [class.text-rose-800]="isUserAnswer && !result.isCorrect"
                      [class.dark:text-rose-300]="isUserAnswer && !result.isCorrect"
                      [class.text-slate-700]="!isCorrectAnswer && !(isUserAnswer && !result.isCorrect)"
                      [class.dark:text-slate-300]="!isCorrectAnswer && !(isUserAnswer && !result.isCorrect)">
                  {{ option }}
                </span>
              </div>
            }
          </div>

          <!-- Explanation Sub-Block -->
          @if (!result.isCorrect && result.question.explanation) {
            <div class="pt-2">
              <div class="p-4 bg-indigo-50/50 dark:bg-slate-900/40 rounded-2xl border border-indigo-100/40 dark:border-slate-800/80">
                <div class="flex items-center gap-2 mb-2">
                  <div class="p-1 rounded-lg bg-indigo-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 18v-5.25m0 .001h-.008v.007H12v-.008Zm0-3.5h.008v.008H12V9.25Zm9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                    </svg>
                  </div>
                  <h4 class="font-bold text-xs uppercase tracking-wider text-indigo-800 dark:text-indigo-300 font-heading">
                    {{ t.translate('student.explanation') }}
                  </h4>
                </div>
                <div class="text-sm text-slate-600 dark:text-slate-300 leading-relaxed prose prose-sm max-w-none" [innerHTML]="result.question.explanation"></div>
              </div>
            </div>
          }
        </div>
      }
    </div>
  </div>
</div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentResultsComponent implements OnInit, AfterViewInit {
  quizService = inject(QuizService);
  t = inject(TranslationService);
  performanceService = inject(PerformanceService);
  supabase = inject(SupabaseService);
  toastService = inject(ToastService);
  mathJaxService = inject(MathJaxService);

  score = this.quizService.score;
  results = this.quizService.quizResults;
  totalQuestions = this.results().length;

  ngOnInit(): void {
    this.saveQuizAttempt();
  }

  ngAfterViewInit(): void {
    this.mathJaxService.render();
    if (this.scorePercentage === 100) {
      this.triggerConfetti();
    }
  }
  
  triggerConfetti() {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
      confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
    }, 250);
  }

  get scorePercentage(): number {
    return this.totalQuestions > 0 ? (this.score() / this.totalQuestions) * 100 : 0;
  }

  async saveQuizAttempt() {
    if (this.quizService.quizMode() === 'practice') {
        return; // Do not save practice attempts
    }

    const subject = this.quizService.selectedSubject();
    const subchapter = this.quizService.selectedSubchapter();
    const chapter = this.quizService.selectedChapter();
    const grade = this.quizService.selectedGrade();
    const language = this.quizService.selectedLanguage();
    const user = this.supabase.currentUser();

    if (!subject || !subchapter || !chapter || !grade || !language) return;
    
    // Save to Supabase, associated with the user if logged in.
    const leanResults: QuizAttemptResult[] = this.results().map(result => ({
        questionId: result.question.id,
        userAnswerIndex: result.userAnswerIndex,
        isCorrect: result.isCorrect,
    }));

    const attempt: Omit<QuizAttempt, 'id' | 'created_at'> = {
      user_id: user?.id,
      subject_id: subject.id,
      chapter_id: chapter.id,
      subchapter_id: subchapter.id,
      grade: grade,
      branch: this.quizService.selectedBranch(),
      language: language,
      score: this.score(),
      total_questions: this.totalQuestions,
      results: leanResults
    };
    
    try {
      const newAttempt = await this.supabase.addQuizAttempt(attempt);
      // After saving, tell performance service to reload history
      this.performanceService.loadUserHistory();
      
      // Check for new achievements
      if (user) {
        const newlyAwardedBadges = await this.performanceService.checkAndAwardBadges(newAttempt);
        for (const badge of newlyAwardedBadges) {
            const badgeName = this.t.translate(badge.nameKey);
            this.toastService.show(this.t.translate('student.badgeEarnedToast', { badgeName }), 'success');
        }
      }

    } catch (error) {
      console.error('Failed to save quiz attempt:', error);
    }
  }
}
