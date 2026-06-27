
import { Component, ChangeDetectionStrategy, inject, computed, signal, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { QuizService } from '../../services/quiz.service';
import { TranslationService } from '../../services/translation.service';
import { GeminiService, AlternateExplanationParams, Flashcard, FlashcardGenerationParams } from '../../services/gemini.service';
import { SupabaseService } from '../../services/supabase.service';
import { StudyGuide } from '../../models';
import { MathJaxService } from '../../services/mathjax.service';

type ExplanationMode = 'simple' | 'analogy' | 'real-world';

@Component({
  selector: 'app-student-study-guide',
  standalone: true,
  imports: [CommonModule],
  template: `
<div class="relative" [class.fixed]="isFocusMode()" [class.inset-0]="isFocusMode()" [class.z-50]="isFocusMode()" [class.bg-slate-50]="isFocusMode()" [class.dark:bg-slate-900]="isFocusMode()" [class.overflow-y-auto]="isFocusMode()" [class.p-4]="isFocusMode()" [class.sm:p-8]="isFocusMode()">
  <div class="bg-white dark:bg-slate-800 p-4 sm:p-8 rounded-2xl shadow-xl max-w-3xl mx-auto animate-fade-in-up mb-24" [class.min-h-screen]="isFocusMode()">
    @if (isLoading()) {
      <div class="animate-pulse space-y-8">
        <div class="flex justify-between items-center mb-6 border-b border-slate-200 dark:border-slate-700 pb-4">
          <div class="h-4 bg-slate-200 dark:bg-slate-700 rounded w-16"></div>
          <div class="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mx-4"></div>
          <div class="w-16"></div>
        </div>
        <div class="space-y-4">
          <div class="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
          <div class="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
          <div class="h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6"></div>
        </div>
        <div class="space-y-4 mt-8">
          <div class="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-4"></div>
          <div class="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
          <div class="h-4 bg-slate-200 dark:bg-slate-700 rounded w-4/5"></div>
          <div class="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
        </div>
        <div class="space-y-4 mt-8">
          <div class="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/4 mb-4"></div>
          <div class="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
          <div class="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
          <div class="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3"></div>
        </div>
      </div>
    } @else if (studyGuide()) {
      <div class="flex justify-between items-center mb-6 border-b border-slate-200 dark:border-slate-700 pb-4">
        <button (click)="quizService.goBack()" class="text-sm font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition">
          <span>{{ t.isRtl() ? '→' : '←' }}</span> {{ t.translate('back') }}
        </button>
        <h1 class="text-xl sm:text-2xl font-bold text-indigo-600 dark:text-indigo-400 text-center flex-1 mx-4">
          {{ t.translate('student.studyGuideFor', { topic: subchapter()?.name || '' }) }}
        </h1>
        <button (click)="toggleFocusMode()" class="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition" [title]="isFocusMode() ? 'Exit Focus Mode' : 'Enter Focus Mode'">
          @if (isFocusMode()) {
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5 5.25 5.25" /></svg>
          } @else {
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" /></svg>
          }
        </button>
      </div>
      
      <!-- Study Tools Section -->
      <div class="mb-8 p-4 bg-slate-50 dark:bg-slate-900/40 rounded-lg flex items-center justify-center gap-4">
        <button (click)="handleGenerateFlashcards()" [disabled]="flashcardState().loading" class="flex items-center gap-2 px-4 py-2 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-sm font-semibold rounded-md hover:bg-indigo-200 dark:hover:bg-indigo-500/30 transition disabled:opacity-50">
          @if (flashcardState().loading) {
            <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <span>{{ t.translate('student.studyGuide.generating') }}</span>
          } @else {
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path d="M3.5 2A1.5 1.5 0 0 0 2 3.5v13A1.5 1.5 0 0 0 3.5 18h13a1.5 1.5 0 0 0 1.5-1.5v-13A1.5 1.5 0 0 0 16.5 2h-13ZM12.25 8.25a.75.75 0 0 0-1.5 0v3.5a.75.75 0 0 0 1.5 0v-3.5ZM8.5 7.5a.75.75 0 0 0-1.5 0v5a.75.75 0 0 0 1.5 0v-5ZM5.75 9a.75.75 0 0 0-1.5 0v2a.75.75 0 0 0 1.5 0v-2Z" /></svg>
            <span>{{ t.translate('student.studyGuide.flashcards.generate') }}</span>
          }
        </button>
      </div>
      @if(flashcardState().error) {
        <p class="text-sm text-red-600 dark:text-red-400 text-center -mt-4 mb-4">{{ flashcardState().error }}</p>
      }

      @if (hasPageImages()) {
        <div class="book-container relative bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden shadow-inner mb-8 aspect-[3/4] sm:aspect-[4/3] flex items-center justify-center group">
          <!-- Navigation Buttons -->
          <button (click)="prevPage()" [disabled]="currentPage() === 0" class="absolute left-2 z-10 p-2 rounded-full bg-white/80 dark:bg-slate-800/80 shadow-md opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          </button>
          
          <div class="page-display w-full h-full flex items-center justify-center p-2 sm:p-4">
            <img [src]="pageImages()[currentPage()].url" 
                 [alt]="'Page ' + pageImages()[currentPage()].pageNumber"
                 class="max-w-full max-h-full object-contain shadow-2xl rounded-sm animate-fade-in"
                 referrerpolicy="no-referrer">
          </div>

          <button (click)="nextPage()" [disabled]="currentPage() === pageImages().length - 1" class="absolute right-2 z-10 p-2 rounded-full bg-white/80 dark:bg-slate-800/80 shadow-md opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
          </button>

          <!-- Page Indicator -->
          <div class="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/50 text-white text-xs font-medium backdrop-blur-sm">
            {{ currentPage() + 1 }} / {{ pageImages().length }}
          </div>
        </div>
      }

      <article class="prose prose-slate dark:prose-invert max-w-none mt-8">
          <div [innerHTML]="safeStudyGuideContent()"></div>
      </article>
      
      @if (fullStudyGuide()?.animation_html) {
        <div class="mt-8" [innerHTML]="safeAnimationHtml()"></div>
      }

      <div class="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 flex justify-end">
          <button (click)="startQuiz()" class="px-8 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-transform transform hover:scale-105">
              {{ t.translate('student.startQuiz') }}
          </button>
      </div>

    } @else {
      <div class="text-center py-8">
          <p class="text-slate-600 dark:text-slate-400 text-lg">{{ t.translate('student.noSubjectsAvailable') }}</p>
          <button (click)="quizService.goBack()" class="mt-4 px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition">
              {{ t.translate('back') }}
          </button>
      </div>
    }
  </div>

  <!-- Interactive AI Tools -->
  <div class="fixed bottom-4 left-1/2 -translate-x-1/2 w-[95%] max-w-lg z-20">
    <div class="bg-white dark:bg-slate-800/80 backdrop-blur-sm rounded-xl p-3 shadow-2xl ring-1 ring-slate-900/10 dark:ring-slate-50/10 flex items-center justify-around gap-2 transition-all duration-300"
         [class.opacity-50]="selectedText().length === 0">
      @if (selectedText().length === 0) {
        <p class="text-xs text-center text-slate-500 dark:text-slate-400 px-2">{{ t.translate('student.studyGuide.selectTextPrompt') }}</p>
      } @else {
        <button (click)="getAlternateExplanation('simple')" class="flex-1 text-center px-2 py-1.5 text-xs font-semibold rounded-md bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 hover:bg-sky-200 dark:hover:bg-sky-500/30 transition">
          {{ t.translate('student.studyGuide.explainSimple') }}
        </button>
        <button (click)="getAlternateExplanation('analogy')" class="flex-1 text-center px-2 py-1.5 text-xs font-semibold rounded-md bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-500/30 transition">
          {{ t.translate('student.studyGuide.explainAnalogy') }}
        </button>
        <button (click)="getAlternateExplanation('real-world')" class="flex-1 text-center px-2 py-1.5 text-xs font-semibold rounded-md bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-500/30 transition">
          {{ t.translate('student.studyGuide.explainRealWorld') }}
        </button>
      }
    </div>
  </div>

  <!-- Explanation Modal -->
  @if (explanationModal(); as modal) {
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in" (click)="closeModal()">
      <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-xl animate-fade-in-up" (click)="$event.stopPropagation()">
        <header class="p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 class="font-semibold text-slate-700 dark:text-slate-200 truncate pr-8" [title]="modal.originalText">
            {{ t.translate('student.studyGuide.explanationFor', { text: modal.originalText }) }}
          </h2>
          <button (click)="closeModal()" class="absolute top-3 right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg>
          </button>
        </header>
        <div class="p-6 min-h-[10rem]">
          @switch (modal.state) {
            @case ('loading') {
              <div class="flex items-center justify-center h-full gap-2 text-slate-500 dark:text-slate-400">
                <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <span>{{ t.translate('student.studyGuide.generating') }}</span>
              </div>
            }
            @case ('success') {
              <p class="text-slate-700 dark:text-slate-300 whitespace-pre-line">{{ modal.content }}</p>
            }
            @case ('error') {
              <p class="text-red-600 dark:text-red-400">{{ modal.content }}</p>
            }
          }
        </div>
      </div>
    </div>
  }

  <!-- Flashcards Modal -->
  @if(flashcards(); as cards) {
    <div class="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" (click)="closeFlashcards()">
      <div class="relative w-full max-w-2xl" (click)="$event.stopPropagation()">
        <!-- Header -->
        <header class="flex justify-between items-center mb-4 text-white">
          <div>
            <h2 class="font-bold text-xl">{{ t.translate('student.studyGuide.flashcards.title') }}</h2>
            <p class="text-sm opacity-80">{{ t.translate('student.studyGuide.flashcards.cardOf', { current: currentFlashcardIndex() + 1, total: cards.length }) }}</p>
          </div>
          <button (click)="closeFlashcards()" class="text-white/70 hover:text-white transition">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-7 h-7"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg>
          </button>
        </header>
        
        <!-- Flashcard -->
        <div class="flashcard-container" (click)="flipCard()">
          <div class="flashcard" [class.is-flipped]="isFlashcardFlipped()">
            <div class="flashcard-face flashcard-front">
              <span class="label">{{ t.translate('student.studyGuide.flashcards.term') }}</span>
              <p>{{ cards[currentFlashcardIndex()].term }}</p>
            </div>
            <div class="flashcard-face flashcard-back">
              <span class="label">{{ t.translate('student.studyGuide.flashcards.definition') }}</span>
              <p class="mb-6">{{ cards[currentFlashcardIndex()].definition }}</p>
              
              <!-- Spaced Repetition Buttons (Only visible on back) -->
              <div class="flex gap-4 mt-auto w-full" (click)="$event.stopPropagation()">
                <button (click)="markFlashcard('needs-review')" class="flex-1 py-2 px-4 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50 font-semibold transition">
                  {{ t.translate('student.needsReview') || 'Needs Review' }}
                </button>
                <button (click)="markFlashcard('got-it')" class="flex-1 py-2 px-4 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50 font-semibold transition">
                  {{ t.translate('student.gotIt') || 'Got It' }}
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Footer / Navigation -->
        <footer class="flex items-center justify-between mt-4 text-white">
          <button (click)="shuffleCards(); $event.stopPropagation()" class="flex items-center gap-2 px-3 py-2 rounded-md bg-white/10 hover:bg-white/20 transition">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.458-2.656.75.75 0 0 1 1.288.79 4 4 0 0 0 6.882 1.916.75.75 0 1 1-1.135.952 2.5 2.5 0 0 1-4.301-1.198.75.75 0 0 1 1.493-.154 1 1 0 0 0 1.72- .479.75.75 0 1 1 1.342.671Zm-1.543-3.41a.75.75 0 0 1-1.288-.79 4 4 0 0 0-6.882-1.916.75.75 0 0 1 1.135-.952 2.5 2.5 0 0 1 4.301 1.198.75.75 0 0 1-1.493.154 1 1 0 0 0-1.72.479.75.75 0 1 1-1.342-.671a5.5 5.5 0 0 1 9.458 2.656Z" clip-rule="evenodd" /></svg>
            {{ t.translate('student.studyGuide.flashcards.shuffle') }}
          </button>
          <div class="flex items-center gap-2">
            <button (click)="prevCard(); $event.stopPropagation()" [disabled]="currentFlashcardIndex() === 0" class="px-4 py-2 rounded-md bg-white/10 hover:bg-white/20 transition disabled:opacity-50">
              {{ t.translate('student.studyGuide.flashcards.prev') }}
            </button>
            <button (click)="nextCard(); $event.stopPropagation()" [disabled]="currentFlashcardIndex() === cards.length - 1" class="px-4 py-2 rounded-md bg-white/10 hover:bg-white/20 transition disabled:opacity-50">
              {{ t.translate('student.studyGuide.flashcards.next') }}
            </button>
          </div>
        </footer>
      </div>
    </div>
  }

</div>
  `,
  styles: [`
    .book-container {
      perspective: 1000px;
    }
    .page-display img {
      box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.3);
      transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .animate-fade-in {
      animation: fadeIn 0.5s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

:host ::ng-deep {
  .prose { line-height: 1.75; }
  .prose h1, .prose h2, .prose h3, .prose h4 { color: inherit; scroll-margin-top: 4rem; }
  .prose h1 {
    font-size: 2.5em; font-weight: 900; letter-spacing: -0.025em; padding-bottom: 0.3em;
    background: -webkit-linear-gradient(45deg, #4f46e5, #a855f7);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  }
  .prose h2 {
    font-size: 1.75em; padding-bottom: 0.5em; margin-top: 2em;
    border-bottom: 3px solid; border-image-slice: 1;
    border-image-source: linear-gradient(to right, #818cf8, #c084fc);
  }
  .prose h3 {
    font-size: 1.4em; font-weight: 700; margin-top: 1.8em;
    position: relative; padding-left: 1.2em;
  }
  .prose h3::before {
    content: ''; position: absolute; left: 0; top: 50%;
    transform: translateY(-50%); width: 0.6em; height: 0.6em;
    background-color: #818cf8; border-radius: 50%;
  }
  .prose blockquote {
    border-left-width: 0px; border-radius: 0.75rem; background-color: #f5f3ff;
    padding: 1.5em; font-style: normal; position: relative; margin: 2em 0;
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
    overflow: hidden;
  }
  .prose blockquote.takeaways {
    background-color: #fef3c7;
  }
  .prose blockquote.takeaways::before {
    content: '⭐'; background-color: #f59e0b;
  }
  .prose blockquote.example {
    background-color: #ecfdf5;
  }
  .prose blockquote.example::before {
    content: '📝'; background-color: #10b981;
  }
  .prose blockquote.warning {
    background-color: #fff1f2;
  }
  .prose blockquote.warning::before {
    content: '⚠️'; background-color: #ef4444;
  }
  .prose blockquote.definition {
    background-color: #ecfeff;
  }
  .prose blockquote.definition::before {
    content: '📖'; background-color: #06b6d4;
  }
  .prose blockquote::before {
    content: '💡'; position: absolute; top: 0; left: 0; height: 100%;
    width: 3.5rem; display: flex; align-items: center; justify-content: center;
    font-size: 1.5rem; background-color: #4f46e5; color: white;
  }
  [dir="rtl"] .prose blockquote { padding-right: 1.5em; }
  [dir="rtl"] .prose blockquote::before { right: 0; left: auto; }
  [dir="rtl"] .prose blockquote p, [dir="rtl"] .prose blockquote ul { margin-right: 4rem; margin-left: 0; }
  .prose blockquote p, .prose blockquote ul { margin-left: 4rem; }
  .prose blockquote p:first-of-type::before, .prose blockquote p:last-of-type::after { content: ''; }
  .prose code {
    background-color: #eef2ff; color: #4338ca; padding: 0.2em 0.4em;
    border-radius: 0.25rem; font-weight: 600;
  }
  .prose code::before, .prose code::after { content: none; }
  .prose ul > li { position: relative; padding-left: 1.75rem; margin-top: 0.5em; }
  .prose ul > li::before {
    content: '✓'; position: absolute; left: 0; top: 0.1em;
    font-weight: bold; color: #4f46e5; transition: transform 0.2s ease-in-out;
  }
  [dir="rtl"] .prose ul > li { padding-left: 0; padding-right: 1.75rem; }
  [dir="rtl"] .prose ul > li::before { left: auto; right: 0; }
  .prose ul > li:hover::before { transform: scale(1.2); }
  .prose figure { margin: 2em 0; }
  .prose figure img, .prose svg { 
    border-radius: 0.5rem; 
    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1); 
    border: 1px solid #e5e7eb; 
  }
  .prose svg {
    max-width: 100%;
    height: auto;
    margin: 2em auto;
    display: block;
    background-color: white;
  }
  .prose figcaption {
    margin-top: 0.75em; text-align: center; font-size: 0.9em;
    color: #6b7280; line-height: 1.5;
  }
}

:host-context(.dark) ::ng-deep {
  .prose h1 {
    background: -webkit-linear-gradient(45deg, #818cf8, #c084fc);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  }
  .prose h3::before { background-color: #a78bfa; }
  .prose blockquote { background-color: #1e1b4b; }
  .prose blockquote.takeaways { background-color: #451a0333; }
  .prose blockquote.takeaways::before { background-color: #d97706; }
  .prose blockquote.example { background-color: #064e3b33; }
  .prose blockquote.example::before { background-color: #047857; }
  .prose blockquote.warning { background-color: #88133733; }
  .prose blockquote.warning::before { background-color: #be123c; }
  .prose blockquote.definition { background-color: #164e6333; }
  .prose blockquote.definition::before { background-color: #0e7490; }
  .prose blockquote::before { background-color: #4f46e5; }
  .prose code { background-color: #3730a3; color: #c7d2fe; }
  .prose ul > li::before { color: #a78bfa; }
  .prose figure img, .prose svg { border-color: #374151; }
  .prose svg { background-color: #f8fafc; }
  .prose figcaption { color: #9ca3af; }
}

  /* Flashcard styles */
  .flashcard-container {
    perspective: 1000px;
    width: 100%;
    height: 40vh;
    cursor: pointer;
  }
  .flashcard {
    width: 100%;
    height: 100%;
    position: relative;
    transition: transform 0.6s;
    transform-style: preserve-3d;
  }
  .flashcard.is-flipped {
    transform: rotateY(180deg);
  }
  .flashcard-face {
    position: absolute;
    width: 100%;
    height: 100%;
    backface-visibility: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    border-radius: 1rem;
    text-align: center;
  }
  .flashcard-face .label {
    font-size: 0.875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    opacity: 0.6;
    margin-bottom: 1rem;
  }
  .flashcard-face p {
    font-size: 1.75rem;
    font-weight: 700;
    line-height: 1.4;
  }
  .flashcard-front {
    background: white;
    color: #1e293b;
    border: 1px solid #e2e8f0;
  }
  .dark .flashcard-front {
    background: #1e293b; /* slate-800 */
    color: #f8fafc; /* slate-50 */
    border: 1px solid #334155; /* slate-700 */
  }
  .flashcard-back {
    background: #f1f5f9; /* slate-100 */
    color: #1e293b;
    transform: rotateY(180deg);
    border: 1px solid #e2e8f0;
  }
  .dark .flashcard-back {
    background: #334155; /* slate-700 */
    color: #f1f5f9; /* slate-100 */
    border: 1px solid #475569; /* slate-600 */
  }
  .dark .flashcard-back p {
    font-size: 1.25rem;
    font-weight: 500;
  }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentStudyGuideComponent implements OnDestroy {
  quizService = inject(QuizService);
  t = inject(TranslationService);
  private sanitizer: DomSanitizer = inject(DomSanitizer);
  private geminiService = inject(GeminiService);
  private supabase = inject(SupabaseService);
  private mathJaxService = inject(MathJaxService);

  studyGuide = this.quizService.selectedStudyGuide;
  subchapter = this.quizService.selectedSubchapter;

  isLoading = signal(true);
  fullStudyGuide = signal<StudyGuide | null>(null);
  selectedText = signal<string>('');
  explanationModal = signal<{
    mode: ExplanationMode;
    originalText: string;
    content: string;
    state: 'loading' | 'success' | 'error';
  } | null>(null);

  // Flashcard state
  flashcards = signal<Flashcard[] | null>(null);
  flashcardState = signal<{ loading: boolean; error: string | null }>({ loading: false, error: null });
  currentFlashcardIndex = signal(0);
  isFlashcardFlipped = signal(false);
  
  // Focus Mode
  isFocusMode = signal(false);
  currentPage = signal(0);
  pageImages = computed(() => this.fullStudyGuide()?.page_images || []);
  hasPageImages = computed(() => this.pageImages().length > 0);

  nextPage() {
    if (this.currentPage() < this.pageImages().length - 1) {
      this.currentPage.update(p => p + 1);
    }
  }

  prevPage() {
    if (this.currentPage() > 0) {
      this.currentPage.update(p => p - 1);
    }
  }

  constructor() {
    document.addEventListener('selectionchange', this.onSelectionChange);
    effect(() => {
      const partialGuide = this.studyGuide();
      if (partialGuide && partialGuide.id) {
        this.loadFullStudyGuide(partialGuide.id);
      } else {
        // If there's no guide metadata, we are not loading anything.
        this.isLoading.set(false);
        this.fullStudyGuide.set(null);
      }
    });
    
    effect(() => {
        // Trigger MathJax render when content is loaded
        if (this.fullStudyGuide()) {
            this.mathJaxService.render();
        }
    });
  }

  ngOnDestroy(): void {
    document.removeEventListener('selectionchange', this.onSelectionChange);
  }

  async loadFullStudyGuide(id: string) {
    this.isLoading.set(true);
    try {
      const fullGuide = await this.supabase.getStudyGuideById(id);
      this.fullStudyGuide.set(fullGuide);
    } catch (error) {
      console.error("Failed to load full study guide content", error);
      this.fullStudyGuide.set(null); // Set to null on error
    } finally {
      this.isLoading.set(false);
    }
  }

  private onSelectionChange = (): void => {
    const selection = window.getSelection();
    this.selectedText.set(selection ? selection.toString().trim() : '');
  };

  safeStudyGuideContent = computed<SafeHtml | null>(() => {
    const guide = this.fullStudyGuide();
    if (guide?.content) {
      return this.sanitizer.bypassSecurityTrustHtml(guide.content);
    }
    return null;
  });
  
  safeAnimationHtml = computed<SafeHtml | null>(() => {
      const guide = this.fullStudyGuide();
      if (guide?.animation_html) {
          return this.sanitizer.bypassSecurityTrustHtml(guide.animation_html);
      }
      return null;
  });

  async getAlternateExplanation(mode: ExplanationMode) {
    const text = this.selectedText();
    if (!text) return;

    const lang = this.quizService.selectedLanguage();
    const grade = this.quizService.selectedGrade();
    if (!lang || !grade) {
      console.error("Language or grade not selected.");
      return;
    }

    this.explanationModal.set({
      mode: mode,
      originalText: text,
      content: '',
      state: 'loading',
    });

    try {
      const params: AlternateExplanationParams = { text, language: lang, grade, mode };
      const explanation = await this.geminiService.getAlternateExplanation(params);
      this.explanationModal.update(state => state ? { ...state, content: explanation, state: 'success' } : null);
    } catch (e) {
      this.explanationModal.update(state => state ? { ...state, content: this.t.translate('gemini.explanationError'), state: 'error' } : null);
    }
  }

  async handleGenerateFlashcards() {
    const guide = this.fullStudyGuide();
    const lang = this.quizService.selectedLanguage();
    const grade = this.quizService.selectedGrade();

    if (!guide || !guide.content || !lang || !grade) return;
    
    this.flashcardState.set({ loading: true, error: null });
    
    try {
      const params: FlashcardGenerationParams = { htmlContent: guide.content, language: lang, grade };
      const cards = await this.geminiService.generateFlashcards(params);
      if (cards.length > 0) {
        this.flashcards.set(cards);
        this.currentFlashcardIndex.set(0);
        this.isFlashcardFlipped.set(false);
      } else {
        this.flashcardState.set({ loading: false, error: this.t.translate('student.studyGuide.flashcards.noCards') });
      }
    } catch(e) {
      this.flashcardState.set({ loading: false, error: this.t.translate('gemini.flashcardError') });
    } finally {
      this.flashcardState.update(s => ({ ...s, loading: false }));
    }
  }

  closeModal() {
    this.explanationModal.set(null);
  }

  closeFlashcards() {
    this.flashcards.set(null);
  }

  flipCard() {
    this.isFlashcardFlipped.update(v => !v);
  }

  nextCard() {
    this.currentFlashcardIndex.update(i => Math.min(i + 1, this.flashcards()!.length - 1));
    this.isFlashcardFlipped.set(false);
  }

  prevCard() {
    this.currentFlashcardIndex.update(i => Math.max(i - 1, 0));
    this.isFlashcardFlipped.set(false);
  }

  shuffleCards() {
    this.flashcards.update(cards => {
      if (!cards) return null;
      // Fisher-Yates shuffle
      const shuffled = [...cards];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    });
    this.currentFlashcardIndex.set(0);
    this.isFlashcardFlipped.set(false);
  }

  markFlashcard(status: 'got-it' | 'needs-review') {
    // In a real app, this would save to a backend for spaced repetition.
    // For now, we just move to the next card.
    if (this.currentFlashcardIndex() < this.flashcards()!.length - 1) {
      this.nextCard();
    } else {
      // If it's the last card, maybe shuffle and start over with 'needs-review' cards?
      // For simplicity, just close or shuffle.
      this.shuffleCards();
    }
  }

  toggleFocusMode() {
    this.isFocusMode.update(v => !v);
  }

  startQuiz() {
    if (this.quizService.selectedChapter() && this.subchapter()) {
      this.quizService.setQuizMode('practice');
      this.quizService.selectTopic(this.quizService.selectedChapter()!, this.subchapter()!);
    }
  }
}
