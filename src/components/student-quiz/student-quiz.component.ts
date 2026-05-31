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

  @if (question(); as q) {
    <div class="space-y-6">
      <!-- Header Card -->
      <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/50 dark:border-slate-700 p-6 relative overflow-hidden">
        <div class="absolute -right-16 -top-16 w-32 h-32 rounded-full bg-indigo-500/5 blur-2xl pointer-events-none"></div>

        <div class="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100/50 dark:border-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <span class="text-xl font-extrabold font-heading">{{ questionIndex() + 1 }}</span>
            </div>
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <h2 class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  {{ t.translate('student.questionOf', { current: questionIndex() + 1, total: totalQuestions() }) }}
                </h2>
                
                <!-- Streak Badge -->
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
            <!-- Timer (Test Mode Only) -->
            @if (quizMode() === 'test' && quizService.selectedQuizDuration() !== null) {
              <div class="flex items-center gap-2.5 px-4.5 py-2 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200/50 dark:border-slate-700">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-5 h-5 animate-pulse" [class]="timerColorClass()">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                <span class="text-lg font-black font-heading tabular-nums" [class]="timerColorClass()">{{ timerValue() }}s</span>
              </div>
            }

            <button (click)="quizService.backToTopicSelect()" class="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/40" [title]="t.translate('student.changeTopic')">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-6 h-6">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Lifelines & Tools -->
        <div class="flex flex-wrap justify-between items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-700/80">
          <!-- Left: Lifelines -->
          <div class="flex flex-wrap gap-2.5" [class.opacity-40]="quizMode() === 'test'">
            <button (click)="useFiftyFifty()" [disabled]="quizMode() === 'test' || usedLifelines().fiftyFifty || answerState() !== 'unanswered'" 
              class="group flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/2 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
              <div class="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M16.403 12.652a3 3 0 0 0 0-5.304 3 3 0 0 0-3.75-3.751 3 3 0 0 0-5.305 0 3 3 0 0 0-3.751 3.75 3 3 0 0 0 0 5.305 3 3 0 0 0 3.75 3.751 3 3 0 0 0 5.305 0 3 3 0 0 0 3.751-3.75Zm-2.146-4.354a.75.75 0 0 0-1.06-1.06L10 10.94l-3.197-3.198a.75.75 0 1 0-1.06 1.06L8.94 12l-3.198 3.197a.75.75 0 1 0 1.06 1.06L10 13.06l3.197 3.198a.75.75 0 0 0 1.06-1.06L11.06 12l3.198-3.197Z" clip-rule="evenodd" /></svg>
              </div>
              <span class="text-xs font-bold text-slate-600 dark:text-slate-300">{{ t.translate('student.fiftyFifty') }}</span>
            </button>

            <button (click)="useHint()" [disabled]="quizMode() === 'test' || usedLifelines().hint || answerState() !== 'unanswered'" 
              class="group flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/2 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
              <div class="w-7 h-7 rounded-lg bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center text-sky-600 dark:text-sky-400 group-hover:scale-110 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4"><path d="M10 2a.75.75 0 0 1 .75.75v.715A4.004 4.004 0 0 1 12.75 4h.442a.75.75 0 0 1 .75.75v.232c0 .245.09.48.252.662l.004.004c.328.328.423.83.254 1.28l-.003.007-.015.035-.04.086a4.25 4.25 0 0 1-8.48 0l-.04-.086-.015-.035-.003-.007a1.5 1.5 0 0 1 .254-1.28l.004-.004A1.25 1.25 0 0 1 7.808 5h.442A4.004 4.004 0 0 1 10.25 3.465V2.75A.75.75 0 0 1 10 2ZM7.5 10a2.5 2.5 0 1 0 5 0 2.5 2.5 0 0 0-5 0Z" /><path d="M10 12.5a.75.75 0 0 1 .75.75v1.516a.75.75 0 0 1-1.5 0V13.25a.75.75 0 0 1 .75-.75Z" /></svg>
              </div>
              <span class="text-xs font-bold text-slate-600 dark:text-slate-300">{{ t.translate('student.hint') }}</span>
            </button>
          </div>

          <!-- Right: Reference Material Access -->
          @if (hasActiveStudyGuide()) {
            <button (click)="openStudyGuideOverlay()" class="group flex items-center gap-2 px-4 py-2.5 rounded-xl border border-indigo-150 bg-indigo-50/50 hover:bg-indigo-100/50 dark:border-indigo-900/30 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 font-bold hover:scale-103 transition-all text-xs">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-4 h-4">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
              </svg>
              {{ t.translate('student.studyGuide.flashcards.title') || 'Study Guide' }}
            </button>
          }
        </div>
      </div>

      <!-- Question Card -->
      <div class="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-200/50 dark:border-slate-700/80 overflow-hidden relative">
        <div class="p-6 sm:p-8">
          <div class="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-slate-100 mb-8 prose prose-slate dark:prose-invert max-w-none leading-relaxed font-heading" [innerHTML]="q.text"></div>

          <div class="grid grid-cols-1 gap-4">
            @for(option of q.options; track $index + '-' + option) {
              @let isSelected = selectedOption() === $index;
              @let isCorrect = q.correctAnswerIndex === $index;
              @let isRevealed = answerState() !== 'unanswered';
              @let isFiftyFiftyDisabled = disabledOptions().has($index);
              
              <button 
                (click)="selectOption($index)" 
                [disabled]="isRevealed || isFiftyFiftyDisabled"
                class="group relative w-full text-start p-4 sm:p-5 rounded-2xl border-2 transition-all duration-200 flex items-center gap-4 hover:-translate-y-0.5 active:translate-y-0 text-base"
                [class.border-slate-150]="!isSelected && !isRevealed"
                [class.dark:border-slate-700/80]="!isSelected && !isRevealed"
                [class.bg-white]="!isSelected && !isRevealed"
                [class.dark:bg-slate-800]="!isSelected && !isRevealed"
                
                [class.hover:border-indigo-400]="!isRevealed && !isFiftyFiftyDisabled"
                [class.hover:bg-indigo-50/10]="!isRevealed && !isFiftyFiftyDisabled"
                
                [class.border-indigo-500]="isSelected && !isRevealed"
                [class.bg-indigo-50/30]="isSelected && !isRevealed"
                [class.dark:bg-indigo-950/20]="isSelected && !isRevealed"
                
                [class.border-emerald-500]="isRevealed && isCorrect"
                [class.bg-emerald-50/50]="isRevealed && isCorrect"
                [class.dark:bg-emerald-950/20]="isRevealed && isCorrect"
                
                [class.border-rose-500]="isRevealed && !isCorrect && isSelected"
                [class.bg-rose-50/50]="isRevealed && !isCorrect && isSelected"
                [class.dark:bg-rose-950/20]="isRevealed && !isCorrect && isSelected"
                
                [class.opacity-40]="isFiftyFiftyDisabled"
                [class.cursor-not-allowed]="isFiftyFiftyDisabled">
                
                <div class="w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-base transition-colors shrink-0"
                  [class.bg-slate-100]="!isSelected && !isRevealed"
                  [class.dark:bg-slate-700]="!isSelected && !isRevealed"
                  [class.text-slate-500]="!isSelected && !isRevealed"
                  
                  [class.bg-indigo-600]="isSelected && !isRevealed"
                  [class.text-white]="isSelected && !isRevealed"
                  
                  [class.bg-emerald-600]="isRevealed && isCorrect"
                  [class.text-white]="isRevealed && isCorrect"
                  
                  [class.bg-rose-500]="isRevealed && !isCorrect && isSelected"
                  [class.text-white]="isRevealed && !isCorrect && isSelected">
                  {{ 'ABCD'[$index] }}
                </div>
                
                <span class="flex-1 font-semibold leading-relaxed text-slate-700 dark:text-slate-200">{{ option }}</span>

                @if (isRevealed && isCorrect) {
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-6 h-6 text-emerald-500 shrink-0">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clip-rule="evenodd" />
                  </svg>
                } @else if (isRevealed && !isCorrect && isSelected) {
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-6 h-6 text-rose-500 shrink-0">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z" clip-rule="evenodd" />
                  </svg>
                }
              </button>
            }
          </div>
        </div>

        <!-- Hint Display -->
        @if (hint().state !== 'idle') {
          <div class="px-8 pb-8 animate-fade-in">
            <div class="p-4 rounded-2xl border bg-sky-50 border-sky-100 dark:bg-sky-950/20 dark:border-sky-900/40">
              @switch (hint().state) {
                @case('loading') {
                  <div class="flex items-center gap-3 text-sky-700 dark:text-sky-400">
                    <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    <span class="font-bold text-xs uppercase tracking-wider">{{ t.translate('student.hintLoading') }}</span>
                  </div>
                }
                @case('success') {
                  <div class="flex gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 text-sky-500 shrink-0 mt-0.5">
                      <path d="M10 2a.75.75 0 0 1 .75.75v.715A4.004 4.004 0 0 1 12.75 4h.442a.75.75 0 0 1 .75.75v.232c0 .245.09.48.252.662l.004.004c.328.328.423.83.254 1.28l-.003.007-.015.035-.04.086a4.25 4.25 0 0 1-8.48 0l-.04-.086-.015-.035-.003-.007a1.5 1.5 0 0 1 .254-1.28l.004-.004A1.25 1.25 0 0 1 7.808 5h.442A4.004 4.004 0 0 1 10.25 3.465V2.75A.75.75 0 0 1 10 2ZM7.5 10a2.5 2.5 0 1 0 5 0 2.5 2.5 0 0 0-5 0Z" />
                    </svg>
                    <p class="text-sky-850 dark:text-sky-200 leading-relaxed font-semibold text-sm">
                      <strong class="font-black text-sky-800 dark:text-sky-400 uppercase tracking-wide text-xs block mb-1">
                        {{ t.translate('student.hint') }}
                      </strong> 
                      {{ hint().content }}
                    </p>
                  </div>
                }
                @case('error') {
                  <p class="text-sm font-bold text-red-650 dark:text-red-400">{{ hint().content }}</p>
                }
              }
            </div>
          </div>
        }

        <!-- Practice Mode Feedback -->
        @if (quizMode() === 'practice' && answerState() !== 'unanswered') {
          <div class="px-8 pb-8 animate-fade-in">
            <div class="p-6 rounded-2xl border transition-colors duration-300 relative"
                 [class.bg-emerald-50/50]="answerState() === 'correct'" [class.border-emerald-100]="answerState() === 'correct'"
                 [class.dark:bg-slate-900/40]="answerState() === 'correct'" [class.dark:border-emerald-950/50]="answerState() === 'correct'"
                 [class.bg-rose-50/50]="answerState() === 'incorrect'" [class.border-rose-100]="answerState() === 'incorrect'"
                 [class.dark:bg-slate-900/40]="answerState() === 'incorrect'" [class.dark:border-rose-950/50]="answerState() === 'incorrect'">
              
              <div class="flex items-center gap-3.5 mb-4">
                <div class="w-10 h-10 rounded-full flex items-center justify-center pointer-events-none"
                  [class.bg-emerald-500]="answerState() === 'correct'"
                  [class.bg-rose-500]="answerState() === 'incorrect'">
                  @if (answerState() === 'correct') {
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-6 h-6 text-white">
                      <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd" />
                    </svg>
                  } @else {
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-6 h-6 text-white">
                      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                    </svg>
                  }
                </div>
                <h3 class="font-extrabold text-lg sm:text-xl font-heading"
                    [class.text-emerald-800]="answerState() === 'correct'" [class.dark:text-emerald-400]="answerState() === 'correct'"
                    [class.text-rose-800]="answerState() === 'incorrect'" [class.dark:text-rose-400]="answerState() === 'incorrect'">
                  {{ answerState() === 'correct' ? t.translate('student.correct') : t.translate('student.incorrect') }}
                </h3>
              </div>

              @if(explanation(); as exp) {
                <div class="pt-4 border-t border-slate-100 dark:border-slate-800/80">
                    @switch (exp.state) {
                      @case('loading') {
                        <div class="flex items-center gap-3 text-slate-500">
                          <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                          <span class="font-bold text-xs uppercase tracking-wider text-slate-400">{{ t.translate('student.generatingExplanation') }}</span>
                        </div>
                      }
                      @case('success') {
                        <div class="space-y-4">
                          <div class="prose prose-sm dark:prose-invert max-w-none text-slate-650 dark:text-slate-300 leading-relaxed font-medium" [innerHTML]="exp.content"></div>
                          
                          <!-- Interactive Review in-context study guide -->
                          @if (hasActiveStudyGuide()) {
                            <div class="pt-2 border-t border-dashed border-slate-200/60 dark:border-slate-700/60 flex flex-wrap gap-3 items-center">
                              <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">Need to read up on this topic?</span>
                              
                              <button (click)="openStudyGuideOverlay()" class="inline-flex items-center gap-2 px-4.5 py-2 hover:scale-103 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-500/10 transition-all text-xs">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-4 h-4">
                                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                                </svg>
                                {{ t.translate('student.focusAreas.reviewGuide') || 'Review Study Guide' }}
                              </button>
                            </div>
                          }
                        </div>
                      }
                      @case('error') {
                        <p class="text-sm font-bold text-rose-700 dark:text-red-400">{{ exp.content }}</p>
                      }
                    }
                </div>
              }
            </div>
          </div>
        }
      </div>
      
      <!-- Footer Actions -->
      <div class="flex justify-end pt-4">
        @if (quizMode() === 'test') {
          <button (click)="submitAnswer()" [disabled]="selectedOption() === null"
            class="group px-10 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/35 hover:-translate-y-1 active:translate-y-0 disabled:bg-slate-350 disabled:shadow-none disabled:-translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2.5 text-base">
            <span>{{ (questionIndex() < totalQuestions() - 1) ? t.translate('student.nextQuestion') : t.translate('student.finishQuiz') }}</span>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 group-hover:translate-x-1 transition-transform">
              <path fill-rule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clip-rule="evenodd" />
            </svg>
          </button>
        } @else {
          @if (answerState() === 'unanswered') {
            <button (click)="submitAnswer()" [disabled]="selectedOption() === null"
              class="group px-10 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/35 hover:-translate-y-1 active:translate-y-0 disabled:bg-slate-350 disabled:shadow-none disabled:-translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2.5 text-base">
              <span>{{ t.translate('student.submit') }}</span>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 group-hover:scale-108 transition-transform">
                <path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clip-rule="evenodd" />
              </svg>
            </button>
          } @else {
            <button (click)="nextQuestion()" 
              class="group px-10 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/35 hover:-translate-y-1 active:translate-y-0 flex items-center gap-2.5 text-base">
              <span>{{ (questionIndex() < totalQuestions() - 1) ? t.translate('student.nextQuestion') : t.translate('student.finishQuiz') }}</span>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 group-hover:translate-x-1 transition-transform">
                <path fill-rule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clip-rule="evenodd" />
              </svg>
            </button>
          }
        }
      </div>
    </div>
  } @else {
    <div class="bg-white dark:bg-slate-800 rounded-3xl shadow-xl p-12 text-center border border-slate-200/50 dark:border-slate-700/80 animate-fade-in">
        <div class="w-20 h-20 bg-indigo-50 dark:bg-indigo-950/40 rounded-3xl flex items-center justify-center mx-auto mb-6 text-indigo-600 dark:text-indigo-400">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-10 h-10">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
          </svg>
        </div>
        <h2 class="text-2xl font-black text-slate-800 dark:text-slate-100 mb-2 font-heading">{{ t.translate('student.noQuestionsAvailable') }}</h2>
        <p class="text-slate-555 dark:text-slate-400 mb-8 max-w-sm mx-auto">This subchapter does not contain any questions at the moment. Pick another topic to verify your skills.</p>
        <button (click)="quizService.backToTopicSelect()" class="px-8 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 shadow-md shadow-indigo-500/10 active:translate-y-0.5 hover:-translate-y-0.5 transition-all text-sm">
            {{ t.translate('student.chooseAnotherTopic') || 'Choose Another Topic' }}
        </button>
    </div>
  }

  <!-- Slide-over drawer for interactive Study Guide Review overlay -->
  @if (showStudyGuideOverlay()) {
    <div class="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm animate-fade-in" (click)="closeStudyGuideOverlay()">
      <div class="bg-white dark:bg-slate-800 h-full w-full max-w-2xl shadow-2xl flex flex-col animate-slide-left relative" (click)="$event.stopPropagation()">
        
        <!-- Header -->
        <header class="p-5 sm:p-6 border-b border-slate-200/60 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/40 shrink-0">
          <div class="min-w-0">
            <span class="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Quick Reference</span>
            <h2 class="font-extrabold text-lg text-slate-800 dark:text-slate-100 font-heading truncate max-w-md mt-0.5" [title]="quizService.selectedSubchapter()?.name">
              {{ quizService.selectedSubchapter()?.name }}
            </h2>
          </div>
          <button (click)="closeStudyGuideOverlay()" class="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-6 h-6">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </header>
        
        <!-- Scrolling Material Body -->
        <div class="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          @if (loadingStudyGuide()) {
            <div class="flex flex-col items-center justify-center py-20 gap-4 text-slate-500">
              <svg class="animate-spin h-10 w-10 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span class="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Retrieving Study Material...</span>
            </div>
          } @else if (studyGuideContent(); as guide) {
            
            <!-- Standard book images slider overlay inside drawer -->
            @if (guide.page_images && guide.page_images.length > 0) {
              <div class="relative bg-slate-100 dark:bg-slate-900 rounded-2xl overflow-hidden shadow-inner aspect-[3/4] sm:aspect-[4/3] flex items-center justify-center group mb-6 border border-slate-250/50 dark:border-slate-800">
                <button (click)="prevSgPage()" [disabled]="currentSgPage() === 0" class="absolute left-3 z-10 p-2 rounded-full bg-white/80 dark:bg-slate-800/80 shadow-md disabled:opacity-0 hover:scale-105 active:scale-95 transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
                </button>
                
                <div class="w-full h-full flex items-center justify-center p-4">
                  <img [src]="guide.page_images[currentSgPage()].url" 
                       [alt]="'Page ' + guide.page_images[currentSgPage()].pageNumber"
                       class="max-w-full max-h-full object-contain shadow-md rounded-md border border-slate-200/50"
                       referrerpolicy="no-referrer">
                </div>

                <button (click)="nextSgPage(guide.page_images.length)" [disabled]="currentSgPage() === guide.page_images.length - 1" class="absolute right-3 z-10 p-2 rounded-full bg-white/80 dark:bg-slate-800/80 shadow-md disabled:opacity-0 hover:scale-105 active:scale-95 transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                </button>

                <div class="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 text-white text-[11px] font-extrabold tracking-wider backdrop-blur-sm">
                  {{ currentSgPage() + 1 }} / {{ guide.page_images.length }}
                </div>
              </div>
            }
            
            <!-- Material Body Content Rendered in Custom Propose Rules -->
            <article class="prose prose-indigo dark:prose-invert max-w-none text-slate-705 dark:text-slate-300 leading-relaxed font-sans mt-2">
              <div [innerHTML]="safeStudyGuideContent()"></div>
            </article>
            
            @if (guide.animation_html) {
              <div class="mt-6 p-4 rounded-2xl bg-indigo-50/20 dark:bg-indigo-950/10 border border-indigo-100/50 dark:border-indigo-900/30" [innerHTML]="sanitizer.bypassSecurityTrustHtml(guide.animation_html)"></div>
            }

          } @else {
            <div class="text-center py-16 text-slate-400 dark:text-slate-500">
              <p class="font-medium">No study guide available for this subchapter.</p>
            </div>
          }
        </div>
        
        <!-- Drawer Footer -->
        <footer class="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 flex justify-center shrink-0">
          <button (click)="closeStudyGuideOverlay()" class="w-full sm:w-auto px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-indigo-500/10 active:translate-y-0.5 hover:-translate-y-0.5">
            Back to Quiz
          </button>
        </footer>
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
