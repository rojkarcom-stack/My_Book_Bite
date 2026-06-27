import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { QuizService } from '../../services/quiz.service';
import { TranslationService } from '../../services/translation.service';
import { GeminiService, HintParams } from '../../services/gemini.service';
import { MathJaxService } from '../../services/mathjax.service';
import { SupabaseService } from '../../services/supabase.service';
import { StudyGuide } from '../../models';

type AnswerState = 'unanswered' | 'correct' | 'incorrect';
type ExplanationState = 'idle' | 'loading' | 'success' | 'error';
type HintState = 'idle' | 'loading' | 'success' | 'error';

@Component({
  selector: 'app-student-quiz',
  standalone: true,
  imports: [CommonModule],
  template: `
<div class="max-w-3xl mx-auto animate-fade-in-up relative">

  <!-- Confetti Celebration Overlay -->
  @if (showConfetti()) {
    <div class="fixed inset-0 pointer-events-none z-[999] overflow-hidden">
      @for (p of confettiParticles; track $index) {
        <div class="absolute confetti-particle rounded-full"
             [style.left]="p.left"
             [style.top]="p.top"
             [style.background-color]="p.color"
             [style.width]="p.size"
             [style.height]="p.size"
             [style.--delay]="p.delay"
             [style.--duration]="p.duration"></div>
      }
    </div>
  }

  <!-- Header Card -->
  <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/50 dark:border-slate-700 p-6 mb-6 relative overflow-hidden">
      <!-- (Keep header content) -->
      <div class="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100/50 dark:border-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <span class="text-xl font-extrabold font-heading">{{ questionIndex() + 1 }}</span>
            </div>
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <h2 class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  {{ t.translate('student.questionOf', { current: questionIndex() + 1, total: totalQuestions() }) }}
                </h2>
                @if (quizMode() === 'practice' && currentStreak() > 0) {
                  <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/40 text-[10px] font-black uppercase tracking-wider animate-pulse">
                    🔥 {{ currentStreak() }} {{ t.translate('student.streak') || 'Streak' }}
                  </span>
                }
              </div>
              <div class="w-32 sm:w-48 bg-slate-100 dark:bg-slate-700/60 h-2 rounded-full mt-1.5 overflow-hidden">
                <div class="bg-indigo-600 h-full transition-all duration-700 ease-out" [style.width.%]="progressPercentage"></div>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-4">
            @if (quizMode() === 'test' && quizService.selectedQuizDuration() !== null) {
              <div class="flex items-center gap-2.5 px-4.5 py-2 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200/50 dark:border-slate-700">
                <span class="text-lg font-black font-heading tabular-nums" [class]="timerColorClass()">{{ timerValue() }}s</span>
              </div>
            }
            <button (click)="quizService.backToTopicSelect()" class="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/40">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
            </button>
          </div>
      </div>
      
      <!-- Toggle Tabs -->
      @if (hasActiveStudyGuide()) {
          <div class="flex gap-1 p-1 bg-slate-100 dark:bg-slate-900/50 rounded-xl">
              <button (click)="toggleViewMode('quiz')" [class.bg-white]="viewMode() === 'quiz'" [class.dark:bg-slate-800]="viewMode() === 'quiz'" class="flex-1 px-4 py-2 rounded-lg text-sm font-bold transition-all" [class.text-indigo-600]="viewMode() === 'quiz'" [class.text-slate-500]="viewMode() !== 'quiz'">{{ t.translate('student.quiz') || 'Quiz' }}</button>
              <button (click)="toggleViewMode('study')" [class.bg-white]="viewMode() === 'study'" [class.dark:bg-slate-800]="viewMode() === 'study'" class="flex-1 px-4 py-2 rounded-lg text-sm font-bold transition-all" [class.text-indigo-600]="viewMode() === 'study'" [class.text-slate-500]="viewMode() !== 'study'">{{ t.translate('student.studyMaterial') || 'Study Material' }}</button>
          </div>
      }
  </div>

  @if (viewMode() === 'quiz') {
      @if (question(); as q) {
        <div class="space-y-6">
          <div class="bg-white/90 dark:bg-slate-900/75 backdrop-blur-xl rounded-3xl shadow-xl border border-slate-200/55 dark:border-slate-800/80 overflow-hidden relative">
            <div class="p-6 sm:p-8">
              <!-- Question Text -->
              <div class="text-lg sm:text-xl font-extrabold text-slate-800 dark:text-slate-100 mb-8 prose prose-slate dark:prose-invert max-w-none leading-relaxed font-heading" 
                   [innerHTML]="q.text"></div>
              
              <!-- Interactive Choices Grid -->
              <div class="grid grid-cols-1 gap-3.5 mb-8">
                @for (opt of q.options; track $index; let index = $index) {
                  @let isSelected = selectedOption() === index;
                  @let isCorrectAnswer = q.correctAnswerIndex === index;
                  @let isIncorrectChoices = !isCorrectAnswer;
                  @let isDisabled = disabledOptions().has(index);
                  @let isRevealedState = answerState() !== 'unanswered';
                  
                  <button (click)="selectOption(index)"
                          [disabled]="isDisabled || isRevealedState"
                          [class.opacity-35]="isDisabled"
                          [class.pointer-events-none]="isDisabled || isRevealedState"
                          class="group w-full text-start p-5 rounded-2xl border transition-all duration-200 relative flex items-center justify-between gap-4 cursor-pointer"
                          [class]="isRevealedState 
                            ? (isCorrectAnswer 
                              ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-500 text-emerald-900 dark:text-emerald-300 shadow-md shadow-emerald-500/5' 
                              : (isSelected 
                                ? 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-500 text-rose-900 dark:text-rose-300 shadow-md' 
                                : 'bg-slate-50/50 dark:bg-slate-900/20 border-slate-200/60 dark:border-slate-800 text-slate-400'))
                            : (isSelected 
                              ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-500 dark:border-indigo-500 text-indigo-900 dark:text-indigo-200 shadow-md shadow-indigo-500/5' 
                              : 'bg-slate-50/40 dark:bg-slate-900/30 border-slate-200/65 dark:border-slate-800 hover:border-indigo-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/40')">
                    
                    <div class="flex items-center gap-4 text-[15px] font-medium leading-relaxed">
                      <!-- Option letter indicator -->
                      <span class="w-7 h-7 rounded-lg text-xs font-black flex items-center justify-center shrink-0 uppercase transition-colors"
                            [class]="isRevealedState
                              ? (isCorrectAnswer 
                                ? 'bg-emerald-500 text-white' 
                                : (isSelected ? 'bg-rose-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-550'))
                              : (isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-700 dark:group-hover:bg-indigo-950')">
                        {{ ['a', 'b', 'c', 'd', 'e'][index] }}
                      </span>
                      <span [innerHTML]="opt"></span>
                    </div>

                    <!-- Visual Feedback Badges -->
                    @if (isRevealedState) {
                      <div class="shrink-0 flex items-center gap-1">
                        @if (isCorrectAnswer) {
                          <span class="text-emerald-600 dark:text-emerald-400 p-1 bg-emerald-100 dark:bg-emerald-950/40 rounded-full">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4.5 h-4.5">
                              <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143Z" clip-rule="evenodd" />
                            </svg>
                          </span>
                        } @else if (isSelected) {
                          <span class="text-rose-600 dark:text-rose-400 p-1 bg-rose-100 dark:bg-rose-950/40 rounded-full">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4.5 h-4.5">
                              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22Z" />
                            </svg>
                          </span>
                        }
                      </div>
                    } @else if (isSelected) {
                      <span class="w-2 h-2 rounded-full bg-indigo-600 animate-ping"></span>
                    }
                  </button>
                }
              </div>

              <!-- Action button bar -->
              <div class="flex items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800/40">
                
                <!-- Practice Mode Lifelines -->
                @if (quizMode() === 'practice') {
                  <div class="flex items-center gap-2">
                    <button (click)="useFiftyFifty()" 
                            [disabled]="usedLifelines().fiftyFifty || answerState() !== 'unanswered'"
                            [class.opacity-40]="usedLifelines().fiftyFifty || answerState() !== 'unanswered'"
                            class="px-3.5 py-2 text-[11px] font-black uppercase tracking-wider rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-slate-700 bg-white dark:bg-slate-900 transition flex items-center gap-1.5 shadow-xs enabled:hover:scale-105 active:scale-95 cursor-pointer">
                      {{ t.translate('student.lifelinesCustom.fiftyFifty') || '🌓 Eliminate 50/50' }}
                    </button>
                    <button (click)="useHint()" 
                            [disabled]="usedLifelines().hint || answerState() !== 'unanswered'"
                            [class.opacity-40]="usedLifelines().hint || answerState() !== 'unanswered'"
                            class="px-3.5 py-2 text-[11px] font-black uppercase tracking-wider rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-slate-700 bg-white dark:bg-slate-900 transition flex items-center gap-1.5 shadow-xs enabled:hover:scale-105 active:scale-95 cursor-pointer text-indigo-600 dark:text-indigo-400">
                      {{ t.translate('student.lifelinesCustom.hint') || '💡 Gemini Hint' }}
                    </button>
                  </div>
                } @else {
                  <div></div>
                }

                <div>
                  @if (answerState() === 'unanswered') {
                    <button (click)="submitAnswer()" 
                            [disabled]="selectedOption() === null"
                            [class.opacity-50]="selectedOption() === null"
                            class="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:hover:bg-indigo-600 text-white font-bold text-sm rounded-2xl transition shadow-md shadow-indigo-500/15 cursor-pointer flex items-center gap-2">
                      {{ t.translate('student.submitAnswer') || 'Submit Answer' }}
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
                    </button>
                  } @else {
                    <button (click)="nextQuestion()" 
                            class="px-8 py-3 bg-slate-900 dark:bg-indigo-600 text-white hover:bg-black dark:hover:bg-indigo-700 font-bold text-sm rounded-2xl transition shadow-md cursor-pointer flex items-center gap-2">
                      {{ (questionIndex() === totalQuestions() - 1) ? (t.translate('student.finishPractice') || 'Finish Practice') : (t.translate('student.nextQuestion') || 'Next Question') }}
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
                    </button>
                  }
                </div>
              </div>
            </div>
          </div>

          <!-- Gemini Hint Output -->
          @if (hint().state !== 'idle') {
            <div class="p-6 rounded-3xl backdrop-blur-xl border transition-all duration-300 animate-fade-in"
                 [class]="hint().state === 'loading' 
                   ? 'bg-slate-50/50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800' 
                   : (hint().state === 'error' ? 'bg-rose-50/50 border-rose-200 text-rose-800' : 'bg-indigo-50/30 dark:bg-indigo-950/10 border-indigo-200/50 dark:border-indigo-900/40')">
              
              <div class="flex items-center gap-2.5 mb-2.5">
                <span class="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
                <span class="text-xs font-extrabold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">{{ t.translate('student.lifelinesCustom.geminiTitle') || 'Gemini Strategic Lifeline' }}</span>
              </div>

              @if (hint().state === 'loading') {
                <div class="flex items-center gap-3">
                  <div class="animate-spin rounded-full h-4.5 w-4.5 border-2 border-indigo-600 border-t-transparent"></div>
                  <span class="text-xs text-slate-500 font-medium">{{ t.translate('student.lifelinesCustom.generating') || 'Generating helpful context...' }}</span>
                </div>
              } @else if (hint().state === 'success') {
                <p class="text-[13.5px] text-slate-650 dark:text-slate-350 leading-relaxed font-sans" [innerHTML]="hint().content"></p>
              } @else {
                <p class="text-[13.5px] leading-relaxed">{{ hint().content }}</p>
              }
            </div>
          }

          <!-- Practice Mode: Expert breakdown explanation -->
          @if (explanation(); as exp) {
            <div class="p-6 sm:p-8 bg-slate-900/95 dark:bg-slate-950/90 rounded-3xl border border-slate-800/80 shadow-2xl space-y-4 animate-fade-in text-white relative overflow-hidden">
              <div class="absolute top-0 right-0 p-8 opacity-5 text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-24 h-24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 18v-5.25m0 0a3 3 0 0 0-3-3H9.75M12 13.5a3 3 0 0 0 3-3H14.25M8.25 19.5h7.5M12 3v13.5M3 12h18" />
                </svg>
              </div>

              <div class="flex items-center gap-2.5">
                <span class="w-6 h-6 rounded-lg bg-indigo-500 text-white flex items-center justify-center text-xs">✨</span>
                <h3 class="text-sm font-black uppercase tracking-widest text-indigo-400">{{ t.translate('student.lifelinesCustom.deepBreakdown') || 'Gemini Deep AI Breakdown' }}</h3>
              </div>

              @if (exp.state === 'loading') {
                <div class="flex items-center gap-3 py-2">
                  <div class="animate-spin rounded-full h-5 w-5 border-2 border-white/20 border-t-indigo-400"></div>
                  <p class="text-xs text-slate-400 font-medium tracking-wide">{{ t.translate('student.lifelinesCustom.consulting') || 'Consulting school archives & translating step-by-step logic...' }}</p>
                </div>
              } @else if (exp.state === 'success') {
                <div class="prose prose-invert max-w-none text-slate-300 font-sans text-[13.5px] leading-relaxed" [innerHTML]="exp.content"></div>
              } @else {
                <p class="text-slate-400 text-xs">{{ exp.content }}</p>
              }
            </div>
          }
        </div>
      } @else {
        <div class="bg-white dark:bg-slate-800 rounded-3xl shadow-xl p-12 text-center border border-slate-200/50 dark:border-slate-700/80 animate-fade-in">
           <h2 class="text-2xl font-black text-slate-800 dark:text-slate-100 mb-2 font-heading">{{ t.translate('student.noQuestionsAvailable') || 'No Questions Available' }}</h2>
        </div>
      }
  } @else {
      <div class="bg-white dark:bg-slate-800 rounded-3xl shadow-xl p-8 border border-slate-200/50 dark:border-slate-700/80">
        <div class="space-y-6">
          @if (loadingStudyGuide()) {
            <p>{{ t.translate('loading') || 'Loading...' }}</p>
          } @else if (studyGuideContent(); as guide) {
             <article class="prose prose-indigo dark:prose-invert max-w-none text-slate-705 dark:text-slate-300 leading-relaxed font-sans mt-2">
               <div [innerHTML]="safeStudyGuideContent()"></div>
             </article>
          }
        </div>
      </div>
  }
</div>
  `,
  styles: [`
    @keyframes fall {
      0% { transform: translateY(-50px) rotate(0deg); opacity: 1; }
      100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
    }
    .confetti-particle {
      position: absolute;
      animation: fall var(--duration) var(--delay) linear infinite forwards;
    }
    @keyframes slideLeft {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }
    .animate-slide-left {
      animation: slideLeft 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    
    :host ::ng-deep {
      .prose { line-height: 1.75; font-size: 0.95rem; }
      .prose h1, .prose h2, .prose h3 { color: inherit; font-family: Outfit, Inter, sans-serif; }
      .prose h1 { font-size: 2em; font-weight: 800; margin-top: 1.5em; margin-bottom: 0.5em; }
      .prose h2 { font-size: 1.5em; font-weight: 700; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.4em; margin-top: 1.8em; }
      .prose h3 { font-size: 1.22em; font-weight: 600; margin-top: 1.5em; }
      .prose code { background-color: #f1f5f9; color: #4338ca; padding: 0.2em 0.4em; border-radius: 0.25rem; font-weight: 600; font-size: 0.85em; }
      .prose blockquote { border-left: 4px solid #4f46e5; background-color: #f5f3ff; border-radius: 0.5rem; padding: 1em 1.5em; font-style: italic; margin: 1.5em 0; }
      .prose ul { list-style-type: disc; padding-left: 1.5rem; margin-top: 0.5em; }
      .prose ol { list-style-type: decimal; padding-left: 1.5rem; margin-top: 0.5em; }
      .dark .prose code { background-color: #1e1b4b; color: #c7d2fe; }
      .dark .prose blockquote { background-color: #1e1b4b; border-color: #818cf8; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentQuizComponent implements OnInit {
  quizService = inject(QuizService);
  t = inject(TranslationService);
  geminiService = inject(GeminiService);
  mathJaxService = inject(MathJaxService);
  supabaseService = inject(SupabaseService);
  sanitizer = inject(DomSanitizer);
  
  question = this.quizService.currentQuestion;
  questionIndex = this.quizService.currentQuestionIndex;
  totalQuestions = computed(() => this.quizService.questionsForSelectedSubchapter().length);
  quizMode = this.quizService.quizMode;

  selectedOption = signal<number | null>(null);
  answerState = signal<AnswerState>('unanswered');
  explanation = signal<{ state: ExplanationState; content: string } | null>(null);
  
  // Lifelines state (Practice Mode only)
  usedLifelines = signal<{ hint: boolean; fiftyFifty: boolean }>({ hint: false, fiftyFifty: false });
  disabledOptions = signal<Set<number>>(new Set());
  hint = signal<{ state: HintState; content: string | null }>({ state: 'idle', content: null });

  // Correct answer session streak
  currentStreak = signal<number>(0);

  // Confetti overlay trigger
  showConfetti = signal<boolean>(false);
  confettiParticles = Array.from({ length: 80 }).map((_, i) => ({
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * -15 - 5}%`,
    color: ['#4f46e5', '#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#8700ff'][Math.floor(Math.random() * 6)],
    delay: `${Math.random() * 0.7}s`,
    duration: `${Math.random() * 2.0 + 1.2}s`,
    size: `${Math.random() * 6 + 6}px`
  }));

  // Study Guide slide drawer overlay inside the quiz State properties
  showStudyGuideOverlay = signal<boolean>(false);
  loadingStudyGuide = signal<boolean>(false);
  studyGuideContent = signal<StudyGuide | null>(null);
  currentSgPage = signal<number>(0);
  
  // New view mode for tabs
  viewMode = signal<'quiz' | 'study'>('quiz');

  // Timer properties for test mode
  timerValue = this.quizService.timerValue;
  quizDuration = this.quizService.selectedQuizDuration;
  readonly circumference = 2 * Math.PI * 16;

  hasActiveStudyGuide = computed(() => {
    const sub = this.quizService.selectedSubchapter();
    if (!sub) return false;
    return this.quizService.allStudyGuides().some(g => g.subchapter_id === sub.id);
  });

  safeStudyGuideContent = computed<SafeHtml | null>(() => {
    const guide = this.studyGuideContent();
    if (guide?.content) {
      return this.sanitizer.bypassSecurityTrustHtml(guide.content);
    }
    return null;
  });

  timerStrokeOffset = computed(() => {
    const duration = this.quizDuration();
    if (duration === null) return 0; // Untimed quiz
    const progress = Math.max(0, this.timerValue() / duration);
    return this.circumference * (1 - progress);
  });

  timerColorClass = computed(() => {
    const value = this.timerValue();
    if (value <= 5) return 'text-red-500';
    if (value <= 10) return 'text-amber-500';
    return 'text-indigo-500';
  });

  constructor() {
    effect(() => {
      // Re-render math whenever the question changes or we go to next/prev
      const currentQ = this.question();
      const exp = this.explanation();
      const hnt = this.hint();
      // Using signals in effect registers them as dependencies
      this.mathJaxService.render();
    });
  }

  ngOnInit(): void {
    this.resetQuestionState();
  }

  selectOption(index: number) {
    if (this.answerState() === 'unanswered') {
      this.selectedOption.set(index);
    }
  }

  submitAnswer() {
    if (this.selectedOption() === null) return;
    
    if (this.quizMode() === 'test') {
      this.quizService.submitAnswer(this.selectedOption());
      this.resetQuestionState(); // Reset for next question in test mode
    } else { // Practice mode
      const q = this.question();
      if (!q) return;

      const isCorrect = q.correctAnswerIndex === this.selectedOption();
      this.answerState.set(isCorrect ? 'correct' : 'incorrect');
      
      if (isCorrect) {
        this.currentStreak.update(s => s + 1);
        this.triggerConfettiEffect();
      } else {
        this.currentStreak.set(0);
        this.fetchExplanation();
      }
    }
  }

  triggerConfettiEffect() {
    this.showConfetti.set(true);
    setTimeout(() => {
      this.showConfetti.set(false);
    }, 2800);
  }

  async openStudyGuideOverlay() {
    const sg = this.quizService.selectedStudyGuide();
    if (!sg) return;

    this.showStudyGuideOverlay.set(true);
    this.loadingStudyGuide.set(true);
    this.currentSgPage.set(0);

    try {
      const fullGuide = await this.supabaseService.getStudyGuideById(sg.id);
      this.studyGuideContent.set(fullGuide);
      
      // Request MathJax math rendering after the template binds the DOM content
      setTimeout(() => {
        this.mathJaxService.render();
      }, 150);
    } catch (error) {
      console.error("Failed to load full study guide inline drawer", error);
      this.studyGuideContent.set(null);
    } finally {
      this.loadingStudyGuide.set(false);
    }
  }

  closeStudyGuideOverlay() {
    this.showStudyGuideOverlay.set(false);
  }

  toggleViewMode(mode: 'quiz' | 'study') {
    this.viewMode.set(mode);
    if (mode === 'study' && !this.studyGuideContent()) {
      this.loadStudyGuideContent();
    }
  }

  async loadStudyGuideContent() {
    const sg = this.quizService.selectedStudyGuide();
    if (!sg) return;

    this.loadingStudyGuide.set(true);
    this.currentSgPage.set(0);

    try {
      const fullGuide = await this.supabaseService.getStudyGuideById(sg.id);
      this.studyGuideContent.set(fullGuide);
      
      // Request MathJax math rendering after the template binds the DOM content
      setTimeout(() => {
        this.mathJaxService.render();
      }, 150);
    } catch (error) {
      console.error("Failed to load study guide", error);
      this.studyGuideContent.set(null);
    } finally {
      this.loadingStudyGuide.set(false);
    }
  }

  nextSgPage(totalPages: number) {
    if (this.currentSgPage() < totalPages - 1) {
      this.currentSgPage.update(p => p + 1);
    }
  }

  prevSgPage() {
    if (this.currentSgPage() > 0) {
      this.currentSgPage.update(p => p - 1);
    }
  }

  nextQuestion() {
    if (this.questionIndex() < this.totalQuestions() - 1) {
      this.quizService.currentQuestionIndex.update(i => i + 1);
      this.resetQuestionState();
    } else {
        // For both modes, finishing the quiz should lead out of the quiz view.
        // Results page for test, back to topics for practice.
        if (this.quizMode() === 'practice') {
            this.quizService.backToTopicSelect();
        } else {
            this.quizService.view.set('student_results');
        }
    }
  }

  useFiftyFifty() {
    if (this.usedLifelines().fiftyFifty || this.answerState() !== 'unanswered') return;

    const q = this.question();
    if (!q) return;

    const incorrectOptions: number[] = [];
    for (let i = 0; i < q.options.length; i++) {
        if (i !== q.correctAnswerIndex) {
            incorrectOptions.push(i);
        }
    }
    
    // Shuffle and pick two to disable
    incorrectOptions.sort(() => 0.5 - Math.random());
    const toDisable = new Set([incorrectOptions[0], incorrectOptions[1]]);
    this.disabledOptions.set(toDisable);

    this.usedLifelines.update(lifelines => ({ ...lifelines, fiftyFifty: true }));
  }

  async useHint() {
    if (this.usedLifelines().hint || this.answerState() !== 'unanswered') return;
    
    const q = this.question();
    const lang = this.quizService.selectedLanguage();
    if (!q || !lang) return;

    this.hint.set({ state: 'loading', content: null });
    this.usedLifelines.update(lifelines => ({ ...lifelines, hint: true }));

    try {
        const params: HintParams = { question: q, language: lang };
        const hintText = await this.geminiService.getHint(params);
        this.hint.set({ state: 'success', content: hintText });
    } catch (e) {
        this.hint.set({ state: 'error', content: this.t.translate('gemini.hintError') });
    }
  }

  private resetQuestionState() {
    this.selectedOption.set(null);
    this.answerState.set('unanswered');
    this.explanation.set(null);
    this.usedLifelines.set({ hint: false, fiftyFifty: false });
    this.disabledOptions.set(new Set());
    this.hint.set({ state: 'idle', content: null });
    this.currentSgPage.set(0);
  }

  private async fetchExplanation() {
    const question = this.question();
    const selectedOption = this.selectedOption();

    if (!question || selectedOption === null) return;
    
    const grade = this.quizService.selectedGrade();
    const language = this.quizService.selectedLanguage();
    if (!grade || !language) return;

    this.explanation.set({ state: 'loading', content: '' });

    const userAnswer = question.options[selectedOption];

    try {
      const explanationText = await this.geminiService.getExplanation({
        language, grade,
        question: question, userAnswer,
      });
      this.explanation.set({ state: 'success', content: explanationText });
    } catch (error) {
      const errorMessage = this.t.translate('student.explanationError');
      this.explanation.set({ state: 'error', content: errorMessage });
    }
  }

  get progressPercentage() {
    if (this.totalQuestions() === 0) return 0;
    // We add 1 to the index to make it 1-based for progress calculation
    return ((this.questionIndex() + 1) / this.totalQuestions()) * 100;
  }
}
