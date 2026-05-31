

import { Component, ChangeDetectionStrategy, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ReactiveFormsModule, FormsModule, FormBuilder, Validators, FormControl, FormGroup, FormArray } from '@angular/forms';
import { QuillModule } from 'ngx-quill';
import { QuizService } from '../../services/quiz.service';
import { TranslationService } from '../../services/translation.service';
import { GeminiService, AiGeneratedQuestion, QuestionGenerationParams, StudyGuideGenerationParams, StudyGuideContentGenerationParams, AiGeneratedCurriculum, CurriculumFromTextGenerationParams, VisualsGenerationParams, QuestionGenerationParams as GeminiQuestionGenerationParams } from '../../services/gemini.service';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import { Language, Subject, Chapter, Subchapter, Question, QuizAttempt, UserPermissions, UserProfile, StudyGuide } from '../../models';
import { AdminAnalyticsComponent } from '../admin-analytics/admin-analytics.component';
import * as pdfjsLib from 'pdfjs-dist';
import { debounceTime, distinctUntilChanged } from 'rxjs';

const pdfWorker = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).href;
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;


type AdminTab = 'analytics' | 'content_questions' | 'user_management';
type ModalType = 
    | 'edit_subject' | 'new_subject'
    | 'edit_chapter' | 'new_chapter'
    | 'edit_subchapter' | 'new_subchapter'
    | 'edit_question' | 'new_question'
    | 'ai_generate_questions' | 'ai_generate_variations'
    | 'ai_generate_study_guide' | 'ai_generate_pdf'
    | 'ai_generate_study_guide_pdf'
    | 'ai_generate_image'
    | 'grant_access'
    | 'ai_curriculum_builder'
    | 'ai_import_curriculum_pdf'
    | 'bulk_generate_chapter'
    | 'bulk_generate_subject'
    | 'bulk_generate_subject_guides'
    | 'upload_pdf_guide'
    | 'view_study_guide'
    | 'manage_study_guide_images'
    | 'sync_selection'
    | 'correct_reupload_questions'
    | 'move_questions';

interface ModalState {
  type: ModalType;
  data?: any;
}

interface ManagedUser {
    id: string; // This is the UUID
    email: string;
    totalQuizzes: number;
    averageScore: number;
    lastActivity: string | null; // Can be null for new users
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, AdminAnalyticsComponent, QuillModule],
  styles: [`
  :host ::ng-deep .prose figure {
    margin: 2em 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
  }
  :host ::ng-deep .prose img {
    max-width: 100%;
    height: auto;
    border-radius: 0.75rem;
    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
    border: 1px solid #e5e7eb;
    background-color: white;
  }
  :host ::ng-deep .prose figcaption {
    font-size: 0.875rem;
    color: #64748b;
    text-align: center;
    font-style: italic;
    max-width: 80%;
  }
  :host ::ng-deep .prose svg {
    max-width: 100%;
    height: auto;
    margin: 2em auto;
    display: block;
    background-color: white;
    border-radius: 0.5rem;
    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
    border: 1px solid #e5e7eb;
  }
  :host ::ng-deep .prose blockquote {
    border-left-width: 0px; border-radius: 0.75rem; background-color: #f5f3ff;
    padding: 1.5em; font-style: normal; position: relative; margin: 2em 0;
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
    overflow: hidden;
  }
  :host ::ng-deep .prose blockquote.takeaways {
    background-color: #fef3c7;
  }
  :host ::ng-deep .prose blockquote.takeaways::before {
    content: '⭐'; background-color: #f59e0b;
  }
  :host ::ng-deep .prose blockquote.example {
    background-color: #ecfdf5;
  }
  :host ::ng-deep .prose blockquote.example::before {
    content: '📝'; background-color: #10b981;
  }
  :host ::ng-deep .prose blockquote.warning {
    background-color: #fff1f2;
  }
  :host ::ng-deep .prose blockquote.warning::before {
    content: '⚠️'; background-color: #ef4444;
  }
  :host ::ng-deep .prose blockquote.definition {
    background-color: #ecfeff;
  }
  :host ::ng-deep .prose blockquote.definition::before {
    content: '📖'; background-color: #06b6d4;
  }
  :host ::ng-deep .prose blockquote::before {
    content: '💡'; position: absolute; top: 0; left: 0; height: 100%;
    width: 3.5rem; display: flex; align-items: center; justify-content: center;
    font-size: 1.5rem; background-color: #4f46e5; color: white;
  }
  :host ::ng-deep .prose blockquote p, :host ::ng-deep .prose blockquote ul {
    margin-left: 4rem;
  }
  [dir="rtl"] :host ::ng-deep .prose blockquote p, [dir="rtl"] :host ::ng-deep .prose blockquote ul {
    margin-right: 4rem; margin-left: 0;
  }
  [dir="rtl"] :host ::ng-deep .prose blockquote {
    padding-right: 1.5em;
  }
  [dir="rtl"] :host ::ng-deep .prose blockquote::before {
    right: 0; left: auto;
  }
  :host-context(.dark) ::ng-deep .prose svg,
  :host-context(.dark) ::ng-deep .prose img {
    border-color: #374151;
    background-color: #f8fafc;
  }
  :host-context(.dark) ::ng-deep .prose blockquote { background-color: #1e1b4b; }
  :host-context(.dark) ::ng-deep .prose blockquote.takeaways { background-color: #451a0333; }
  :host-context(.dark) ::ng-deep .prose blockquote.takeaways::before { background-color: #d97706; }
  :host-context(.dark) ::ng-deep .prose blockquote.example { background-color: #064e3b33; }
  :host-context(.dark) ::ng-deep .prose blockquote.example::before { background-color: #047857; }
  :host-context(.dark) ::ng-deep .prose blockquote.warning { background-color: #88133733; }
  :host-context(.dark) ::ng-deep .prose blockquote.warning::before { background-color: #be123c; }
  :host-context(.dark) ::ng-deep .prose blockquote.definition { background-color: #164e6333; }
  :host-context(.dark) ::ng-deep .prose blockquote.definition::before { background-color: #0e7490; }
  :host-context(.dark) ::ng-deep .prose blockquote::before { background-color: #4f46e5; }
  `],
  template: `<!-- Sync Progress Modal (Highest Priority) -->
  @if (isSyncingContent()) {
    <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col animate-scale-in border border-slate-200 dark:border-slate-700">
        <header class="p-6 bg-indigo-600 text-white relative">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-white/20 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6 animate-spin" *ngIf="!syncProgress() || syncProgress()?.total === 0"><path fill-rule="evenodd" d="M4.755 10.059a7.5 7.5 0 0 1 12.548-3.364l1.903 1.903h-3.183a.75.75 0 1 0 0 1.5h4.992a.75.75 0 0 0 .75-.75V4.356a.75.75 0 0 0-1.5 0v3.18l-1.9-1.9A9 9 0 0 0 3.306 9.67a.75.75 0 1 0 1.45.388Zm15.408 3.352a.75.75 0 0 0-1.45-.388 7.5 7.5 0 0 1-12.548 3.364l-1.903-1.903h3.183a.75.75 0 1 0 0-1.5H2.5a.75.75 0 0 0-.75.75v4.992a.75.75 0 0 0 1.5 0v-3.18l1.9 1.9a9 9 0 0 0 15.013-4.085Z" clip-rule="evenodd" /></svg>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6" *ngIf="syncProgress()?.total !== 0"><path fill-rule="evenodd" d="M4.755 10.059a7.5 7.5 0 0 1 12.548-3.364l1.903 1.903h-3.183a.75.75 0 1 0 0 1.5h4.992a.75.75 0 0 0 .75-.75V4.356a.75.75 0 0 0-1.5 0v3.18l-1.9-1.9A9 9 0 0 0 3.306 9.67a.75.75 0 1 0 1.45.388Zm15.408 3.352a.75.75 0 0 0-1.45-.388 7.5 7.5 0 0 1-12.548 3.364l-1.903-1.903h3.183a.75.75 0 1 0 0-1.5H2.5a.75.75 0 0 0-.75.75v4.992a.75.75 0 0 0 1.5 0v-3.18l1.9 1.9a9 9 0 0 0 15.013-4.085Z" clip-rule="evenodd" /></svg>
            </div>
            <div>
              <h2 class="text-xl font-bold">Content Synchronization</h2>
              <p class="text-indigo-100 text-xs opacity-90">Please do not close this window until the process is complete.</p>
            </div>
          </div>
        </header>

        <div class="p-6 flex flex-col flex-grow max-h-[70vh]">
          @if (syncProgress(); as progress) {
            <div class="mb-6 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
              <div class="flex justify-between items-end mb-2">
                <div class="flex flex-col gap-1">
                  <span class="text-indigo-600 dark:text-indigo-400 font-bold text-sm uppercase tracking-wider">
                    @if (progress.total > 0) {
                      Syncing: {{ progress.chapter }}
                    } @else {
                      {{ progress.chapter }}
                    }
                  </span>
                  <span class="text-xs text-slate-500 font-medium">
                    @if (progress.subchapter) {
                      Topic: {{ progress.subchapter }}
                    } @else if (progress.total > 0) {
                      Preparing chapters...
                    } @else {
                      Analyzing course structure...
                    }
                  </span>
                </div>
                <div class="text-right">
                  <span class="text-2xl font-black text-indigo-600 dark:text-indigo-400 leading-none">
                    {{ progress.total > 0 ? Math.floor((progress.current / progress.total) * 100) : 0 }}%
                  </span>
                  <p class="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Complete</p>
                </div>
              </div>
              
              <div class="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden shadow-inner">
                <div class="bg-indigo-600 h-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(79,70,229,0.5)]" 
                     [style.width.%]="progress.total > 0 ? (progress.current / progress.total) * 100 : 0">
                </div>
              </div>
              
              @if (progress.total > 0) {
                <p class="text-[10px] text-slate-400 mt-2 text-center font-medium">
                  Processed {{ progress.current }} of {{ progress.total }} topics
                </p>
              }
            </div>
          } @else {
            <div class="mb-6 flex flex-col items-center justify-center p-8 gap-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl">
               <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
               <p class="text-sm text-slate-500">Initializing sync engine...</p>
            </div>
          }

          <div class="flex-grow overflow-hidden flex flex-col min-h-0">
            <h3 class="text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">Activity Logs</h3>
            <div class="flex-grow overflow-y-auto pr-2 custom-scrollbar space-y-2">
              @for (log of syncLogs(); track $index) {
                <div class="text-[11px] font-mono p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 animate-fade-in-up border-l-4"
                     [class.border-l-indigo-500]="log.includes('Processing') || log.includes('Syncing')"
                     [class.border-l-emerald-500]="log.includes('Successfully') || log.includes('Created')"
                     [class.border-l-red-500]="log.includes('ERROR')">
                  {{ log }}
                </div>
              } @empty {
                <div class="text-center py-8 text-slate-400 italic text-xs">Waiting for sync to start...</div>
              }
            </div>
          </div>
        </div>

        <footer class="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 flex justify-center">
          <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest">AI Sync Engine v1.0 • Do not close tab</p>
        </footer>
      </div>
    </div>
  }

  <!-- Main Admin Container -->
<div class="bg-white dark:bg-slate-800 p-4 sm:p-8 rounded-2xl shadow-xl w-full animate-fade-in-up">
  @if (loadError()) {
    <div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
      <p class="font-bold">{{ t.translate('admin.errorTitle') }}</p>
      <p>{{ loadError() }}</p>
    </div>
  }

  <div class="flex justify-between items-center mb-6">
    <h1 class="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{{ t.translate('admin.panelTitle') }}</h1>
    <div class="flex items-center gap-4">
      <button (click)="quizService.view.set('student_dashboard')" class="text-sm font-medium bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-300 dark:hover:bg-indigo-800/50 px-4 py-2 rounded-lg transition flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
        </svg>
        Student Preview
      </button>
      <button (click)="quizService.resetToHome()" class="text-sm font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition">
        <span>{{ t.isRtl() ? '→' : '←' }}</span> {{ t.translate('admin.backToHome') }}
      </button>
    </div>
  </div>

  <!-- Tabs Navigation -->
  <div class="border-b border-slate-200 dark:border-slate-700 mb-6">
    <nav class="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
      <button (click)="setTab('analytics')"
              [class]="activeTab() === 'analytics' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'"
              class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors">
        {{ t.translate('admin.tabs.analytics') }}
      </button>
      <button (click)="setTab('content_questions')"
              [class]="activeTab() === 'content_questions' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'"
              class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors">
        {{ t.translate('admin.tabs.content_questions') }}
      </button>
      <button (click)="setTab('user_management')"
              [class]="activeTab() === 'user_management' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'"
              class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors">
        {{ t.translate('admin.tabs.user_management') }}
      </button>
    </nav>
  </div>

  <!-- Tabs Content -->
  <div class="min-h-[65vh]">
    <!-- Analytics Tab -->
    @if (activeTab() === 'analytics') {
      <app-admin-analytics></app-admin-analytics>
    }

    <!-- Content & Questions Tab -->
    @if (activeTab() === 'content_questions') {
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
        <!-- Left: Tree View -->
        <div class="md:col-span-1 border-e border-slate-200 dark:border-slate-700 md:pe-6">
           <div class="flex justify-between items-center mb-4 gap-2 flex-wrap">
             <h2 class="text-xl font-semibold text-slate-700 dark:text-slate-200">{{ t.translate('admin.contentExplorer.title') }}</h2>
             <div class="flex items-center gap-2 flex-wrap">
                <button (click)="openModal('ai_import_curriculum_pdf')" class="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M4 1.75a.75.75 0 0 1 .75-.75h5.5a.75.75 0 0 1 .75.75v3.662l1.43 1.838A.75.75 0 0 1 12.25 8.5h-8.5a.75.75 0 0 1-.18-1.488L5 5.412V1.75ZM5.75 1A2.25 2.25 0 0 0 3.5 3.25v2.162l-1.43 1.838A2.25 2.25 0 0 0 3.75 10h8.5a2.25 2.25 0 0 0 1.68-3.75L12.5 4.412V3.25A2.25 2.25 0 0 0 10.25 1h-4.5Z" clip-rule="evenodd" /></svg>
                    {{ t.translate('admin.aiCurriculumBuilder.importFromPdf') }}
                </button>
                <button (click)="openModal('ai_curriculum_builder')" class="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4"><path d="M5.5 2.5a3 3 0 0 0-3 3v.5c0 .83.67 1.5 1.5 1.5h.5a3 3 0 0 0 3-3v-.5a1.5 1.5 0 0 0-1.5-1.5h-.5Zm6.5 3a.5.5 0 0 0-.5-.5h-2a.5.5 0 0 0 0 1h2a.5.5 0 0 0 .5-.5ZM8 9a.5.5 0 0 0-.5-.5H5.5a.5.5 0 0 0 0 1h2a.5.5 0 0 0 .5-.5ZM12 2a.5.5 0 0 0-.5-.5h-2a.5.5 0 0 0 0 1h2a.5.5 0 0 0 .5-.5Z" /></svg>
                    {{ t.translate('admin.aiCurriculumBuilder.title') }}
                </button>
                <button (click)="openModal('new_subject')" class="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">+ {{ t.translate('admin.addNewSubject') }}</button>
             </div>
           </div>
           <div class="space-y-1 max-h-[60vh] overflow-y-auto">
             @for (langGroup of subjectsByLanguage(); track langGroup.language) {
                <div class="mb-4">
                  <div class="flex items-center justify-between p-1 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg group transition-all duration-200 bg-slate-200/50 dark:bg-slate-700/30">
                    <button (click)="toggleLanguage(langGroup.language)" class="flex-grow flex items-center justify-between p-2 text-start font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
                      <span>{{ getLanguageName(langGroup.language) }}</span>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-5 h-5 transition-transform" [class.rotate-90]="expandedLanguages().has(langGroup.language)"><path fill-rule="evenodd" d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg>
                    </button>
                  </div>

                  @if (expandedLanguages().has(langGroup.language)) {
                    <div class="ps-2 mt-2 space-y-1 border-l-2 border-slate-200 dark:border-slate-700 ml-2">
                       @for (gradeGroup of langGroup.gradeGroups; track gradeGroup.grade) {
                          <div class="rounded-lg bg-slate-50 dark:bg-slate-900/40 mb-1">
                            <div class="flex items-center justify-between p-1 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg group transition-all duration-200">
                              <button (click)="toggleGrade(gradeGroup.grade)" class="flex-grow flex items-center justify-between p-2 text-start font-bold text-slate-800 dark:text-slate-100">
                                <span>{{ t.translate('admin.grade') }} {{ gradeGroup.grade }}</span>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4 text-slate-500 transition-transform" [class.rotate-90]="expandedGrades().has(gradeGroup.grade)"><path fill-rule="evenodd" d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg>
                              </button>
                              <button (click)="deleteGrade(gradeGroup)" title="{{ t.translate('delete') }}" class="p-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM4.569 13.5 4.25 5.5h7.5l-.319 8H4.57Z" clip-rule="evenodd" /></svg>
                              </button>
                            </div>
                            @if(expandedGrades().has(gradeGroup.grade)) {
                              <div class="ps-4 pe-2 py-1 space-y-1">
                                @for (subject of gradeGroup.subjects; track subject.id) {
                                  <div class="rounded-lg" [class.bg-indigo-50]="activeContentItem()?.item?.id === subject.id" [class.dark:bg-indigo-900/20]="activeContentItem()?.item?.id === subject.id">
                                      <div class="flex items-center justify-between p-2">
                                          <div class="flex items-center gap-2 flex-grow min-w-0">
                                              <button (click)="toggleSubject(subject.id)" class="flex-shrink-0">
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4 text-slate-500 transition-transform" [class.rotate-90]="expandedSubjects().has(subject.id)"><path fill-rule="evenodd" d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg>
                                              </button>
                                              <button (click)="selectContentItem('subject', subject)" class="truncate text-start flex-grow">
                                                <span class="font-semibold text-slate-800 dark:text-slate-100">{{ subject.name }}</span>
                                                <span class="text-xs text-slate-500 dark:text-slate-400 block">{{ getLanguageName(subject.language) }}</span>
                                              </button>
                                          </div>
                                          <div class="flex items-center flex-shrink-0">
                                              <button (click)="openModal('edit_subject', subject)" title="{{ t.translate('edit') }}" class="text-slate-400 hover:text-indigo-500"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4"><path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L6.75 6.775a.75.75 0 0 0 0 1.06l.53.53a.75.75 0 0 0 1.06 0l4.263-4.262a1.75 1.75 0 0 0 0-2.475Z" /><path d="M6.03 8.353.75 13.634V15.25h1.616l5.28-5.28-1.59-1.59a.75.75 0 0 0-1.026-.027Z" /></svg></button>
                                              <button (click)="deleteSubject(subject)" title="{{ t.translate('delete') }}" class="text-slate-400 hover:text-red-500"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM4.569 13.5 4.25 5.5h7.5l-.319 8H4.57Z" clip-rule="evenodd" /></svg></button>
                                              <button (click)="openModal('new_chapter', { subject })" title="{{ t.translate('admin.contentExplorer.addChapter') }}" class="text-slate-400 hover:text-indigo-500"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4"><path d="M2.5 4.25a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H3.25a.75.75 0 0 1-.75-.75ZM2.5 8a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H3.25a.75.75 0 0 1-.75-.75Zm0 3.75a.75.75 0 0 1 .75-.75h6.5a.75.75 0 0 1 0 1.5h-6.5a.75.75 0 0 1-.75-.75Z" /><path d="M12.5 10.5a.5.5 0 0 0-1 0V12h-1.5a.5.5 0 0 0 0 1H11.5v1.5a.5.5 0 0 0 1 0V13h1.5a.5.5 0 0 0 0-1H12.5v-1.5Z" /></svg></button>
                                              <button (click)="syncEnglishSubjectToArabic(subject)" title="Sync / Copy content to other languages" class="text-slate-400 hover:text-emerald-500 transition-colors ml-1">
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.451a.75.75 0 0 0 0-1.5H4.147a.75.75 0 0 0-.75.75v4.103a.75.75 0 0 0 1.5 0v-1.894l.325.325a7 7 0 1 0 12.025-4.57.75.75 0 1 0-1.935 1.031Z" clip-rule="evenodd" /></svg>
                                              </button>
                                          </div>
                                      </div>
                                      @if (expandedSubjects().has(subject.id)) {
                                          <div class="ps-6 pe-2 py-1 space-y-1">
                                              @for(chapter of chaptersBySubjectId().get(subject.id); track chapter.id) {
                                                  <div class="rounded-md" [class.bg-indigo-100]="activeContentItem()?.item?.id === chapter.id" [class.dark:bg-indigo-900/40]="activeContentItem()?.item?.id === chapter.id">
                                                      <div class="flex items-center justify-between p-2">
                                                          <div class="flex items-center gap-2 flex-grow min-w-0">
                                                              <button (click)="toggleChapter(chapter.id)" class="flex-shrink-0">
                                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4 text-slate-500 transition-transform" [class.rotate-90]="expandedChapters().has(chapter.id)"><path fill-rule="evenodd" d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg>
                                                              </button>
                                                              <button (click)="selectContentItem('chapter', chapter)" class="truncate text-start flex-grow font-medium text-slate-700 dark:text-slate-200">{{ chapter.name }}</button>
                                                          </div>
                                                          <div class="flex items-center flex-shrink-0">
                                                              <button (click)="openEditChapterModal(chapter, subject)" title="{{ t.translate('edit') }}" class="text-slate-400 hover:text-indigo-500"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4"><path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L6.75 6.775a.75.75 0 0 0 0 1.06l.53.53a.75.75 0 0 0 1.06 0l4.263-4.262a1.75 1.75 0 0 0 0-2.475Z" /><path d="M6.03 8.353.75 13.634V15.25h1.616l5.28-5.28-1.59-1.59a.75.75 0 0 0-1.026-.027Z" /></svg></button>
                                                              <button (click)="deleteChapter(chapter)" title="{{ t.translate('delete') }}" class="text-slate-400 hover:text-red-500"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM4.569 13.5 4.25 5.5h7.5l-.319 8H4.57Z" clip-rule="evenodd" /></svg></button>
                                                              <button (click)="openModal('new_subchapter', { chapter })" title="{{ t.translate('admin.contentExplorer.addSubchapter') }}" class="text-slate-400 hover:text-indigo-500"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4"><path d="M2.5 4.25a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H3.25a.75.75 0 0 1-.75-.75ZM2.5 8a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H3.25a.75.75 0 0 1-.75-.75Zm0 3.75a.75.75 0 0 1 .75-.75h6.5a.75.75 0 0 1 0 1.5h-6.5a.75.75 0 0 1-.75-.75Z" /><path d="M12.5 10.5a.5.5 0 0 0-1 0V12h-1.5a.5.5 0 0 0 0 1H11.5v1.5a.5.5 0 0 0 1 0V13h1.5a.5.5 0 0 0 0-1H12.5v-1.5Z" /></svg></button>
                                                          </div>
                                                      </div>
                                                      @if (expandedChapters().has(chapter.id)) {
                                                          <div class="ps-6 pe-2 py-1 space-y-1">
                                                              @for(subchapter of subchaptersByChapterId().get(chapter.id); track subchapter.id) {
                                                                  <div class="flex items-center justify-between p-2 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700" [class.bg-indigo-200]="activeContentItem()?.item?.id === subchapter.id" [class.dark:bg-indigo-900/60]="activeContentItem()?.item?.id === subchapter.id">
                                                                      <button (click)="selectContentItem('subchapter', subchapter)" class="w-full text-start text-slate-600 dark:text-slate-300 flex items-center gap-2">
                                                                        {{ subchapter.name }}
                                                                        @if (subchapter.isPublished === false) {
                                                                          <span class="px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 rounded">Draft</span>
                                                                        }
                                                                      </button>
                                                                      <div class="flex items-center flex-shrink-0">
                                                                        <button (click)="openEditSubchapterModal(subchapter, chapter)" title="{{ t.translate('edit') }}" class="text-slate-400 hover:text-indigo-500"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4"><path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L6.75 6.775a.75.75 0 0 0 0 1.06l.53.53a.75.75 0 0 0 1.06 0l4.263-4.262a1.75 1.75 0 0 0 0-2.475Z" /><path d="M6.03 8.353.75 13.634V15.25h1.616l5.28-5.28-1.59-1.59a.75.75 0 0 0-1.026-.027Z" /></svg></button>
                                                                        <button (click)="deleteSubchapter(subchapter)" title="{{ t.translate('delete') }}" class="text-slate-400 hover:text-red-500"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM4.569 13.5 4.25 5.5h7.5l-.319 8H4.57Z" clip-rule="evenodd" /></svg></button>
                                                                      </div>
                                                                  </div>
                                                              }
                                                          </div>
                                                      }
                                                  </div>
                                              }
                                          </div>
                                      }
                                  </div>
                                }
                              </div>
                            }
                          </div>
                       }
                    </div>
                  }
                </div>
             }
           </div>
        </div>

        <!-- Right: Detail/Edit View -->
        <div class="md:col-span-2">
            @if(activeContentItem(); as activeItem) {
                @switch (activeItem.type) {
                    @case ('subject') {
                        <div class="text-center p-8 bg-slate-50 dark:bg-slate-900/40 rounded-lg">
                            <h3 class="text-lg font-semibold text-slate-700 dark:text-slate-200">{{ activeItem.item.name }}</h3>
                            <p class="text-slate-500 dark:text-slate-400 mt-1 mb-6">{{ t.translate('admin.contentExplorer.selectChapterPrompt') }}</p>

                            <div class="flex flex-wrap justify-center gap-4 mt-6">
                                <button (click)="openModal('bulk_generate_subject')" class="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-all duration-200 hover:scale-105 shadow-sm">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
                                      <path fill-rule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Zm1.23-3.723a.75.75 0 0 0 .219-.53V2.929a.75.75 0 0 0-1.5 0V5.36l-.31-.31A7 7 0 0 0 3.239 8.188a.75.75 0 1 0 1.448.389A5.5 5.5 0 0 1 13.89 6.11l.311.31h-2.432a.75.75 0 0 0 0 1.5h4.243a.75.75 0 0 0 .53-.219Z" clip-rule="evenodd" />
                                    </svg>
                                    {{ t.translate('admin.bulkGenerateSubject.button') }}
                                </button>
                                <button (click)="openModal('bulk_generate_subject_guides', activeItem.item)" class="flex items-center gap-2 px-6 py-3 bg-fuchsia-600 text-white font-bold rounded-lg hover:bg-fuchsia-700 transition-all duration-200 hover:scale-105 shadow-sm">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
                                      <path fill-rule="evenodd" d="M9.69 18.933a.75.75 0 0 1-1.38 0l-.3-.9a1.5 1.5 0 0 0-.96-.96l-.9-.3a.75.75 0 0 1 0-1.38l.9-.3a1.5 1.5 0 0 0 .96-.96l.3-.9a.75.75 0 0 1 1.38 0l.3.9a1.5 1.5 0 0 0 .96.96l.9.3a.75.75 0 0 1 0 1.38l-.9.3a1.5 1.5 0 0 0-.96.96l-.3.9ZM12 8a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5h-1.5A.75.75 0 0 1 12 8Zm-6 0a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5h-1.5A.75.75 0 0 1 6 8Zm6-4a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5h-1.5A.75.75 0 0 1 12 4Zm-6 0a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5h-1.5A.75.75 0 0 1 6 4Zm11.31.69a.75.75 0 0 1 0 1.06l-11.25 11.25a.75.75 0 1 1-1.06-1.06l11.25-11.25a.75.75 0 0 1 1.06 0Z" clip-rule="evenodd" />
                                    </svg>
                                    {{ t.translate('admin.bulkGenerateSubjectGuides.button') }}
                                </button>
                                <button (click)="openModal('ai_import_curriculum_pdf', activeItem.item)" class="flex items-center gap-2 px-6 py-3 bg-pink-600 text-white font-bold rounded-lg hover:bg-pink-700 transition-all duration-200 hover:scale-105 shadow-sm">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M4 1.75a.75.75 0 0 1 .75-.75h5.5a.75.75 0 0 1 .75.75v3.662l1.43 1.838A.75.75 0 0 1 12.25 8.5h-8.5a.75.75 0 0 1-.18-1.488L5 5.412V1.75ZM5.75 1A2.25 2.25 0 0 0 3.5 3.25v2.162l-1.43 1.838A2.25 2.25 0 0 0 3.75 10h8.5a2.25 2.25 0 0 0 1.68-3.75L12.5 4.412V3.25A2.25 2.25 0 0 0 10.25 1h-4.5Z" clip-rule="evenodd" /><path d="M2.5 12.5a.5.5 0 0 0-1 0v1a.5.5 0 0 0 1 0v-1Zm1-1.5a.5.5 0 0 0 0 1h.5a.5.5 0 0 0 0-1h-.5ZM1 15.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5Z" /></svg>
                                    {{ t.translate('admin.uploadPdfGuide') }}
                                </button>
                                <button (click)="downloadSubjectQuestions(activeItem.item)" class="flex items-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg transition-all duration-200 hover:scale-105 shadow-sm">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
                                      <path fill-rule="evenodd" d="M10 3a.75.75 0 0 1 .75.75v6.793l2.83-2.83a.75.75 0 1 1 1.06 1.06l-4.108 4.108a1.25 1.25 0 0 1-1.768 0L4.659 8.773a.75.75 0 1 1 1.06-1.06l2.83 2.83V3.75A.75.75 0 0 1 10 3ZM3.75 13.5a.75.75 0 0 0 0 1.5h12.5a.75.75 0 0 0 0-1.5H3.75Z" clip-rule="evenodd" />
                                    </svg>
                                    Download Questions JSON
                                </button>
                                <button (click)="openModal('correct_reupload_questions', activeItem.item)" class="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-all duration-200 hover:scale-105 shadow-sm">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
                                      <path fill-rule="evenodd" d="M10 17a.75.75 0 0 1-.75-.75V9.457l-2.83 2.83a.75.75 0 1 1-1.06-1.06l4.108-4.108a1.25 1.25 0 0 1 1.768 0l4.108 4.108a.75.75 0 1 1-1.06 1.06l-2.83-2.83V16.25A.75.75 0 0 1 10 17ZM3.75 13.5a.75.75 0 0 0 0 1.5h12.5a.75.75 0 0 0 0-1.5H3.75Z" clip-rule="evenodd" />
                                    </svg>
                                    Correct & Reupload JSON
                                </button>
                            </div>
                        </div>
                    }
                    @case ('chapter') {
                        <div class="text-center p-8 bg-slate-50 dark:bg-slate-900/40 rounded-lg">
                            <h3 class="text-lg font-semibold text-slate-700 dark:text-slate-200">{{ activeItem.item.name }}</h3>
                            <p class="text-slate-500 dark:text-slate-400 mt-1 mb-6">{{ t.translate('admin.contentExplorer.selectSubchapterPrompt') }}</p>
                            
                            <div class="flex justify-center">
                                <button (click)="openModal('bulk_generate_chapter')" class="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-all duration-200 hover:scale-105 shadow-sm">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
                                      <path fill-rule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Zm1.23-3.723a.75.75 0 0 0 .219-.53V2.929a.75.75 0 0 0-1.5 0V5.36l-.31-.31A7 7 0 0 0 3.239 8.188a.75.75 0 1 0 1.448.389A5.5 5.5 0 0 1 13.89 6.11l.311.31h-2.432a.75.75 0 0 0 0 1.5h4.243a.75.75 0 0 0 .53-.219Z" clip-rule="evenodd" />
                                    </svg>
                                    {{ t.translate('admin.bulkGenerate.button') }}
                                </button>
                            </div>
                        </div>
                    }
                    @case ('subchapter') {
                        <div>
                            <div class="flex flex-wrap gap-4 justify-between items-start mb-4">
                                <h3 class="text-xl font-semibold text-slate-700 dark:text-slate-200">{{ t.translate('admin.tabs.manageQuestions') }}</h3>
                                <div class="flex flex-col items-end gap-3">
                                  @if (hasSelection()) {
                                    <div class="flex items-center gap-2">
                                      <button (click)="deleteSelectedQuestions()" class="flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition shadow-sm">
                                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM4.569 13.5 4.25 5.5h7.5l-.319 8H4.57Z" clip-rule="evenodd" /></svg>
                                          {{ t.translate('admin.deleteSelected', { count: selectedQuestionIds().size }) }}
                                      </button>
                                      <button (click)="openModal('move_questions')" class="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-700 transition shadow-sm">
                                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clip-rule="evenodd" /></svg>
                                          Move Selected ({{ selectedQuestionIds().size }})
                                      </button>
                                      <button (click)="autoCategorizeSelectedQuestions()" [disabled]="isAutoCategorizing()" class="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition shadow-sm disabled:opacity-50">
                                           @if (isAutoCategorizing()) {
                                             <svg class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                             {{ autoCategorizeProgress() ? 'Fixing (' + autoCategorizeProgress()?.current + '/' + autoCategorizeProgress()?.total + ')...' : 'Analzing...' }}
                                           } @else {
                                             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clip-rule="evenodd" /></svg>
                                             Auto-Fix Placements
                                           }
                                      </button>
                                    </div>
                                  }
                                   <div class="flex items-center gap-3 flex-wrap justify-end">
                                    @if (getActiveSubject(); as sub) {
                                      <button (click)="downloadSubjectQuestions(sub)" class="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg transition-all duration-200 shadow-sm shrink-0">
                                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
                                            <path fill-rule="evenodd" d="M10 3a.75.75 0 0 1 .75.75v6.793l2.83-2.83a.75.75 0 1 1 1.06 1.06l-4.108 4.108a1.25 1.25 0 0 1-1.768 0L4.659 8.773a.75.75 0 1 1 1.06-1.06l2.83 2.83V3.75A.75.75 0 0 1 10 3ZM3.75 13.5a.75.75 0 0 0 0 1.5h12.5a.75.75 0 0 0 0-1.5H3.75Z" clip-rule="evenodd" />
                                          </svg>
                                          Download Questions JSON
                                      </button>
                                      <button (click)="openModal('correct_reupload_questions', sub)" class="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-all duration-200 shadow-sm shrink-0">
                                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
                                            <path fill-rule="evenodd" d="M10 17a.75.75 0 0 1-.75-.75V9.457l-2.83 2.83a.75.75 0 1 1-1.06-1.06l4.108-4.108a1.25 1.25 0 0 1 1.768 0l4.108 4.108a.75.75 0 1 1-1.06 1.06l-2.83-2.83V16.25A.75.75 0 0 1 10 17ZM3.75 13.5a.75.75 0 0 0 0 1.5h12.5a.75.75 0 0 0 0-1.5H3.75Z" clip-rule="evenodd" />
                                          </svg>
                                          Correct & Reupload JSON
                                      </button>
                                    }
                                    <button (click)="scanForMisplacedQuestions()" [disabled]="isScanningQuestions() || isAutoCategorizing()" class="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition shadow-sm disabled:opacity-50">
                                      @if (isScanningQuestions()) {
                                        <svg class="animate-spin h-4 w-4 text-slate-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        Scanning...
                                      } @else {
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z" clip-rule="evenodd" /></svg>
                                        Scan for Misplaced
                                      }
                                    </button>
                                    <button (click)="openModal('new_question')" class="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-all duration-200 hover:scale-105">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-5 h-5"><path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" /></svg>
                                        {{ t.translate('admin.addNewQuestion') }}
                                    </button>
                                    <button (click)="openModal('ai_generate_image')" class="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white font-bold rounded-lg hover:bg-cyan-700 transition">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M1.25 5A2.75 2.75 0 0 1 4 2.25h8A2.75 2.75 0 0 1 14.75 5v6A2.75 2.75 0 0 1 12 13.75H4A2.75 2.75 0 0 1 1.25 11V5Zm2.75-1.25a1.25 1.25 0 0 0-1.25 1.25v6a1.25 1.25 0 0 0 1.25 1.25h8a1.25 1.25 0 0 0 1.25-1.25V5a1.25 1.25 0 0 0-1.25-1.25H4ZM9.5 6.5a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0V7a.5.5 0 0 1 .5-.5Z" clip-rule="evenodd" /><path d="M6.5 7.25a.75.75 0 0 1 1.5 0v1.5a.75.75 0 0 1-1.5 0v-1.5Z" /></svg>
                                        {{ t.translate('admin.generateFromImage') }}
                                    </button>
                                    <button (click)="openModal('ai_generate_pdf')" class="flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition">
                                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M4 1.75a.75.75 0 0 1 .75-.75h5.5a.75.75 0 0 1 .75.75v3.662l1.43 1.838A.75.75 0 0 1 12.25 8.5h-8.5a.75.75 0 0 1-.18-1.488L5 5.412V1.75ZM5.75 1A2.25 2.25 0 0 0 3.5 3.25v2.162l-1.43 1.838A2.25 2.25 0 0 0 3.75 10h8.5a2.25 2.25 0 0 0 1.68-3.75L12.5 4.412V3.25A2.25 2.25 0 0 0 10.25 1h-4.5ZM8 11a.75.75 0 0 1 .75.75v1.5h1.5a.75.75 0 0 1 0 1.5h-1.5v1.5a.75.75 0 0 1-1.5 0v-1.5h-1.5a.75.75 0 0 1 0-1.5h1.5v-1.5A.75.75 0 0 1 8 11Z" clip-rule="evenodd" /></svg>
                                      {{ t.translate('admin.generateFromPdf') }}
                                    </button>
                                    <button (click)="openModal('ai_generate_questions')" class="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white font-bold rounded-lg hover:bg-sky-700 transition">
                                      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" /></svg>
                                      {{ t.translate('admin.generateWithAi') }}
                                    </button>
                                    <button (click)="openModal('ai_generate_study_guide_pdf')" class="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M4 1.75a.75.75 0 0 1 .75-.75h5.5a.75.75 0 0 1 .75.75v3.662l1.43 1.838A.75.75 0 0 1 12.25 8.5h-8.5a.75.75 0 0 1-.18-1.488L5 5.412V1.75ZM5.75 1A2.25 2.25 0 0 0 3.5 3.25v2.162l-1.43 1.838A2.25 2.25 0 0 0 3.75 10h8.5a2.25 2.25 0 0 0 1.68-3.75L12.5 4.412V3.25A2.25 2.25 0 0 0 10.25 1h-4.5Z" clip-rule="evenodd" /><path d="M2.5 12.5a.5.5 0 0 0-1 0v1a.5.5 0 0 0 1 0v-1Zm1-1.5a.5.5 0 0 0 0 1h.5a.5.5 0 0 0 0-1h-.5ZM1 15.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5Z" /></svg>
                                      {{ t.translate('admin.generateGuideFromPdf') }}
                                    </button>
                                    <button (click)="openModal('upload_pdf_guide')" class="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white font-bold rounded-lg hover:bg-pink-700 transition">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M4 1.75a.75.75 0 0 1 .75-.75h5.5a.75.75 0 0 1 .75.75v3.662l1.43 1.838A.75.75 0 0 1 12.25 8.5h-8.5a.75.75 0 0 1-.18-1.488L5 5.412V1.75ZM5.75 1A2.25 2.25 0 0 0 3.5 3.25v2.162l-1.43 1.838A2.25 2.25 0 0 0 3.75 10h8.5a2.25 2.25 0 0 0 1.68-3.75L12.5 4.412V3.25A2.25 2.25 0 0 0 10.25 1h-4.5Z" clip-rule="evenodd" /><path d="M2.5 12.5a.5.5 0 0 0-1 0v1a.5.5 0 0 0 1 0v-1Zm1-1.5a.5.5 0 0 0 0 1h.5a.5.5 0 0 0 0-1h-.5ZM1 15.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5Z" /></svg>
                                      {{ t.translate('admin.uploadPdfGuide') }}
                                    </button>
                                    <button (click)="openModal('manage_study_guide_images')" class="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700 transition">
                                       <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-5 h-5"><path d="M4.5 1A2.5 2.5 0 0 0 2 3.5v9A2.5 2.5 0 0 0 4.5 15h7a2.5 2.5 0 0 0 2.5-2.5v-9A2.5 2.5 0 0 0 11.5 1h-7ZM3.5 3.5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-7a1 1-0 0 1-1-1v-9ZM5 5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5A.5.5 0 0 1 5 5Zm0 3a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5A.5.5 0 0 1 5 8Zm0 3a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3A.5.5 0 0 1 5 11Z" /></svg>
                                       Manage Images
                                    </button>
                                    <button (click)="openStudyGuideModal()" class="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition">
                                       <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-5 h-5"><path d="M4.75 2.75a.75.75 0 0 0-1.5 0v11.5a.75.75 0 0 0 1.5 0V2.75Z" /><path d="M7.25 5a.75.75 0 0 1 .75-.75h5.5a.75.75 0 0 1 0 1.5h-5.5a.75.75 0 0 1-.75-.75ZM8 8.25a.75.75 0 0 0 0 1.5h2.5a.75.75 0 0 0 0-1.5H8Z" /></svg>
                                      {{ guideExistsForActiveSubchapter() ? t.translate('admin.regenerateStudyGuide') : t.translate('admin.generateStudyGuide') }}
                                    </button>
                                    <button (click)="proofreadActiveSubchapterQuestions()" [disabled]="isProofreadingQuestions()" class="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
                                         @if (isProofreadingQuestions()) {
                                           <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                           {{ proofreadProgress() ? 'Proofreading (' + proofreadProgress()?.current + '/' + proofreadProgress()?.total + ')...' : 'Analzing...' }}
                                         } @else {
                                           <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clip-rule="evenodd" /></svg>
                                           Proofread All Questions
                                         }
                                    </button>
                                    @if (guideExistsForActiveSubchapter()) {
                                        <button (click)="editStudyGuide(studyGuideForActiveSubchapter()!)" class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-5 h-5"><path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L6.75 6.774a2.75 2.75 0 0 0-.596.892l-.848 2.047a.75.75 0 0 0 .98.98l2.047-.848a2.75 2.75 0 0 0 .892-.596l4.261-4.262a1.75 1.75 0 0 0 0-2.474Z" /><path d="M4.75 3.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h6.5c.69 0 1.25-.56 1.25-1.25V9A.75.75 0 0 1 14 9v2.25A2.75 2.75 0 0 1 11.25 14h-6.5A2.75 2.75 0 0 1 2 11.25v-6.5A2.75 2.75 0 0 1 4.75 2H7a.75.75 0 0 1 0 1.5H4.75Z" /></svg>
                                            {{ t.translate('edit') }}
                                        </button>
                                        <button (click)="openModal('view_study_guide', studyGuideForActiveSubchapter())" class="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-5 h-5"><path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12.735 14c.618 0 1.093-.561.872-1.139a6.002 6.002 0 0 0-11.215 0c-.22.578.254 1.139.872 1.139h9.47Z" /></svg>
                                            {{ t.translate('admin.viewStudyGuide') }}
                                        </button>
                                        @if (studyGuideForActiveSubchapter()?.isPublished === false) {
                                          <span class="flex items-center px-2.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 rounded-full">Draft</span>
                                        }
                                    }
                                  </div>
                                </div>
                            </div>
                            <div class="border dark:border-slate-700 rounded-lg overflow-hidden">
                                <div class="overflow-y-auto max-h-[55vh]">
                                    <table class="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                                        <thead class="text-xs text-slate-700 dark:text-slate-300 uppercase bg-slate-100 dark:bg-slate-700 sticky top-0 z-10">
                                            <tr>
                                                <th scope="col" class="p-4 w-12">
                                                    <input type="checkbox" class="h-4 w-4 rounded border-gray-300 dark:border-slate-500 text-indigo-600 focus:ring-indigo-500 bg-slate-200 dark:bg-slate-600" [checked]="areAllFilteredSelected()" (change)="toggleSelectAllFiltered()" [disabled]="questionsForActiveSubchapter().length === 0">
                                                </th>
                                                <th scope="col" class="px-6 py-3">{{ t.translate('admin.tableHeaders.question') }}</th>
                                                <th scope="col" class="relative px-6 py-3"><span class="sr-only">{{ t.translate('admin.tableHeaders.actions') }}</span></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            @for (question of questionsForActiveSubchapter(); track question.id) {
                                                <tr class="bg-white dark:bg-slate-800 border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                                    <td class="p-4"><input type="checkbox" class="h-4 w-4 rounded border-gray-300 dark:border-slate-500 text-indigo-600 focus:ring-indigo-500 bg-slate-200 dark:bg-slate-600" [checked]="selectedQuestionIds().has(question.id)" (change)="toggleQuestionSelection(question.id)"></td>
                                                    <td class="px-6 py-4">
                                                        <div class="flex items-center gap-2 mb-2">
                                                          <p class="font-semibold text-slate-800 dark:text-slate-100" [innerHTML]="sanitizer.bypassSecurityTrustHtml(question.text)"></p>
                                                          @if (question.isPublished === false) {
                                                            <span class="px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 rounded">Draft</span>
                                                          }
                                                        </div>
                                                        <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                                            @for (option of question.options; track $index; let j = $index) {
                                                                <div class="flex items-center" [class.text-green-700]="j === question.correctAnswerIndex" [class.dark:text-green-400]="j === question.correctAnswerIndex" [class.font-bold]="j === question.correctAnswerIndex">
                                                                    <span class="me-2">{{ 'ABCD'[j] }}.</span><span>{{ option }}</span>
                                                                </div>
                                                            }
                                                        </div>
                                                    </td>
                                                    <td class="px-6 py-4 text-right">
                                                        <div class="flex justify-end items-center gap-4">
                                                            @if ((activeContentItem()?.item?.language || '') === 'en') {
                                                              <button (click)="duplicateQuestionToArabic(question)" title="Duplicate and Translate to Arabic" class="p-1 px-2 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center gap-1 text-xs">
                                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-3.5 h-3.5"><path fill-rule="evenodd" d="M11.986 3H12a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-.014a2.25 2.25 0 0 1-2.236 2H3.75a1.5 1.5 0 0 1-1.5-1.5v-7A1.5 1.5 0 0 1 3.75 5h.014a2.25 2.25 0 0 1 2.236-2h6ZM10.5 4v-.25c0-.414-.336-.75-.75-.75h-3.5a.75.75 0 0 0-.75.75V4h5Zm-3.25 1.5a.75.75 0 0 0 0 1.5h1.5a.75.75 0 0 0 0-1.5h-1.5ZM3.75 6.5a.5.5 0 0 0-.5.5v7c0 .276.224.5.5.5h6a.5.5 0 0 0 .5-.5v-7a.5.5 0 0 0-.5-.5h-6Z" clip-rule="evenodd" /></svg>
                                                                AR
                                                              </button>
                                                            }
                                                            <button (click)="openModal('edit_question', question)" class="font-medium text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300">{{ t.translate('edit') }}</button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            } @empty {
                                                <tr><td colspan="3" class="text-center py-10"><p class="text-slate-500 dark:text-slate-400">{{ t.translate('admin.noQuestionsFound') }}</p></td></tr>
                                            }
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    }
                }
            } @else {
              <div class="flex flex-col items-center justify-center h-full text-center bg-slate-50 dark:bg-slate-900/40 rounded-lg p-8">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-12 h-12 text-slate-400 mb-4"><path fill-rule="evenodd" d="M11.03 3.97a.75.75 0 0 1 0 1.06l-6.22 6.22H21a.75.75 0 0 1 0 1.5H4.81l6.22 6.22a.75.75 0 1 1-1.06 1.06l-7.5-7.5a.75.75 0 0 1 0-1.06l7.5-7.5a.75.75 0 0 1 1.06 0Z" clip-rule="evenodd" /></svg>
                <h3 class="text-lg font-semibold text-slate-700 dark:text-slate-200">{{ t.translate('admin.contentExplorer.title') }}</h3>
                <p class="text-slate-500 dark:text-slate-400 mt-1">{{ t.translate('admin.contentExplorer.selectPrompt') }}</p>
              </div>
            }
        </div>
      </div>
    }
    
    <!-- User Management Tab -->
    @if (activeTab() === 'user_management') {
      <div class="animate-fade-in">
        @if (selectedUser(); as user) {
           <div class="max-w-4xl mx-auto">
              <div class="flex items-center gap-4 mb-6">
                <button (click)="backToUserList()" class="text-sm font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition">
                  <span>{{ t.isRtl() ? '→' : '←' }}</span> {{ t.translate('back') }}
                </button>
                <div>
                   <h2 class="text-xl font-bold text-indigo-600 dark:text-indigo-400">{{ t.translate('admin.users.userDetails') }}</h2>
                   <p class="text-sm text-slate-500 dark:text-slate-400 font-sans" title="{{ user.id }}">{{ user.email }}</p>
                </div>
              </div>
              
              <div class="border dark:border-slate-700 rounded-lg overflow-hidden mb-8">
                <div class="overflow-y-auto max-h-[40vh]">
                    <table class="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                        <thead class="text-xs text-slate-700 dark:text-slate-300 uppercase bg-slate-100 dark:bg-slate-700 sticky top-0 z-10">
                            <tr>
                                <th scope="col" class="px-6 py-3">{{ t.translate('admin.users.subject') }}</th>
                                <th scope="col" class="px-6 py-3">{{ t.translate('admin.users.topic') }}</th>
                                <th scope="col" class="px-6 py-3 text-center">{{ t.translate('admin.users.score') }}</th>
                                <th scope="col" class="px-6 py-3">{{ t.translate('admin.users.date') }}</th>
                            </tr>
                        </thead>
                        <tbody>
                            @for(quiz of quizzesForSelectedUser(); track quiz.id) {
                              <tr class="bg-white dark:bg-slate-800 border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                <td class="px-6 py-4 font-medium text-slate-800 dark:text-slate-100">{{ quiz.subjectName }}</td>
                                <td class="px-6 py-4">{{ quiz.subchapterName }}</td>
                                <td class="px-6 py-4 text-center font-semibold">{{ quiz.score }}/{{ quiz.total_questions }}</td>
                                <td class="px-6 py-4 text-slate-600 dark:text-slate-400">{{ quiz.created_at | date:'medium' }}</td>
                              </tr>
                            } @empty {
                              <tr><td colspan="4" class="text-center p-8 text-slate-500 dark:text-slate-400">{{ t.translate('admin.users.noQuizHistory') }}</td></tr>
                            }
                        </tbody>
                    </table>
                </div>
              </div>

              <!-- Premium Access Permissions -->
              <div class="mt-8 pt-8 border-t border-slate-200 dark:border-slate-700">
                <div class="flex justify-between items-center mb-2">
                  <h3 class="text-xl font-bold text-slate-800 dark:text-slate-100">{{ t.translate('admin.users.currentAccess') }}</h3>
                  <button (click)="openModal('grant_access')" class="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-md hover:bg-indigo-700 transition-all duration-200 hover:scale-105">+ {{ t.translate('admin.users.grantNewAccess') }}</button>
                </div>
                <p class="text-slate-500 dark:text-slate-400 mt-1 mb-6">{{ t.translate('admin.users.permissionsSubtitle') }}</p>

                @if(grantedSubjectsForUser().length > 0) {
                  <div class="border dark:border-slate-700 rounded-lg overflow-hidden">
                    <table class="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                      <thead class="text-xs text-slate-700 dark:text-slate-300 uppercase bg-slate-100 dark:bg-slate-700">
                        <tr>
                          <th scope="col" class="px-6 py-3">{{ t.translate('admin.users.subject') }}</th>
                          <th scope="col" class="px-6 py-3">{{ t.translate('admin.grade') }}</th>
                          <th scope="col" class="px-6 py-3">{{ t.translate('admin.users.access.statusTitle') }}</th>
                          <th scope="col" class="px-6 py-3 text-right">{{ t.translate('admin.users.access.actions') }}</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (subject of grantedSubjectsForUser(); track subject.id) {
                          <tr class="bg-white dark:bg-slate-800 border-b dark:border-slate-700">
                            <td class="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">
                              {{subject.name}}
                              @if(subject.grade >= 10 && subject.branch) {
                                <span class="ms-1 text-xs font-semibold capitalize" [class.text-sky-600]="subject.branch === 'scientific'" [class.dark:text-sky-400]="subject.branch === 'scientific'" [class.text-amber-600]="subject.branch === 'literary'" [class.dark:text-amber-400]="subject.branch === 'literary'">({{ t.translate('student.' + subject.branch) }})</span>
                              }
                              <span class="ms-1 text-xs text-slate-500">({{getLanguageName(subject.language)}})</span>
                            </td>
                            <td class="px-6 py-4 text-slate-600 dark:text-slate-400">{{subject.grade}}</td>
                            <td class="px-6 py-4">
                              @if (subject.daysLeft > 0) {
                                <span class="font-medium text-green-600 dark:text-green-400">{{ t.translate('admin.users.access.expiresIn', { days: subject.daysLeft }) }}</span>
                              } @else {
                                <span class="font-medium text-red-500 dark:text-red-400">{{ t.translate('admin.users.access.expired') }}</span>
                              }
                            </td>
                            <td class="px-6 py-4 text-right">
                                @if (subject.daysLeft > 0) {
                                  @if (extendingSubjectId() === subject.id) {
                                      <div class="flex items-center justify-end gap-2">
                                          <input type="number" min="1" #extendDaysInput value="30" class="w-20 p-1 text-sm border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 shadow-sm focus:ring-indigo-500 focus:border-indigo-500">
                                          <button (click)="extendAccess(subject.id, extendDaysInput.value)" [disabled]="isSavingPermissions()" class="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline disabled:text-slate-400 disabled:no-underline">{{ t.translate('save') }}</button>
                                          <button (click)="toggleExtendMode(null)" class="text-sm font-semibold text-slate-500 hover:underline">{{ t.translate('cancel') }}</button>
                                      </div>
                                  } @else {
                                      <div class="flex items-center justify-end gap-4">
                                          <button (click)="toggleExtendMode(subject.id)" class="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">{{ t.translate('admin.users.access.extend') }}</button>
                                          <button (click)="deactivateAccess(subject.id)" [disabled]="isSavingPermissions()" class="text-sm font-semibold text-amber-600 dark:text-amber-400 hover:underline">{{ t.translate('admin.users.access.deactivate') }}</button>
                                      </div>
                                  }
                                } @else {
                                  <div class="flex items-center justify-end gap-4">
                                      <button (click)="reactivateAccess(subject.id)" [disabled]="isSavingPermissions()" class="text-sm font-semibold text-green-600 dark:text-green-400 hover:underline">{{ t.translate('admin.users.access.reactivate') }}</button>
                                      <button (click)="revokeAccess([subject.id])" [disabled]="isRevokingPermissions()" class="text-sm font-semibold text-red-600 dark:text-red-400 hover:underline">{{ t.translate('admin.users.access.remove') }}</button>
                                  </div>
                                }
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                } @else {
                  <div class="text-center py-10 px-6 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                    <p class="text-sm text-slate-500 dark:text-slate-400">{{ t.translate('admin.users.access.noAccess') }}</p>
                  </div>
                }
              </div>

           </div>
        } @else {
          <div>
              <h2 class="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{{ t.translate('admin.users.title') }}</h2>
              <p class="text-slate-500 dark:text-slate-400 mt-1 mb-6">{{ t.translate('admin.users.subtitle') }}</p>
              
              <div class="mb-4">
                  <input [formControl]="userSearchControl" type="text" [placeholder]="t.translate('admin.users.searchPlaceholder')" class="w-full max-w-sm p-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 shadow-sm focus:ring-indigo-500 focus:border-indigo-500">
              </div>

              @if (isLoadingUsers()) {
                 <p class="text-slate-500 dark:text-slate-400 text-center py-10">{{ t.translate('admin.generating') }}</p>
              } @else if (filteredAndSortedUsers().length > 0) {
                <div class="border dark:border-slate-700 rounded-lg overflow-hidden">
                    <div class="overflow-y-auto max-h-[55vh]">
                        <table class="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                            <thead class="text-xs text-slate-700 dark:text-slate-300 uppercase bg-slate-100 dark:bg-slate-700 sticky top-0 z-10">
                                <tr>
                                    <th scope="col" class="px-6 py-3">
                                        <button (click)="setSort('email')" class="flex items-center gap-1 group">
                                            <span>{{ t.translate('admin.users.email') }}</span>
                                            <span class="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200">
                                                @if(sortColumn() === 'email'){
                                                    @if(sortDirection() === 'asc'){ <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M8 14a.75.75 0 0 1 -.75-.75V3.112l-2.22 2.22a.75.75 0 0 1-1.06-1.06l3.5-3.5a.75.75 0 0 1 1.06 0l3.5 3.5a.75.75 0 0 1-1.06 1.06L8.75 3.112V13.25A.75.75 0 0 1 8 14Z" clip-rule="evenodd" /></svg> }
                                                    @else { <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M8 2a.75.75 0 0 1 .75.75v10.138l2.22-2.22a.75.75 0 1 1 1.06 1.06l-3.5 3.5a.75.75 0 0 1-1.06 0l-3.5-3.5a.75.75 0 1 1 1.06-1.06l2.22 2.22V2.75A.75.75 0 0 1 8 2Z" clip-rule="evenodd" /></svg> }
                                                } @else { <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4 opacity-30 group-hover:opacity-100"><path fill-rule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06ZM8 3.5a.75.75 0 0 1 .75.75v2.5a.75.75 0 0 1-1.5 0v-2.5A.75.75 0 0 1 8 3.5Z" clip-rule="evenodd" /></svg> }
                                            </span>
                                        </button>
                                    </th>
                                    <th scope="col" class="px-6 py-3 text-center">
                                        <button (click)="setSort('totalQuizzes')" class="flex items-center gap-1 group mx-auto">
                                            <span>{{ t.translate('admin.users.quizzesTaken') }}</span>
                                            <span class="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200">
                                                @if(sortColumn() === 'totalQuizzes'){
                                                    @if(sortDirection() === 'asc'){ <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M8 14a.75.75 0 0 1 -.75-.75V3.112l-2.22 2.22a.75.75 0 0 1-1.06-1.06l3.5-3.5a.75.75 0 0 1 1.06 0l3.5 3.5a.75.75 0 0 1-1.06 1.06L8.75 3.112V13.25A.75.75 0 0 1 8 14Z" clip-rule="evenodd" /></svg> }
                                                    @else { <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M8 2a.75.75 0 0 1 .75.75v10.138l2.22-2.22a.75.75 0 1 1 1.06 1.06l-3.5 3.5a.75.75 0 0 1-1.06 0l-3.5-3.5a.75.75 0 1 1 1.06-1.06l2.22 2.22V2.75A.75.75 0 0 1 8 2Z" clip-rule="evenodd" /></svg> }
                                                } @else { <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4 opacity-30 group-hover:opacity-100"><path fill-rule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06ZM8 3.5a.75.75 0 0 1 .75.75v2.5a.75.75 0 0 1-1.5 0v-2.5A.75.75 0 0 1 8 3.5Z" clip-rule="evenodd" /></svg> }
                                            </span>
                                        </button>
                                    </th>
                                    <th scope="col" class="px-6 py-3 text-center">
                                        <button (click)="setSort('averageScore')" class="flex items-center gap-1 group mx-auto">
                                            <span>{{ t.translate('admin.users.avgScore') }}</span>
                                            <span class="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200">
                                                @if(sortColumn() === 'averageScore'){
                                                    @if(sortDirection() === 'asc'){ <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M8 14a.75.75 0 0 1 -.75-.75V3.112l-2.22 2.22a.75.75 0 0 1-1.06-1.06l3.5-3.5a.75.75 0 0 1 1.06 0l3.5 3.5a.75.75 0 0 1-1.06 1.06L8.75 3.112V13.25A.75.75 0 0 1 8 14Z" clip-rule="evenodd" /></svg> }
                                                    @else { <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M8 2a.75.75 0 0 1 .75.75v10.138l2.22-2.22a.75.75 0 1 1 1.06 1.06l-3.5 3.5a.75.75 0 0 1-1.06 0l-3.5-3.5a.75.75 0 1 1 1.06-1.06l2.22 2.22V2.75A.75.75 0 0 1 8 2Z" clip-rule="evenodd" /></svg> }
                                                } @else { <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4 opacity-30 group-hover:opacity-100"><path fill-rule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06ZM8 3.5a.75.75 0 0 1 .75.75v2.5a.75.75 0 0 1-1.5 0v-2.5A.75.75 0 0 1 8 3.5Z" clip-rule="evenodd" /></svg> }
                                            </span>
                                        </button>
                                    </th>
                                    <th scope="col" class="px-6 py-3">
                                        <button (click)="setSort('lastActivity')" class="flex items-center gap-1 group">
                                            <span>{{ t.translate('admin.users.lastActive') }}</span>
                                            <span class="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200">
                                                @if(sortColumn() === 'lastActivity'){
                                                    @if(sortDirection() === 'asc'){ <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M8 14a.75.75 0 0 1 -.75-.75V3.112l-2.22 2.22a.75.75 0 0 1-1.06-1.06l3.5-3.5a.75.75 0 0 1 1.06 0l3.5 3.5a.75.75 0 0 1-1.06 1.06L8.75 3.112V13.25A.75.75 0 0 1 8 14Z" clip-rule="evenodd" /></svg> }
                                                    @else { <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M8 2a.75.75 0 0 1 .75.75v10.138l2.22-2.22a.75.75 0 1 1 1.06 1.06l-3.5 3.5a.75.75 0 0 1-1.06 0l-3.5-3.5a.75.75 0 1 1 1.06-1.06l2.22 2.22V2.75A.75.75 0 0 1 8 2Z" clip-rule="evenodd" /></svg> }
                                                } @else { <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4 opacity-30 group-hover:opacity-100"><path fill-rule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06ZM8 3.5a.75.75 0 0 1 .75.75v2.5a.75.75 0 0 1-1.5 0v-2.5A.75.75 0 0 1 8 3.5Z" clip-rule="evenodd" /></svg> }
                                            </span>
                                        </button>
                                    </th>
                                    <th scope="col" class="relative px-6 py-3"><span class="sr-only">Actions</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                @for(user of filteredAndSortedUsers(); track user.id) {
                                  <tr class="bg-white dark:bg-slate-800 border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                      <td class="px-6 py-4" [title]="user.id">
                                        <span class="font-sans text-sm"
                                            [class.text-amber-600]="!user.email.includes('@')"
                                            [class.dark:text-amber-400]="!user.email.includes('@')">
                                            {{ user.email }}
                                        </span>
                                        @if (!user.email.includes('@')) {
                                            <span class="block text-xs text-slate-500 dark:text-slate-400 font-mono truncate">{{ user.id }}</span>
                                        }
                                      </td>
                                      <td class="px-6 py-4 text-center font-medium">{{ user.totalQuizzes }}</td>
                                      <td class="px-6 py-4 text-center font-medium">{{ user.averageScore.toFixed(1) }}%</td>
                                      <td class="px-6 py-4">{{ user.lastActivity ? (user.lastActivity | date:'short') : 'N/A' }}</td>
                                      <td class="px-6 py-4 text-right">
                                          <button (click)="viewUserDetails(user)" class="font-medium text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300">
                                              {{ t.translate('details') }}
                                          </button>
                                      </td>
                                  </tr>
                                }
                            </tbody>
                        </table>
                    </div>
                </div>
              } @else {
                  <div class="text-center py-16 px-6 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                      <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ t.translate('admin.users.noUsers') }}</p>
                  </div>
              }
          </div>
        }
      </div>
    }

  </div>
</div>

<!-- Modals -->
@if (confirmModal()) {
  <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 animate-fade-in" (click)="confirmModal.set(null)">
    <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md animate-fade-in-up" (click)="$event.stopPropagation()">
      <div class="p-6">
        <h3 class="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">{{ confirmModal()?.title }}</h3>
        <p class="text-slate-600 dark:text-slate-400">{{ confirmModal()?.message }}</p>
      </div>
      <div class="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-b-2xl flex justify-end gap-3">
        <button (click)="confirmModal.set(null)" class="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 border dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600">{{ t.translate('cancel') }}</button>
        <button (click)="confirmModal()?.onConfirm(); confirmModal.set(null)" class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">{{ t.translate('confirm') }}</button>
      </div>
    </div>
  </div>
}

@if (modalState(); as modal) {
    <!-- AI Generate Questions Modal -->
    @if (modal.type === 'ai_generate_questions') {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in" (click)="closeModal()">
        <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-4xl animate-fade-in-up" (click)="$event.stopPropagation()">
          <header class="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <h2 class="font-semibold text-lg text-slate-800 dark:text-slate-100">{{ t.translate('admin.generateWithAi') }}</h2>
              <button (click)="closeModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg>
              </button>
          </header>

          <div class="p-6">
            @switch (aiQuestionGenState()) {
              @case ('form') {
                <form [formGroup]="aiQuestionGenForm" (ngSubmit)="handleGenerateQuestions()" class="space-y-4">
                  <p class="text-sm text-slate-500 dark:text-slate-400">{{ t.translate('admin.aiInstructions') }}</p>
                  <div>
                    <label for="textContent" class="block text-sm font-medium text-slate-700 dark:text-slate-300">{{ t.translate('admin.pasteTextLabel') }}</label>
                    <textarea id="textContent" formControlName="textContent" rows="10" [placeholder]="t.translate('admin.pasteTextPlaceholder')" class="mt-1 w-full p-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"></textarea>
                  </div>
                  <div>
                    <label for="questionCount" class="block text-sm font-medium text-slate-700 dark:text-slate-300">{{ t.translate('admin.numberOfQuestions') }}</label>
                    <input id="questionCount" formControlName="count" type="number" min="1" class="mt-1 w-24 p-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600">
                  </div>
                  <div class="flex items-center gap-2">
                    <input type="checkbox" id="useCheapModel_questions" formControlName="useCheapModel" class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
                    <label for="useCheapModel_questions" class="text-sm text-slate-600 dark:text-slate-400">
                      {{ t.translate('admin.useCheapModel') }} 
                      <span class="text-[10px] text-slate-400">{{ t.translate('admin.useCheapModelDesc') }}</span>
                    </label>
                  </div>
                   @if(aiQuestionGenError()) { <p class="text-sm text-red-500">{{ aiQuestionGenError() }}</p> }
                  <div class="text-end pt-2">
                    <button type="submit" [disabled]="aiQuestionGenForm.invalid" class="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:bg-slate-400">{{ t.translate('admin.generateBtn') }}</button>
                  </div>
                </form>
              }
              @case ('loading') {
                <div class="flex flex-col min-h-[20rem] animate-pulse space-y-4">
                    <p class="text-center text-slate-600 dark:text-slate-300 mb-4">{{ t.translate('admin.generating') }}</p>
                    @for (i of [1, 2, 3]; track i) {
                      <div class="p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                        <div class="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-4"></div>
                        <div class="space-y-2 pl-4">
                          <div class="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                          <div class="h-3 bg-slate-200 dark:bg-slate-700 rounded w-2/3"></div>
                          <div class="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
                          <div class="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                        </div>
                      </div>
                    }
                </div>
              }
              @case ('review') {
                <div>
                  <div class="flex justify-between items-center mb-4">
                    <h3 class="font-semibold text-slate-700 dark:text-slate-200">{{ t.translate('admin.reviewGenerated') }}</h3>
                    <div class="flex items-center gap-4">
                        <label class="flex items-center gap-2 text-sm">
                            <input type="checkbox" id="publishGeneratedQuestions" [checked]="isGeneratedQuestionsPublished()" (change)="isGeneratedQuestionsPublished.set(!isGeneratedQuestionsPublished())" class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
                            Publish Questions
                        </label>
                        <label class="flex items-center gap-2 text-sm">
                            <input type="checkbox" (change)="toggleAllQuestionsToSave()" [checked]="areAllGeneratedQuestionsSelected()" class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
                            {{ t.translate('admin.selectAll') }}
                        </label>
                        <button (click)="handleSaveGeneratedQuestions()" [disabled]="isModalSaving()" class="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-md hover:bg-indigo-700">{{ t.translate('admin.saveAll') }}</button>
                    </div>
                  </div>
                  <div class="space-y-4 max-h-[60vh] overflow-y-auto p-2 bg-slate-50 dark:bg-slate-900/40 rounded-md">
                    @for (q of generatedQuestions(); track $index; let i = $index) {
                      <div class="p-4 bg-white dark:bg-slate-800 rounded-lg shadow">
                        <div class="flex items-start gap-3">
                          <input type="checkbox" [checked]="questionsToSave()[i]" (change)="toggleQuestionToSave(i)" class="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
                          <div class="flex-1">
                            <div class="font-semibold text-slate-800 dark:text-slate-100" [innerHTML]="sanitizer.bypassSecurityTrustHtml(q.text || '')"></div>
                            <div class="mt-2 space-y-1 text-sm">
                              @for (option of q.options; track $index; let j = $index) {
                                <p [class.font-bold]="j === q.correctAnswerIndex" [class.text-green-700]="j === q.correctAnswerIndex" [class.dark:text-green-400]="j === q.correctAnswerIndex">
                                  {{ 'ABCD'[j] }}. {{ option }}
                                </p>
                              }
                            </div>
                            @if(q.explanation) {
                              <div class="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                                  <div class="text-xs text-slate-500 dark:text-slate-400"><strong class="font-medium">{{ t.translate('student.explanation') }}:</strong> <span [innerHTML]="sanitizer.bypassSecurityTrustHtml(q.explanation)"></span></div>
                              </div>
                            }
                          </div>
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }
            }
          </div>
        </div>
      </div>
    }

    <!-- AI Generate Questions from IMAGE Modal -->
    @if (modal.type === 'ai_generate_image') {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in" (click)="closeModal()">
        <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl animate-fade-in-up" (click)="$event.stopPropagation()">
          <header class="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <h2 class="font-semibold text-lg text-slate-800 dark:text-slate-100">{{ t.translate('admin.imageUploadTitle') }}</h2>
              <button (click)="closeModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg>
              </button>
          </header>
          <div class="p-6">
            @if(aiQuestionGenState() === 'loading') {
              <div class="flex flex-col min-h-[20rem] animate-pulse space-y-4">
                <p class="text-center text-slate-600 dark:text-slate-300 mb-4">{{ t.translate('admin.processingImage') }}</p>
                @for (i of [1, 2, 3]; track i) {
                  <div class="p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <div class="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-4"></div>
                    <div class="space-y-2 pl-4">
                      <div class="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                      <div class="h-3 bg-slate-200 dark:bg-slate-700 rounded w-2/3"></div>
                      <div class="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
                      <div class="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                    </div>
                  </div>
                }
              </div>
            } @else {
              <form [formGroup]="aiImageGenForm" (ngSubmit)="handleGenerateQuestionsFromImage()" class="space-y-4">
                <p class="text-sm text-slate-500 dark:text-slate-400">{{ t.translate('admin.imageUploadDescription') }}</p>
                <div>
                  <label for="imageFiles" class="block text-sm font-medium text-slate-700 dark:text-slate-300">{{ t.translate('admin.imageUploadLabel') }}</label>
                  <input id="imageFiles" type="file" (change)="onImageFileSelected($event)" multiple accept="image/*" class="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"/>
                  @if (aiImageGenForm.get('imageFiles')?.value?.length) {
                    <p class="text-xs text-slate-500 dark:text-slate-400 mt-2">
                      {{ t.translate('admin.filesSelected', { count: aiImageGenForm.get('imageFiles')!.value!.length }) }}
                    </p>
                  }
                </div>
                <div>
                  <label for="imageQuestionCount" class="block text-sm font-medium text-slate-700 dark:text-slate-300">{{ t.translate('admin.numberOfQuestions') }}</label>
                  <input id="imageQuestionCount" formControlName="count" type="number" min="1" class="mt-1 w-24 p-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600">
                </div>
                <div class="flex items-center gap-2">
                  <input type="checkbox" id="useCheapModel_images" formControlName="useCheapModel" class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
                  <label for="useCheapModel_images" class="text-sm text-slate-600 dark:text-slate-400">
                    {{ t.translate('admin.useCheapModel') }} 
                    <span class="text-[10px] text-slate-400">{{ t.translate('admin.useCheapModelDesc') }}</span>
                  </label>
                </div>
                @if(aiQuestionGenError()) { <p class="text-sm text-red-500">{{ aiQuestionGenError() }}</p> }
                <div class="text-end pt-2">
                  <button type="submit" [disabled]="aiImageGenForm.invalid" class="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:bg-slate-400">{{ t.translate('admin.generateBtn') }}</button>
                </div>
              </form>
            }
          </div>
        </div>
      </div>
    }

    <!-- Bulk Generate Chapter Content Modal -->
    @if (modal.type === 'bulk_generate_chapter') {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in" (click)="closeModal()">
        <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl animate-fade-in-up" (click)="$event.stopPropagation()">
          <header class="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <h2 class="font-semibold text-lg text-slate-800 dark:text-slate-100">{{ t.translate('admin.bulkGenerate.title') }}</h2>
              <button (click)="closeModal()" [disabled]="bulkGenerateState() === 'processing'" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition disabled:opacity-50">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg>
              </button>
          </header>
          <div class="p-6">
            @if (bulkGenerateState() === 'idle' || bulkGenerateState() === 'error') {
              <form [formGroup]="bulkGenerateForm" (ngSubmit)="handleBulkGenerate()" class="space-y-4">
                <p class="text-sm text-slate-500 dark:text-slate-400">{{ t.translate('admin.bulkGenerate.description') }}</p>
                
                <div class="flex gap-4 mb-4">
                  <label class="flex items-center gap-2">
                    <input type="radio" formControlName="inputType" value="pdf" class="text-indigo-600 focus:ring-indigo-500">
                    <span class="text-sm text-slate-700 dark:text-slate-300">PDF</span>
                  </label>
                  <label class="flex items-center gap-2">
                    <input type="radio" formControlName="inputType" value="image" class="text-indigo-600 focus:ring-indigo-500">
                    <span class="text-sm text-slate-700 dark:text-slate-300">Images</span>
                  </label>
                  <label class="flex items-center gap-2">
                    <input type="radio" formControlName="inputType" value="text" class="text-indigo-600 focus:ring-indigo-500">
                    <span class="text-sm text-slate-700 dark:text-slate-300">Text</span>
                  </label>
                </div>

                @if (bulkGenerateForm.get('inputType')?.value === 'pdf') {
                  <div class="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border border-indigo-100 dark:border-indigo-800/30">
                    <label for="bulkPdfFile" class="block text-sm font-medium text-slate-700 dark:text-slate-300">{{ t.translate('admin.pdfUploadLabel') }}</label>
                    <input id="bulkPdfFile" type="file" (change)="onBulkPdfFileSelected($event)" accept=".pdf" class="mt-2 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-100 file:text-indigo-700 hover:file:bg-indigo-200"/>
                     @if (bulkGenerateForm.get('pdfFile')?.value) {
                      <p class="text-xs text-slate-500 mt-2 font-medium">{{ t.translate('admin.selectedFile', { name: bulkGenerateForm.get('pdfFile')!.value!.name }) }}</p>
                     }
                  </div>

                  <div class="flex items-center gap-2 mt-4">
                    <input type="checkbox" id="forceOcrBulk" formControlName="forceOcr" class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
                    <label for="forceOcrBulk" class="text-sm text-slate-600 dark:text-slate-400">{{ t.translate('admin.forceOcr') }}</label>
                  </div>
                } @else if (bulkGenerateForm.get('inputType')?.value === 'image') {
                  <div class="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border border-indigo-100 dark:border-indigo-800/30">
                    <label for="bulkImageFile" class="block text-sm font-medium text-slate-700 dark:text-slate-300">Upload Images</label>
                    <input id="bulkImageFile" type="file" (change)="onBulkImageFilesSelected($event)" accept="image/*" multiple class="mt-2 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-100 file:text-indigo-700 hover:file:bg-indigo-200"/>
                     @if (bulkGenerateForm.get('imageFiles')?.value) {
                      <p class="text-xs text-slate-500 mt-2 font-medium">{{ bulkGenerateForm.get('imageFiles')!.value!.length }} images selected</p>
                     }
                  </div>
                } @else if (bulkGenerateForm.get('inputType')?.value === 'text') {
                  <div class="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border border-indigo-100 dark:border-indigo-800/30">
                    <label for="bulkTextContent" class="block text-sm font-medium text-slate-700 dark:text-slate-300">Text Content</label>
                    <textarea id="bulkTextContent" formControlName="textContent" rows="6" class="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200"></textarea>
                  </div>
                }

                <div class="flex items-center gap-6 mt-4 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div class="flex items-center gap-2">
                    <input type="checkbox" id="genGuides_bulk_chapter" formControlName="generateStudyGuides" class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
                    <label for="genGuides_bulk_chapter" class="text-sm font-medium text-slate-700 dark:text-slate-300">{{ t.translate('admin.bulkGenerateSubject.generateStudyGuides') }}</label>
                  </div>
                  <div class="flex items-center gap-2">
                    <input type="checkbox" id="genQuestions_bulk_chapter" formControlName="generateQuestions" class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
                    <label for="genQuestions_bulk_chapter" class="text-sm font-medium text-slate-700 dark:text-slate-300">{{ t.translate('admin.bulkGenerateSubject.generateQuestions') }}</label>
                  </div>
                </div>

                <div class="flex items-center gap-2 mt-4">
                  <input type="checkbox" id="useCheapModel_bulk_chapter" formControlName="useCheapModel" class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
                  <label for="useCheapModel_bulk_chapter" class="text-sm text-slate-600 dark:text-slate-400">
                    {{ t.translate('admin.useCheapModel') }} 
                    <span class="text-[10px] text-slate-400">{{ t.translate('admin.useCheapModelDesc') }}</span>
                  </label>
                </div>

                @if(bulkGenerateError()) { <p class="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">{{ bulkGenerateError() }}</p> }
                
                <div class="text-end pt-4">
                  <button type="submit" [disabled]="!isBulkGenerateFormValid()" class="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:bg-slate-400 transition shadow-sm">{{ t.translate('admin.bulkGenerate.startBtn') }}</button>
                </div>
              </form>
            } @else if (bulkGenerateState() === 'processing' || bulkGenerateState() === 'uploading') {
              <div class="text-center py-8 space-y-6">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                
                @if (bulkGenerateState() === 'uploading') {
                  <div class="space-y-2">
                    <p class="text-lg font-medium text-slate-700 dark:text-slate-200">{{ t.translate('admin.pdf.extracting_start') }}</p>
                    <div class="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 max-w-md mx-auto">
                      <div class="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" [style.width.%]="pdfProcessingProgress()"></div>
                    </div>
                  </div>
                } @else if (bulkGenerateProgress(); as progress) {
                  <div class="space-y-2">
                    <p class="text-lg font-medium text-slate-700 dark:text-slate-200">
                      {{ t.translate('admin.bulkGenerate.processingSubchapter', { current: progress.current, total: progress.total, name: progress.currentSubchapter }) }}
                    </p>
                    <p class="text-sm text-slate-500 dark:text-slate-400">
                      {{ progress.step === 'guide' ? t.translate('admin.bulkGenerate.stepGuide') : t.translate('admin.bulkGenerate.stepQuestions') }}
                    </p>
                    <div class="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 max-w-md mx-auto mt-4">
                      <div class="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" [style.width.%]="(progress.current / progress.total) * 100"></div>
                    </div>
                  </div>
                }
                
                <div class="mt-6 text-left bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg max-h-48 overflow-y-auto font-mono text-xs text-slate-600 dark:text-slate-400 space-y-1">
                  @for (log of bulkGenerateLogs(); track $index) {
                    <div>> {{ log }}</div>
                  }
                </div>
              </div>
            } @else if (bulkGenerateState() === 'complete') {
              <div class="text-center py-8 space-y-4">
                <div class="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-8 h-8">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <h3 class="text-xl font-bold text-slate-800 dark:text-slate-100">{{ t.translate('admin.bulkGenerate.completeTitle') }}</h3>
                <p class="text-slate-600 dark:text-slate-300">{{ t.translate('admin.bulkGenerate.completeDesc') }}</p>
                <div class="pt-4">
                  <button (click)="closeModal()" class="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition">{{ t.translate('close') }}</button>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    }

    <!-- AI Generate Questions from PDF Modal -->
    @if (modal.type === 'ai_generate_pdf') {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in" (click)="closeModal()">
        <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl animate-fade-in-up" (click)="$event.stopPropagation()">
          <header class="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <h2 class="font-semibold text-lg text-slate-800 dark:text-slate-100">{{ t.translate('admin.pdfUploadTitle') }}</h2>
              <button (click)="closeModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg>
              </button>
          </header>
          <div class="p-6">
            @if(aiQuestionGenState() === 'loading') {
              <div class="flex flex-col items-center justify-center min-h-[20rem]">
                <svg class="animate-spin h-8 w-8 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <p class="mt-4 text-slate-600 dark:text-slate-300">{{ pdfProcessingState() || t.translate('admin.processingPdf') }}</p>
                @if (pdfProcessingState()) {
                  <div class="w-full max-w-xs bg-slate-200 dark:bg-slate-600 rounded-full h-2.5 mt-4">
                    <div class="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" [style.width.%]="pdfProcessingProgress()"></div>
                  </div>
                }
              </div>
            } @else {
              <form [formGroup]="aiPdfGenForm" (ngSubmit)="handleGenerateQuestionsFromPdf()" class="space-y-4">
                <p class="text-sm text-slate-500 dark:text-slate-400">{{ t.translate('admin.pdfUploadDescription') }}</p>
                <div>
                  <label for="pdfFile" class="block text-sm font-medium text-slate-700 dark:text-slate-300">{{ t.translate('admin.pdfUploadLabel') }}</label>
                  <input id="pdfFile" type="file" (change)="onPdfFileSelectedForQuestions($event)" accept=".pdf" class="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"/>
                   @if (aiPdfGenForm.get('pdfFile')?.value) {
                    <p class="text-xs text-slate-500 mt-1">{{ t.translate('admin.selectedFile', { name: aiPdfGenForm.get('pdfFile')!.value!.name }) }}</p>
                  }
                </div>
                <div>
                  <label for="pdfQuestionCount" class="block text-sm font-medium text-slate-700 dark:text-slate-300">{{ t.translate('admin.numberOfQuestions') }}</label>
                  <input id="pdfQuestionCount" formControlName="count" type="number" min="1" class="mt-1 w-24 p-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600">
                </div>
                <div class="flex items-center gap-2">
                  <input type="checkbox" id="forceOcrPdf" formControlName="forceOcr" class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
                  <label for="forceOcrPdf" class="text-sm text-slate-600 dark:text-slate-400">{{ t.translate('admin.forceOcr') }}</label>
                </div>
                <div class="flex items-center gap-2">
                  <input type="checkbox" id="useCheapModel_pdf_questions" formControlName="useCheapModel" class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
                  <label for="useCheapModel_pdf_questions" class="text-sm text-slate-600 dark:text-slate-400">
                    {{ t.translate('admin.useCheapModel') }} 
                    <span class="text-[10px] text-slate-400">{{ t.translate('admin.useCheapModelDesc') }}</span>
                  </label>
                </div>
                @if(aiQuestionGenError()) { <p class="text-sm text-red-500">{{ aiQuestionGenError() }}</p> }
                <div class="text-end pt-2">
                  <button type="submit" [disabled]="aiPdfGenForm.invalid" class="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:bg-slate-400">{{ t.translate('admin.generateBtn') }}</button>
                </div>
              </form>
            }
          </div>
        </div>
      </div>
    }

    <!-- AI Curriculum Builder Modal -->
    @if (modal.type === 'ai_curriculum_builder') {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in" (click)="closeModal()">
          <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl animate-fade-in-up" (click)="$event.stopPropagation()">
            <header class="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <h2 class="font-semibold text-lg text-slate-800 dark:text-slate-100">{{ t.translate('admin.aiCurriculumBuilder.modalTitle') }}</h2>
                <button (click)="closeModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg>
                </button>
            </header>
            <div class="p-6">
                @if (aiBuilderState() === 'form') {
                    <form [formGroup]="aiBuilderForm" (ngSubmit)="handleGenerateCurriculum()" class="space-y-4">
                        <h3 class="font-semibold text-slate-700 dark:text-slate-200">{{ t.translate('admin.aiCurriculumBuilder.step1') }}</h3>
                        <p class="text-sm text-slate-500 dark:text-slate-400">{{ t.translate('admin.aiCurriculumBuilder.description') }}</p>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">{{ t.translate('admin.selectGrade') }}</label>
                                <select formControlName="grade" class="mt-1 w-full p-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600">
                                    <option [ngValue]="null" disabled>{{ t.translate('admin.selectGrade') }}</option> 
                                    @for(g of [1,2,3,4,5,6,7,8,9,10,11,12]; track g){
                                        <option [ngValue]="g">{{g}}</option>
                                    }
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">{{ t.translate('admin.selectLanguage') }}</label>
                                <select formControlName="language" class="mt-1 w-full p-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"><option value="" disabled>{{ t.translate('admin.selectLanguage') }}</option><option value="en">English</option><option value="ar">العربية</option><option value="ku_sorani">کوردی (سۆرانی)</option><option value="ku_badini">کوردی (بادینی)</option></select>
                            </div>
                        </div>
                        @if (aiBuilderForm.get('grade')?.value && [10,11,12].includes(aiBuilderForm.get('grade')!.value!)) {
                            <div>
                                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    {{ t.translate('admin.selectBranch') }} <span class="text-red-500">*</span>
                                </label>
                                <select formControlName="branch" class="mt-1 w-full p-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600">
                                    <option [ngValue]="null" disabled>{{ t.translate('admin.selectBranch') }}</option>
                                    <option value="scientific">{{ t.translate('student.scientific') }}</option>
                                    <option value="literary">{{ t.translate('student.literary') }}</option>
                                </select>
                            </div>
                        }
                        <div>
                            <label for="subjectDesc" class="block text-sm font-medium text-slate-700 dark:text-slate-300">{{ t.translate('admin.aiCurriculumBuilder.subjectDescription') }}</label>
                            <input id="subjectDesc" formControlName="subjectDescription" [placeholder]="t.translate('admin.aiCurriculumBuilder.subjectDescriptionPlaceholder')" class="mt-1 w-full p-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600">
                        </div>
                        <div class="flex items-center gap-2">
                          <input type="checkbox" id="useCheapModel_curriculum" formControlName="useCheapModel" class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
                          <label for="useCheapModel_curriculum" class="text-sm text-slate-600 dark:text-slate-400">
                            {{ t.translate('admin.useCheapModel') }} 
                            <span class="text-[10px] text-slate-400">{{ t.translate('admin.useCheapModelDesc') }}</span>
                          </label>
                        </div>
                        @if(aiBuilderError()) { <p class="text-sm text-red-500">{{ aiBuilderError() }}</p> }
                        <div class="text-end pt-2">
                            <button type="submit" [disabled]="aiBuilderForm.invalid" class="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:bg-slate-400">{{ t.translate('admin.aiCurriculumBuilder.generateStructure') }}</button>
                        </div>
                    </form>
                }
                <!-- Common States for Both Builder Types -->
                @if (aiBuilderState() === 'loading') {
                    <div class="flex flex-col min-h-[20rem] animate-pulse space-y-4">
                        <p class="text-center text-slate-600 dark:text-slate-300 mb-4">{{ pdfProcessingState() || t.translate('admin.generating') }}</p>
                        @if (pdfProcessingState()) {
                           <div class="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2.5 mt-4">
                              <div class="bg-indigo-600 h-2.5 rounded-full" [style.width.%]="pdfProcessingProgress()"></div>
                           </div>
                        }
                        @for (i of [1, 2, 3]; track i) {
                          <div class="p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                            <div class="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-4"></div>
                            <div class="space-y-2 pl-4">
                              <div class="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
                              <div class="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/5"></div>
                              <div class="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
                            </div>
                          </div>
                        }
                    </div>
                }
                @if (aiBuilderState() === 'saving') {
                     <div class="flex flex-col items-center justify-center min-h-[20rem] animate-pulse">
                        <div class="w-16 h-16 bg-indigo-200 dark:bg-indigo-900/50 rounded-full mb-4"></div>
                        <div class="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
                        <p class="mt-4 text-slate-600 dark:text-slate-300">{{ t.translate('admin.aiCurriculumBuilder.saving') }}</p>
                    </div>
                }
                @if (aiBuilderState() === 'review') {
                    <div>
                        <h3 class="font-semibold text-slate-700 dark:text-slate-200">{{ t.translate('admin.aiCurriculumBuilder.step2') }}</h3>
                        <p class="text-sm text-slate-500 dark:text-slate-400 mb-4">{{ t.translate('admin.aiCurriculumBuilder.reviewDescription') }}</p>
                        @if (generatedCurriculum(); as curriculum) {
                            <div class="space-y-4 max-h-[60vh] overflow-y-auto p-2 bg-slate-50 dark:bg-slate-900/40 rounded-md">
                                <!-- Subject -->
                                <div class="flex items-center gap-2 p-2 bg-white dark:bg-slate-700 rounded-md shadow-sm">
                                    <input [value]="curriculum.subjectName" (input)="updateCurriculumItem('subject', $event)" class="w-full font-bold text-lg text-indigo-600 dark:text-indigo-300 bg-transparent border-none focus:ring-0">
                                </div>
                                <!-- Chapters -->
                                <div class="space-y-3 ps-4">
                                    @for (chapter of curriculum.chapters; track $index; let i = $index) {
                                        <div class="p-2 border-l-2 border-slate-300 dark:border-slate-600">
                                            <div class="flex items-center gap-2">
                                                <input [value]="chapter.name" (input)="updateCurriculumItem('chapter', $event, i)" class="w-full font-semibold text-slate-800 dark:text-slate-100 bg-transparent border-none focus:ring-0">
                                                <button (click)="deleteCurriculumItem('chapter', i)" [title]="t.translate('admin.aiCurriculumBuilder.deleteItem')" class="text-slate-400 hover:text-red-500"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM4.569 13.5 4.25 5.5h7.5l-.319 8H4.57Z" clip-rule="evenodd" /></svg></button>
                                            </div>
                                            <!-- Subchapters -->
                                            <div class="space-y-1 ps-6 mt-2">
                                                @for (subchapter of chapter.subchapters; track $index; let j = $index) {
                                                    <div class="flex items-center gap-2">
                                                        <input [value]="subchapter.name" (input)="updateCurriculumItem('subchapter', $event, i, j)" class="w-full text-slate-700 dark:text-slate-300 bg-transparent border-none focus:ring-0">
                                                        <button (click)="deleteCurriculumItem('subchapter', i, j)" [title]="t.translate('admin.aiCurriculumBuilder.deleteItem')" class="text-slate-400 hover:text-red-500"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM4.569 13.5 4.25 5.5h7.5l-.319 8H4.57Z" clip-rule="evenodd" /></svg></button>
                                                    </div>
                                                }
                                            </div>
                                        </div>
                                    }
                                </div>
                            </div>
                            @if(aiBuilderError()) { <p class="text-sm text-red-500 mt-4">{{ aiBuilderError() }}</p> }
                            <div class="text-end pt-4">
                                <button (click)="saveGeneratedCurriculum()" class="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700">{{ t.translate('admin.aiCurriculumBuilder.saveToCurriculum') }}</button>
                            </div>
                        }
                    </div>
                }
            </div>
          </div>
        </div>
    }

    <!-- Builder by PDF -->
    @if (modal.type === 'ai_import_curriculum_pdf') {
       <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in" (click)="closeModal()">
          <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl animate-fade-in-up" (click)="$event.stopPropagation()">
            <header class="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <h2 class="font-semibold text-lg text-slate-800 dark:text-slate-100">{{ t.translate('admin.aiCurriculumBuilder.importModalTitle') }}</h2>
                <button (click)="closeModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg>
                </button>
            </header>
            <div class="p-6">
                 @if (aiBuilderState() === 'form') {
                    <form [formGroup]="aiPdfBuilderForm" (ngSubmit)="handleGenerateCurriculumFromPdf()" class="space-y-4">
                        <p class="text-sm text-slate-500 dark:text-slate-400">{{ t.translate('admin.aiCurriculumBuilder.importDescription') }}</p>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">{{ t.translate('admin.selectGrade') }}</label>
                                <select formControlName="grade" class="mt-1 w-full p-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600">
                                    <option [ngValue]="null" disabled>{{ t.translate('admin.selectGrade') }}</option> 
                                    @for(g of [1,2,3,4,5,6,7,8,9,10,11,12]; track g){
                                        <option [ngValue]="g">{{g}}</option>
                                    }
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">{{ t.translate('admin.selectLanguage') }}</label>
                                <select formControlName="language" class="mt-1 w-full p-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"><option value="" disabled>{{ t.translate('admin.selectLanguage') }}</option><option value="en">English</option><option value="ar">العربية</option><option value="ku_sorani">کوردی (سۆرانی)</option><option value="ku_badini">کوردی (بادینی)</option></select>
                            </div>
                        </div>
                         @if (aiPdfBuilderForm.get('grade')?.value && [10,11,12].includes(aiPdfBuilderForm.get('grade')!.value!)) {
                            <div>
                                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    {{ t.translate('admin.selectBranch') }} <span class="text-red-500">*</span>
                                </label>
                                <select formControlName="branch" class="mt-1 w-full p-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600">
                                    <option [ngValue]="null" disabled>{{ t.translate('admin.selectBranch') }}</option>
                                    <option value="scientific">{{ t.translate('student.scientific') }}</option>
                                    <option value="literary">{{ t.translate('student.literary') }}</option>
                                </select>
                            </div>
                        }
                        <div>
                            <label for="pdfFile" class="block text-sm font-medium text-slate-700 dark:text-slate-300">{{ t.translate('admin.pdfUploadLabel') }}</label>
                            <input id="pdfFile" type="file" (change)="onPdfFileSelected($event)" accept=".pdf" class="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"/>
                             @if (aiPdfBuilderForm.get('pdfFile')?.value) {
                               <p class="text-xs text-slate-500 mt-1">{{ t.translate('admin.selectedFile', { name: aiPdfBuilderForm.get('pdfFile')!.value!.name }) }}</p>
                            }
                        </div>
                        <div class="flex items-center gap-2">
                          <input type="checkbox" id="forceOcrBuilder" formControlName="forceOcr" class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
                          <label for="forceOcrBuilder" class="text-sm text-slate-600 dark:text-slate-400">{{ t.translate('admin.forceOcr') }}</label>
                        </div>
                        <div class="flex items-center gap-2">
                          <input type="checkbox" id="useCheapModel_curriculum_pdf" formControlName="useCheapModel" class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
                          <label for="useCheapModel_curriculum_pdf" class="text-sm text-slate-600 dark:text-slate-400">
                            {{ t.translate('admin.useCheapModel') }} 
                            <span class="text-[10px] text-slate-400">{{ t.translate('admin.useCheapModelDesc') }}</span>
                          </label>
                        </div>
                        @if(aiBuilderError()) { <p class="text-sm text-red-500">{{ aiBuilderError() }}</p> }
                        <div class="text-end pt-2">
                            <button type="submit" [disabled]="aiPdfBuilderForm.invalid" class="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:bg-slate-400">{{ t.translate('admin.aiCurriculumBuilder.generateStructure') }}</button>
                        </div>
                    </form>
                }
            </div>
          </div>
       </div>
    }

    <!-- AI Generate Study Guide Modal -->
    @if (modal.type === 'ai_generate_study_guide' || modal.type === 'ai_generate_study_guide_pdf') {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in" (click)="closeModal()">
        <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-4xl h-[90vh] flex flex-col animate-fade-in-up" (click)="$event.stopPropagation()">
          <header class="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <h2 class="font-semibold text-lg text-slate-800 dark:text-slate-100">{{ t.translate('admin.generateStudyGuide') }}</h2>
              <button (click)="closeModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg>
              </button>
          </header>

          <div class="flex-grow overflow-y-auto">
            @switch (aiStudyGuideGenState()) {
              @case ('form') {
                @if (modal.type === 'ai_generate_study_guide') {
                  <form [formGroup]="aiStudyGuideGenForm" (ngSubmit)="handleGenerateStudyGuide(modal.data)" class="p-6 space-y-4">
                    <h3 class="font-semibold text-slate-700 dark:text-slate-200">{{ t.translate('admin.studyGuideContextTitle') }}</h3>
                    <p class="text-sm text-slate-500 dark:text-slate-400">{{ t.translate('admin.studyGuideContextDescription') }}</p>
                    <textarea formControlName="context" rows="15" class="mt-1 w-full p-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 font-mono text-sm"></textarea>
                    <div class="flex flex-col gap-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div class="flex items-center gap-2">
                        <input type="checkbox" id="generateImages_study_guide" formControlName="generateImages" class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
                        <label for="generateImages_study_guide" class="text-sm font-medium text-slate-700 dark:text-slate-300">
                          {{ t.translate('admin.generateImages') }}
                          <span class="text-xs text-slate-400 block font-normal">{{ t.translate('admin.generateImagesDesc') }}</span>
                        </label>
                      </div>
                      <div class="flex items-center gap-2 mt-1 pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                        <input type="checkbox" id="useCheapModel_study_guide" formControlName="useCheapModel" class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
                        <label for="useCheapModel_study_guide" class="text-sm text-slate-600 dark:text-slate-400">
                          {{ t.translate('admin.useCheapModel') }} 
                          <span class="text-[10px] text-slate-400">{{ t.translate('admin.useCheapModelDesc') }}</span>
                        </label>
                      </div>
                    </div>
                    @if(aiStudyGuideGenError()) { <p class="text-sm text-red-500">{{ aiStudyGuideGenError() }}</p> }
                    <div class="text-end pt-2">
                      <button type="submit" [disabled]="aiStudyGuideGenForm.invalid" class="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:bg-slate-400">{{ t.translate('admin.generateStudyGuide') }}</button>
                    </div>
                  </form>
                } @else if (modal.type === 'ai_generate_study_guide_pdf') {
                  <form [formGroup]="aiPdfStudyGuideGenForm" (ngSubmit)="handleGenerateStudyGuideFromPdf()" class="p-6 space-y-4">
                    <h3 class="font-semibold text-slate-700 dark:text-slate-200">{{ t.translate('admin.studyGuidePdfTitle') }}</h3>
                    <p class="text-sm text-slate-500 dark:text-slate-400">{{ t.translate('admin.studyGuidePdfDescription') }}</p>
                    
                    <div class="p-8 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-center">
                      <input type="file" id="studyGuidePdf" (change)="onStudyGuidePdfSelected($event)" accept=".pdf" class="hidden">
                      <label for="studyGuidePdf" class="cursor-pointer flex flex-col items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-12 h-12 text-slate-400 mb-2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                        </svg>
                        <span class="text-indigo-600 font-semibold">{{ t.translate('admin.clickToUploadPdf') }}</span>
                        <span class="text-xs text-slate-500 mt-1">{{ aiPdfStudyGuideGenForm.get('pdfFile')?.value?.name || t.translate('admin.noFileSelected') }}</span>
                      </label>
                    </div>

                    <div class="flex items-center gap-2">
                      <input type="checkbox" id="forceOcrStudyGuide" formControlName="forceOcr" class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
                      <label for="forceOcrStudyGuide" class="text-sm text-slate-600 dark:text-slate-400">{{ t.translate('admin.forceOcr') }}</label>
                    </div>

                    <div class="flex flex-col gap-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div class="flex items-center gap-2">
                        <input type="checkbox" id="generateImages_study_guide_pdf" formControlName="generateImages" class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
                        <label for="generateImages_study_guide_pdf" class="text-sm font-medium text-slate-700 dark:text-slate-300">
                          {{ t.translate('admin.generateImages') }}
                          <span class="text-xs text-slate-400 block font-normal">{{ t.translate('admin.generateImagesDesc') }}</span>
                        </label>
                      </div>
                      <div class="flex items-center gap-2 mt-1 pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                        <input type="checkbox" id="useCheapModel_study_guide_pdf" formControlName="useCheapModel" class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
                        <label for="useCheapModel_study_guide_pdf" class="text-sm text-slate-600 dark:text-slate-400">
                          {{ t.translate('admin.useCheapModel') }} 
                          <span class="text-[10px] text-slate-400">{{ t.translate('admin.useCheapModelDesc') }}</span>
                        </label>
                      </div>
                    </div>
                    @if(aiStudyGuideGenError()) { <p class="text-sm text-red-500">{{ aiStudyGuideGenError() }}</p> }
                    <div class="text-end pt-2">
                      <button type="submit" [disabled]="aiPdfStudyGuideGenForm.invalid" class="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:bg-slate-400">{{ t.translate('admin.generateStudyGuide') }}</button>
                    </div>
                  </form>
                }
              }
              @case ('loading') {
                <div class="flex flex-col items-center justify-center h-full p-12">
                    <div class="relative w-24 h-24 mb-6">
                      <svg class="animate-spin w-full h-full text-indigo-500" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      @if (pdfProcessingProgress() > 0) {
                        <div class="absolute inset-0 flex items-center justify-center text-xs font-bold text-indigo-600">
                          {{ pdfProcessingProgress() }}%
                        </div>
                      }
                    </div>
                    <p class="text-lg font-medium text-slate-700 dark:text-slate-200">{{ aiLoadingMessage() || pdfProcessingState() || t.translate('admin.generating') }}</p>
                    @if (pdfProcessingState()) {
                      <p class="text-sm text-slate-500 dark:text-slate-400 mt-2">
                        {{ pdfProcessingState() }}
                      </p>
                    }
                </div>
              }
              @case ('review') {
                <div class="p-6">
                  <h3 class="font-semibold text-slate-700 dark:text-slate-200 mb-4">{{ t.translate('admin.reviewStudyGuide') }}</h3>
                  <div class="bg-white dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div class="flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 px-4 py-2">
                      <div class="flex gap-2">
                        <button (click)="studyGuideEditMode.set('preview')" [class.bg-white]="studyGuideEditMode() === 'preview'" [class.dark:bg-slate-800]="studyGuideEditMode() === 'preview'" [class.shadow-sm]="studyGuideEditMode() === 'preview'" class="px-3 py-1 text-xs font-medium rounded-md transition">Preview</button>
                        <button (click)="studyGuideEditMode.set('editor')" [class.bg-white]="studyGuideEditMode() === 'editor'" [class.dark:bg-slate-800]="studyGuideEditMode() === 'editor'" [class.shadow-sm]="studyGuideEditMode() === 'editor'" class="px-3 py-1 text-xs font-medium rounded-md transition">HTML Editor</button>
                      </div>
                      <span class="text-[10px] text-slate-400 uppercase tracking-wider font-bold">{{ studyGuideEditMode() === 'preview' ? 'Visual Preview' : 'Source Code' }}</span>
                    </div>
                    
                    @if (studyGuideEditMode() === 'preview') {
                      <div class="h-[400px] overflow-y-auto p-6 prose dark:prose-invert max-w-none" [innerHTML]="safeGeneratedStudyGuide()"></div>
                    } @else {
                      <textarea [ngModel]="generatedStudyGuide()" (ngModelChange)="generatedStudyGuide.set($event)" class="w-full h-[400px] p-4 font-mono text-sm bg-slate-50 dark:bg-slate-900 border-none focus:ring-0 resize-none" placeholder="Study guide HTML content..."></textarea>
                    }
                  </div>
                  <div class="mt-4 flex items-center gap-2">
                    <input type="checkbox" id="publishStudyGuide" [checked]="isStudyGuidePublished()" (change)="isStudyGuidePublished.set(!isStudyGuidePublished())" class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
                    <label for="publishStudyGuide" class="text-sm font-medium text-slate-700 dark:text-slate-300">Publish Study Guide</label>
                  </div>
                  @if(aiStudyGuideGenError()) { <p class="text-sm text-red-500 mt-2">{{ aiStudyGuideGenError() }}</p> }
                  <div class="text-end pt-4 flex justify-between items-center">
                    <button (click)="handleGenerateVisuals()" [disabled]="isGeneratingVisuals() || isModalSaving()" class="px-4 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 disabled:bg-slate-400 flex items-center gap-2 transition">
                      @if (isGeneratingVisuals()) {
                        <svg class="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
                          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {{ t.translate('admin.generating') }}
                      } @else {
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M1 5.25A2.25 2.25 0 0 1 3.25 3h13.5A2.25 2.25 0 0 1 19 5.25v9.5A2.25 2.25 0 0 1 16.75 17H3.25A2.25 2.25 0 0 1 14.75v-9.5Zm1.5 0v9.5c0 .414.336.75.75.75h13.5a.75.75 0 0 0 .75-.75v-9.5a.75.75 0 0 0-.75-.75H3.25a.75.75 0 0 0-.75.75ZM3.5 12.75l3.5-3.5 2.5 2.5 3.5-3.5 3.5 3.5v1.25H3.5v-1.25Zm10.5-4.75a1.25 1.25 0 1 1 2.5 0 1.25 1.25 0 0 1-2.5 0Z" clip-rule="evenodd" /></svg>
                        {{ t.translate('admin.generateVisuals') }}
                      }
                    </button>
                    <button (click)="handleSaveStudyGuide()" [disabled]="isModalSaving() || isGeneratingVisuals()" class="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:bg-slate-400">{{ t.translate('save') }}</button>
                  </div>
                </div>
              }
            }
          </div>
        </div>
      </div>
    }

    <!-- Bulk Generate Subject Modal -->
    @if (modal.type === 'bulk_generate_subject') {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in" (click)="closeModal()">
        <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl animate-fade-in-up" (click)="$event.stopPropagation()">
          <header class="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <h2 class="font-semibold text-lg text-slate-800 dark:text-slate-100">{{ t.translate('admin.bulkGenerateSubject.title') }}</h2>
              <button (click)="closeModal()" [disabled]="bulkGenerateSubjectState() === 'processing'" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition disabled:opacity-50">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg>
              </button>
          </header>
          <div class="p-6">
            @if (bulkGenerateSubjectState() === 'idle' || bulkGenerateSubjectState() === 'error') {
              <form [formGroup]="bulkGenerateSubjectForm" (ngSubmit)="handleBulkGenerateSubject()" class="space-y-4">
                <p class="text-sm text-slate-500 dark:text-slate-400">{{ t.translate('admin.bulkGenerateSubject.description') }}</p>
                
                <div class="flex gap-4 mb-4">
                  <label class="flex items-center gap-2">
                    <input type="radio" formControlName="inputType" value="pdf" class="text-indigo-600 focus:ring-indigo-500">
                    <span class="text-sm text-slate-700 dark:text-slate-300">PDF</span>
                  </label>
                  <label class="flex items-center gap-2">
                    <input type="radio" formControlName="inputType" value="image" class="text-indigo-600 focus:ring-indigo-500">
                    <span class="text-sm text-slate-700 dark:text-slate-300">Images</span>
                  </label>
                  <label class="flex items-center gap-2">
                    <input type="radio" formControlName="inputType" value="text" class="text-indigo-600 focus:ring-indigo-500">
                    <span class="text-sm text-slate-700 dark:text-slate-300">Text</span>
                  </label>
                </div>

                @if (bulkGenerateSubjectForm.get('inputType')?.value === 'pdf') {
                  <div class="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border border-indigo-100 dark:border-indigo-800/30">
                    <label for="bulkSubjectPdfFile" class="block text-sm font-medium text-slate-700 dark:text-slate-300">{{ t.translate('admin.pdfUploadLabel') }}</label>
                    <input id="bulkSubjectPdfFile" type="file" (change)="onBulkSubjectPdfFileSelected($event)" accept=".pdf" class="mt-2 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-100 file:text-indigo-700 hover:file:bg-indigo-200"/>
                     @if (bulkGenerateSubjectForm.get('pdfFile')?.value) {
                      <p class="text-xs text-slate-500 mt-2 font-medium">{{ t.translate('admin.selectedFile', { name: bulkGenerateSubjectForm.get('pdfFile')!.value!.name }) }}</p>
                     }
                  </div>

                  <div class="flex items-center gap-2 mt-4">
                    <input type="checkbox" id="forceOcrBulkSubject" formControlName="forceOcr" class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
                    <label for="forceOcrBulkSubject" class="text-sm text-slate-600 dark:text-slate-400">{{ t.translate('admin.forceOcr') }}</label>
                  </div>
                } @else if (bulkGenerateSubjectForm.get('inputType')?.value === 'image') {
                  <div class="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border border-indigo-100 dark:border-indigo-800/30">
                    <label for="bulkSubjectImageFile" class="block text-sm font-medium text-slate-700 dark:text-slate-300">Upload Images</label>
                    <input id="bulkSubjectImageFile" type="file" (change)="onBulkSubjectImageFilesSelected($event)" accept="image/*" multiple class="mt-2 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-100 file:text-indigo-700 hover:file:bg-indigo-200"/>
                     @if (bulkGenerateSubjectForm.get('imageFiles')?.value) {
                      <p class="text-xs text-slate-500 mt-2 font-medium">{{ bulkGenerateSubjectForm.get('imageFiles')!.value!.length }} images selected</p>
                     }
                  </div>
                } @else if (bulkGenerateSubjectForm.get('inputType')?.value === 'text') {
                  <div class="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border border-indigo-100 dark:border-indigo-800/30">
                    <label for="bulkSubjectTextContent" class="block text-sm font-medium text-slate-700 dark:text-slate-300">Text Content</label>
                    <textarea id="bulkSubjectTextContent" formControlName="textContent" rows="6" class="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200"></textarea>
                  </div>
                }

                <div class="flex items-center gap-6 mt-4 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div class="flex items-center gap-2">
                    <input type="checkbox" id="genGuides_bulk_subject" formControlName="generateStudyGuides" class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
                    <label for="genGuides_bulk_subject" class="text-sm font-medium text-slate-700 dark:text-slate-300">{{ t.translate('admin.bulkGenerateSubject.generateStudyGuides') }}</label>
                  </div>
                  <div class="flex items-center gap-2">
                    <input type="checkbox" id="genQuestions_bulk_subject" formControlName="generateQuestions" class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
                    <label for="genQuestions_bulk_subject" class="text-sm font-medium text-slate-700 dark:text-slate-300">{{ t.translate('admin.bulkGenerateSubject.generateQuestions') }}</label>
                  </div>
                </div>

                @if (modal.data?.language === 'en') {
                  <div class="flex items-center gap-2 mt-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-100 dark:border-emerald-800/30">
                    <input type="checkbox" id="autoSyncToArabic_bulk" formControlName="autoSyncToArabic" class="h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500">
                    <label for="autoSyncToArabic_bulk" class="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                      Automatically translate and sync to Arabic version
                    </label>
                  </div>
                }

                <div class="flex items-center gap-2 mt-4">
                  <input type="checkbox" id="useCheapModel_bulk_subject" formControlName="useCheapModel" class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
                  <label for="useCheapModel_bulk_subject" class="text-sm text-slate-600 dark:text-slate-400">
                    {{ t.translate('admin.useCheapModel') }} 
                    <span class="text-[10px] text-slate-400">{{ t.translate('admin.useCheapModelDesc') }}</span>
                  </label>
                </div>

                @if(bulkGenerateSubjectError()) { <p class="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">{{ bulkGenerateSubjectError() }}</p> }
                
                <div class="text-end pt-4">
                  <button type="submit" [disabled]="!isBulkGenerateSubjectFormValid()" class="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:bg-slate-400 transition shadow-sm">{{ t.translate('admin.bulkGenerate.startBtn') }}</button>
                </div>
              </form>
            } @else if (bulkGenerateSubjectState() === 'processing' || bulkGenerateSubjectState() === 'uploading') {
              <div class="text-center py-8 space-y-6">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                
                @if (bulkGenerateSubjectState() === 'uploading') {
                  <div class="space-y-2">
                    <p class="text-lg font-medium text-slate-700 dark:text-slate-200">{{ t.translate('admin.pdf.extracting_start') }}</p>
                    <div class="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 max-w-md mx-auto">
                      <div class="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" [style.width.%]="pdfProcessingProgress()"></div>
                    </div>
                  </div>
                } @else if (bulkGenerateSubjectProgress(); as progress) {
                  <div class="space-y-2">
                    <p class="text-lg font-medium text-slate-700 dark:text-slate-200">
                      {{ t.translate('admin.bulkGenerateSubject.processingSubchapter', { current: progress.current, total: progress.total, chapter: progress.currentChapter, subchapter: progress.currentSubchapter }) }}
                    </p>
                    <p class="text-sm text-slate-500 dark:text-slate-400">
                      {{ progress.step === 'guide' ? t.translate('admin.bulkGenerate.stepGuide') : t.translate('admin.bulkGenerate.stepQuestions') }}
                    </p>
                  </div>
                }

                <div class="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 text-left h-48 overflow-y-auto font-mono text-xs text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                  @for (log of bulkGenerateSubjectLogs(); track $index) {
                    <div class="mb-1">{{ log }}</div>
                  }
                </div>
              </div>
            } @else if (bulkGenerateSubjectState() === 'complete') {
              <div class="text-center py-8 space-y-4">
                <div class="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-8 h-8">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <h3 class="text-xl font-bold text-slate-800 dark:text-slate-100">{{ t.translate('admin.bulkGenerate.completeTitle') }}</h3>
                <p class="text-slate-600 dark:text-slate-300">{{ t.translate('admin.bulkGenerateSubject.completeDesc') }}</p>
                <div class="pt-4">
                  <button (click)="closeModal()" class="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition">{{ t.translate('close') }}</button>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    }

    <!-- Bulk Generate Subject Guides Modal -->
    @if (modal.type === 'bulk_generate_subject_guides') {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in" (click)="closeModal()">
        <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl animate-fade-in-up" (click)="$event.stopPropagation()">
          <header class="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <h2 class="font-semibold text-lg text-slate-800 dark:text-slate-100">{{ t.translate('admin.bulkGenerateSubjectGuides.title') }}</h2>
              <button (click)="closeModal()" [disabled]="bulkGenerateSubjectGuidesState() === 'processing' || bulkGenerateSubjectGuidesState() === 'uploading'" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition disabled:opacity-50">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg>
              </button>
          </header>
          <div class="p-6">
            @if (bulkGenerateSubjectGuidesState() === 'idle' || bulkGenerateSubjectGuidesState() === 'error') {
              <form [formGroup]="bulkGenerateSubjectGuidesForm" (ngSubmit)="handleBulkGenerateSubjectGuides()" class="space-y-4">
                <p class="text-sm text-slate-500 dark:text-slate-400">{{ t.translate('admin.bulkGenerateSubjectGuides.description') }}</p>
                
                <div class="flex gap-4 mb-4">
                  <label class="flex items-center gap-2">
                    <input type="radio" formControlName="inputType" value="pdf" class="text-indigo-600 focus:ring-indigo-500">
                    <span class="text-sm text-slate-700 dark:text-slate-300">PDF</span>
                  </label>
                  <label class="flex items-center gap-2">
                    <input type="radio" formControlName="inputType" value="image" class="text-indigo-600 focus:ring-indigo-500">
                    <span class="text-sm text-slate-700 dark:text-slate-300">Images</span>
                  </label>
                  <label class="flex items-center gap-2">
                    <input type="radio" formControlName="inputType" value="text" class="text-indigo-600 focus:ring-indigo-500">
                    <span class="text-sm text-slate-700 dark:text-slate-300">Text</span>
                  </label>
                  <label class="flex items-center gap-2">
                    <input type="radio" formControlName="inputType" value="saved" class="text-indigo-600 focus:ring-indigo-500">
                    <span class="text-sm text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4"><path d="M10.75 3a.75.75 0 0 0-1.5 0v2.187L7.03 3.32a.75.75 0 0 0-1.06 0L3.32 5.97a.75.75 0 0 0 0 1.06l2.65 2.65a.75.75 0 0 0 1.06 0l2.22-2.22V10a.75.75 0 0 0 1.5 0V3Z"/><path d="M3 12.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5Z"/></svg>
                      {{ t.translate('admin.bulkGenerateSubjectGuides.useSavedOption') }}
                    </span>
                  </label>
                  <label class="flex items-center gap-2">
                    <input type="radio" formControlName="inputType" value="questions" class="text-indigo-600 focus:ring-indigo-500">
                    <span class="text-sm text-violet-600 dark:text-violet-400 font-bold flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14Zm0-2a.75.75 0 0 0 .75-.75v-.5a.75.75 0 0 0-1.5 0v.5A.75.75 0 0 0 8 13Zm0-3a2.5 2.5 0 0 0 2-3.75.75.75 0 1 0-1.3.75 1 1 0 0 1-.7 1.25.75.75 0 0 0-.2.433V9A.75.75 0 0 0 8 9.75Z"/></svg>
                      {{ t.translate('admin.bulkGenerateSubjectGuides.useQuestionsOption') }}
                    </span>
                  </label>
                </div>

                @if (bulkGenerateSubjectGuidesForm.get('inputType')?.value === 'pdf') {
                  <div class="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border border-indigo-100 dark:border-indigo-800/30">
                    <label for="bulkSubjectGuidesPdfFile" class="block text-sm font-medium text-slate-700 dark:text-slate-300">{{ t.translate('admin.pdfUploadLabel') }}</label>
                    <input id="bulkSubjectGuidesPdfFile" type="file" (change)="onBulkSubjectGuidesPdfFileSelected($event)" accept=".pdf" class="mt-2 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-100 file:text-indigo-700 hover:file:bg-indigo-200"/>
                     @if (bulkGenerateSubjectGuidesForm.get('pdfFile')?.value) {
                      <p class="text-xs text-slate-500 mt-2 font-medium">{{ t.translate('admin.selectedFile', { name: bulkGenerateSubjectGuidesForm.get('pdfFile')!.value!.name }) }}</p>
                     }
                  </div>

                  <div class="flex items-center gap-2 mt-4">
                    <input type="checkbox" id="forceOcrBulkSubjectGuides" formControlName="forceOcr" class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
                    <label for="forceOcrBulkSubjectGuides" class="text-sm text-slate-600 dark:text-slate-400">{{ t.translate('admin.forceOcr') }}</label>
                  </div>
                } @else if (bulkGenerateSubjectGuidesForm.get('inputType')?.value === 'image') {
                  <div class="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border border-indigo-100 dark:border-indigo-800/30">
                    <label for="bulkSubjectGuidesImageFile" class="block text-sm font-medium text-slate-700 dark:text-slate-300">Upload Images</label>
                    <input id="bulkSubjectGuidesImageFile" type="file" (change)="onBulkSubjectGuidesImageFilesSelected($event)" accept="image/*" multiple class="mt-2 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-100 file:text-indigo-700 hover:file:bg-indigo-200"/>
                     @if (bulkGenerateSubjectGuidesForm.get('imageFiles')?.value) {
                      <p class="text-xs text-slate-500 mt-2 font-medium">{{ bulkGenerateSubjectGuidesForm.get('imageFiles')!.value!.length }} images selected</p>
                     }
                  </div>
                } @else if (bulkGenerateSubjectGuidesForm.get('inputType')?.value === 'text') {
                  <div class="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border border-indigo-100 dark:border-indigo-800/30">
                    <label for="bulkSubjectGuidesTextContent" class="block text-sm font-medium text-slate-700 dark:text-slate-300">Text Content</label>
                    <textarea id="bulkSubjectGuidesTextContent" formControlName="textContent" rows="6" class="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200"></textarea>
                  </div>
                } @else if (bulkGenerateSubjectGuidesForm.get('inputType')?.value === 'saved') {
                  <div class="bg-fuchsia-50 dark:bg-fuchsia-950/20 p-5 rounded-xl border border-fuchsia-200/40 dark:border-fuchsia-800/20 text-center space-y-2 animate-fade-in">
                    <div class="w-12 h-12 bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-600 dark:text-fuchsia-400 rounded-full flex items-center justify-center mx-auto mb-1">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 class="text-sm font-semibold text-fuchsia-800 dark:text-fuchsia-300">{{ t.translate('admin.bulkGenerateSubjectGuides.useSavedOption') }}</h3>
                    <p class="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">{{ t.translate('admin.bulkGenerateSubjectGuides.savedDescription') }}</p>
                  </div>
                } @else if (bulkGenerateSubjectGuidesForm.get('inputType')?.value === 'questions') {
                  <div class="bg-violet-50 dark:bg-violet-950/20 p-5 rounded-xl border border-violet-200/40 dark:border-violet-800/20 text-center space-y-2 animate-fade-in">
                    <div class="w-12 h-12 bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 rounded-full flex items-center justify-center mx-auto mb-1">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 class="text-sm font-semibold text-violet-800 dark:text-violet-300">{{ t.translate('admin.bulkGenerateSubjectGuides.useQuestionsOption') }}</h3>
                    <p class="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">{{ t.translate('admin.bulkGenerateSubjectGuides.questionsDescription') }}</p>
                  </div>
                }

                <div class="flex items-center gap-6 mt-4 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div class="flex items-center gap-2">
                    <input type="checkbox" id="genImages_bulk_subject_guides" formControlName="generateImages" class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
                    <label for="genImages_bulk_subject_guides" class="text-sm font-medium text-slate-700 dark:text-slate-300">Generate explanatory images, illustrations and diagrams for studying</label>
                  </div>
                </div>

                <div class="flex items-center gap-2 mt-4">
                  <input type="checkbox" id="useCheapModel_bulk_subject_guides" formControlName="useCheapModel" class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
                  <label for="useCheapModel_bulk_subject_guides" class="text-sm text-slate-600 dark:text-slate-400">
                    {{ t.translate('admin.useCheapModel') }} 
                    <span class="text-[10px] text-slate-400">{{ t.translate('admin.useCheapModelDesc') }}</span>
                  </label>
                </div>

                @if(bulkGenerateSubjectGuidesError()) { <p class="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">{{ bulkGenerateSubjectGuidesError() }}</p> }
                
                <div class="text-end pt-4">
                  <button type="submit" [disabled]="!isBulkGenerateSubjectGuidesFormValid()" class="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:bg-slate-400 transition shadow-sm">{{ t.translate('admin.bulkGenerateSubjectGuides.startBtn') }}</button>
                </div>
              </form>
            } @else if (bulkGenerateSubjectGuidesState() === 'processing' || bulkGenerateSubjectGuidesState() === 'uploading') {
              <div class="text-center py-8 space-y-6">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                
                @if (bulkGenerateSubjectGuidesState() === 'uploading') {
                  <div class="space-y-2">
                    <p class="text-lg font-medium text-slate-700 dark:text-slate-200">{{ t.translate('admin.pdf.extracting_start') }}</p>
                    <div class="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 max-w-md mx-auto">
                      <div class="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" [style.width.%]="pdfProcessingProgress()"></div>
                    </div>
                  </div>
                } @else if (bulkGenerateSubjectGuidesProgress(); as progress) {
                  <div class="space-y-2">
                    <p class="text-lg font-medium text-slate-700 dark:text-slate-200">
                      {{ t.translate('admin.bulkGenerateSubjectGuides.processingSubchapter', { current: progress.current, total: progress.total, chapter: progress.currentChapter, subchapter: progress.currentSubchapter }) }}
                    </p>
                  </div>
                }

                <div class="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 text-left h-48 overflow-y-auto font-mono text-xs text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                  @for (log of bulkGenerateSubjectGuidesLogs(); track $index) {
                    <div class="mb-1">{{ log }}</div>
                  }
                </div>
              </div>
            } @else if (bulkGenerateSubjectGuidesState() === 'complete') {
              <div class="text-center py-8 space-y-4">
                <div class="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-8 h-8">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <h3 class="text-xl font-bold text-slate-800 dark:text-slate-100">{{ t.translate('admin.bulkGenerateSubjectGuides.completeTitle') }}</h3>
                <p class="text-slate-600 dark:text-slate-300">{{ t.translate('admin.bulkGenerateSubjectGuides.completeDesc') }}</p>
                <div class="pt-4">
                  <button (click)="closeModal()" class="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition">{{ t.translate('close') }}</button>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    }

    <!-- Upload PDF Guide Modal -->
    @if (modal.type === 'upload_pdf_guide') {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in" (click)="closeModal()">
        <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg animate-fade-in-up" (click)="$event.stopPropagation()">
          <header class="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <h2 class="font-semibold text-lg text-slate-800 dark:text-slate-100">{{ t.translate('admin.uploadPdfGuide') }}</h2>
              <button (click)="closeModal()" [disabled]="isUploadingPdfGuide()" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition disabled:opacity-50">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg>
              </button>
          </header>
          <div class="p-6">
            @if (isUploadingPdfGuide()) {
              <div class="space-y-4 py-8">
                <div class="flex justify-center">
                  <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
                <p class="text-center text-slate-600 dark:text-slate-300 font-medium">{{ pdfGuideUploadStatus() }}</p>
                <div class="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                  <div class="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" [style.width.%]="pdfGuideUploadProgress()"></div>
                </div>
              </div>
            } @else {
              <form [formGroup]="pdfGuideForm" (ngSubmit)="handlePdfGuideUpload()" class="space-y-4">
                <p class="text-sm text-slate-500 dark:text-slate-400">
                  {{ t.translate('admin.uploadPdfGuideDesc') }}
                </p>
                <div>
                  <label for="pdfGuideFile" class="block text-sm font-medium text-slate-700 dark:text-slate-300">{{ t.translate('admin.selectPdfFile') }}</label>
                  <input id="pdfGuideFile" type="file" (change)="onPdfGuideFileSelected($event)" accept="application/pdf" class="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"/>
                </div>
                <div class="text-end pt-4">
                  <button type="submit" [disabled]="pdfGuideForm.invalid" class="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:bg-slate-400">
                    {{ t.translate('admin.uploadAndProcess') }}
                  </button>
                </div>
              </form>
            }
          </div>
        </div>
      </div>
    }

    <!-- Manage Study Guide Images Modal -->
    @if (modal.type === 'manage_study_guide_images') {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in" (click)="closeModal()">
        <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-fade-in-up" (click)="$event.stopPropagation()">
          <header class="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <h2 class="font-semibold text-lg text-slate-800 dark:text-slate-100">Manage Study Guide Images</h2>
              <button (click)="closeModal()" [disabled]="isUploadingManualImages()" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition disabled:opacity-50">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg>
              </button>
          </header>
          <div class="p-6 overflow-y-auto flex-grow">
            <div class="space-y-6">
              <!-- Existing Images -->
              <div>
                <h3 class="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wider">Existing Images</h3>
                @if (existingPageImages().length === 0) {
                  <p class="text-sm text-slate-500 italic">No images uploaded yet.</p>
                } @else {
                  <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    @for (img of existingPageImages(); track $index) {
                      <div class="relative group aspect-[3/4] bg-slate-100 dark:bg-slate-900 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                        <img [src]="img.url" class="w-full h-full object-cover" referrerpolicy="no-referrer">
                        <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                          <button (click)="deleteExistingImage($index)" class="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition shadow-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM4.569 13.5 4.25 5.5h7.5l-.319 8H4.57Z" clip-rule="evenodd" /></svg>
                          </button>
                        </div>
                        <div class="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 text-white text-[10px] font-bold rounded">Page {{ img.pageNumber }}</div>
                      </div>
                    }
                  </div>
                }
              </div>

              <hr class="border-slate-200 dark:border-slate-700">

              <!-- Upload New Images -->
              <div>
                <h3 class="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wider">Upload New Images</h3>
                <div class="space-y-4">
                  <div class="flex items-center justify-center w-full">
                    <label class="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl cursor-pointer bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-900 transition">
                      <div class="flex flex-col items-center justify-center pt-5 pb-6">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8 text-slate-400 mb-2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        <p class="text-sm text-slate-500 dark:text-slate-400">Click to select images</p>
                      </div>
                      <input type="file" class="hidden" (change)="onManualImagesSelected($event)" accept="image/*" multiple />
                    </label>
                  </div>

                  @if (manualImageFiles().length > 0) {
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      @for (file of manualImageFiles(); track $index) {
                        <div class="relative aspect-square bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center p-2">
                          <span class="text-[10px] text-slate-500 truncate w-full text-center">{{ file.name }}</span>
                          <button (click)="removeManualImage($index)" class="absolute -top-2 -right-2 p-1 bg-red-600 text-white rounded-full shadow-md hover:bg-red-700 transition">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-3 h-3"><path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" /></svg>
                          </button>
                        </div>
                      }
                    </div>
                  }
                </div>
              </div>
            </div>
          </div>
          <footer class="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3 bg-slate-50 dark:bg-slate-900/50 rounded-b-2xl">
            <button (click)="closeModal()" [disabled]="isUploadingManualImages()" class="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 border dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600">Cancel</button>
            <button (click)="handleUploadManualImages()" [disabled]="isUploadingManualImages() || (manualImageFiles().length === 0 && existingPageImages().length === studyGuideForActiveSubchapter()?.page_images?.length)" class="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:bg-slate-400 flex items-center gap-2">
              @if (isUploadingManualImages()) {
                <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Uploading...
              } @else {
                Save Changes
              }
            </button>
          </footer>
        </div>
      </div>
    }
    @if (modal.type === 'view_study_guide' && modal.data) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in" (click)="closeModal()">
        <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-5xl h-[90vh] flex flex-col animate-fade-in-up" (click)="$event.stopPropagation()">
          <header class="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 rounded-t-2xl">
              <h2 class="font-bold text-xl text-indigo-600 dark:text-indigo-400">{{ t.translate('admin.viewStudyGuide') }}</h2>
              <div class="flex items-center gap-4">
                  <button (click)="closeModal()" class="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-6 h-6"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg>
                  </button>
              </div>
          </header>

          <div class="flex-grow overflow-y-auto p-6 space-y-8">
            <!-- Study Guide Content -->
            <section>
                <h3 class="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-5 h-5 text-indigo-500"><path d="M4.75 2.75a.75.75 0 0 0-1.5 0v11.5a.75.75 0 0 0 1.5 0V2.75Z" /><path d="M7.25 5a.75.75 0 0 1 .75-.75h5.5a.75.75 0 0 1 0 1.5h-5.5a.75.75 0 0 1-.75-.75ZM8 8.25a.75.75 0 0 0 0 1.5h2.5a.75.75 0 0 0 0-1.5H8Z" /></svg>
                    {{ t.translate('admin.studyGuideContent') }}
                </h3>
                <div class="prose prose-indigo dark:prose-invert max-w-none p-6 border dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/40 shadow-inner" 
                     [innerHTML]="getSafeHtml(modal.data.content || modal.data.source_text || '')">
                </div>
            </section>

            <!-- Page Images -->
            @if (modal.data.page_images && modal.data.page_images.length > 0) {
                <section>
                    <h3 class="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-5 h-5 text-emerald-500"><path fill-rule="evenodd" d="M1.25 5A2.75 2.75 0 0 1 4 2.25h8A2.75 2.75 0 0 1 14.75 5v6A2.75 2.75 0 0 1 12 13.75H4A2.75 2.75 0 0 1 1.25 11V5Zm2.75-1.25a1.25 1.25 0 0 0-1.25 1.25v6a1.25 1.25 0 0 0 1.25 1.25h8a1.25 1.25 0 0 0 1.25-1.25V5a1.25 1.25 0 0 0-1.25-1.25H4ZM9.5 6.5a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0V7a.5.5 0 0 1 .5-.5Z" clip-rule="evenodd" /><path d="M6.5 7.25a.75.75 0 0 1 1.5 0v1.5a.75.75 0 0 1-1.5 0v-1.5Z" /></svg>
                        {{ t.translate('admin.uploadedPages') }} ({{ modal.data.page_images.length }})
                    </h3>
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        @for (img of modal.data.page_images; track img.url) {
                            <div class="group relative bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden border dark:border-slate-700 shadow-sm hover:shadow-md transition-all">
                                <div class="aspect-[3/4] overflow-hidden bg-white dark:bg-slate-800">
                                    <img [src]="img.url" 
                                         [alt]="'Page ' + img.pageNumber" 
                                         class="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                                         referrerpolicy="no-referrer">
                                </div>
                                <div class="p-3 bg-white dark:bg-slate-800 border-t dark:border-slate-700 flex justify-between items-center">
                                    <span class="text-sm font-bold text-slate-600 dark:text-slate-300">{{ t.translate('admin.page') }} {{ img.pageNumber }}</span>
                                    <a [href]="img.url" target="_blank" class="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 text-xs font-semibold flex items-center gap-1">
                                        {{ t.translate('admin.viewFull') }}
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-3 h-3"><path d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06Z" /></svg>
                                    </a>
                                </div>
                            </div>
                        }
                    </div>
                </section>
            } @else {
                <div class="p-12 text-center bg-slate-50 dark:bg-slate-900/40 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-12 h-12 text-slate-400 mx-auto mb-4"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
                    <p class="text-slate-500 dark:text-slate-400">{{ t.translate('admin.noImagesUploaded') }}</p>
                </div>
            }
          </div>
          
          <footer class="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 rounded-b-2xl flex justify-end">
              <button (click)="closeModal()" class="px-6 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition">
                  {{ t.translate('close') }}
              </button>
          </footer>
        </div>
      </div>
    }

    <!-- Move Questions Modal -->
    @if (modal.type === 'move_questions') {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in" (click)="closeModal()">
        <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg animate-fade-in-up" (click)="$event.stopPropagation()">
          <form [formGroup]="moveQuestionsForm" (ngSubmit)="handleMoveQuestionsSubmit()">
            <header class="p-4 border-b border-slate-200 dark:border-slate-700">
              <h2 class="font-semibold text-lg text-slate-800 dark:text-slate-100">Move Selected Questions</h2>
              <p class="text-xs text-slate-500 mt-1">Moving {{ selectedQuestionIds().size }} questions to a new location.</p>
            </header>
            <div class="p-6 space-y-4">
               <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">Target Grade</label>
                    <select formControlName="grade" class="mt-1 w-full p-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600">
                        <option [ngValue]="null" disabled>Select Grade</option>
                        @for(g of [1,2,3,4,5,6,7,8,9,10,11,12]; track g){ <option [ngValue]="g">{{g}}</option> }
                    </select>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">Target Language</label>
                    <select formControlName="language" class="mt-1 w-full p-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600">
                        <option [ngValue]="null" disabled>Select Language</option>
                        <option value="en">English</option><option value="ar">العربية</option><option value="ku_sorani">کوردی (سۆرانی)</option><option value="ku_badini">کوردی (بادینی)</option>
                    </select>
                  </div>
               </div>

               <div>
                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">Target Subject</label>
                <select formControlName="subject_id" class="mt-1 w-full p-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600">
                    <option [ngValue]="null" disabled>Select Subject</option>
                    @for(s of moveModalSubjects(); track s.id){ <option [ngValue]="s.id">{{s.name}}</option> }
                </select>
               </div>

               <div>
                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">Target Chapter</label>
                <select formControlName="chapter_id" class="mt-1 w-full p-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600">
                    <option [ngValue]="null" disabled>Select Chapter</option>
                    @for(c of moveModalChapters(); track c.id){ <option [ngValue]="c.id">{{c.name}}</option> }
                </select>
               </div>

               <div>
                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">Target Subchapter</label>
                <select formControlName="subchapter_id" class="mt-1 w-full p-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600">
                    <option [ngValue]="null" disabled>Select Subchapter</option>
                    @for(sc of moveModalSubchapters(); track sc.id){ <option [ngValue]="sc.id">{{sc.name}}</option> }
                </select>
               </div>
            </div>
            <footer class="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-b-2xl flex justify-end gap-3">
              <button type="button" (click)="closeModal()" class="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 border dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600">Cancel</button>
              <button type="submit" [disabled]="moveQuestionsForm.invalid || isModalSaving()" class="px-6 py-2 text-sm font-bold text-white bg-amber-600 rounded-md hover:bg-amber-700 disabled:bg-slate-400">
                Move Questions
              </button>
            </footer>
          </form>
        </div>
      </div>
    }

    <!-- Subject Modal -->
    @if (modal.type === 'new_subject' || modal.type === 'edit_subject') {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in" (click)="closeModal()">
        <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg animate-fade-in-up" (click)="$event.stopPropagation()">
          <form [formGroup]="subjectForm" (ngSubmit)="handleSubjectSubmit()">
            <header class="p-4 border-b border-slate-200 dark:border-slate-700">
              <h2 class="font-semibold text-lg text-slate-800 dark:text-slate-100">{{ modal.type === 'new_subject' ? t.translate('admin.addNewSubject') : t.translate('admin.editSubject') }}</h2>
            </header>
            <div class="p-6 space-y-4">
              <div>
                  <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">{{ t.translate('admin.subjectName') }}</label>
                  <input formControlName="name" class="mt-1 w-full p-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600">
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">{{ t.translate('admin.selectGrade') }}</label>
                  <select formControlName="grade" class="mt-1 w-full p-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600">
                    <option [ngValue]="null" disabled>{{ t.translate('admin.selectGrade') }}</option> 
                    @for(g of [1,2,3,4,5,6,7,8,9,10,11,12]; track g){
                      <option [ngValue]="g">{{g}}</option>
                    }
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">{{ t.translate('admin.selectLanguage') }}</label>
                  <select formControlName="language" class="mt-1 w-full p-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"><option value="" disabled>{{ t.translate('admin.selectLanguage') }}</option><option value="en">English</option><option value="ar">العربية</option><option value="ku_sorani">کوردی (سۆرانی)</option><option value="ku_badini">کوردی (بادینی)</option></select>
                </div>
              </div>
               @if (subjectForm.get('grade')?.value && [10,11,12].includes(subjectForm.get('grade')!.value!)) {
                  <div>
                      <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">
                          {{ t.translate('admin.selectBranch') }} <span class="text-red-500">*</span>
                      </label>
                      <select formControlName="branch" class="mt-1 w-full p-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600">
                          <option [ngValue]="null" disabled>{{ t.translate('admin.selectBranch') }}</option>
                          <option value="scientific">{{ t.translate('student.scientific') }}</option>
                          <option value="literary">{{ t.translate('student.literary') }}</option>
                      </select>
                  </div>
              }
            </div>
            <footer class="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-b-2xl flex justify-end gap-3">
              <button type="button" (click)="closeModal()" class="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 border dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600">{{ t.translate('cancel') }}</button>
              <button type="submit" [disabled]="subjectForm.invalid || isModalSaving()" class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-slate-400">{{ t.translate('save') }}</button>
            </footer>
          </form>
        </div>
      </div>
    }

    <!-- Chapter Modal -->
    @if (modal.type === 'new_chapter' || modal.type === 'edit_chapter') {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in" (click)="closeModal()">
        <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg animate-fade-in-up" (click)="$event.stopPropagation()">
          <form [formGroup]="chapterForm" (ngSubmit)="handleChapterSubmit()">
            <header class="p-4 border-b border-slate-200 dark:border-slate-700">
              <h2 class="font-semibold text-lg text-slate-800 dark:text-slate-100">{{ modal.type === 'new_chapter' ? t.translate('admin.addNewChapter') : t.translate('admin.editChapter') }}</h2>
            </header>
            <div class="p-6">
                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">{{ t.translate('admin.chapterName') }}</label>
                <input formControlName="name" class="mt-1 w-full p-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600">
            </div>
            <footer class="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-b-2xl flex justify-end gap-3">
              <button type="button" (click)="closeModal()" class="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 border dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600">{{ t.translate('cancel') }}</button>
              <button type="submit" [disabled]="chapterForm.invalid || isModalSaving()" class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-slate-400">{{ t.translate('save') }}</button>
            </footer>
          </form>
        </div>
      </div>
    }

    <!-- Subchapter Modal -->
    @if (modal.type === 'new_subchapter' || modal.type === 'edit_subchapter') {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in" (click)="closeModal()">
        <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg animate-fade-in-up" (click)="$event.stopPropagation()">
          <form [formGroup]="subchapterForm" (ngSubmit)="handleSubchapterSubmit()">
            <header class="p-4 border-b border-slate-200 dark:border-slate-700">
              <h2 class="font-semibold text-lg text-slate-800 dark:text-slate-100">{{ modal.type === 'new_subchapter' ? t.translate('admin.addNewSubchapter') : t.translate('admin.editSubchapter') }}</h2>
            </header>
            <div class="p-6">
                <div class="mb-4">
                  <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">{{ t.translate('admin.subchapterName') }}</label>
                  <input formControlName="name" class="mt-1 w-full p-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600">
                </div>
                <div class="flex items-center gap-2">
                  <input type="checkbox" id="publishSubchapter" formControlName="isPublished" class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
                  <label for="publishSubchapter" class="text-sm font-medium text-slate-700 dark:text-slate-300">Publish Subchapter</label>
                </div>
            </div>
            <footer class="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-b-2xl flex justify-end gap-3">
              <button type="button" (click)="closeModal()" class="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 border dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600">{{ t.translate('cancel') }}</button>
              <button type="submit" [disabled]="subchapterForm.invalid || isModalSaving()" class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-slate-400">{{ t.translate('save') }}</button>
            </footer>
          </form>
        </div>
      </div>
    }

    <!-- Question Modal -->
    @if (modal.type === 'new_question' || modal.type === 'edit_question') {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in" (click)="closeModal()">
        <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl animate-fade-in-up" (click)="$event.stopPropagation()">
          <form [formGroup]="questionForm" (ngSubmit)="handleQuestionSubmit()">
            <header class="p-4 border-b border-slate-200 dark:border-slate-700">
              <h2 class="font-semibold text-lg text-slate-800 dark:text-slate-100">{{ modal.type === 'new_question' ? t.translate('admin.addNewQuestion') : t.translate('admin.editQuestion') }}</h2>
            </header>
            <div class="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">{{ t.translate('admin.questionText') }}</label>
                <div class="bg-white dark:bg-slate-800 rounded-md mt-1">
                  <quill-editor formControlName="text" [styles]="{height: '150px'}"></quill-editor>
                </div>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4" formArrayName="options">
                @for(option of questionOptions.controls; track $index) {
                  <div>
                    <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">{{ 'Option ' + 'ABCD'[$index] }}</label>
                    <input [formControlName]="$index" class="mt-1 w-full p-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600">
                  </div>
                }
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">{{ t.translate('admin.selectCorrectAnswer') }}</label>
                <div class="mt-2 flex flex-wrap gap-4">
                  @for(option of questionOptions.controls; track $index) {
                    <label class="flex items-center gap-2">
                      <input type="radio" formControlName="correctAnswerIndex" [value]="$index" class="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500">
                      <span>{{ 'ABCD'[$index] }}</span>
                    </label>
                  }
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">Explanation (Optional)</label>
                <div class="bg-white dark:bg-slate-800 rounded-md mt-1">
                  <quill-editor formControlName="explanation" [styles]="{height: '100px'}"></quill-editor>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <input type="checkbox" id="publishQuestion" formControlName="isPublished" class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
                <label for="publishQuestion" class="text-sm font-medium text-slate-700 dark:text-slate-300">Publish Question</label>
              </div>
            </div>
            <footer class="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-b-2xl flex justify-end gap-3">
              <button type="button" (click)="closeModal()" class="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 border dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600">{{ t.translate('cancel') }}</button>
              <button type="submit" [disabled]="questionForm.invalid || isModalSaving()" class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-slate-400">{{ t.translate('save') }}</button>
            </footer>
          </form>
        </div>
      </div>
    }
    
    <!-- Sync Selection Modal -->
    @if (modal.type === 'sync_selection') {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" (click)="closeModal()">
        <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl animate-scale-in border border-slate-200 dark:border-slate-700 overflow-hidden" (click)="$event.stopPropagation()">
          <header class="p-6 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
             <div class="flex justify-between items-center">
               <div>
                 <h2 class="text-xl font-bold text-slate-800 dark:text-slate-100">Select Content to Sync</h2>
                 <p class="text-xs text-slate-500 mt-1">Choose target language and chapters/subchapters to sync from {{ syncSelectionSubject() ? getLanguageName(syncSelectionSubject()!.language) : 'source' }}.</p>
               </div>
               <button (click)="closeModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2">
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-6 h-6"><path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" /></svg>
               </button>
             </div>
          </header>

          <div class="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
            @if (isSyncSelectionLoading()) {
              <div class="flex flex-col items-center justify-center py-12 gap-4">
                <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                <p class="text-sm text-slate-500">Loading curriculum structure...</p>
              </div>
            } @else {
              <!-- Target Branch Selector -->
              <div class="mb-4 p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-950/30">
                <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Target Branch for Sync</label>
                <div class="grid grid-cols-3 gap-2">
                  <button type="button" 
                          (click)="syncTargetBranch.set('scientific')"
                          [class.bg-indigo-600]="syncTargetBranch() === 'scientific'"
                          [class.text-white]="syncTargetBranch() === 'scientific'"
                          [class.border-indigo-600]="syncTargetBranch() === 'scientific'"
                          [class.bg-white]="syncTargetBranch() !== 'scientific'"
                          [class.dark:bg-slate-900]="syncTargetBranch() !== 'scientific'"
                          [class.text-slate-700]="syncTargetBranch() !== 'scientific'"
                          [class.dark:text-slate-300]="syncTargetBranch() !== 'scientific'"
                          class="px-4 py-2 text-xs font-semibold rounded-lg border transition-all text-center cursor-pointer">
                    Scientific
                  </button>
                  <button type="button" 
                          (click)="syncTargetBranch.set('literary')"
                          [class.bg-indigo-600]="syncTargetBranch() === 'literary'"
                          [class.text-white]="syncTargetBranch() === 'literary'"
                          [class.border-indigo-600]="syncTargetBranch() === 'literary'"
                          [class.bg-white]="syncTargetBranch() !== 'literary'"
                          [class.dark:bg-slate-900]="syncTargetBranch() !== 'literary'"
                          [class.text-slate-700]="syncTargetBranch() !== 'literary'"
                          [class.dark:text-slate-300]="syncTargetBranch() !== 'literary'"
                          class="px-4 py-2 text-xs font-semibold rounded-lg border transition-all text-center cursor-pointer">
                    Literary
                  </button>
                  <button type="button" 
                          (click)="syncTargetBranch.set(null)"
                          [class.bg-indigo-600]="syncTargetBranch() === null"
                          [class.text-white]="syncTargetBranch() === null"
                          [class.border-indigo-600]="syncTargetBranch() === null"
                          [class.bg-white]="syncTargetBranch() !== null"
                          [class.dark:bg-slate-900]="syncTargetBranch() !== null"
                          [class.text-slate-700]="syncTargetBranch() !== null"
                          [class.dark:text-slate-300]="syncTargetBranch() !== null"
                          class="px-4 py-2 text-xs font-semibold rounded-lg border transition-all text-center cursor-pointer">
                    No Branch / General
                  </button>
                </div>
              </div>

              <!-- Target Language Selector -->
              <div class="mb-6 p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-950/30">
                <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Target Language for Sync</label>
                <div class="grid grid-cols-3 gap-2">
                  @if (syncSelectionSubject()?.language !== 'ar') {
                    <button type="button" 
                            (click)="syncTargetLanguage.set('ar')"
                            [class.bg-indigo-600]="syncTargetLanguage() === 'ar'"
                            [class.text-white]="syncTargetLanguage() === 'ar'"
                            [class.border-indigo-600]="syncTargetLanguage() === 'ar'"
                            [class.bg-white]="syncTargetLanguage() !== 'ar'"
                            [class.dark:bg-slate-900]="syncTargetLanguage() !== 'ar'"
                            [class.text-slate-700]="syncTargetLanguage() !== 'ar'"
                            [class.dark:text-slate-300]="syncTargetLanguage() !== 'ar'"
                            class="px-4 py-2 text-xs font-semibold rounded-lg border transition-all text-center cursor-pointer">
                      Arabic
                    </button>
                  }
                  @if (syncSelectionSubject()?.language !== 'ku_sorani') {
                    <button type="button" 
                            (click)="syncTargetLanguage.set('ku_sorani')"
                            [class.bg-indigo-600]="syncTargetLanguage() === 'ku_sorani'"
                            [class.text-white]="syncTargetLanguage() === 'ku_sorani'"
                            [class.border-indigo-600]="syncTargetLanguage() === 'ku_sorani'"
                            [class.bg-white]="syncTargetLanguage() !== 'ku_sorani'"
                            [class.dark:bg-slate-900]="syncTargetLanguage() !== 'ku_sorani'"
                            [class.text-slate-700]="syncTargetLanguage() !== 'ku_sorani'"
                            [class.dark:text-slate-300]="syncTargetLanguage() !== 'ku_sorani'"
                            class="px-4 py-2 text-xs font-semibold rounded-lg border transition-all text-center cursor-pointer">
                      Kurdish Sorani
                    </button>
                  }
                  @if (syncSelectionSubject()?.language !== 'ku_badini') {
                    <button type="button" 
                            (click)="syncTargetLanguage.set('ku_badini')"
                            [class.bg-indigo-600]="syncTargetLanguage() === 'ku_badini'"
                            [class.text-white]="syncTargetLanguage() === 'ku_badini'"
                            [class.border-indigo-600]="syncTargetLanguage() === 'ku_badini'"
                            [class.bg-white]="syncTargetLanguage() !== 'ku_badini'"
                            [class.dark:bg-slate-900]="syncTargetLanguage() !== 'ku_badini'"
                            [class.text-slate-700]="syncTargetLanguage() !== 'ku_badini'"
                            [class.dark:text-slate-300]="syncTargetLanguage() !== 'ku_badini'"
                            class="px-4 py-2 text-xs font-semibold rounded-lg border transition-all text-center cursor-pointer">
                      Kurdish Badini
                    </button>
                  }
                  @if (syncSelectionSubject()?.language !== 'en') {
                    <button type="button" 
                            (click)="syncTargetLanguage.set('en')"
                            [class.bg-indigo-600]="syncTargetLanguage() === 'en'"
                            [class.text-white]="syncTargetLanguage() === 'en'"
                            [class.border-indigo-600]="syncTargetLanguage() === 'en'"
                            [class.bg-white]="syncTargetLanguage() !== 'en'"
                            [class.dark:bg-slate-900]="syncTargetLanguage() !== 'en'"
                            [class.text-slate-700]="syncTargetLanguage() !== 'en'"
                            [class.dark:text-slate-300]="syncTargetLanguage() !== 'en'"
                            class="px-4 py-2 text-xs font-semibold rounded-lg border transition-all text-center cursor-pointer">
                      English
                    </button>
                  }
                </div>

                <div class="mt-4 pt-4 border-t border-slate-200/50 dark:border-slate-700/50">
                  <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Translation Mode</label>
                  <div class="grid grid-cols-2 gap-2">
                    <button type="button" 
                            (click)="syncTranslateContent.set(true)"
                            [class.bg-indigo-600]="syncTranslateContent() === true"
                            [class.text-white]="syncTranslateContent() === true"
                            [class.border-indigo-600]="syncTranslateContent() === true"
                            [class.bg-white]="syncTranslateContent() !== true"
                            [class.dark:bg-slate-900]="syncTranslateContent() !== true"
                            [class.text-slate-700]="syncTranslateContent() !== true"
                            [class.dark:text-slate-300]="syncTranslateContent() !== true"
                            class="px-4 py-2 text-xs font-semibold rounded-lg border transition-all text-center cursor-pointer">
                      ✨ AI Translate Content
                    </button>
                    <button type="button" 
                            (click)="syncTranslateContent.set(false)"
                            [class.bg-indigo-600]="syncTranslateContent() === false"
                            [class.text-white]="syncTranslateContent() === false"
                            [class.border-indigo-600]="syncTranslateContent() === false"
                            [class.bg-white]="syncTranslateContent() !== false"
                            [class.dark:bg-slate-900]="syncTranslateContent() !== false"
                            [class.text-slate-700]="syncTranslateContent() !== false"
                            [class.dark:text-slate-300]="syncTranslateContent() !== false"
                            class="px-4 py-2 text-xs font-semibold rounded-lg border transition-all text-center cursor-pointer">
                      📋 Copy Directly (No AI Translation)
                    </button>
                  </div>
                </div>

                @if (syncTranslateContent()) {
                  <p class="text-[10px] text-slate-500 mt-2">All selected English content will be translated using Gemini AI and stored under the chosen language version of the subject.</p>
                } @else {
                  <p class="text-[10px] text-slate-500 mt-2">All selected English content (names, questions, study guides) will be copied directly as-is to the chosen language version without any modification.</p>
                }
              </div>

              <div class="space-y-4">
                <div class="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span class="text-sm font-semibold text-slate-700 dark:text-slate-300">Course Structure</span>
                  <div class="flex gap-4">
                     <button (click)="selectAllSync(true)" class="text-xs font-bold text-indigo-600 hover:underline">Select All</button>
                     <button (click)="selectAllSync(false)" class="text-xs font-bold text-slate-500 hover:underline">Deselect All</button>
                  </div>
                </div>

                @for (chapterData of syncSelectionStructure(); track chapterData.chapter.id) {
                  <div class="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900/40 shadow-sm">
                     <div class="flex items-center p-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                        <input type="checkbox" 
                               [checked]="isChapterFullySelected(chapterData)" 
                               [indeterminate]="isChapterPartiallySelected(chapterData)"
                               (change)="toggleChapterSync(chapterData)"
                               class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mr-3">
                        <span class="font-bold text-sm text-slate-800 dark:text-slate-100">{{ chapterData.chapter.name }}</span>
                     </div>
                     <div class="p-2 space-y-1">
                        @for (subData of chapterData.subchapters; track subData.subchapter.id) {
                          <label class="flex items-center p-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-lg cursor-pointer group transition-colors">
                             <input type="checkbox" 
                                    [(ngModel)]="subData.selected"
                                    class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mr-3">
                             <span class="text-sm text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-100">{{ subData.subchapter.name }}</span>
                          </label>
                        }
                     </div>
                  </div>
                }
              </div>
            }
          </div>

          <footer class="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
             <button (click)="closeModal()" class="px-6 py-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">Cancel</button>
             <button (click)="startSyncFromSelection()" 
                     [disabled]="isSyncSelectionLoading() || !hasAnySyncSelection()"
                     class="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 dark:shadow-none transition-all transform active:scale-95 flex items-center gap-2">
               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M13.836 2.477a.75.75 0 0 1 .75.75v3.182a.75.75 0 0 1-.75.75h-3.182a.75.75 0 0 1 0-1.5h1.37l-.84-.841a4.5 4.5 0 0 0-7.08.932.75.75 0 0 1-1.3-.75 6 6 0 0 1 9.44-1.242l.842.84V3.227a.75.75 0 0 1 .75-.75Zm-.932 9.44a.75.75 0 0 1 0 1.3 6 6 0 0 1-9.44-1.242l-.842-.84v2.085a.75.75 0 0 1-1.5 0v-3.182a.75.75 0 0 1 .75-.75h3.182a.75.75 0 0 1 0 1.5h-1.37l.84.841a4.5 4.5 0 0 0 7.08-.932.75.75 0 0 1 1.3.75Z" clip-rule="evenodd" /></svg>
               Start Sync
             </button>
          </footer>
        </div>
      </div>
    }
  }

  <!-- Proofread Review Modal -->
  @if (showProofreadReview()) {
    <div class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col border border-slate-200 dark:border-slate-700 overflow-hidden animate-scale-in">
        <header class="p-6 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
           <div>
             <h2 class="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
               <span class="bg-amber-100 text-amber-600 p-2 rounded-xl">
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6"><path d="M21.731 2.269a2.625 2.625 0 0 0-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 0 0 0-3.712ZM19.513 8.199l-3.712-3.712-12.15 12.15a5.25 5.25 0 0 0-1.32 2.214l-.8 2.685a.75.75 0 0 0 .933.933l2.685-.8a5.25 5.25 0 0 0 2.214-1.32L19.513 8.199Z" /></svg>
               </span>
               Review AI Corrections
             </h2>
             <p class="text-sm text-slate-500 mt-1 italic">Compare the original questions with AI-suggested improvements.</p>
           </div>
           <div class="flex items-center gap-4">
             <button (click)="toggleAllProofreadSelection()" class="text-sm font-bold text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 px-4 py-2 rounded-lg transition-colors">
              {{ allProofreadsSelected() ? 'Deselect All' : 'Select All Changes' }}
             </button>
             <button (click)="discardProofreads()" class="text-slate-400 hover:text-red-500 p-2 transition-colors">
               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-8 h-8"><path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" /></svg>
             </button>
           </div>
        </header>

        <main class="flex-1 overflow-y-auto p-6 bg-slate-100 dark:bg-slate-900 custom-scrollbar">
          <div class="space-y-8 max-w-5xl mx-auto">
            @for (item of pendingProofreads(); track $index) {
              <div class="group relative bg-white dark:bg-slate-800 rounded-3xl shadow-xl border-2 transition-all duration-300"
                   [class.border-indigo-500]="item.selected"
                   [class.border-transparent]="!item.selected">
                
                <div class="absolute -left-4 top-4 z-10">
                  <input type="checkbox" 
                         [checked]="item.selected" 
                         (change)="toggleProofreadSelection($index)"
                         class="h-8 w-8 rounded-xl border-2 border-slate-300 text-indigo-600 focus:ring-indigo-500 bg-white shadow-lg cursor-pointer">
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x dark:divide-slate-700">
                  <!-- Original -->
                  <div class="p-6 opacity-60 grayscale-[0.5] hover:grayscale-0 transition-all">
                    <div class="flex items-center gap-2 mb-4">
                      <span class="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-500 rounded text-[10px] uppercase font-bold tracking-wider">Before</span>
                      <h4 class="text-xs font-bold text-slate-400 uppercase tracking-tighter">Original Version</h4>
                    </div>
                    <div class="prose prose-sm dark:prose-invert max-w-none text-slate-600 dark:text-slate-400"
                         [innerHTML]="sanitizer.bypassSecurityTrustHtml(item.original.text)"></div>
                    
                    <div class="mt-4 space-y-2">
                      @for (opt of item.original.options; track $index) {
                        <div class="flex items-center gap-2 text-sm" [class.text-emerald-600]="item.original.correctAnswerIndex === $index">
                          <span class="font-bold w-5 opacity-40">{{ 'ABCD'[$index] }}.</span>
                          <span>{{ opt }}</span>
                        </div>
                      }
                    </div>

                    @if (item.original.explanation) {
                      <div class="mt-4 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-xs text-slate-500">
                        <span class="font-bold block mb-1 opacity-50 uppercase">Explanation:</span>
                        <div [innerHTML]="sanitizer.bypassSecurityTrustHtml(item.original.explanation)"></div>
                      </div>
                    }
                  </div>

                  <!-- Corrected -->
                  <div class="p-6 bg-indigo-50/30 dark:bg-indigo-900/10 relative">
                    <div class="flex items-center gap-2 mb-4">
                      <span class="px-2 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 rounded text-[10px] uppercase font-bold tracking-wider">After</span>
                      <h4 class="text-xs font-bold text-indigo-500 uppercase tracking-tighter">AI Improved Version</h4>
                      @if (!hasQuestionChanged(item.original, item.corrected)) {
                        <span class="ml-auto text-[10px] text-slate-400 uppercase font-bold italic">No changes detected</span>
                      }
                    </div>

                    <div class="prose prose-sm dark:prose-invert max-w-none text-slate-800 dark:text-slate-100"
                         [innerHTML]="sanitizer.bypassSecurityTrustHtml(item.corrected.text)"></div>
                    
                    <div class="mt-4 space-y-2">
                      @for (opt of item.corrected.options; track $index) {
                        <div class="flex items-center gap-2 text-sm p-1 rounded transition-colors" 
                             [class.bg-emerald-100/50]="item.corrected.correctAnswerIndex === $index"
                             [class.dark:bg-emerald-900/30]="item.corrected.correctAnswerIndex === $index"
                             [class.text-emerald-700]="item.corrected.correctAnswerIndex === $index"
                             [class.dark:text-emerald-300]="item.corrected.correctAnswerIndex === $index"
                             [class.font-bold]="item.corrected.correctAnswerIndex === $index">
                          <span class="font-bold w-5">{{ 'ABCD'[$index] }}.</span>
                          <span [class.bg-yellow-100]="item.original.options[$index] !== opt"
                                [class.dark:bg-yellow-900/40]="item.original.options[$index] !== opt">{{ opt }}</span>
                        </div>
                      }
                    </div>

                    @if (item.corrected.explanation) {
                      <div class="mt-4 p-3 bg-white dark:bg-slate-800 rounded-xl text-xs border border-indigo-100 dark:border-indigo-900/50">
                        <span class="font-bold block mb-1 text-indigo-400 uppercase">Improved Explanation:</span>
                        <div [innerHTML]="sanitizer.bypassSecurityTrustHtml(item.corrected.explanation)"></div>
                      </div>
                    }
                  </div>
                </div>
              </div>
            }
          </div>
        </main>

        <footer class="p-6 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50/50">
           <div class="text-sm font-medium text-slate-500">
             Total: <span class="text-slate-800 dark:text-slate-100 font-bold">{{ pendingProofreads().length }}</span> | 
             Selected for Update: <span class="text-indigo-600 dark:text-indigo-400 font-bold">{{ selectedProofreadsCount() }}</span>
           </div>
           <div class="flex gap-4">
             <button (click)="discardProofreads()" 
                     class="px-8 py-3 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-2xl transition-all">
               Discard All Improvements
             </button>
             <button (click)="applySelectedProofreads()" 
                     [disabled]="selectedProofreadsCount() === 0"
                     class="px-12 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white rounded-2xl font-bold shadow-xl shadow-indigo-200 dark:shadow-none transition-all transform active:scale-95 disabled:scale-100 disabled:shadow-none">
               Apply & Update Database
              </button>
            </div>
         </footer>
      </div>
    </div>

    <!-- Correct & Reupload Questions Modal -->
    @if (modal.type === 'correct_reupload_questions') {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" (click)="closeModal()">
        <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl animate-scale-in border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[85vh]" (click)="$event.stopPropagation()">
          <header class="p-6 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
             <div class="flex justify-between items-center font-sans tracking-tight">
               <div>
                 <h2 class="text-xl font-bold text-slate-800 dark:text-slate-100 font-sans tracking-tight">Correct & Reupload JSON</h2>
                 <p class="text-xs text-slate-500 mt-1">Upload a corrected questions JSON file for <span class="font-bold text-indigo-600 dark:text-indigo-400 font-sans tracking-tight">{{ modal.data?.name }}</span>.</p>
               </div>
               <button (click)="closeModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2">
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-6 h-6"><path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" /></svg>
               </button>
             </div>
          </header>

          <div class="p-6 overflow-y-auto flex-grow custom-scrollbar space-y-6">
            <div class="p-4 bg-amber-50 dark:bg-amber-950/10 border border-amber-200 dark:border-amber-900/30 rounded-xl text-xs text-amber-800 dark:text-amber-300 space-y-1">
              <span class="font-bold uppercase tracking-wider block mb-1">⚠️ Important Instructions:</span>
              <p>1. Ensure you keep the <code class="font-mono bg-amber-100 dark:bg-amber-900/40 p-0.5 rounded">id</code> field unmodified if you want to overwrite preexisting questions.</p>
              <p>2. Do not change the <code class="font-mono bg-amber-100 dark:bg-amber-900/40 p-0.5 rounded">chapter_id</code> or <code class="font-mono bg-amber-100 dark:bg-amber-900/40 p-0.5 rounded">subchapter_id</code> values unless you explicitly want to move the question to another topic within this subject.</p>
              <p>3. If you want to add a new question, omit the <code class="font-mono bg-amber-100 dark:bg-amber-900/40 p-0.5 rounded">id</code> property entirely, and it will be inserted as a new question.</p>
            </div>

            <!-- Drag and drop zone -->
            <div 
              (dragover)="onDragOverQuestionsFile($event)"
              (dragleave)="onDragLeaveQuestionsFile($event)"
              (drop)="onDropQuestionsFile($event)"
              [class.border-indigo-500]="isDraggingFile()"
              [class.bg-indigo-50/30]="isDraggingFile()"
              [class.dark:bg-indigo-950/5]="isDraggingFile()"
              class="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-8 text-center cursor-pointer transition hover:border-indigo-500 dark:hover:border-indigo-400 flex flex-col items-center justify-center gap-2 select-none"
              (click)="fileInput.click()"
            >
              <input 
                type="file" 
                #fileInput 
                (change)="onUploadQuestionsFile($event)" 
                accept=".json" 
                class="hidden"
              />
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-12 h-12 text-slate-400 dark:text-slate-600 font-sans font-medium tracking-tight text-gray-900">
                <path fill-rule="evenodd" d="M10.5 3.75a6.75 6.75 0 1 0 0 13.5h3 a6.75 6.75 0 1 0 0-13.5h-3Zm3 2.25a.75.75 0 0 1 .75.75v5.03l1.22-1.22a.75.75 0 1 1 1.06 1.06l-2.5 2.5a.75.75 0 0 1-1.06 0l-2.5-2.5a.75.75 0 1 1 1.06-1.06l1.22 1.22V6.75a.75.75 0 0 1 .75-.75Z" clip-rule="evenodd" />
                <path d="M3.75 18a.75.75 0 0 0 0 1.5h16.5a.75.75 0 0 0 0-1.5H3.75Z" />
              </svg>
              <span class="font-bold text-slate-700 dark:text-slate-300 font-sans tracking-tight">Drag & drop your corrected JSON here</span>
              <span class="text-xs text-slate-500">or click to browse from files</span>
            </div>

            <!-- Stats/Preview -->
            @if (uploadStats().total > 0 || uploadStats().errors.length > 0) {
              <div class="space-y-4 animate-fade-in bg-slate-50 dark:bg-slate-900/30 rounded-2xl p-4 border border-slate-200/60 dark:border-slate-700/60 text-sm">
                <h3 class="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest border-b pb-2 border-slate-100 dark:border-slate-800 font-mono">Verification Report</h3>
                
                @if (uploadStats().errors.length > 0) {
                  <div class="space-y-1.5">
                    <span class="text-xs font-bold text-red-500 uppercase font-mono">Errors / Format issues found ({{ uploadStats().errors.length }}):</span>
                    <div class="max-h-40 overflow-y-auto bg-red-50 dark:bg-red-950/10 border border-red-100 dark:border-red-900/30 rounded-xl p-3 space-y-1 custom-scrollbar">
                      @for (error of uploadStats().errors; track $index) {
                        <p class="text-[11px] font-mono text-red-600 dark:text-red-400 font-sans text-xs">{{ error }}</p>
                      }
                    </div>
                  </div>
                } @else {
                  <div class="grid grid-cols-3 gap-4 text-center">
                    <div class="bg-indigo-50/50 dark:bg-indigo-950/10 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
                      <span class="text-2xl font-black text-indigo-600 dark:text-indigo-400 leading-none block mb-1 font-mono">{{ uploadStats().total }}</span>
                      <span class="text-[10px] text-slate-500 font-bold uppercase tracking-tight font-sans">Total Parsed</span>
                    </div>
                    <div class="bg-teal-50/50 dark:bg-teal-950/10 p-3 rounded-xl border border-teal-100 dark:border-teal-900/30">
                      <span class="text-2xl font-black text-teal-600 dark:text-teal-400 leading-none block mb-1 font-mono">{{ uploadStats().updates }}</span>
                      <span class="text-[10px] text-slate-500 font-bold uppercase tracking-tight font-sans">Updates</span>
                    </div>
                    <div class="bg-emerald-50/50 dark:bg-emerald-950/10 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                      <span class="text-2xl font-black text-emerald-600 dark:text-emerald-400 leading-none block mb-1 font-mono">{{ uploadStats().creates }}</span>
                      <span class="text-[10px] text-slate-500 font-bold uppercase tracking-tight font-sans">New Additions</span>
                    </div>
                  </div>
                  
                  <div class="flex items-center gap-2 p-2 bg-emerald-50 dark:bg-emerald-950/10 text-emerald-800 dark:text-emerald-400 rounded-lg text-xs justify-center font-bold">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clip-rule="evenodd" /></svg>
                    <span>All questions mapped and validated successfully! Click save to apply.</span>
                  </div>
                }
              </div>
            }
          </div>

          <footer class="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3 flex-shrink-0">
            <button type="button" (click)="closeModal()" class="px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 border dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-600 transition">Cancel</button>
            <button 
              type="button" 
              (click)="applyUploadedQuestions()" 
              [disabled]="questionsToUpload().length === 0 || uploadStats().errors.length > 0 || isModalSaving()" 
              class="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 dark:disabled:bg-slate-700 rounded-xl transition shadow shadow-indigo-100 dark:shadow-none flex items-center gap-2"
            >
              @if (isModalSaving()) {
                <svg class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Saving Questions...
              } @else {
                Apply Corrections ({{ questionsToUpload().length }})
              }
            </button>
          </footer>
        </div>
      </div>
    }
  }
`,
changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminComponent {
  protected readonly Math = Math;
  quizService = inject(QuizService);
  supabase = inject(SupabaseService);
  t = inject(TranslationService);
  geminiService = inject(GeminiService);
  toastService = inject(ToastService);
  fb = inject(FormBuilder);
  sanitizer = inject(DomSanitizer);

  activeTab = signal<AdminTab>('analytics');
  loadError = signal<string | null>(null);

  // Content Explorer State
  expandedLanguages = signal(new Set<Language>());
  expandedGrades = signal(new Set<number>());
  expandedSubjects = signal(new Set<string>());
  expandedChapters = signal(new Set<string>());
  activeContentItem = signal<{ type: 'subject' | 'chapter' | 'subchapter', item: Subject | Chapter | Subchapter } | null>(null);

  // User Management State
  allManagedUsers = this.quizService.allManagedUsers;
  selectedUserAttempts = signal<QuizAttempt[]>([]);
  isLoadingUsers = signal(true);
  userSearchControl = new FormControl('');
  selectedUser = signal<ManagedUser | null>(null);
  selectedUserPermissions = signal<UserPermissions | null>(null);
  isSavingPermissions = signal(false);
  isRevokingPermissions = signal(false);
  extendingSubjectId = signal<string | null>(null);
  sortColumn = signal<keyof ManagedUser>('lastActivity');
  sortDirection = signal<'asc' | 'desc'>('desc');

  // Question Management State
  selectedQuestionIds = signal(new Set<string>());
  isAutoCategorizing = signal(false);
  isScanningQuestions = signal(false);
  scanningProgress = signal<{ current: number; total: number } | null>(null);
  autoCategorizeProgress = signal<{ current: number; total: number } | null>(null);
  moveSelectedGrade = signal<number | null>(null);
  moveSelectedLanguage = signal<Language | null>(null);
  moveSelectedSubjectId = signal<string | null>(null);
  moveSelectedChapterId = signal<string | null>(null);

  moveModalSubjects = computed(() => {
    const grade = this.moveSelectedGrade();
    const lang = this.moveSelectedLanguage();
    if (!grade || !lang) return [];
    return this.quizService.allSubjects().filter(s => s.grade === grade && s.language === lang);
  });

  moveModalChapters = computed(() => {
    const subjectId = this.moveSelectedSubjectId();
    if (!subjectId) return [];
    return this.quizService.allChapters().filter(c => c.subject_id === subjectId);
  });

  moveModalSubchapters = computed(() => {
    const chapterId = this.moveSelectedChapterId();
    if (!chapterId) return [];
    return this.quizService.allSubchapters().filter(sc => sc.chapter_id === chapterId);
  });

  // AI Curriculum Builder State
  aiBuilderState = signal<'form' | 'loading' | 'review' | 'saving'>('form');
  aiBuilderForm: FormGroup;
  generatedCurriculum = signal<AiGeneratedCurriculum | null>(null);
  aiBuilderError = signal<string | null>(null);
  
  // AI PDF Curriculum Importer State
  aiPdfBuilderForm: FormGroup;
  currentPdfFile = signal<File | null>(null);
  pdfProcessingState = signal<string | null>(null);
  pdfProcessingProgress = signal(0);

  // Manual Image Management State
  isUploadingManualImages = signal(false);
  manualImageFiles = signal<File[]>([]);
  existingPageImages = signal<{ url: string; pageNumber: number }[]>([]);

  // AI Question Generation State
  aiQuestionGenState = signal<'form' | 'loading' | 'review'>('form');
  aiQuestionGenForm: FormGroup;
  aiImageGenForm: FormGroup;
  aiPdfGenForm: FormGroup;
  generatedQuestions = signal<AiGeneratedQuestion[]>([]);
  isGeneratedQuestionsPublished = signal<boolean>(true);
  aiQuestionGenError = signal<string | null>(null);
  questionsToSave = signal<boolean[]>([]);
  isProofreadingQuestions = signal(false);
  proofreadProgress = signal<{ current: number, total: number } | null>(null);
  
  // Pending proofreads for review
  pendingProofreads = signal<{ original: Question, corrected: AiGeneratedQuestion, selected: boolean }[]>([]);
  showProofreadReview = signal(false);

  allProofreadsSelected = computed(() => {
    const items = this.pendingProofreads();
    return items.length > 0 && items.every(p => p.selected);
  });

  selectedProofreadsCount = computed(() => {
    return this.pendingProofreads().filter(p => p.selected).length;
  });

  areAllGeneratedQuestionsSelected = computed(() => {
    const toSave = this.questionsToSave();
    return toSave.length > 0 && toSave.every(v => v);
  });

  // AI Study Guide Generation State
  aiStudyGuideGenState = signal<'form' | 'loading' | 'review'>('form');
  isGeneratingVisuals = signal(false);
  aiStudyGuideGenForm: FormGroup;
  aiPdfStudyGuideGenForm: FormGroup;
  
  // Bulk Generation State
  bulkGenerateForm: FormGroup;
  bulkGenerateState = signal<'idle' | 'uploading' | 'processing' | 'complete' | 'error'>('idle');
  bulkGenerateProgress = signal<{ currentSubchapter: string, step: 'guide' | 'questions', current: number, total: number } | null>(null);
  bulkGenerateLogs = signal<string[]>([]);
  bulkGenerateError = signal<string | null>(null);

  bulkGenerateSubjectForm: FormGroup;
  bulkGenerateSubjectState = signal<'idle' | 'uploading' | 'processing' | 'complete' | 'error'>('idle');
  bulkGenerateSubjectProgress = signal<{ currentChapter: string, currentSubchapter: string, step: 'guide' | 'questions', current: number, total: number } | null>(null);
  bulkGenerateSubjectLogs = signal<string[]>([]);
  bulkGenerateSubjectError = signal<string | null>(null);

  bulkGenerateSubjectGuidesForm: FormGroup;
  bulkGenerateSubjectGuidesState = signal<'idle' | 'uploading' | 'processing' | 'complete' | 'error'>('idle');
  bulkGenerateSubjectGuidesProgress = signal<{ currentChapter: string, currentSubchapter: string, current: number, total: number } | null>(null);
  bulkGenerateSubjectGuidesLogs = signal<string[]>([]);
  bulkGenerateSubjectGuidesError = signal<string | null>(null);

  // Sync English to Arabic state
  isSyncingContent = signal(false);
  syncProgress = signal<{ subject: string, chapter: string, subchapter: string, current: number, total: number } | null>(null);
  syncLogs = signal<string[]>([]);
  
  // Sync Selection State
  syncSelectionSubject = signal<Subject | null>(null);
  syncTargetLanguage = signal<Language>('ar');
  syncTargetBranch = signal<'scientific' | 'literary' | null>(null);
  syncTranslateContent = signal<boolean>(true);
  syncSelectionStructure = signal<{ chapter: Chapter, subchapters: { subchapter: Subchapter, selected: boolean }[] }[]>([]);
  isSyncSelectionLoading = signal(false);
  
  generatedStudyGuide = signal<string | null>(null);
  isStudyGuidePublished = signal<boolean>(true);
  studyGuideEditMode = signal<'editor' | 'preview'>('preview');
  aiStudyGuideGenError = signal<string | null>(null);
  aiLoadingMessage = signal<string | null>(null);

  // PDF Guide Upload State
  pdfGuideForm: FormGroup;
  isUploadingPdfGuide = signal(false);
  pdfGuideUploadProgress = signal(0);
  pdfGuideUploadStatus = signal<string | null>(null);


  // Questions Bulk Reupload State
  questionsToUpload = signal<Partial<Question>[]>([]);
  uploadStats = signal<{ total: number; updates: number; creates: number; errors: string[] }>({
    total: 0,
    updates: 0,
    creates: 0,
    errors: []
  });
  isDraggingFile = signal<boolean>(false);

  // Modal State
  modalState = signal<ModalState | null>(null);
  isModalSaving = signal(false);
  confirmModal = signal<{ title: string; message: string; onConfirm: () => void } | null>(null);

  // CRUD Forms
  subjectForm: FormGroup;
  chapterForm: FormGroup;
  subchapterForm: FormGroup;
  questionForm: FormGroup;
  moveQuestionsForm: FormGroup;

  constructor() {
    this.subjectForm = this.fb.group({
      id: [null],
      name: ['', Validators.required],
      grade: [null as number | null, Validators.required],
      language: [null as Language | null, Validators.required],
      branch: [null as 'scientific' | 'literary' | null],
    });

    this.chapterForm = this.fb.group({
      id: [null],
      name: ['', Validators.required],
      subject_id: [null, Validators.required],
      language: [null, Validators.required],
    });

    this.subchapterForm = this.fb.group({
      id: [null],
      name: ['', Validators.required],
      chapter_id: [null, Validators.required],
      language: [null, Validators.required],
      isPublished: [true]
    });
    
    this.questionForm = this.fb.group({
        id: [null],
        text: ['', Validators.required],
        options: this.fb.array([
            this.fb.control('', Validators.required),
            this.fb.control('', Validators.required),
            this.fb.control('', Validators.required),
            this.fb.control('', Validators.required),
        ]),
        correctAnswerIndex: [null, [Validators.required, Validators.min(0), Validators.max(3)]],
        explanation: [''],
        isPublished: [true]
    });

    this.moveQuestionsForm = this.fb.group({
      grade: [null, Validators.required],
      language: [null, Validators.required],
      subject_id: [null, Validators.required],
      chapter_id: [null, Validators.required],
      subchapter_id: [null, Validators.required],
    });

    // Sync form values to signals for computed filtering
    this.moveQuestionsForm.get('grade')?.valueChanges.subscribe(v => this.moveSelectedGrade.set(v));
    this.moveQuestionsForm.get('language')?.valueChanges.subscribe(v => this.moveSelectedLanguage.set(v));
    this.moveQuestionsForm.get('subject_id')?.valueChanges.subscribe(v => this.moveSelectedSubjectId.set(v));
    this.moveQuestionsForm.get('chapter_id')?.valueChanges.subscribe(v => this.moveSelectedChapterId.set(v));

    this.aiBuilderForm = this.fb.group({
      grade: [null as number | null, Validators.required],
      language: [null as Language | null, Validators.required],
      branch: [null as 'scientific' | 'literary' | null],
      subjectDescription: ['', Validators.required],
      useCheapModel: [true]
    });
    
    this.aiPdfBuilderForm = this.fb.group({
      grade: [null as number | null, Validators.required],
      language: [null as Language | null, Validators.required],
      branch: [null as 'scientific' | 'literary' | null],
      pdfFile: [null as File | null, Validators.required],
      forceOcr: [true],
      useCheapModel: [true]
    });

    this.aiQuestionGenForm = this.fb.group({
      textContent: ['', Validators.required],
      count: [150, [Validators.required, Validators.min(1)]],
      useCheapModel: [true]
    });

    this.aiImageGenForm = this.fb.group({
      imageFiles: [null as FileList | null, Validators.required],
      count: [150, [Validators.required, Validators.min(1)]],
      useCheapModel: [true]
    });

    this.aiPdfGenForm = this.fb.group({
      pdfFile: [null as File | null, Validators.required],
      count: [150, [Validators.required, Validators.min(1)]],
      forceOcr: [true],
      useCheapModel: [true]
    });

    this.aiStudyGuideGenForm = this.fb.group({
      context: ['', Validators.required],
      useCheapModel: [true],
      generateImages: [true]
    });

    this.aiPdfStudyGuideGenForm = this.fb.group({
      pdfFile: [null as File | null, Validators.required],
      forceOcr: [true],
      useCheapModel: [true],
      generateImages: [true]
    });

    this.pdfGuideForm = this.fb.group({
      pdfFile: [null as File | null, Validators.required]
    });

    this.bulkGenerateForm = this.fb.group({
      inputType: ['pdf', Validators.required],
      pdfFile: [null as File | null],
      imageFiles: [null as FileList | null],
      textContent: [''],
      forceOcr: [true],
      useCheapModel: [true],
      generateStudyGuides: [true],
      generateQuestions: [true]
    });

    this.bulkGenerateSubjectForm = this.fb.group({
      inputType: ['pdf', Validators.required],
      pdfFile: [null as File | null],
      imageFiles: [null as FileList | null],
      textContent: [''],
      forceOcr: [true],
      useCheapModel: [true],
      generateStudyGuides: [true],
      generateQuestions: [true],
      autoSyncToArabic: [false]
    });

    this.bulkGenerateSubjectGuidesForm = this.fb.group({
      inputType: ['pdf', Validators.required],
      pdfFile: [null as File | null],
      imageFiles: [null as FileList | null],
      textContent: [''],
      forceOcr: [true],
      useCheapModel: [true],
      generateImages: [true]
    });

    // Add branch validation logic for all 3 forms that have a branch field
    [this.subjectForm, this.aiBuilderForm, this.aiPdfBuilderForm].forEach(form => {
      form.get('grade')?.valueChanges.subscribe(grade => {
        const branchControl = form.get('branch');
        if (grade && [10, 11, 12].includes(Number(grade))) {
          branchControl?.setValidators([Validators.required]);
        } else {
          branchControl?.clearValidators();
          branchControl?.setValue(null);
        }
        branchControl?.updateValueAndValidity();
      });
    });

    this.loadInitialData();
    this.userSearchControl.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged()
    ).subscribe(value => {
        if (value && value.length >= 3) {
          this.quizService.searchManagedUsers(value);
        }
    });

    effect(() => {
      const active = this.activeContentItem();
      if (active?.type === 'subchapter') {
        // We set the selected subchapter in quiz service so fetchQuestions knows what to fetch
        this.quizService.selectedSubchapter.set(active.item as Subchapter);
        this.quizService.fetchQuestions();
        this.quizService.fetchStudyGuideForSubchapter(active.item.id);
      }
    });
  }

  get questionOptions() {
    return this.questionForm.get('options') as FormArray;
  }

  async loadInitialData() {
    this.isLoadingUsers.set(true);
    try {
        await this.quizService.loadManagedUsers();
    } catch (error: any) {
        this.loadError.set(error.message);
        console.error("Failed to load user data for admin panel", error);
    } finally {
        this.isLoadingUsers.set(false);
    }
  }

  // --- Computed properties ---
  subjectsByLanguage = computed(() => {
    const subjects = this.quizService.allSubjects();
    const grouped = new Map<Language, { language: Language, gradeGroups: { grade: number, subjects: Subject[] }[] }>();
    
    subjects.forEach(subject => {
      if (!grouped.has(subject.language)) {
        grouped.set(subject.language, { language: subject.language, gradeGroups: [] });
      }
      const langGroup = grouped.get(subject.language)!;
      let gradeGroup = langGroup.gradeGroups.find(g => g.grade === subject.grade);
      if (!gradeGroup) {
        gradeGroup = { grade: subject.grade, subjects: [] };
        langGroup.gradeGroups.push(gradeGroup);
      }
      gradeGroup.subjects.push(subject);
    });

    return Array.from(grouped.values()).map(lg => ({
      ...lg,
      gradeGroups: lg.gradeGroups.sort((a, b) => a.grade - b.grade)
    })).sort((a, b) => a.language.localeCompare(b.language));
  });

  chaptersBySubjectId = computed(() => {
    const chapters = this.quizService.allChapters();
    const grouped = new Map<string, Chapter[]>();
    chapters.forEach(chapter => {
      if (!grouped.has(chapter.subject_id)) {
        grouped.set(chapter.subject_id, []);
      }
      grouped.get(chapter.subject_id)!.push(chapter);
    });
    return grouped;
  });

  subchaptersByChapterId = computed(() => {
    const subchapters = this.quizService.allSubchapters();
    const grouped = new Map<string, Subchapter[]>();
    subchapters.forEach(subchapter => {
      if (!grouped.has(subchapter.chapter_id)) {
        grouped.set(subchapter.chapter_id, []);
      }
      grouped.get(subchapter.chapter_id)!.push(subchapter);
    });
    return grouped;
  });

  questionsForActiveSubchapter = computed(() => {
    const active = this.activeContentItem();
    if (active?.type !== 'subchapter') return [];
    return this.quizService.allQuestions().filter(q => q.subchapter_id === active.item.id);
  });

  guideExistsForActiveSubchapter = computed(() => {
    const active = this.activeContentItem();
    if (active?.type !== 'subchapter') return false;
    return this.quizService.allStudyGuides().some(g => g.subchapter_id === active.item.id);
  });

  studyGuideForActiveSubchapter = computed(() => {
    const active = this.activeContentItem();
    if (active?.type !== 'subchapter') return null;
    return this.quizService.allStudyGuides().find(g => g.subchapter_id === active.item.id) || null;
  });

  hasSelection = computed(() => this.selectedQuestionIds().size > 0);
  
  areAllFilteredSelected = computed(() => {
    const filtered = this.questionsForActiveSubchapter();
    const selected = this.selectedQuestionIds();
    return filtered.length > 0 && filtered.every(q => selected.has(q.id));
  });

  filteredAndSortedUsers = computed(() => {
    const searchTerm = this.userSearchControl.value?.toLowerCase() || '';
    const filtered = this.allManagedUsers().filter(user => user.email.toLowerCase().includes(searchTerm));
    
    const column = this.sortColumn();
    const direction = this.sortDirection();

    return filtered.sort((a, b) => {
        const aVal = a[column];
        const bVal = b[column];
        const modifier = direction === 'asc' ? 1 : -1;

        if (aVal === null) return 1 * modifier;
        if (bVal === null) return -1 * modifier;

        if (typeof aVal === 'string' && typeof bVal === 'string') {
            return aVal.localeCompare(bVal) * modifier;
        }
        if (typeof aVal === 'number' && typeof bVal === 'number') {
            return (aVal - bVal) * modifier;
        }
        return 0;
    });
  });

  quizzesForSelectedUser = computed(() => {
    const userId = this.selectedUser()?.id;
    if (!userId) return [];
    
    return this.selectedUserAttempts()
        .map(attempt => {
            const subject = this.quizService.subjectsMap().get(attempt.subject_id);
            const subchapter = this.quizService.subchaptersMap().get(attempt.subchapter_id);
            return {
                ...attempt,
                subjectName: subject?.name || this.t.translate('unknownSubject'),
                subchapterName: subchapter?.name || this.t.translate('unknownTopic')
            }
        });
  });
  
  grantedSubjectsForUser = computed(() => {
    const permissions = this.selectedUserPermissions();
    if (!permissions?.subject_access) return [];
    
    const now = new Date();
    const subjects = [];
    for (const subjectId in permissions.subject_access) {
      const subject = this.quizService.subjectsMap().get(subjectId);
      if (subject) {
        const expiryDate = new Date(permissions.subject_access[subjectId]);
        const diffTime = expiryDate.getTime() - now.getTime();
        const daysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        subjects.push({ ...subject, daysLeft });
      }
    }
    return subjects.sort((a, b) => b.daysLeft - a.daysLeft);
  });

  safeGeneratedStudyGuide = computed(() => {
    const guide = this.generatedStudyGuide();
    return guide ? this.sanitizer.bypassSecurityTrustHtml(guide) : '';
  });

  getSafeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }


  // --- Methods ---
  setTab(tab: AdminTab) { this.activeTab.set(tab); }
  
  async openModal(type: ModalType, data: any = null) {
    if (type === 'ai_generate_study_guide' || type === 'ai_generate_study_guide_pdf') {
      if (!this.quizService.hasActiveSubscription()) {
        this.toastService.show('This premium feature requires an active Monthly Pro Plan subscription.', 'error');
        this.quizService.view.set('student_billing');
        return;
      }
    }

    this.modalState.set({ type, data });
    this.aiBuilderError.set(null); // Clear errors from other modals
    this.aiQuestionGenError.set(null);

    switch (type) {
      case 'correct_reupload_questions':
        this.questionsToUpload.set([]);
        this.uploadStats.set({ total: 0, updates: 0, creates: 0, errors: [] });
        this.isDraggingFile.set(false);
        break;
      case 'new_subject':
        this.subjectForm.reset({ grade: '', language: '', branch: null });
        break;
      case 'edit_subject':
        this.subjectForm.patchValue(data);
        break;
      case 'new_chapter':
        this.chapterForm.reset({
          subject_id: data.subject.id,
          language: data.subject.language,
        });
        break;
      case 'edit_chapter':
        this.chapterForm.patchValue(data.chapter);
        break;
      case 'new_subchapter':
        this.subchapterForm.reset({
          chapter_id: data.chapter.id,
          language: data.chapter.language,
          isPublished: true
        });
        break;
      case 'edit_subchapter':
        this.subchapterForm.patchValue(data.subchapter);
        break;
      case 'new_question': {
        this.questionForm.reset({ correctAnswerIndex: '', isPublished: true });
        break;
      }
      case 'edit_question':
        this.questionForm.patchValue(data);
        break;
      case 'ai_import_curriculum_pdf':
        this.aiBuilderState.set('form'); 
        if (data && data.grade) {
          this.aiPdfBuilderForm.patchValue({
            grade: data.grade,
            language: data.language,
            branch: data.branch
          });
        }
        break;
      case 'ai_generate_questions':
        this.aiQuestionGenState.set('form');
        this.generatedQuestions.set([]);
        this.aiQuestionGenForm.reset({ count: 150, textContent: '' });
        
        const active = this.activeContentItem();
        if (active?.type === 'subchapter') {
          try {
            const guide = await this.supabase.getStudyGuideBySubchapterId(active.item.id);
            if (guide?.source_text) {
              this.aiQuestionGenForm.patchValue({ textContent: guide.source_text });
            }
          } catch (error) {
            console.warn('Could not pre-load context text for question generation.', error);
          }
        }
        break;
      case 'ai_generate_image':
        this.aiQuestionGenState.set('form');
        this.generatedQuestions.set([]);
        this.aiImageGenForm.reset({ count: 150, imageFiles: null });
        break;
      case 'ai_generate_pdf':
        this.aiQuestionGenState.set('form');
        this.generatedQuestions.set([]);
        this.aiPdfGenForm.reset({ count: 150, pdfFile: null });
        break;
      case 'ai_generate_study_guide':
        this.aiStudyGuideGenState.set('form');
        this.generatedStudyGuide.set(null);
        this.studyGuideEditMode.set('preview');
        this.aiStudyGuideGenError.set(null);
        this.aiStudyGuideGenForm.reset({ context: data?.context || '', useCheapModel: true, generateImages: true });
        break;
      case 'ai_generate_study_guide_pdf':
        this.aiStudyGuideGenState.set('form');
        this.generatedStudyGuide.set(null);
        this.studyGuideEditMode.set('preview');
        this.aiStudyGuideGenError.set(null);
        this.aiPdfStudyGuideGenForm.reset({ pdfFile: null, forceOcr: true, useCheapModel: true, generateImages: true });
        break;
      case 'move_questions': {
        const active = this.activeContentItem();
        if (active?.type === 'subchapter') {
          const subchapter = active.item as Subchapter;
          const chapter = this.quizService.allChapters().find(c => c.id === subchapter.chapter_id);
          const subject = this.quizService.allSubjects().find(s => s.id === chapter?.subject_id);
          
          this.moveQuestionsForm.patchValue({
            grade: subject?.grade || null,
            language: subject?.language || null,
            subject_id: subject?.id || null,
            chapter_id: chapter?.id || null,
            subchapter_id: null
          });
        }
        break;
      }
      case 'upload_pdf_guide':
        this.pdfGuideForm.reset({ pdfFile: null });
        this.pdfGuideUploadStatus.set(null);
        this.pdfGuideUploadProgress.set(0);
        break;
      case 'bulk_generate_subject_guides':
        this.bulkGenerateSubjectGuidesState.set('idle');
        this.bulkGenerateSubjectGuidesProgress.set(null);
        this.bulkGenerateSubjectGuidesLogs.set([]);
        this.bulkGenerateSubjectGuidesError.set(null);
        this.bulkGenerateSubjectGuidesForm.reset({
          inputType: 'pdf',
          pdfFile: null,
          imageFiles: null,
          textContent: '',
          forceOcr: true,
          useCheapModel: true,
          generateImages: true
        });
        break;
      case 'manage_study_guide_images':
        const guide = this.studyGuideForActiveSubchapter();
        this.existingPageImages.set(guide?.page_images ? [...guide.page_images] : []);
        this.manualImageFiles.set([]);
        break;
    }
  }

  closeModal() {
    this.modalState.set(null);
    this.aiBuilderState.set('form');
    this.generatedCurriculum.set(null);
    this.aiBuilderError.set(null);
    this.aiBuilderForm.reset();
    this.aiPdfBuilderForm.reset();
    this.pdfProcessingState.set(null);
    this.aiQuestionGenState.set('form');
    this.generatedQuestions.set([]);
    this.aiQuestionGenError.set(null);
    this.bulkGenerateSubjectGuidesState.set('idle');
    this.bulkGenerateSubjectGuidesProgress.set(null);
    this.bulkGenerateSubjectGuidesError.set(null);
  }

  toggleLanguage(lang: Language) { this.expandedLanguages.update(set => (set.has(lang) ? (set.delete(lang), new Set(set)) : (set.add(lang), new Set(set)))); }
  toggleGrade(grade: number) { this.expandedGrades.update(set => (set.has(grade) ? (set.delete(grade), new Set(set)) : (set.add(grade), new Set(set)))); }
  toggleSubject(id: string) { 
    this.expandedSubjects.update(set => {
      const newSet = new Set(set);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
        // Fetch chapters lazily
        this.quizService.fetchChaptersForSubject(id);
      }
      return newSet;
    });
  }
  toggleChapter(id: string) { 
    this.expandedChapters.update(set => {
      const newSet = new Set(set);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
        // Fetch subchapters lazily
        this.quizService.fetchSubchaptersForChapter(id);
      }
      return newSet;
    });
  }
  selectContentItem(type: 'subject' | 'chapter' | 'subchapter', item: Subject | Chapter | Subchapter) { this.activeContentItem.set({ type, item }); }
  openEditChapterModal(chapter: Chapter, subject: Subject) { this.openModal('edit_chapter', { chapter, subject }); }
  openEditSubchapterModal(subchapter: Subchapter, chapter: Chapter) { this.openModal('edit_subchapter', { subchapter, chapter }); }
  
  onManualImagesSelected(event: any) {
    const files = Array.from(event.target.files as FileList);
    this.manualImageFiles.set(files);
  }

  removeManualImage(index: number) {
    this.manualImageFiles.update(files => files.filter((_, i) => i !== index));
  }

  deleteExistingImage(index: number) {
    this.existingPageImages.update(images => images.filter((_, i) => i !== index));
  }

  async handleUploadManualImages() {
    const activeSubchapter = this.activeContentItem()?.item as Subchapter;
    if (!activeSubchapter) return;

    this.isUploadingManualImages.set(true);
    try {
      const newImages = [];
      const files = this.manualImageFiles();
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const pageNum = this.existingPageImages().length + i + 1;
        const path = `study_guides/${activeSubchapter.id}/manual_page_${Date.now()}_${i}.png`;
        const url = await this.supabase.uploadFile(path, file);
        newImages.push({ url, pageNumber: pageNum });
      }

      const updatedImages = [...this.existingPageImages(), ...newImages];
      
      // Update study guide
      const guide = this.studyGuideForActiveSubchapter();
      if (guide) {
        await this.supabase.updateStudyGuide(guide.id, { page_images: updatedImages });
      } else {
        await this.supabase.upsertStudyGuide({
          subchapter_id: activeSubchapter.id,
          language: this.quizService.selectedLanguage()!,
          page_images: updatedImages,
          isPublished: true
        });
      }

      this.toastService.show('Images updated successfully', 'success');
      await this.quizService.loadCoreData();
      this.closeModal();
    } catch (error) {
      console.error('Error uploading images:', error);
      this.toastService.show('Failed to upload images', 'error');
    } finally {
      this.isUploadingManualImages.set(false);
    }
  }

  async downloadSubjectQuestions(subjectInput?: Subject) {
    try {
      const subject = subjectInput || this.getActiveSubject();
      if (!subject) {
        this.toastService.show('No active subject found.', 'error');
        return;
      }
      this.toastService.show('Fetching questions for export...', 'info');
      const questions = await this.supabase.getQuestionsForSubject(subject.id);
      
      if (questions.length === 0) {
        this.toastService.show('No questions found for this subject.', 'info');
        return;
      }

      const chapters = this.quizService.allChapters();
      const subchapters = this.quizService.allSubchapters();
      
      const enrichedQuestions = questions.map(q => {
        const chapter = chapters.find(c => c.id === q.chapter_id);
        const subchapter = subchapters.find(sc => sc.id === q.subchapter_id);
        return {
          id: q.id,
          text: q.text,
          options: q.options,
          correctAnswerIndex: q.correctAnswerIndex,
          explanation: q.explanation,
          language: q.language,
          grade: q.grade,
          branch: q.branch,
          subject_id: q.subject_id,
          chapter_id: q.chapter_id,
          subchapter_id: q.subchapter_id,
          isPublished: q.isPublished ?? true,
          _chapter_name: chapter ? chapter.name : 'Unknown Chapter',
          _subchapter_name: subchapter ? subchapter.name : 'Unknown Subchapter'
        };
      });

      const jsonStr = JSON.stringify(enrichedQuestions, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      const cleanSubjectName = subject.name.replace(/[^a-zA-Z0-9_\u0600-\u06FF\s-]/g, '');
      link.download = `Questions_${cleanSubjectName}_Grade${subject.grade}_${subject.language}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      this.toastService.show(`Downloaded ${questions.length} questions successfully!`, 'success');
    } catch (err: any) {
      console.error('Error downloading questions:', err);
      this.toastService.show('Failed to download questions: ' + (err.message || err), 'error');
    }
  }

  onUploadQuestionsFile(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;
    this.readAndProcessQuestionsFile(file);
  }

  onDragOverQuestionsFile(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingFile.set(true);
  }

  onDragLeaveQuestionsFile(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingFile.set(false);
  }

  onDropQuestionsFile(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingFile.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.readAndProcessQuestionsFile(file);
    }
  }

  private readAndProcessQuestionsFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);
        this.processUploadedQuestions(parsed);
      } catch (err: any) {
        this.uploadStats.set({
          total: 0,
          updates: 0,
          creates: 0,
          errors: ['Invalid file format. Please upload a valid JSON file. Error: ' + err.message]
        });
      }
    };
    reader.readAsText(file);
  }

  processUploadedQuestions(parsedData: any) {
    const subject = this.getActiveSubject();
    if (!subject) {
      this.uploadStats.set({
        total: 0,
        updates: 0,
        creates: 0,
        errors: ['No subject is currently active. Please select a subject first.']
      });
      return;
    }

    if (!Array.isArray(parsedData)) {
      this.uploadStats.set({
        total: 0,
        updates: 0,
        creates: 0,
        errors: ['The uploaded JSON file must contain an array of questions.']
      });
      return;
    }

    const errors: string[] = [];
    const validQuestions: Partial<Question>[] = [];
    let updatesCount = 0;
    let createsCount = 0;

    const chapters = this.quizService.allChapters().filter(c => c.subject_id === subject.id);
    const chapterIds = new Set(chapters.map(c => c.id));
    const subchapterIds = new Set(this.quizService.allSubchapters().filter(sc => chapterIds.has(sc.chapter_id)).map(sc => sc.id));

    parsedData.forEach((item, index) => {
      const qIndexString = `Question at index ${index + 1}`;
      
      if (!item.text || typeof item.text !== 'string' || item.text.trim() === '') {
        errors.push(`${qIndexString}: Missing or empty "text"`);
        return;
      }
      
      if (!Array.isArray(item.options) || item.options.length < 2) {
        errors.push(`${qIndexString}: "options" must be an array of at least 2 choices`);
        return;
      }

      for (let i = 0; i < item.options.length; i++) {
        if (typeof item.options[i] !== 'string') {
          errors.push(`${qIndexString}: Option choice at index ${i + 1} must be a string`);
          return;
        }
      }

      if (typeof item.correctAnswerIndex !== 'number' || item.correctAnswerIndex < 0 || item.correctAnswerIndex >= item.options.length) {
        errors.push(`${qIndexString}: "correctAnswerIndex" should be a valid index from 0 to ${item.options.length - 1}`);
        return;
      }

      const chapterId = item.chapter_id;
      const subchapterId = item.subchapter_id;

      if (!chapterId || !chapterIds.has(chapterId)) {
        errors.push(`${qIndexString}: Missing or invalid "chapter_id". It must match an existing chapter of this subject.`);
        return;
      }

      if (!subchapterId || !subchapterIds.has(subchapterId)) {
        errors.push(`${qIndexString}: Missing or invalid "subchapter_id". It must match an existing subchapter of this subject.`);
        return;
      }

      const hasId = !!item.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id);
      
      const questionData: Partial<Question> = {
        text: item.text.trim(),
        options: item.options.map((opt: string) => opt.trim()),
        correctAnswerIndex: item.correctAnswerIndex,
        explanation: item.explanation ? item.explanation.trim() : null,
        language: item.language || subject.language,
        grade: item.grade || subject.grade,
        branch: item.branch || subject.branch,
        subject_id: subject.id,
        chapter_id: chapterId,
        subchapter_id: subchapterId,
        isPublished: item.isPublished !== undefined ? !!item.isPublished : true,
      };

      if (hasId) {
        questionData.id = item.id;
        updatesCount++;
      } else {
        createsCount++;
      }

      validQuestions.push(questionData);
    });

    this.questionsToUpload.set(validQuestions);
    this.uploadStats.set({
      total: parsedData.length,
      updates: updatesCount,
      creates: createsCount,
      errors: errors
    });
  }

  async applyUploadedQuestions() {
    const questions = this.questionsToUpload();
    if (questions.length === 0) return;

    this.isModalSaving.set(true);
    try {
      this.toastService.show('Applying corrections in background...', 'info');
      await this.supabase.updateManyQuestions(questions);
      await this.quizService.loadCoreData();
      this.toastService.show(`Successfully synced and updated ${questions.length} questions in the database!`, 'success');
      this.closeModal();
    } catch (err: any) {
      console.error('Error uploading questions:', err);
      this.toastService.show('Failed to save questions: ' + (err.message || err), 'error');
    } finally {
      this.isModalSaving.set(false);
    }
  }

  private readonly subjectMapping: { [en: string]: string } = {
    'Biology': 'الأحياء',
    'Chemistry': 'الكيمياء',
    'Mathematics': 'الرياضيات',
    'Physics': 'الفيزياء',
    'biology': 'الأحياء',
    'chemistry': 'الكيمياء',
    'mathematics': 'الرياضيات',
    'physics': 'الفيزياء',
    'Maths': 'الرياضيات',
    'Math': 'الرياضيات',
    'Physics Grade 12': 'الفيزياء',
    'Biology Grade 12': 'الأحياء',
    'Chemistry Grade 12': 'الكيمياء',
    'Mathematics Grade 12': 'الرياضيات',
    'Physics (Grade 12)': 'الفيزياء',
    'Biology (Grade 12)': 'الأحياء',
    'Chemistry (Grade 12)': 'الكيمياء',
    'Mathematics (Grade 12)': 'الرياضيات'
  };

  async syncEnglishSubjectToArabic(enSubject: Subject) {
    this.syncSelectionSubject.set(enSubject);
    this.isSyncSelectionLoading.set(true);

    const currentLang = enSubject.language;
    let defaultTarget: Language = 'ar';
    if (currentLang === 'ar') {
      defaultTarget = 'en';
    } else if (currentLang === 'ku_sorani') {
      defaultTarget = 'ar';
    } else if (currentLang === 'ku_badini') {
      defaultTarget = 'ar';
    } else {
      defaultTarget = 'ar';
    }
    this.syncTargetLanguage.set(defaultTarget);
    this.syncTargetBranch.set(enSubject.branch);

    this.openModal('sync_selection');

    try {
      const chapters = await this.supabase.getChaptersForSubject(enSubject.id);
      const structure = [];
      for (const chapter of chapters) {
        const subchapters = await this.supabase.getSubchaptersForChapter(chapter.id);
        structure.push({
          chapter,
          subchapters: subchapters.map(s => ({ subchapter: s, selected: true }))
        });
      }
      this.syncSelectionStructure.set(structure);
    } catch (error: any) {
      this.toastService.show(`Failed to load structure: ${error.message}`, 'error');
      this.closeModal();
    } finally {
      this.isSyncSelectionLoading.set(false);
    }
  }

  selectAllSync(selected: boolean) {
    this.syncSelectionStructure.update(struct => 
      struct.map(c => ({
        ...c,
        subchapters: c.subchapters.map(s => ({ ...s, selected }))
      }))
    );
  }

  isChapterFullySelected(chapterData: any): boolean {
    return chapterData.subchapters.every((s: any) => s.selected);
  }

  isChapterPartiallySelected(chapterData: any): boolean {
    const selectedCount = chapterData.subchapters.filter((s: any) => s.selected).length;
    return selectedCount > 0 && selectedCount < chapterData.subchapters.length;
  }

  toggleChapterSync(chapterData: any) {
    const allSelected = this.isChapterFullySelected(chapterData);
    this.syncSelectionStructure.update(struct => 
      struct.map(c => {
        if (c.chapter.id === chapterData.chapter.id) {
          return {
            ...c,
            subchapters: c.subchapters.map(s => ({ ...s, selected: !allSelected }))
          };
        }
        return c;
      })
    );
  }

  hasAnySyncSelection(): boolean {
    return this.syncSelectionStructure().some(c => c.subchapters.some(s => s.selected));
  }

  async startSyncFromSelection() {
    const enSubject = this.syncSelectionSubject();
    if (!enSubject) return;

    const selectedSubchapterIds = this.syncSelectionStructure()
      .flatMap(c => c.subchapters)
      .filter(s => s.selected)
      .map(s => s.subchapter.id);

    this.closeModal();
    await this.performSync(enSubject, selectedSubchapterIds);
  }

  getLanguageLabel(lang: Language): string {
    switch (lang) {
      case 'ar': return 'Arabic';
      case 'ku_sorani': return 'Kurdish Sorani';
      case 'ku_badini': return 'Kurdish Badini';
      case 'en': return 'English';
      default: return lang;
    }
  }

  async performSync(enSubject: Subject, limitToSubchapterIds?: string[], targetLang: Language = this.syncTargetLanguage()) {
    this.syncLogs.set([]);
    this.isSyncingContent.set(true);
    const targetLangName = this.getLanguageLabel(targetLang);
    const targetBranch = this.syncTargetBranch();
    this.addSyncLog(`Searching for matching ${targetLangName} subject for: ${enSubject.name} (Grade ${enSubject.grade}, ${targetBranch || 'no branch'})`);

    this.syncProgress.set({
      subject: enSubject.name,
      chapter: `Locating ${targetLangName} counterpart...`,
      subchapter: '',
      current: 0,
      total: 0
    });

    // Robust subject matching for any targetLang
    let targetSubject = this.quizService.allSubjects().find(s => {
      if (s.language !== targetLang || s.grade !== enSubject.grade) return false;
      
      const enName = enSubject.name.trim().toLowerCase();
      const targetName = s.name.trim(); // target language name
      
      // Check if names match directly or via mapping
      const mappedTargetName = targetLang === 'ar' ? (this.subjectMapping[enSubject.name] || this.subjectMapping[enName]) : '';
      const isNameMatch = targetName === enSubject.name || (mappedTargetName && targetName === mappedTargetName) || targetName.toLowerCase() === enName;
      
      if (!isNameMatch) return false;

      // Branch matching: match if branches are equal, OR if one is null and there's no other choice
      if (s.branch === targetBranch) return true;

      // If branch doesn't match exactly, check if this is the only targetLang subject with this name/grade
      const potentialMatches = this.quizService.allSubjects().filter(sub => {
        const subName = sub.name.trim();
        return sub.language === targetLang && 
               sub.grade === enSubject.grade && 
               (subName === enSubject.name || (mappedTargetName && (subName === mappedTargetName)));
      });

      // If there's only one targetLang version of this subject, we pair them regardless of branch nullability
      if (potentialMatches.length === 1) return true;

      return false;
    });

    // stage 2: translation-based matching if no subject found
    if (!targetSubject) {
      if (this.syncTranslateContent()) {
        this.addSyncLog(`No direct match found for "${enSubject.name}". Translating to check for existing ${targetLangName} counterpart...`);
        try {
          const translatedSubjectName = await this.geminiService.translateText(enSubject.name, targetLang);
          targetSubject = this.quizService.allSubjects().find(s => 
            s.language === targetLang && 
            s.grade === enSubject.grade && 
            s.branch === targetBranch && 
            (s.name.trim() === translatedSubjectName.trim() || s.name.toLowerCase().includes(translatedSubjectName.toLowerCase()))
          );
          if (targetSubject) this.addSyncLog(`Found existing ${targetLangName} subject via translation: ${targetSubject.name}`);
        } catch (err) {
          console.warn('Translation matching failed', err);
        }
      } else {
        targetSubject = this.quizService.allSubjects().find(s => 
          s.language === targetLang && 
          s.grade === enSubject.grade && 
          s.branch === targetBranch && 
          s.name.trim().toLowerCase() === enSubject.name.trim().toLowerCase()
        );
        if (targetSubject) this.addSyncLog(`Found existing ${targetLangName} subject with matching name: ${targetSubject.name}`);
      }
    }

    // stage 3: single-candidate fallback
    if (!targetSubject) {
      const candidates = this.quizService.allSubjects().filter(s => 
        s.language === targetLang && s.grade === enSubject.grade && s.branch === targetBranch
      );
      if (candidates.length === 1) {
        targetSubject = candidates[0];
        this.addSyncLog(`Using the only available ${targetLangName} subject for this grade/branch: ${targetSubject.name}`);
      }
    }

    if (!targetSubject) {
      if (this.syncTranslateContent()) {
        this.addSyncLog(`${targetLangName} subject counterpart not found for "${enSubject.name}". Translating name and creating...`);
      } else {
        this.addSyncLog(`${targetLangName} subject counterpart not found for "${enSubject.name}". Creating...`);
      }
      try {
        const nameToUse = this.syncTranslateContent()
          ? await this.geminiService.translateText(enSubject.name, targetLang)
          : enSubject.name;
        targetSubject = await this.supabase.addSubject({
          name: nameToUse,
          grade: enSubject.grade,
          language: targetLang,
          branch: targetBranch,
          isPublished: enSubject.isPublished || true
        });
        this.addSyncLog(`Created ${targetLangName} subject: ${targetSubject.name}`);
        // Refresh local subjects list to reflect the new addition
        await this.quizService.loadCoreData();
      } catch (createErr: any) {
        this.isSyncingContent.set(false);
        this.toastService.show(`Failed to create ${targetLangName} subject: ${createErr.message}`, 'error');
        return;
      }
    }

    this.syncProgress.set({
      subject: enSubject.name,
      chapter: 'Initializing...',
      subchapter: '',
      current: 0,
      total: 0
    });
    
    try {
      this.addSyncLog(`Starting sync for ${enSubject.name} -> ${targetSubject.name} (${targetLangName})`);
      
      // Load all chapters for both
      const [enChapters, targetChapters] = await Promise.all([
        this.supabase.getChaptersForSubject(enSubject.id),
        this.supabase.getChaptersForSubject(targetSubject.id)
      ]);

      // Calculate total subchapters for progress tracking
      let totalSubchapters = 0;
      const subchapterTasks: any[] = [];
      const filterSet = limitToSubchapterIds ? new Set(limitToSubchapterIds) : null;

      for (const enChapter of enChapters) {
        let subs = await this.supabase.getSubchaptersForChapter(enChapter.id);
        
        // Filter if requested
        if (filterSet) {
          subs = subs.filter(s => filterSet.has(s.id));
        }

        if (subs.length > 0) {
          totalSubchapters += subs.length;
          subchapterTasks.push({ enChapter, subs });
        }
      }

      if (subchapterTasks.length === 0) {
        this.addSyncLog(`No subchapters found or selected for syncing.`);
        this.isSyncingContent.set(false);
        return;
      }

      let processedSubchapters = 0;
      this.syncProgress.set({
        subject: enSubject.name,
        chapter: '',
        subchapter: '',
        current: 0,
        total: totalSubchapters
      });

      for (const task of subchapterTasks) {
        const enChapter = task.enChapter;
        const enSubchapters = task.subs;

        // Try to find matching target chapter
        let targetChapter = targetChapters.find(c => c.name === enChapter.name) || 
                            targetChapters.find(c => c.name.toLowerCase().includes(enChapter.name.toLowerCase()));
        
        if (!targetChapter) {
          const chapterName = this.syncTranslateContent()
            ? await this.geminiService.translateText(enChapter.name, targetLang)
            : enChapter.name;

          if (this.syncTranslateContent()) {
            this.addSyncLog(`${targetLangName} chapter not found for "${enChapter.name}". Translating to search...`);
          } else {
            this.addSyncLog(`${targetLangName} chapter not found for "${enChapter.name}". Checking directly...`);
          }

          targetChapter = targetChapters.find(c => 
            c.name.trim() === chapterName.trim() || 
            c.name.toLowerCase().includes(chapterName.toLowerCase()) || 
            chapterName.toLowerCase().includes(c.name.toLowerCase())
          );
          
          if (!targetChapter) {
            this.addSyncLog(`  Still not found. Creating chapter: ${chapterName}`);
            targetChapter = await this.supabase.addChapter({
              name: chapterName,
              subject_id: targetSubject.id,
              language: targetLang
            });
            targetChapters.push(targetChapter);
          } else {
            this.addSyncLog(`  Found existing ${targetLangName} chapter: ${targetChapter.name}`);
          }
        }

        this.addSyncLog(`Processing chapter: ${enChapter.name} -> ${targetChapter.name}`);

        const targetSubchapters = await this.supabase.getSubchaptersForChapter(targetChapter.id);

        for (const enSub of enSubchapters) {
          processedSubchapters++;
          this.syncProgress.set({
            subject: enSubject.name,
            chapter: enChapter.name,
            subchapter: enSub.name,
            current: processedSubchapters,
            total: totalSubchapters
          });

          let targetSub = targetSubchapters.find(s => s.name === enSub.name) || 
                          targetSubchapters.find(s => s.name.toLowerCase().includes(enSub.name.toLowerCase()));
          
          if (!targetSub) {
             const subName = this.syncTranslateContent()
               ? await this.geminiService.translateText(enSub.name, targetLang)
               : enSub.name;

             if (this.syncTranslateContent()) {
               this.addSyncLog(`  Subchapter not found by name. Translating to search: "${enSub.name}"...`);
             } else {
               this.addSyncLog(`  Subchapter not found by name. Checking directly: "${enSub.name}"...`);
             }

             targetSub = targetSubchapters.find(s => 
               s.name.trim() === subName.trim() || 
               s.name.toLowerCase().includes(subName.toLowerCase()) ||
               subName.toLowerCase().includes(s.name.toLowerCase())
             );

             if (!targetSub) {
               this.addSyncLog(`    Creating ${targetLangName} subchapter: ${subName}`);
               targetSub = await this.supabase.addSubchapter({
                 name: subName,
                 chapter_id: targetChapter.id,
                 language: targetLang,
                 isPublished: true
               });
               targetSubchapters.push(targetSub);
             } else {
               this.addSyncLog(`    Found existing ${targetLangName} subchapter: ${targetSub.name}`);
             }
          }

          this.addSyncLog(`  [${processedSubchapters}/${totalSubchapters}] Syncing questions & guide for: ${enSub.name}...`);
          
          // Fetch existing source questions
          const enQuestions = await this.supabase.getQuestions(enSub.id);
          this.addSyncLog(`    Found ${enQuestions.length} questions in source language.`);
          
          if (enQuestions.length > 0) {
            // Fetch existing target questions to avoid duplicates
            const targetQuestions = await this.supabase.getQuestions(targetSub.id);
            const targetQuestionTexts = new Set(targetQuestions.map(q => q.text.trim()));

            let translated: any[];
            if (this.syncTranslateContent()) {
              this.addSyncLog(`    Translating ${enQuestions.length} questions to ${targetLangName}...`);
              translated = await this.geminiService.translateQuestions(enQuestions, targetLang);
              this.addSyncLog(`    Filtering translated questions...`);
            } else {
              this.addSyncLog(`    Copying ${enQuestions.length} questions directly to ${targetLangName}...`);
              translated = enQuestions.map(q => ({
                text: q.text,
                options: [...q.options],
                correctAnswerIndex: q.correctAnswerIndex,
                explanation: q.explanation || ''
              }));
              this.addSyncLog(`    Filtering copied questions...`);
            }
            
            const questionsToInsert = translated
              .filter(q => !targetQuestionTexts.has(q.text.trim()))
              .map(q => ({
                ...q,
                language: targetLang as Language,
                grade: targetSubject!.grade,
                branch: targetSubject!.branch,
                subject_id: targetSubject!.id,
                chapter_id: targetChapter!.id,
                subchapter_id: targetSub.id,
                is_published: true
              }));

            if (questionsToInsert.length > 0) {
              this.addSyncLog(`    Saving ${questionsToInsert.length} new questions...`);
              await this.supabase.addManyQuestions(questionsToInsert);
              this.addSyncLog(`    Successfully added ${questionsToInsert.length} questions.`);
            } else {
              this.addSyncLog(`    No new questions to add (already exists).`);
            }
          }

          // --- Sync Study Guide ---
          const enGuide = await this.supabase.getStudyGuideBySubchapterId(enSub.id);
          if (enGuide && enGuide.content) {
            const targetGuide = await this.supabase.getStudyGuideBySubchapterId(targetSub.id);
            if (!targetGuide || !targetGuide.content) {
              let contentToSave: string;
              if (this.syncTranslateContent()) {
                this.addSyncLog(`    Translating study guide to ${targetLangName}...`);
                contentToSave = await this.geminiService.translateStudyGuide(enGuide.content, targetLang);
              } else {
                this.addSyncLog(`    Copying study guide directly to ${targetLangName}...`);
                contentToSave = enGuide.content;
              }
              await this.supabase.upsertStudyGuide({
                subchapter_id: targetSub.id,
                language: targetLang,
                content: contentToSave,
                isPublished: true
              });
              this.addSyncLog(`    Successfully saved study guide.`);
            } else {
              this.addSyncLog(`    ${targetLangName} study guide already exists.`);
            }
          }
        }
      }

      this.addSyncLog(`Sync operation completed successfully.`);
      this.toastService.show(`Sync completed for ${enSubject.name} to ${targetLangName}.`, 'success');
      await this.quizService.loadCoreData();
    } catch (error: any) {
      this.addSyncLog(`ERROR: ${error.message}`);
      console.error('Sync error:', error);
      this.toastService.show(`Sync failed: ${error.message}`, 'error');
    } finally {
      this.isSyncingContent.set(false);
    }
  }

  private addSyncLog(message: string) {
    this.syncLogs.update(logs => [...logs, `[${new Date().toLocaleTimeString()}] ${message}`]);
  }

  async deleteSubject(subject: Subject) {
    this.confirmModal.set({
      title: this.t.translate('delete'),
      message: this.t.translate('admin.deleteConfirmSubject', { name: subject.name }),
      onConfirm: async () => {
        try {
          await this.supabase.deleteSubject(subject.id!);
          this.toastService.show(this.t.translate('admin.toast.subjectDeleted'), 'success');
          this.activeContentItem.set(null);
          await this.quizService.loadCoreData();
        } catch (error: any) {
          this.toastService.show(error.message, 'error');
        }
      }
    });
  }

  async deleteGrade(gradeData: { grade: number, subjects: Subject[] }) {
    this.confirmModal.set({
      title: this.t.translate('delete'),
      message: this.t.translate('admin.deleteConfirmGrade', { grade: gradeData.grade }),
      onConfirm: async () => {
        try {
          for (const subject of gradeData.subjects) {
            await this.supabase.deleteSubject(subject.id!);
          }
          this.toastService.show(this.t.translate('admin.toast.gradeDeleted', { grade: gradeData.grade }), 'success');
          this.activeContentItem.set(null);
          await this.quizService.loadCoreData();
        } catch (error: any) {
          this.toastService.show(error.message, 'error');
        }
      }
    });
  }

  async deleteChapter(chapter: Chapter) {
    this.confirmModal.set({
      title: this.t.translate('delete'),
      message: this.t.translate('admin.deleteConfirmChapter', { name: chapter.name }),
      onConfirm: async () => {
        try {
          await this.supabase.deleteChapter(chapter.id);
          this.toastService.show(this.t.translate('admin.toast.chapterDeleted'), 'success');
          this.activeContentItem.set(null);
          await this.quizService.loadCoreData();
        } catch (error: any) {
          this.toastService.show(error.message, 'error');
        }
      }
    });
  }

  async deleteSubchapter(subchapter: Subchapter) {
    this.confirmModal.set({
      title: this.t.translate('delete'),
      message: this.t.translate('admin.deleteConfirmSubchapter', { name: subchapter.name }),
      onConfirm: async () => {
        try {
          await this.supabase.deleteSubchapter(subchapter.id);
          this.toastService.show(this.t.translate('admin.toast.subchapterDeleted'), 'success');
          this.activeContentItem.set(null);
          await this.quizService.loadCoreData();
        } catch (error: any) {
          this.toastService.show(error.message, 'error');
        }
      }
    });
  }

  async deleteSelectedQuestions() {
    const ids = Array.from(this.selectedQuestionIds());
    if (ids.length === 0) return;
    this.confirmModal.set({
      title: this.t.translate('delete'),
      message: this.t.translate('admin.deleteConfirmSelected', { count: ids.length }),
      onConfirm: async () => {
        try {
          await this.supabase.deleteManyQuestions(ids);
          this.toastService.show(this.t.translate('admin.toast.questionsDeleted', { count: ids.length }), 'success');
          this.selectedQuestionIds.set(new Set());
          await this.quizService.loadCoreData();
        } catch (error: any) {
          this.toastService.show(error.message, 'error');
        }
      }
    });
  }
  
  editStudyGuide(guide: StudyGuide) {
    this.openModal('ai_generate_study_guide');
    this.aiStudyGuideGenState.set('review');
    this.generatedStudyGuide.set(guide.content || '');
    this.studyGuideEditMode.set('preview');
    this.isStudyGuidePublished.set(guide.isPublished !== false);
    this.aiStudyGuideGenError.set(null);
  }

  openStudyGuideModal() {
    const active = this.activeContentItem();
    if (active?.type !== 'subchapter') {
        this.toastService.show(this.t.translate('admin.toast.selectSubchapterFirst'), 'error');
        return;
    }
    const questions = this.questionsForActiveSubchapter();
    if (questions.length === 0) {
        this.toastService.show(this.t.translate('admin.toast.addQuestionsForContext'), 'info');
        return;
    }

    // FIX: Cast item to Subchapter to access chapter_id
    const subchapter = active.item as Subchapter;
    const chapter = this.quizService.chaptersMap().get(subchapter.chapter_id);
    if (!chapter) return;
    const subject = this.quizService.subjectsMap().get(chapter.subject_id);
    if (!subject) return;
    
    const context = questions.map(q => 
        `Q: ${q.text}\nA: ${q.options[q.correctAnswerIndex]}\nExplanation: ${q.explanation || 'N/A'}`
    ).join('\n\n');

    const data = {
        context,
        language: subject.language,
        grade: subject.grade,
        subject: subject.name,
        chapter: chapter.name,
        subchapter: active.item.name,
    };

    this.openModal('ai_generate_study_guide', data);
  }

  async proofreadActiveSubchapterQuestions() {
    if (!this.quizService.hasActiveSubscription()) {
      this.toastService.show('This premium feature requires an active Monthly Pro Plan subscription.', 'error');
      this.quizService.view.set('student_billing');
      return;
    }

    const active = this.activeContentItem();
    if (active?.type !== 'subchapter') {
        this.toastService.show(this.t.translate('admin.toast.selectSubchapterFirst'), 'error');
        return;
    }
    const activeSubchapter = active.item as Subchapter;

    this.isProofreadingQuestions.set(true);
    this.proofreadProgress.set(null);

    try {
      const questions = await this.supabase.getQuestions(activeSubchapter.id);
      if (questions.length === 0) {
        this.toastService.show('No questions found to proofread', 'info');
        this.isProofreadingQuestions.set(false);
        return;
      }

      this.proofreadProgress.set({ current: 0, total: questions.length });

      // Convert Question[] to AiGeneratedQuestion[] for the AI service
      const aiQuestions: AiGeneratedQuestion[] = questions.map(q => ({
        text: q.text,
        options: q.options,
        correctAnswerIndex: q.correctAnswerIndex,
        explanation: q.explanation || ''
      }));

      const correctedAiQuestions = await this.geminiService.proofreadQuestions(aiQuestions, activeSubchapter.language);

      // Map to pending corrections for review
      const pending = questions.map((q, i) => ({
        original: q,
        corrected: correctedAiQuestions[i],
        selected: this.hasQuestionChanged(q, correctedAiQuestions[i])
      }));

      this.pendingProofreads.set(pending);
      this.showProofreadReview.set(true);
      
      this.toastService.show('Proofreading complete. Please review the changes.', 'success');
    } catch (error) {
      console.error('Error proofreading questions:', error);
      this.toastService.show('Failed to proofread questions', 'error');
    } finally {
      this.isProofreadingQuestions.set(false);
      this.proofreadProgress.set(null);
    }
  }

  hasQuestionChanged(original: Question, corrected: AiGeneratedQuestion): boolean {
    if (original.text !== corrected.text) return true;
    if (original.explanation !== corrected.explanation) return true;
    if (original.correctAnswerIndex !== corrected.correctAnswerIndex) return true;
    if (original.options.length !== corrected.options.length) return true;
    for (let i = 0; i < original.options.length; i++) {
        if (original.options[i] !== corrected.options[i]) return true;
    }
    return false;
  }

  toggleProofreadSelection(index: number) {
    this.pendingProofreads.update(items => items.map((item, i) => i === index ? { ...item, selected: !item.selected } : item));
  }

  toggleAllProofreadSelection() {
    const allSelected = this.pendingProofreads().every(v => v.selected);
    this.pendingProofreads.update(items => items.map(item => ({ ...item, selected: !allSelected })));
  }

  async applySelectedProofreads() {
    const pending = this.pendingProofreads().filter(p => p.selected);
    if (pending.length === 0) {
        this.toastService.show('No changes selected', 'info');
        return;
    }

    try {
        const updatedQuestions: Question[] = pending.map(p => ({
            ...p.original,
            text: p.corrected.text,
            options: p.corrected.options,
            correctAnswerIndex: p.corrected.correctAnswerIndex,
            explanation: p.corrected.explanation
        }));

        await this.supabase.updateManyQuestions(updatedQuestions);
        this.toastService.show(`Successfully updated ${updatedQuestions.length} questions`, 'success');
        this.showProofreadReview.set(false);
        this.pendingProofreads.set([]);
        await this.quizService.loadCoreData();
    } catch (error) {
        console.error('Error applying proofreads:', error);
        this.toastService.show('Failed to apply changes', 'error');
    }
  }

  discardProofreads() {
    this.showProofreadReview.set(false);
    this.pendingProofreads.set([]);
  }

  async autoCategorizeSelectedQuestions() {
    const selectedIds = Array.from(this.selectedQuestionIds());
    if (selectedIds.length === 0) return;

    const active = this.activeContentItem();
    if (active?.type !== 'subchapter') return;

    const activeSubchapter = active.item as Subchapter;
    const chapters = this.quizService.allChapters();
    const subchapters = this.quizService.allSubchapters();
    
    // Find parent subject to scope the subchapters
    const currentChapter = chapters.find(c => c.id === activeSubchapter.chapter_id);
    if (!currentChapter) return;

    const subjectSubchapters = subchapters.filter(sc => {
        const ch = chapters.find(c => c.id === sc.chapter_id);
        return ch?.subject_id === currentChapter.subject_id;
    });

    if (subjectSubchapters.length === 0) {
        this.toastService.show('No target subchapters found in this subject', 'error');
        return;
    }

    this.isAutoCategorizing.set(true);
    this.autoCategorizeProgress.set(null);

    try {
        // Verify admin permissions before proceeding
        const isAdmin = await this.supabase.isAdmin();
        if (!isAdmin) {
          this.toastService.show('You do not have administrative permissions. Please verify your Supabase profile.', 'error');
          return;
        }

        // Fetch full question data for the selected IDs
        const allQuestions = await this.supabase.getQuestions(activeSubchapter.id);
        const selectedQuestions = allQuestions.filter(q => selectedIds.includes(q.id));

        if (selectedQuestions.length === 0) {
            this.toastService.show('Failed to retrieve selected questions', 'error');
            return;
        }

        this.autoCategorizeProgress.set({ current: 0, total: selectedQuestions.length });

        const mappings = await this.geminiService.autoCategorizeQuestions(
            selectedQuestions.map(q => ({ id: q.id, text: q.text })),
            subjectSubchapters.map(sc => ({ id: sc.id, name: sc.name }))
        );

        const updates = mappings.map(m => {
            const original = selectedQuestions.find(q => q.id === m.questionId);
            return {
                ...original,
                subchapter_id: m.targetSubchapterId
            } as Question;
        });
        
        await this.supabase.updateManyQuestions(updates);

        this.toastService.show(`AI re-categorized ${updates.length} questions`, 'success');
        this.selectedQuestionIds.set(new Set());
        await this.quizService.loadCoreData();
    } catch (error) {
        console.error('Error auto-categorizing questions:', error);
        this.toastService.show('AI failed to categorize questions', 'error');
    } finally {
        this.isAutoCategorizing.set(false);
        this.autoCategorizeProgress.set(null);
    }
  }

  async scanForMisplacedQuestions() {
    const active = this.activeContentItem();
    if (active?.type !== 'subchapter') return;

    const activeSubchapter = active.item as Subchapter;
    this.isScanningQuestions.set(true);
    
    try {
        const questions = await this.supabase.getQuestions(activeSubchapter.id);
        if (questions.length === 0) {
            this.toastService.show('No questions to scan', 'info');
            return;
        }

        const misplacedIds = await this.geminiService.identifyMisplacedQuestions(
            questions.map(q => ({ id: q.id, text: q.text })),
            activeSubchapter.name
        );

        if (misplacedIds.length === 0) {
            this.toastService.show('No misplaced questions found! Everything looks correct.', 'success');
        } else {
            this.toastService.show(`Found ${misplacedIds.length} potentially misplaced questions. They have been selected for you.`, 'info');
            this.selectedQuestionIds.set(new Set(misplacedIds));
        }
    } catch (error) {
        console.error('Error scanning for misplaced questions:', error);
        this.toastService.show('AI failed to scan questions', 'error');
    } finally {
        this.isScanningQuestions.set(false);
    }
  }

  async handleMoveQuestionsSubmit() {
    if (this.moveQuestionsForm.invalid) return;
    
    const targetSubchapterId = this.moveQuestionsForm.get('subchapter_id')?.value;
    const selectedIds = Array.from(this.selectedQuestionIds());
    
    if (selectedIds.length === 0) {
      this.toastService.show('No questions selected to move', 'error');
      return;
    }

    this.isModalSaving.set(true);
    try {
        const active = this.activeContentItem();
        const questions = this.questionsForActiveSubchapter();
        const selectedQuestions = questions.filter(q => selectedIds.includes(q.id));

        const updates = selectedQuestions.map(q => ({ 
            ...q, 
            subchapter_id: targetSubchapterId 
        }));

        await this.supabase.updateManyQuestions(updates);
        
        this.toastService.show(`Successfully moved ${selectedIds.length} questions`, 'success');
        this.selectedQuestionIds.set(new Set());
        await this.quizService.loadCoreData();
        this.closeModal();
    } catch (error) {
        console.error('Error moving questions:', error);
        this.toastService.show('Failed to move questions', 'error');
    } finally {
        this.isModalSaving.set(false);
    }
  }

  toggleSelectAllFiltered() {
    const questions = this.questionsForActiveSubchapter();
    const allSelected = this.areAllFilteredSelected();
    const currentIds = new Set(this.selectedQuestionIds());

    if (allSelected) {
      questions.forEach(q => currentIds.delete(q.id));
    } else {
      questions.forEach(q => currentIds.add(q.id));
    }
    this.selectedQuestionIds.set(currentIds);
  }

  toggleQuestionSelection(id: string) { this.selectedQuestionIds.update(set => (set.has(id) ? set.delete(id) : set.add(id), new Set(set))); }
  
  viewUserDetails(user: ManagedUser) {
    this.selectedUser.set(user);
    this.selectedUserAttempts.set([]); // Clear previous
    this.supabase.getUserPermissions(user.id).then(p => this.selectedUserPermissions.set(p));
    this.supabase.getQuizAttemptsForUser(user.id).then(attempts => this.selectedUserAttempts.set(attempts));
  }
  backToUserList() { this.selectedUser.set(null); }
  
  async extendAccess(subjectId: string, daysStr: string) {
    const days = parseInt(daysStr, 10);
    if (isNaN(days) || days < 1) {
        this.toastService.show(this.t.translate('admin.users.access.invalidDays'), 'error');
        return;
    }
    await this.updateAccess(subjectId, days, 'extend');
    this.toggleExtendMode(null);
    this.toastService.show(this.t.translate('admin.toast.accessExtended', { days }), 'success');
  }

  async deactivateAccess(subjectId: string) {
    this.confirmModal.set({
      title: this.t.translate('admin.access.deactivate'),
      message: this.t.translate('admin.deactivateConfirm'),
      onConfirm: async () => {
        await this.updateAccess(subjectId, 0, 'deactivate');
        this.toastService.show(this.t.translate('admin.toast.accessDeactivated'), 'success');
      }
    });
  }
  
  async reactivateAccess(subjectId: string) {
    await this.updateAccess(subjectId, 30, 'reactivate');
    this.toastService.show(this.t.translate('admin.toast.accessReactivated', { days: 30 }), 'success');
  }

  private async updateAccess(subjectId: string, days: number, mode: 'extend' | 'deactivate' | 'reactivate') {
      const user = this.selectedUser();
      if (!user) return;
      this.isSavingPermissions.set(true);
      try {
          // FIX: Add missing properties to the default object for UserPermissions
          const currentPermissions = await this.supabase.getUserPermissions(user.id) ?? { 
              user_id: user.id, 
              subject_access: {},
              allowed_languages: [],
              allowed_grades: []
          };
          const subjectAccess = currentPermissions.subject_access || {};
          
          let newExpiryDate: Date;
          if (mode === 'extend') {
              const currentExpiry = new Date(subjectAccess[subjectId] || Date.now());
              newExpiryDate = new Date(currentExpiry.getTime() + days * 24 * 60 * 60 * 1000);
          } else if (mode === 'deactivate') {
              newExpiryDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
          } else { // reactivate
              newExpiryDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
          }
          
          subjectAccess[subjectId] = newExpiryDate.toISOString();
          
          const updatedPermissions = { ...currentPermissions, subject_access: subjectAccess };
          const saved = await this.supabase.upsertUserPermissions(updatedPermissions);
          this.selectedUserPermissions.set(saved);
      } catch (error: any) {
          this.toastService.show(error.message, 'error');
      } finally {
          this.isSavingPermissions.set(false);
      }
  }

  async revokeAccess(subjectIds: string[]) {
    const user = this.selectedUser();
    if (!user) return;

    this.confirmModal.set({
      title: this.t.translate('admin.users.revokePermissions'),
      message: this.t.translate('admin.revokeConfirm', { count: subjectIds.length }),
      onConfirm: async () => {
        this.isRevokingPermissions.set(true);
        try {
            const permissions = this.selectedUserPermissions();
            if (!permissions || !permissions.subject_access) return;

            // Clone to avoid direct signal mutation
            const updatedSubjectAccess = { ...permissions.subject_access };
            subjectIds.forEach(id => delete updatedSubjectAccess[id]);

            const updatedPermissions = { ...permissions, subject_access: updatedSubjectAccess };
            const saved = await this.supabase.upsertUserPermissions(updatedPermissions);
            this.selectedUserPermissions.set(saved);
            this.toastService.show(this.t.translate('admin.toast.permissionsRevoked', { count: subjectIds.length }), 'success');
        } catch (error: any) {
            this.toastService.show(error.message, 'error');
        } finally {
            this.isRevokingPermissions.set(false);
        }
      }
    });
  }

  toggleExtendMode(id: string | null) { this.extendingSubjectId.set(id); }
  
  setSort(column: keyof ManagedUser) {
    if (this.sortColumn() === column) {
      this.sortDirection.update(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('desc');
    }
  }
  getActiveSubject(): Subject | null {
    const active = this.activeContentItem();
    if (!active) return null;
    if (active.type === 'subject') {
      return active.item as Subject;
    }
    if (active.type === 'chapter') {
      const chapter = active.item as Chapter;
      return this.quizService.subjectsMap().get(chapter.subject_id) || null;
    }
    if (active.type === 'subchapter') {
      const subchapter = active.item as Subchapter;
      const chapter = this.quizService.chaptersMap().get(subchapter.chapter_id);
      if (!chapter) return null;
      return this.quizService.subjectsMap().get(chapter.subject_id) || null;
    }
    return null;
  }

  getLanguageName(lang: Language) { return this.t.translate(`languages.${lang}`); }

  // --- CRUD Handlers ---
  async handleSubjectSubmit() {
    if (this.subjectForm.invalid) return;
    this.isModalSaving.set(true);
    try {
      const formData = this.subjectForm.value;
      if (!formData.branch) {
        formData.branch = null;
      }
      if (formData.id) { // Update
        await this.supabase.updateSubject(formData.id, formData);
      } else { // Insert
        delete formData.id;
        await this.supabase.addSubject(formData);
      }
      this.toastService.show(this.t.translate('admin.toast.subjectSaved'), 'success');
      this.closeModal();
      await this.quizService.loadCoreData();
    } catch (error: any) {
        this.toastService.show(error.message, 'error');
    } finally {
        this.isModalSaving.set(false);
    }
  }

  async handleChapterSubmit() {
    if (this.chapterForm.invalid) return;
    this.isModalSaving.set(true);
    try {
      const formData = this.chapterForm.value;
      if (formData.id) {
        await this.supabase.updateChapter(formData.id, formData);
      } else {
        delete formData.id;
        await this.supabase.addChapter(formData);
      }
      this.toastService.show(this.t.translate('admin.toast.chapterSaved'), 'success');
      this.closeModal();
      await this.quizService.loadCoreData();
    } catch (error: any) {
        this.toastService.show(error.message, 'error');
    } finally {
        this.isModalSaving.set(false);
    }
  }

  async handleSubchapterSubmit() {
    if (this.subchapterForm.invalid) return;
    this.isModalSaving.set(true);
    try {
      const formData = this.subchapterForm.value;
      if (formData.id) {
        await this.supabase.updateSubchapter(formData.id, formData);
      } else {
        delete formData.id;
        await this.supabase.addSubchapter(formData);
      }
      this.toastService.show(this.t.translate('admin.toast.subchapterSaved'), 'success');
      this.closeModal();
      await this.quizService.loadCoreData();
    } catch (error: any) {
        this.toastService.show(error.message, 'error');
    } finally {
        this.isModalSaving.set(false);
    }
  }

  async handleQuestionSubmit() {
      if (this.questionForm.invalid) return;
      this.isModalSaving.set(true);
      try {
          const activeSubchapter = this.activeContentItem();
          if (activeSubchapter?.type !== 'subchapter') {
              throw new Error(this.t.translate('admin.errors.noSubchapterSelected'));
          }
          // FIX: Cast item to Subchapter to access chapter_id
          const subchapter = activeSubchapter.item as Subchapter;
          const chapter = this.quizService.chaptersMap().get(subchapter.chapter_id);
          const subject = this.quizService.subjectsMap().get(chapter!.subject_id);

          const formData = this.questionForm.value;
          const questionData = {
              ...formData,
              subchapter_id: activeSubchapter.item.id,
              chapter_id: chapter!.id,
              subject_id: subject!.id,
              grade: subject!.grade,
              branch: subject!.branch,
              language: subject!.language,
          };

          if (formData.id) {
              delete questionData.id;
              await this.supabase.updateQuestion(formData.id, questionData);
          } else {
              delete questionData.id;
              await this.supabase.addQuestion(questionData);
          }
          this.toastService.show(this.t.translate('admin.toast.questionAdded'), 'success');
          this.closeModal();
          await this.quizService.loadCoreData();
      } catch (error: any) {
          this.toastService.show(error.message, 'error');
      } finally {
          this.isModalSaving.set(false);
      }
  }

  // --- AI Curriculum Methods ---
  
  onPdfFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.aiPdfBuilderForm.patchValue({ pdfFile: file });
    }
  }

  onStudyGuidePdfSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.aiPdfStudyGuideGenForm.patchValue({ pdfFile: file });
    }
  }

  onBulkPdfFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.bulkGenerateForm.patchValue({ pdfFile: file });
    }
  }

  onBulkImageFilesSelected(event: any) {
    const files = event.target.files;
    if (files) {
      this.bulkGenerateForm.patchValue({ imageFiles: files });
    }
  }

  isBulkGenerateFormValid(): boolean {
    const { inputType, pdfFile, imageFiles, textContent } = this.bulkGenerateForm.value;
    if (inputType === 'pdf') return !!pdfFile;
    if (inputType === 'image') return !!imageFiles && imageFiles.length > 0;
    if (inputType === 'text') return !!textContent && textContent.trim().length > 0;
    return false;
  }

  isBulkGenerateSubjectFormValid(): boolean {
    const { inputType, pdfFile, imageFiles, textContent } = this.bulkGenerateSubjectForm.value;
    if (inputType === 'pdf') return !!pdfFile;
    if (inputType === 'image') return !!imageFiles && imageFiles.length > 0;
    if (inputType === 'text') return !!textContent && textContent.trim().length > 0;
    return false;
  }

  async handleBulkGenerate() {
    if (this.bulkGenerateForm.invalid || !this.activeContentItem() || this.activeContentItem()?.type !== 'chapter') return;
    
    const chapter = this.activeContentItem()!.item as Chapter;
    const subchapters = this.quizService.allSubchapters().filter(s => s.chapter_id === chapter.id);
    
    if (subchapters.length === 0) {
      this.bulkGenerateError.set(this.t.translate('admin.bulkGenerate.noSubchapters'));
      return;
    }

    const { inputType, pdfFile, imageFiles, textContent, forceOcr, useCheapModel, generateStudyGuides, generateQuestions } = this.bulkGenerateForm.value;
    
    if (inputType === 'pdf' && !pdfFile) return;
    if (inputType === 'image' && (!imageFiles || imageFiles.length === 0)) return;
    if (inputType === 'text' && !textContent.trim()) return;
    if (!generateStudyGuides && !generateQuestions) {
      this.bulkGenerateError.set("Please select at least one content type to generate.");
      return;
    }
    
    this.bulkGenerateState.set('uploading');
    this.bulkGenerateError.set(null);
    this.bulkGenerateLogs.set([]);
    this.pdfProcessingProgress.set(0);

    try {
      let pdfText = '';
      
      if (inputType === 'pdf') {
        this.bulkGenerateLogs.update(logs => [...logs, `Extracting text from PDF: ${pdfFile.name}...`]);
        const { text } = await this.extractTextFromPdf(pdfFile, forceOcr, useCheapModel);
        pdfText = text;
      } else if (inputType === 'image') {
        this.bulkGenerateLogs.update(logs => [...logs, `Extracting text from ${imageFiles.length} images...`]);
        const imageParts: { data: string, mimeType: string }[] = [];
        for (const file of Array.from(imageFiles as FileList)) {
          const base64 = await this.fileToBase64(file);
          imageParts.push({ data: base64, mimeType: file.type });
        }
        pdfText = await this.geminiService.extractTextFromImages(imageParts, undefined, useCheapModel);
      } else if (inputType === 'text') {
        pdfText = textContent;
      }
      
      this.bulkGenerateLogs.update(logs => [...logs, `Successfully extracted ${pdfText.length} characters.`]);
      this.bulkGenerateState.set('processing');

      const subject = this.quizService.allSubjects().find(s => s.id === chapter.subject_id);
      if (!subject) throw new Error("No active subject found.");

      // 2. Process each subchapter sequentially to avoid hitting Gemini API rate limits
      const CONCURRENCY_LIMIT = 1;
      for (let i = 0; i < subchapters.length; i += CONCURRENCY_LIMIT) {
        const chunk = subchapters.slice(i, i + CONCURRENCY_LIMIT);
        
        await Promise.all(chunk.map(async (subchapter) => {
          try {
            // Check if content already exists to avoid starting from first later
            const existingGuide = await this.supabase.getStudyGuideBySubchapterId(subchapter.id);
            const existingQuestions = await this.supabase.getQuestionsForSubchapter(subchapter.id);
            
            const hasGuide = !!existingGuide;
            const hasQuestions = existingQuestions.length > 0;

            if (hasGuide && hasQuestions) {
              this.bulkGenerateLogs.update(logs => [...logs, `Skipping ${subchapter.name}: Content already exists.`]);
              return;
            }

            // --- Generate Study Guide ---
            if (generateStudyGuides && !hasGuide) {
              this.bulkGenerateProgress.set({
                currentSubchapter: subchapter.name,
                step: 'guide',
                current: i + chunk.indexOf(subchapter) + 1,
                total: subchapters.length
              });
              
              this.bulkGenerateLogs.update(logs => [...logs, `Generating study guide for: ${subchapter.name}...`]);
              
              const studyGuideResult = await this.geminiService.generateStudyGuideFromContent({
                context: pdfText,
                language: subject.language,
                grade: subject.grade,
                subject: subject.name,
                chapter: chapter.name,
                subchapter: subchapter.name,
                skipImages: true,
                useCheapModel
              });
              
              // Save Study Guide
              await this.supabase.upsertStudyGuide({
                subchapter_id: subchapter.id,
                language: chapter.language,
                content: studyGuideResult.guide_html,
                isPublished: true
              });
              this.bulkGenerateLogs.update(logs => [...logs, `Saved study guide for: ${subchapter.name}`]);
            } else if (generateStudyGuides) {
              this.bulkGenerateLogs.update(logs => [...logs, `Study guide already exists for: ${subchapter.name}. Skipping generation.`]);
            }

            // --- Generate Questions ---
            if (generateQuestions && !hasQuestions) {
              this.bulkGenerateProgress.set({
                currentSubchapter: subchapter.name,
                step: 'questions',
                current: i + chunk.indexOf(subchapter) + 1,
                total: subchapters.length
              });
              
              this.bulkGenerateLogs.update(logs => [...logs, `Generating questions for: ${subchapter.name}...`]);
              
              const generatedQuestions = await this.geminiService.generateQuestions({
                textContent: pdfText,
                language: subject.language,
                grade: subject.grade,
                branch: subject.branch,
                subject: subject.name,
                chapter: chapter.name,
                subchapter: subchapter.name,
                count: 150, // Generate 150 questions per subchapter
                useCheapModel
              });
              
              // Save Questions
              const newQuestions: Omit<Question, 'id'>[] = generatedQuestions.map(q => ({
                ...q,
                grade: subject.grade,
                language: subject.language,
                branch: subject.branch,
                subject_id: subject.id,
                chapter_id: chapter.id,
                subchapter_id: subchapter.id,
                isPublished: true,
                created_at: new Date().toISOString()
              }));
              
              await this.supabase.addManyQuestions(newQuestions);
              this.bulkGenerateLogs.update(logs => [...logs, `Saved ${generatedQuestions.length} questions for: ${subchapter.name}`]);
            } else if (generateQuestions) {
              this.bulkGenerateLogs.update(logs => [...logs, `Questions already exist for: ${subchapter.name}. Skipping generation.`]);
            }
          } catch (err: any) {
            const errorMsg = `ERROR in ${subchapter.name}: ${err.message}`;
            this.bulkGenerateLogs.update(logs => [...logs, errorMsg]);
            // Create a more descriptive error to be caught by the outer handler
            const enhancedError = new Error(`Generation stopped at "${subchapter.name}": ${err.message}`);
            throw enhancedError;
          }
        }));

        if (i + CONCURRENCY_LIMIT < subchapters.length) {
          await new Promise(resolve => setTimeout(resolve, 1200));
        }
      }

      this.bulkGenerateState.set('complete');
      this.bulkGenerateLogs.update(logs => [...logs, `Bulk generation complete!`]);
      
      // Refresh data
      await this.quizService.loadCoreData();

    } catch (error: any) {
      console.error("Bulk generation error:", error);
      this.bulkGenerateState.set('error');
      this.bulkGenerateError.set(error.message || 'An error occurred during bulk generation.');
      this.bulkGenerateLogs.update(logs => [...logs, `ERROR: ${error.message}`]);
    }
  }
  
  onBulkSubjectPdfFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.bulkGenerateSubjectForm.patchValue({ pdfFile: file });
    }
  }

  onBulkSubjectImageFilesSelected(event: any) {
    const files = event.target.files;
    if (files) {
      this.bulkGenerateSubjectForm.patchValue({ imageFiles: files });
    }
  }

  onBulkSubjectGuidesPdfFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.bulkGenerateSubjectGuidesForm.patchValue({ pdfFile: file });
    }
  }

  onBulkSubjectGuidesImageFilesSelected(event: any) {
    const files = event.target.files;
    if (files) {
      this.bulkGenerateSubjectGuidesForm.patchValue({ imageFiles: files });
    }
  }

  isBulkGenerateSubjectGuidesFormValid(): boolean {
    const { inputType, pdfFile, imageFiles, textContent } = this.bulkGenerateSubjectGuidesForm.value;
    if (inputType === 'pdf') return !!pdfFile;
    if (inputType === 'image') return !!imageFiles && imageFiles.length > 0;
    if (inputType === 'text') return !!textContent && textContent.trim().length > 0;
    if (inputType === 'saved') return true;
    if (inputType === 'questions') return true;
    return false;
  }

  async handleBulkGenerateSubject() {
    if (this.bulkGenerateSubjectForm.invalid || !this.activeContentItem() || this.activeContentItem()?.type !== 'subject') return;
    
    const subject = this.activeContentItem()!.item as Subject;
    const { 
      inputType, pdfFile, imageFiles, textContent, forceOcr, 
      useCheapModel, generateStudyGuides, generateQuestions, autoSyncToArabic 
    } = this.bulkGenerateSubjectForm.value;
    
    if (inputType === 'pdf' && !pdfFile) return;
    if (inputType === 'image' && (!imageFiles || imageFiles.length === 0)) return;
    if (inputType === 'text' && !textContent.trim()) return;
    if (!generateStudyGuides && !generateQuestions) {
      this.bulkGenerateSubjectError.set("Please select at least one content type to generate.");
      return;
    }
    
    this.bulkGenerateSubjectState.set('uploading');
    this.bulkGenerateSubjectError.set(null);
    this.bulkGenerateSubjectLogs.set([]);
    this.pdfProcessingProgress.set(0);

    try {
      let pdfText = '';
      
      if (inputType === 'pdf') {
        this.bulkGenerateSubjectLogs.update(logs => [...logs, `Extracting text from PDF: ${pdfFile.name}...`]);
        const { text } = await this.extractTextFromPdf(pdfFile, forceOcr, useCheapModel);
        pdfText = text;
      } else if (inputType === 'image') {
        this.bulkGenerateSubjectLogs.update(logs => [...logs, `Extracting text from ${imageFiles.length} images...`]);
        const imageParts: { data: string, mimeType: string }[] = [];
        for (const file of Array.from(imageFiles as FileList)) {
          const base64 = await this.fileToBase64(file);
          imageParts.push({ data: base64, mimeType: file.type });
        }
        pdfText = await this.geminiService.extractTextFromImages(imageParts, undefined, useCheapModel);
      } else if (inputType === 'text') {
        pdfText = textContent;
      }
      
      this.bulkGenerateSubjectLogs.update(logs => [...logs, `Successfully extracted ${pdfText.length} characters.`]);
      this.bulkGenerateSubjectState.set('processing');

      // 2. Generate Curriculum Structure from PDF text
      this.bulkGenerateSubjectLogs.update(logs => [...logs, `Analyzing PDF to generate curriculum structure...`]);
      
      const curriculum = await this.geminiService.generateCurriculumFromText({
        grade: subject.grade,
        language: subject.language,
        branch: subject.branch || null,
        contextText: pdfText,
        useCheapModel
      });

      this.bulkGenerateSubjectLogs.update(logs => [...logs, `Generated structure with ${curriculum.chapters.length} chapters.`]);

      // 3. Save Chapters and Subchapters to Database (Idempotent)
      const existingChapters = await this.supabase.getChaptersForSubject(subject.id);
      const newChapters = [];
      let totalSubchapters = 0;

      for (const chapterData of curriculum.chapters) {
        let chapter = existingChapters.find(c => c.name.toLowerCase() === chapterData.name.toLowerCase());
        
        if (!chapter) {
          chapter = await this.supabase.addChapter({
            name: chapterData.name,
            subject_id: subject.id,
            language: subject.language
          });
          this.bulkGenerateSubjectLogs.update(logs => [...logs, `Created new chapter: ${chapterData.name}`]);
        } else {
          this.bulkGenerateSubjectLogs.update(logs => [...logs, `Using existing chapter: ${chapterData.name}`]);
        }
        
        const existingSubchapters = await this.supabase.getSubchaptersForChapter(chapter.id);
        const subchaptersWithSource = [];
        
        for (const subchapterData of chapterData.subchapters) {
          let subchapter = existingSubchapters.find(s => s.name.toLowerCase() === subchapterData.name.toLowerCase());
          
          if (!subchapter) {
            subchapter = await this.supabase.addSubchapter({
              name: subchapterData.name,
              chapter_id: chapter.id,
              language: subject.language,
              isPublished: true
            });
            this.bulkGenerateSubjectLogs.update(logs => [...logs, `Created new subchapter: ${subchapterData.name}`]);
          } else {
            this.bulkGenerateSubjectLogs.update(logs => [...logs, `Using existing subchapter: ${subchapterData.name}`]);
          }
          
          subchaptersWithSource.push({
            dbSubchapter: subchapter,
            sourceText: subchapterData.source_text || pdfText
          });
          totalSubchapters++;
        }
        
        newChapters.push({ chapter, subchapters: subchaptersWithSource });
      }

      if (totalSubchapters === 0) {
          this.bulkGenerateSubjectError.set(this.t.translate('admin.bulkGenerateSubject.noSubchaptersGenerated'));
          this.bulkGenerateSubjectState.set('error');
          return;
      }

      // 4. Process each chapter and subchapter
      let processedSubchapters = 0;
      
      const allTasks = [];
      for (const { chapter, subchapters } of newChapters) {
        for (const { dbSubchapter: subchapter, sourceText } of subchapters) {
          allTasks.push({ chapter, subchapter, sourceText });
        }
      }

      const CONCURRENCY_LIMIT = 1;
      for (let i = 0; i < allTasks.length; i += CONCURRENCY_LIMIT) {
        const chunk = allTasks.slice(i, i + CONCURRENCY_LIMIT);
        
        await Promise.all(chunk.map(async ({ chapter, subchapter, sourceText }) => {
          try {
            // Check if content already exists to avoid starting from first later
            const existingGuide = await this.supabase.getStudyGuideBySubchapterId(subchapter.id);
            const existingQuestions = await this.supabase.getQuestionsForSubchapter(subchapter.id);
            
            const hasGuide = !!existingGuide;
            const hasQuestions = existingQuestions.length > 0;

            if (hasGuide && hasQuestions) {
              this.bulkGenerateSubjectLogs.update(logs => [...logs, `Skipping ${subchapter.name}: Content already exists.`]);
              processedSubchapters++;
              return;
            }

            // --- Generate Study Guide ---
            if (generateStudyGuides && !hasGuide) {
              this.bulkGenerateSubjectProgress.set({
                currentChapter: chapter.name,
                currentSubchapter: subchapter.name,
                step: 'guide',
                current: processedSubchapters + 1,
                total: totalSubchapters
              });
              
              this.bulkGenerateSubjectLogs.update(logs => [...logs, `Generating study guide for: ${chapter.name} - ${subchapter.name}...`]);
              
              const studyGuideResult = await this.geminiService.generateStudyGuideFromContent({
                context: pdfText, // Use full pdfText so Gemini has all the info
                language: subject.language,
                grade: subject.grade,
                subject: subject.name,
                chapter: chapter.name,
                subchapter: subchapter.name,
                skipImages: true,
                useCheapModel
              });
              
              // Save Study Guide
              await this.supabase.upsertStudyGuide({
                subchapter_id: subchapter.id,
                language: subject.language,
                content: studyGuideResult.guide_html,
                isPublished: true
              });
              this.bulkGenerateSubjectLogs.update(logs => [...logs, `Saved study guide for: ${subchapter.name}`]);
            } else if (generateStudyGuides) {
              this.bulkGenerateSubjectLogs.update(logs => [...logs, `Study guide already exists for: ${subchapter.name}. Skipping generation.`]);
            }

            // --- Generate Questions ---
            if (generateQuestions && !hasQuestions) {
              this.bulkGenerateSubjectProgress.set({
                currentChapter: chapter.name,
                currentSubchapter: subchapter.name,
                step: 'questions',
                current: processedSubchapters + 1,
                total: totalSubchapters
              });
              
              this.bulkGenerateSubjectLogs.update(logs => [...logs, `Generating questions for: ${chapter.name} - ${subchapter.name}...`]);
              
              const generatedQuestions = await this.geminiService.generateQuestions({
                textContent: pdfText, // Use full pdfText so Gemini has all the info
                language: subject.language,
                grade: subject.grade,
                branch: subject.branch,
                subject: subject.name,
                chapter: chapter.name,
                subchapter: subchapter.name,
                count: 150, // Generate 150 questions per subchapter
                useCheapModel
              });
              
              // Save Questions
              const newQuestions: Omit<Question, 'id'>[] = generatedQuestions.map(q => ({
                ...q,
                grade: subject.grade,
                language: subject.language,
                branch: subject.branch,
                subject_id: subject.id,
                chapter_id: chapter.id,
                subchapter_id: subchapter.id,
                isPublished: true,
                created_at: new Date().toISOString()
              }));
              
              await this.supabase.addManyQuestions(newQuestions);
              this.bulkGenerateSubjectLogs.update(logs => [...logs, `Saved ${generatedQuestions.length} questions for: ${subchapter.name}`]);
            } else if (generateQuestions) {
              this.bulkGenerateSubjectLogs.update(logs => [...logs, `Questions already exist for: ${subchapter.name}. Skipping generation.`]);
            }
            
            processedSubchapters++;
          } catch (err: any) {
            const errorMsg = `ERROR in ${chapter.name} - ${subchapter.name}: ${err.message}`;
            this.bulkGenerateSubjectLogs.update(logs => [...logs, errorMsg]);
            // Create a more descriptive error to be caught by the outer handler
            const enhancedError = new Error(`Generation stopped at "${chapter.name} - ${subchapter.name}": ${err.message}`);
            throw enhancedError;
          }
        }));

        if (i + CONCURRENCY_LIMIT < allTasks.length) {
          await new Promise(resolve => setTimeout(resolve, 1200));
        }
      }

      this.bulkGenerateSubjectState.set('complete');
      this.bulkGenerateSubjectLogs.update(logs => [...logs, `Bulk generation complete!`]);
      
      // Refresh data
      await this.quizService.loadCoreData();

      if (autoSyncToArabic && subject.language === 'en') {
        this.bulkGenerateSubjectLogs.update(logs => [...logs, 'Auto-sync to Arabic version requested. Starting sync process...']);
        try {
          await this.syncEnglishSubjectToArabic(subject);
          this.toastService.show('Bulk generation and auto-sync to Arabic completed!', 'success');
        } catch (syncErr: any) {
          console.error('Auto-sync error during bulk generation:', syncErr);
          this.bulkGenerateSubjectLogs.update(logs => [...logs, `Sync Warning: ${syncErr.message}. All English content is saved though.`]);
          this.toastService.show('English generation complete, but auto-sync failed. You can try manual sync.', 'info');
        }
      } else {
        this.toastService.show(this.t.translate('admin.bulkGenerateSubject.completed'), 'success');
        this.closeModal();
      }

    } catch (error: any) {
      console.error("Bulk generation error:", error);
      this.bulkGenerateSubjectState.set('error');
      this.bulkGenerateSubjectError.set(error.message || 'An error occurred during bulk generation.');
      this.bulkGenerateSubjectLogs.update(logs => [...logs, `ERROR: ${error.message}`]);
    }
  }

  async handleBulkGenerateSubjectGuides() {
    if (this.bulkGenerateSubjectGuidesForm.invalid || !this.activeContentItem() || this.activeContentItem()?.type !== 'subject') return;
    
    const subject = this.activeContentItem()!.item as Subject;
    const chapters = this.quizService.allChapters().filter(c => c.subject_id === subject.id);
    const chapterIds = chapters.map(c => c.id);
    const subchapters = this.quizService.allSubchapters().filter(s => chapterIds.includes(s.chapter_id));
    
    if (subchapters.length === 0) {
      this.bulkGenerateSubjectGuidesError.set("This subject doesn't have any chapters or subchapters setup yet. Please add them first.");
      return;
    }

    const { inputType, pdfFile, imageFiles, textContent, forceOcr, useCheapModel, generateImages } = this.bulkGenerateSubjectGuidesForm.value;
    
    if (inputType === 'pdf' && !pdfFile) return;
    if (inputType === 'image' && (!imageFiles || imageFiles.length === 0)) return;
    if (inputType === 'text' && !textContent.trim()) return;
    
    this.bulkGenerateSubjectGuidesState.set(inputType === 'saved' || inputType === 'questions' ? 'processing' : 'uploading');
    this.bulkGenerateSubjectGuidesError.set(null);
    this.bulkGenerateSubjectGuidesLogs.set([]);
    this.pdfProcessingProgress.set(0);

    try {
      let pdfText = '';
      let images: { data: string, mimeType: string }[] = [];
      
      if (inputType === 'pdf') {
        this.bulkGenerateSubjectGuidesLogs.update(logs => [...logs, `Extracting text from PDF: ${pdfFile.name}...`]);
        const { text, images: extractedImages } = await this.extractTextFromPdf(pdfFile, forceOcr, useCheapModel);
        pdfText = text;
        images = extractedImages;
        this.bulkGenerateSubjectGuidesLogs.update(logs => [...logs, `Successfully extracted ${pdfText.length} characters.`]);
        this.bulkGenerateSubjectGuidesState.set('processing');
      } else if (inputType === 'image') {
        this.bulkGenerateSubjectGuidesLogs.update(logs => [...logs, `Extracting text from ${imageFiles.length} images...`]);
        const imageParts: { data: string, mimeType: string }[] = [];
        for (const file of Array.from(imageFiles as FileList)) {
          const base64 = await this.fileToBase64(file);
          imageParts.push({ data: base64, mimeType: file.type });
        }
        pdfText = await this.geminiService.extractTextFromImages(imageParts, undefined, useCheapModel);
        images = imageParts;
        this.bulkGenerateSubjectGuidesLogs.update(logs => [...logs, `Successfully extracted ${pdfText.length} characters.`]);
        this.bulkGenerateSubjectGuidesState.set('processing');
      } else if (inputType === 'text') {
        pdfText = textContent;
        this.bulkGenerateSubjectGuidesLogs.update(logs => [...logs, `Successfully extracted ${pdfText.length} characters.`]);
        this.bulkGenerateSubjectGuidesState.set('processing');
      } else if (inputType === 'saved') {
        this.bulkGenerateSubjectGuidesLogs.update(logs => [...logs, `Initializing bulk generator using saved texts inside each subchapter...`]);
      } else if (inputType === 'questions') {
        this.bulkGenerateSubjectGuidesLogs.update(logs => [...logs, `Initializing bulk generator using generated questions inside each subchapter...`]);
      }

      // Process each subchapter sequentially to avoid hitting Gemini API rate limits
      const CONCURRENCY_LIMIT = 1;
      for (let i = 0; i < subchapters.length; i += CONCURRENCY_LIMIT) {
        const chunk = subchapters.slice(i, i + CONCURRENCY_LIMIT);
        
        await Promise.all(chunk.map(async (subchapter) => {
          try {
            const ch = chapters.find(c => c.id === subchapter.chapter_id);
            if (!ch) return;

            this.bulkGenerateSubjectGuidesProgress.set({
              currentChapter: ch.name,
              currentSubchapter: subchapter.name,
              current: i + chunk.indexOf(subchapter) + 1,
              total: subchapters.length
            });

            this.bulkGenerateSubjectGuidesLogs.update(logs => [...logs, `Generating study guide for: ${ch.name} - ${subchapter.name}...`]);

            let contextToUse = pdfText;
            let imagesToUse = images.length > 0 ? images : undefined;

            if (inputType === 'saved') {
              const existingGuide = await this.supabase.getStudyGuideBySubchapterId(subchapter.id);
              if (!existingGuide || !existingGuide.source_text?.trim()) {
                this.bulkGenerateSubjectGuidesLogs.update(logs => [...logs, `⚠️ Skipped "${subchapter.name}": No saved text content found.`]);
                return; // skip this subchapter
              }
              contextToUse = existingGuide.source_text;
              imagesToUse = undefined;
            } else if (inputType === 'questions') {
              const questionsList = await this.supabase.getQuestionsForSubchapter(subchapter.id);
              if (!questionsList || questionsList.length === 0) {
                this.bulkGenerateSubjectGuidesLogs.update(logs => [...logs, `⚠️ Skipped "${subchapter.name}": No generated questions found.`]);
                return; // skip this subchapter
              }
              this.bulkGenerateSubjectGuidesLogs.update(logs => [...logs, `Found ${questionsList.length} questions for "${subchapter.name}". Formulating context...`]);
              
              let formulatedText = `IMPORTANT CONCEPTS & REVIEW QUESTIONS FOR ${subchapter.name.toUpperCase()}:\n\n`;
              questionsList.forEach((q, idx) => {
                formulatedText += `Question ${idx + 1}: ${q.text}\n`;
                if (q.options && q.options.length > 0) {
                  q.options.forEach((opt, optIdx) => {
                    const prefix = String.fromCharCode(65 + optIdx);
                    const isCorrect = optIdx === q.correctAnswerIndex ? ' (CORRECT ANSWER)' : '';
                    formulatedText += `  [${prefix}] ${opt}${isCorrect}\n`;
                  });
                }
                if (q.explanation) {
                  formulatedText += `Explanation/Context: ${q.explanation}\n`;
                }
                formulatedText += `\n`;
              });
              
              contextToUse = formulatedText;
              imagesToUse = undefined;
            }

            const params: StudyGuideContentGenerationParams = {
              context: contextToUse,
              language: subject.language,
              grade: subject.grade,
              subject: subject.name,
              chapter: ch.name,
              subchapter: subchapter.name,
              images: imagesToUse,
              skipImages: !generateImages,
              useCheapModel
            };

            const studyGuideResult = await this.geminiService.generateStudyGuideFromContent(params);
            let finalHtml = studyGuideResult.guide_html;

            // Generate visuals/illustrations if turned on and AI returned image prompts
            const image_prompts = studyGuideResult.image_prompts;
            if (generateImages && image_prompts && image_prompts.length > 0) {
              this.bulkGenerateSubjectGuidesLogs.update(logs => [...logs, `Generating ${image_prompts.length} visual aid illustrations for ${subchapter.name}...`]);
              
              const imagePromises = image_prompts.map(async (img) => {
                try {
                  const imageResult = await this.geminiService.generateImage(img.prompt);
                  if (imageResult && imageResult.data) {
                    const mime = imageResult.mimeType || 'image/png';
                    const byteCharacters = atob(imageResult.data);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let j = 0; j < byteCharacters.length; j++) {
                      byteNumbers[j] = byteCharacters.charCodeAt(j);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    const blob = new Blob([byteArray], { type: mime });

                    const fileName = `study-guides/${subchapter.id}/${img.id}_${Date.now()}.png`;
                    const url = await this.supabase.uploadFile(fileName, blob);
                    
                    const tagRegex = new RegExp(`(<img[^>]*id\\s*=\\s*["']?${img.id}["']?[^>]*>)`, 'gi');
                    finalHtml = finalHtml.replace(tagRegex, (match) => {
                      if (match.match(/src\s*=\s*["']/i)) {
                        return match.replace(/(src\s*=\s*["'])(.*?)(["'])/i, `$1${url}$3`);
                      } else if (match.match(/src\s*=\s*/i)) {
                        return match.replace(/(src\s*=\s*)([^\s>]+)/i, `$1${url}`);
                      } else {
                        const endTag = match.endsWith('/>') ? '/>' : '>';
                        const baseTag = match.slice(0, match.length - endTag.length);
                        return `${baseTag} src="${url}"${endTag}`;
                      }
                    });
                  }
                } catch (imgErr: any) {
                  this.bulkGenerateSubjectGuidesLogs.update(logs => [...logs, `Warning: Failed to generate/replace graphic ID "${img.id}": ${imgErr.message}`]);
                }
              });

              await Promise.all(imagePromises);
            }

            // Save standard styled study guide to database
            await this.supabase.upsertStudyGuide({
              subchapter_id: subchapter.id,
              language: subject.language,
              content: finalHtml,
              isPublished: true
            });

            this.bulkGenerateSubjectGuidesLogs.update(logs => [...logs, `Saved study guide for: ${subchapter.name}`]);
          } catch (err: any) {
            const errorMsg = `ERROR in subchapter "${subchapter.name}": ${err.message}`;
            this.bulkGenerateSubjectGuidesLogs.update(logs => [...logs, errorMsg]);
            // Propagate the error so Admin knows it failed at this chunk
            throw new Error(`Generation failed at subchapter "${subchapter.name}": ${err.message}`);
          }
        }));

        if (i + CONCURRENCY_LIMIT < subchapters.length) {
          await new Promise(resolve => setTimeout(resolve, 1200));
        }
      }

      this.bulkGenerateSubjectGuidesState.set('complete');
      this.bulkGenerateSubjectGuidesLogs.update(logs => [...logs, `Bulk study guide generation complete!`]);
      
      // Refresh data
      await this.quizService.loadCoreData();
      this.toastService.show("Bulk study guide generation completed successfully!", "success");
      this.closeModal();

    } catch (error: any) {
      console.error("Bulk study guide generation error:", error);
      this.bulkGenerateSubjectGuidesState.set('error');
      this.bulkGenerateSubjectGuidesError.set(error.message || 'An error occurred during bulk generation.');
      this.bulkGenerateSubjectGuidesLogs.update(logs => [...logs, `ERROR: ${error.message}`]);
    }
  }

  async handleGenerateCurriculum() {
    if (this.aiBuilderForm.invalid) return;
    this.aiBuilderState.set('loading');
    this.aiBuilderError.set(null);
    try {
        const params = this.aiBuilderForm.value;
        const result = await this.geminiService.generateCurriculumStructure({
            grade: params.grade!,
            language: params.language!,
            branch: params.branch || null,
            subjectDescription: params.subjectDescription!,
            useCheapModel: params.useCheapModel
        });
        this.generatedCurriculum.set(result);
        this.aiBuilderState.set('review');
    } catch (error: any) {
        this.aiBuilderError.set(error.message || this.t.translate('admin.aiCurriculumBuilder.toast.error'));
        this.aiBuilderState.set('form');
    }
  }

    private async extractTextFromPdf(file: File, forceOcr: boolean, useCheapModel: boolean = false): Promise<{ text: string, images: { data: string, mimeType: string }[] }> {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ 
            data: arrayBuffer,
            stopAtErrors: false 
        }).promise;
        let fullText = '';
        let hasFoundText = false;
        const totalPages = pdf.numPages;
        const images: { data: string, mimeType: string }[] = [];

        // Always render pages to images as requested by the user
        const pagePromises = [];
        let processedPages = 0;
        
        // We'll process in chunks to avoid overwhelming memory
        const CONCURRENCY_LIMIT = 5;
        const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
        
        for (let i = 0; i < pages.length; i += CONCURRENCY_LIMIT) {
            const chunk = pages.slice(i, i + CONCURRENCY_LIMIT);
            
            await Promise.all(chunk.map(async (pageNum) => {
                const page = await pdf.getPage(pageNum);
                const viewport = page.getViewport({ scale: 2.0 });
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                let imageData = null;
                if (context) {
                    await page.render({ canvasContext: context, viewport: viewport } as any).promise;
                    imageData = {
                        data: canvas.toDataURL('image/jpeg', 0.8).split(',')[1],
                        mimeType: 'image/jpeg',
                        pageNum
                    };
                }

                let pageText = '';
                if (!forceOcr) {
                    const textContent = await page.getTextContent();
                    if (textContent.items.length > 0) {
                        hasFoundText = true;
                    }
                    pageText = textContent.items.map((item: any) => ('str' in item ? item.str : '')).join(' ');
                }
                
                processedPages++;
                this.pdfProcessingState.set(this.t.translate('admin.pdf.ocr_rendering', { processed: processedPages, total: totalPages }));
                this.pdfProcessingProgress.set(Math.round((processedPages / totalPages) * 50)); // 0-50% for rendering
                
                return { imageData, pageText, pageNum };
            })).then(results => {
                // Store results to maintain order later
                pagePromises.push(...results);
            });
        }
        
        // Sort by page number to maintain order
        pagePromises.sort((a, b) => a.pageNum - b.pageNum);
        
        for (const result of pagePromises) {
            if (result.imageData) {
                images.push({ data: result.imageData.data, mimeType: result.imageData.mimeType });
            }
            if (!forceOcr) {
                fullText += result.pageText + '\n\n';
            }
        }

        if (forceOcr || !hasFoundText || fullText.trim().length < 100) {
            fullText = await this.geminiService.extractTextFromImages(images, (processed) => {
                this.pdfProcessingState.set(this.t.translate('admin.pdf.ocr_extracting_pages', { processed, total: images.length }));
                this.pdfProcessingProgress.set(50 + Math.round((processed / images.length) * 50)); // 50-100% for OCR
            }, useCheapModel);
        }

        if (!fullText.trim()) {
            throw new Error(this.t.translate('admin.pdfError'));
        }

        return { text: fullText, images };
    }

    // FIX: This method was incomplete, causing a syntax error. It's now fully implemented.
    async handleGenerateCurriculumFromPdf() {
    if (this.aiPdfBuilderForm.invalid) return;

    this.modalState.update(s => ({ ...s!, type: 'ai_curriculum_builder' }));
    this.aiBuilderState.set('loading');
    this.aiBuilderError.set(null);
    this.pdfProcessingState.set(this.t.translate('admin.pdf.extracting_start'));
    this.pdfProcessingProgress.set(0);

    const { pdfFile, forceOcr, useCheapModel, ...formValues } = this.aiPdfBuilderForm.value;
    this.currentPdfFile.set(pdfFile);
    this.aiBuilderForm.patchValue(formValues); // Copy form values for saving

    try {
        const { text: fullText } = await this.extractTextFromPdf(pdfFile!, forceOcr, useCheapModel);

        this.pdfProcessingState.set(this.t.translate('admin.generating'));
        const curriculumParams = this.aiBuilderForm.value;
        const result = await this.geminiService.generateCurriculumFromText({
            grade: curriculumParams.grade!,
            language: curriculumParams.language!,
            branch: curriculumParams.branch || null,
            contextText: fullText,
            useCheapModel
        });

        this.generatedCurriculum.set(result);
        this.aiBuilderState.set('review');
    } catch (error: any) {
        this.aiBuilderError.set(error.message || this.t.translate('admin.pdfError'));
        this.aiBuilderState.set('form');
        // Revert modal type so user sees PDF upload form again on error
        this.modalState.update(s => s ? { ...s, type: 'ai_import_curriculum_pdf' } : null);
    } finally {
        this.pdfProcessingState.set(null);
        this.pdfProcessingProgress.set(0);
    }
  }

  onPdfGuideFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.pdfGuideForm.patchValue({ pdfFile: file });
    }
  }

  async handlePdfGuideUpload() {
    if (this.pdfGuideForm.invalid || !this.activeContentItem() || this.activeContentItem()?.type !== 'subchapter') return;

    const subchapter = this.activeContentItem()!.item as Subchapter;
    const { pdfFile } = this.pdfGuideForm.value;

    this.isUploadingPdfGuide.set(true);
    this.pdfGuideUploadProgress.set(0);
    this.pdfGuideUploadStatus.set('Processing PDF...');

    try {
      // 1. Extract images from PDF
      const { images } = await this.extractTextFromPdf(pdfFile, true); // forceOcr=true to get images
      
      this.pdfGuideUploadStatus.set(`Uploading ${images.length} pages...`);
      const pageImages: { url: string; pageNumber: number }[] = [];

      // 2. Upload each image
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        const pageNumber = i + 1;
        this.pdfGuideUploadProgress.set(Math.round((i / images.length) * 100));
        this.pdfGuideUploadStatus.set(`Uploading page ${pageNumber} of ${images.length}...`);

        const fileName = `study-guides/${subchapter.id}/page-${pageNumber}-${Date.now()}.jpg`;
        const blob = this.base64ToBlob(image.data, image.mimeType);
        const url = await this.supabase.uploadFile(fileName, blob);
        
        pageImages.push({ url, pageNumber });
      }

      // 3. Upsert Study Guide
      this.pdfGuideUploadStatus.set('Saving study guide...');
      await this.supabase.upsertStudyGuide({
        subchapter_id: subchapter.id,
        language: subchapter.language,
        page_images: pageImages,
        isPublished: true
      });

      this.toastService.show('PDF Study Guide uploaded successfully!', 'success');
      this.closeModal();
      await this.quizService.loadCoreData();
    } catch (error: any) {
      console.error('PDF Guide Upload Error:', error);
      this.toastService.show(error.message || 'Failed to upload PDF guide', 'error');
    } finally {
      this.isUploadingPdfGuide.set(false);
      this.pdfGuideUploadStatus.set(null);
      this.pdfGuideUploadProgress.set(0);
    }
  }

  private base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  updateCurriculumItem(type: 'subject' | 'chapter' | 'subchapter', event: Event, chapterIndex?: number, subchapterIndex?: number) {
    const value = (event.target as HTMLInputElement).value;
    this.generatedCurriculum.update(curriculum => {
      if (!curriculum) return null;
      
      const newCurriculum = JSON.parse(JSON.stringify(curriculum)); // Deep copy

      if (type === 'subject') {
        newCurriculum.subjectName = value;
      } else if (type === 'chapter' && chapterIndex !== undefined) {
        newCurriculum.chapters[chapterIndex].name = value;
      } else if (type === 'subchapter' && chapterIndex !== undefined && subchapterIndex !== undefined) {
        newCurriculum.chapters[chapterIndex].subchapters[subchapterIndex].name = value;
      }
      return newCurriculum;
    });
  }

  deleteCurriculumItem(type: 'chapter' | 'subchapter', chapterIndex: number, subchapterIndex?: number) {
    this.generatedCurriculum.update(curriculum => {
      if (!curriculum) return null;

      const newCurriculum = JSON.parse(JSON.stringify(curriculum)); // Deep copy

      if (type === 'chapter') {
        newCurriculum.chapters.splice(chapterIndex, 1);
      } else if (type === 'subchapter' && subchapterIndex !== undefined) {
        newCurriculum.chapters[chapterIndex].subchapters.splice(subchapterIndex, 1);
      }
      return newCurriculum;
    });
  }
  
  async saveGeneratedCurriculum() {
    const curriculum = this.generatedCurriculum();
    const builderParams = this.aiBuilderForm.value;
    if (!curriculum || !builderParams.grade || !builderParams.language) return;

    this.aiBuilderState.set('saving');
    this.aiBuilderError.set(null);

    try {
      // 1. Get or Create the subject
      let targetSubject: Subject;
      const modalData = this.modalState()?.data;
      
      if (modalData && modalData.id && this.modalState()?.type === 'ai_import_curriculum_pdf') {
        targetSubject = modalData;
      } else {
        targetSubject = await this.supabase.addSubject({
          name: curriculum.subjectName,
          grade: builderParams.grade,
          language: builderParams.language,
          branch: builderParams.branch || null
        });
      }

      // 2. Create chapters and subchapters
      const existingChapters = await this.supabase.getChaptersForSubject(targetSubject.id);
      
      const pdfFile = this.currentPdfFile();
      let pdf: any = null;
      if (pdfFile) {
        const arrayBuffer = await pdfFile.arrayBuffer();
        pdf = await pdfjsLib.getDocument({ 
            data: arrayBuffer,
            stopAtErrors: false 
        }).promise;
      }

      for (const chapterData of curriculum.chapters) {
        let targetChapter = existingChapters.find(c => c.name.toLowerCase() === chapterData.name.toLowerCase());
        
        if (!targetChapter) {
          targetChapter = await this.supabase.addChapter({
            name: chapterData.name,
            subject_id: targetSubject.id,
            language: targetSubject.language
          });
        }

        const existingSubchapters = await this.supabase.getSubchaptersForChapter(targetChapter.id);
        
        for (const subchapterSource of chapterData.subchapters) {
          let targetSubchapter = existingSubchapters.find(s => s.name.toLowerCase() === subchapterSource.name.toLowerCase());
          
          if (!targetSubchapter) {
            targetSubchapter = await this.supabase.addSubchapter({
              name: subchapterSource.name,
              chapter_id: targetChapter.id,
              language: targetSubject.language,
              isPublished: true
            });
          }

          const pageImages: { url: string; pageNumber: number }[] = [];
          
          if (pdf && subchapterSource.page_numbers?.length > 0) {
            this.pdfProcessingState.set(this.t.translate('admin.pdf.rendering_pages', { subchapter: subchapterSource.name }));
            for (const pageNum of subchapterSource.page_numbers) {
              try {
                if (pageNum < 1 || pageNum > pdf.numPages) continue;

                const page = await pdf.getPage(pageNum);
                const viewport = page.getViewport({ scale: 2.0 });
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                if (context) {
                  await page.render({ canvasContext: context, viewport: viewport } as any).promise;
                  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
                  if (blob) {
                    const path = `study_guides/${targetSubchapter.id}/page_${pageNum}.png`;
                    const url = await this.supabase.uploadFile(path, blob);
                    pageImages.push({ url, pageNumber: pageNum });
                  }
                }
              } catch (err) {
                console.error(`Error rendering page ${pageNum} for subchapter ${targetSubchapter.id}`, err);
              }
            }
          }

          if (subchapterSource.source_text?.trim() || pageImages.length > 0) {
              const guideData: any = {
                  subchapter_id: targetSubchapter.id,
                  language: targetSubject.language,
                  source_text: subchapterSource.source_text,
                  isPublished: true
              };
              if (pageImages.length > 0) {
                  guideData.page_images = pageImages;
              }
              await this.supabase.upsertStudyGuide(guideData);
          }
        }
      }

      this.toastService.show(this.t.translate('admin.aiCurriculumBuilder.toast.curriculumSaved'), 'success');
      this.closeModal();
      await this.quizService.loadCoreData(); // Reload all data

    } catch (error: any) {
      this.aiBuilderError.set(error.message);
      this.aiBuilderState.set('review'); // Go back to review on error
    }
  }

  // --- AI Question Generation Methods ---
  
  onImageFileSelected(event: Event) {
    const files = (event.target as HTMLInputElement).files;
    if (files) {
      this.aiImageGenForm.patchValue({ imageFiles: files });
    }
  }
  
  onPdfFileSelectedForQuestions(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.aiPdfGenForm.patchValue({ pdfFile: file });
    }
  }

  async handleGenerateQuestions() {
    if (this.aiQuestionGenForm.invalid) return;
    this.aiQuestionGenState.set('loading');
    this.aiQuestionGenError.set(null);
    try {
      const active = this.activeContentItem();
      if (active?.type !== 'subchapter') throw new Error(this.t.translate('admin.errors.noSubchapterSelected'));

      // FIX: Cast item to Subchapter
      const subchapter = active.item as Subchapter;
      const chapter = this.quizService.chaptersMap().get(subchapter.chapter_id);
      if (!chapter) throw new Error('Could not find chapter');
      const subject = this.quizService.subjectsMap().get(chapter.subject_id);
      if (!subject) throw new Error('Could not find subject');
      
      const { textContent, count, useCheapModel } = this.aiQuestionGenForm.value;
      
      // Fetch images from study guide if available
      const studyGuide = this.quizService.allStudyGuides().find(g => g.subchapter_id === subchapter.id);
      const images: { data: string; mimeType: string }[] = [];
      
      if (studyGuide?.page_images) {
        for (const img of studyGuide.page_images) {
          try {
            const response = await fetch(img.url);
            const blob = await response.blob();
            const base64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
              reader.readAsDataURL(blob);
            });
            images.push({ data: base64, mimeType: blob.type });
          } catch (err) {
            console.error('Error fetching study guide image:', err);
          }
        }
      }

      const params: QuestionGenerationParams = {
        textContent: textContent!,
        count: count!,
        language: subject.language,
        grade: subject.grade,
        branch: subject.branch || undefined,
        subject: subject.name,
        chapter: chapter.name,
        subchapter: active.item.name,
        images: images.length > 0 ? images : undefined,
        useCheapModel
      };
      
      const questions = await this.geminiService.generateQuestions(params);
      
      if (textContent.trim()) {
        await this.supabase.upsertStudyGuide({
          subchapter_id: active.item.id,
          language: active.item.language,
          source_text: textContent,
          isPublished: true
        });
      }

      this.generatedQuestions.set(questions);
      this.questionsToSave.set(new Array(questions.length).fill(true));
      this.aiQuestionGenState.set('review');
    } catch (error: any) {
      this.aiQuestionGenError.set(error.message);
      this.aiQuestionGenState.set('form');
    }
  }
  
  async handleGenerateQuestionsFromImage() {
    if (this.aiImageGenForm.invalid) return;
    this.aiQuestionGenState.set('loading');
    this.aiQuestionGenError.set(null);
    const { imageFiles, count, useCheapModel } = this.aiImageGenForm.value;

    try {
      const imageParts: { data: string, mimeType: string }[] = [];
      for (const file of Array.from(imageFiles as FileList)) {
        const base64 = await this.fileToBase64(file);
        imageParts.push({ data: base64, mimeType: file.type });
      }

      const textContent = await this.geminiService.extractTextFromImages(imageParts, undefined, useCheapModel);
      if (!textContent.trim()) {
        throw new Error(this.t.translate('admin.imageError'));
      }
      
      const active = this.activeContentItem();
      const subchapter = active?.item as Subchapter;
      const chapter = this.quizService.chaptersMap().get(subchapter.chapter_id);
      const subject = this.quizService.subjectsMap().get(chapter!.subject_id);

      const params: QuestionGenerationParams = {
        textContent: textContent,
        count: count || 150,
        language: subject!.language,
        grade: subject!.grade,
        branch: subject!.branch || undefined,
        subject: subject!.name,
        chapter: chapter!.name,
        subchapter: active!.item.name,
        images: imageParts.length > 0 ? imageParts : undefined,
        useCheapModel
      };

      const questions = await this.geminiService.generateQuestions(params);
      
      if (active?.type === 'subchapter' && textContent.trim()) {
        await this.supabase.upsertStudyGuide({
          subchapter_id: active.item.id,
          language: active.item.language,
          source_text: textContent,
          isPublished: true
        });
      }

      this.generatedQuestions.set(questions);
      this.questionsToSave.set(new Array(questions.length).fill(true));
      this.aiQuestionGenState.set('review');

    } catch (error: any) {
      this.aiQuestionGenError.set(error.message);
      this.aiQuestionGenState.set('form');
    }
  }
  
  async handleGenerateQuestionsFromPdf() {
    if (this.aiPdfGenForm.invalid) return;
    const { pdfFile, count, forceOcr, useCheapModel } = this.aiPdfGenForm.value;
    if (!pdfFile) return;

    this.aiQuestionGenState.set('loading');
    this.aiQuestionGenError.set(null);
    this.pdfProcessingProgress.set(0);
    this.pdfProcessingState.set(this.t.translate('admin.pdf.extracting_start'));

    try {
      const { text: fullText, images } = await this.extractTextFromPdf(pdfFile, forceOcr, useCheapModel);

      const active = this.activeContentItem();
      if (active?.type === 'subchapter' && fullText.trim()) {
        await this.supabase.upsertStudyGuide({
          subchapter_id: active.item.id,
          language: active.item.language,
          source_text: fullText,
          isPublished: true
        });
      }

      this.aiQuestionGenForm.patchValue({ textContent: fullText, count: count || 150 });
      
      // Pass images directly to handleGenerateQuestions
      const subchapter = active?.item as Subchapter;
      const chapter = this.quizService.chaptersMap().get(subchapter.chapter_id);
      const subject = this.quizService.subjectsMap().get(chapter!.subject_id);

      const params: QuestionGenerationParams = {
        textContent: fullText,
        count: count || 150,
        language: subject!.language,
        grade: subject!.grade,
        branch: subject!.branch || undefined,
        subject: subject!.name,
        chapter: chapter!.name,
        subchapter: active!.item.name,
        images: images.length > 0 ? images : undefined,
        useCheapModel
      };

      const questions = await this.geminiService.generateQuestions(params);
      this.generatedQuestions.set(questions);
      this.questionsToSave.set(new Array(questions.length).fill(true));
      this.aiQuestionGenState.set('review');
    } catch (error: any) {
      this.aiQuestionGenError.set(error.message || this.t.translate('admin.pdfError'));
      this.aiQuestionGenState.set('form');
    } finally {
      this.pdfProcessingState.set(null);
      this.pdfProcessingProgress.set(0);
    }
  }

  toggleAllQuestionsToSave() {
    const shouldSelectAll = !this.areAllGeneratedQuestionsSelected();
    this.questionsToSave.update(arr => arr.map(() => shouldSelectAll));
  }

  toggleQuestionToSave(index: number) {
    this.questionsToSave.update(arr => {
      arr[index] = !arr[index];
      return [...arr];
    });
  }

  async handleSaveGeneratedQuestions() {
    this.isModalSaving.set(true);
    try {
      const active = this.activeContentItem();
      if (active?.type !== 'subchapter') throw new Error(this.t.translate('admin.errors.noSubchapterSelected'));
      
      // FIX: Cast item to Subchapter
      const subchapter = active.item as Subchapter;
      const chapter = this.quizService.chaptersMap().get(subchapter.chapter_id)!;
      const subject = this.quizService.subjectsMap().get(chapter.subject_id)!;

      const questionsToSave = this.generatedQuestions().filter((_, i) => this.questionsToSave()[i]);
      if (questionsToSave.length === 0) {
        this.closeModal();
        return;
      }

      const questionsPayload = questionsToSave.map(q => ({
        ...q,
        subchapter_id: active.item.id,
        chapter_id: chapter.id,
        subject_id: subject.id,
        grade: subject.grade,
        branch: subject.branch,
        language: subject.language,
        isPublished: this.isGeneratedQuestionsPublished(),
      }));
      
      await this.supabase.addManyQuestions(questionsPayload);
      this.toastService.show(this.t.translate('admin.toast.allQuestionsSaved', { count: questionsToSave.length }), 'success');
      this.closeModal();
      await this.quizService.loadCoreData();
    } catch (error: any) {
      this.toastService.show(error.message, 'error');
    } finally {
      this.isModalSaving.set(false);
    }
  }

  async handleGenerateStudyGuide(data: any) {
    if (this.aiStudyGuideGenForm.invalid) return;
    this.aiStudyGuideGenState.set('loading');
    this.aiStudyGuideGenError.set(null);
    this.aiLoadingMessage.set(this.t.translate('admin.generating'));

    try {
      const { context, useCheapModel, generateImages } = this.aiStudyGuideGenForm.value;
      const active = this.activeContentItem();
      const images: { data: string; mimeType: string }[] = [];
      
      if (active?.type === 'subchapter') {
        const subchapter = active.item as Subchapter;
        const studyGuide = this.quizService.allStudyGuides().find(g => g.subchapter_id === subchapter.id);
        
        if (studyGuide?.page_images) {
          for (const img of studyGuide.page_images) {
            try {
              const response = await fetch(img.url);
              const blob = await response.blob();
              const base64 = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                reader.readAsDataURL(blob);
              });
              images.push({ data: base64, mimeType: blob.type });
            } catch (err) {
              console.error('Error fetching study guide image:', err);
            }
          }
        }
      }

      const params: StudyGuideGenerationParams = {
        context: context!,
        images: images.length > 0 ? images : undefined,
        skipImages: !generateImages,
        useCheapModel,
        ...data
      };
      
      const { guide_html, image_prompts } = await this.geminiService.generateStudyGuide(params);
      let finalHtml = guide_html;

      if (generateImages && image_prompts && image_prompts.length > 0) {
        this.aiLoadingMessage.set(this.t.translate('admin.generatingImages', { count: image_prompts.length }));
        const imagePromises = image_prompts.map(async (img) => {
          try {
            const result = await this.geminiService.generateImage(img.prompt);
            return { id: img.id, ...result };
          } catch(e) {
            console.error(`Failed to generate image for prompt: ${img.prompt}`, e);
            return { id: img.id, data: null, mimeType: null }; // Return null on failure
          }
        });
        const images = await Promise.all(imagePromises);
        finalHtml = this.replaceImagePlaceholders(finalHtml, images);
      }

      this.generatedStudyGuide.set(finalHtml);
      this.aiStudyGuideGenState.set('review');
    } catch (error: any) {
      this.aiStudyGuideGenError.set(error.message);
      this.aiStudyGuideGenState.set('form');
    } finally {
      this.aiLoadingMessage.set(null);
    }
  }

  async handleGenerateStudyGuideFromPdf() {
    if (this.aiPdfStudyGuideGenForm.invalid) return;
    const { pdfFile, forceOcr, useCheapModel, generateImages } = this.aiPdfStudyGuideGenForm.value;
    if (!pdfFile) return;

    this.aiStudyGuideGenState.set('loading');
    this.aiStudyGuideGenError.set(null);
    this.pdfProcessingProgress.set(0);
    this.pdfProcessingState.set(this.t.translate('admin.pdf.extracting_start'));
    this.aiLoadingMessage.set(this.t.translate('admin.extractingText'));

    try {
      const { text: fullText, images } = await this.extractTextFromPdf(pdfFile, forceOcr, useCheapModel);

      const active = this.activeContentItem();
      if (active?.type !== 'subchapter') throw new Error('No active subchapter selected');

      if (fullText.trim()) {
        await this.supabase.upsertStudyGuide({
          subchapter_id: active.item.id,
          language: active.item.language,
          source_text: fullText,
          isPublished: true
        });
      }

      // Get context info from active content
      const chapter = this.quizService.allChapters().find(c => c.id === (active.item as Subchapter).chapter_id);
      const subject = this.quizService.allSubjects().find(s => s.id === chapter?.subject_id);

      const params: StudyGuideContentGenerationParams = {
        context: fullText,
        language: active.item.language,
        grade: subject?.grade || 12,
        subject: subject?.name || '',
        chapter: chapter?.name || '',
        subchapter: active.item.name,
        images: images.length > 0 ? images : undefined,
        skipImages: !generateImages,
        useCheapModel
      };

      this.aiLoadingMessage.set(this.t.translate('admin.generatingGuide'));
      const { guide_html, image_prompts } = await this.geminiService.generateStudyGuideFromContent(params);
      let finalHtml = guide_html;

      if (generateImages && image_prompts && image_prompts.length > 0) {
        this.aiLoadingMessage.set(this.t.translate('admin.generatingImages', { count: image_prompts.length }));
        const imagePromises = image_prompts.map(async (img) => {
          try {
            const result = await this.geminiService.generateImage(img.prompt);
            return { id: img.id, ...result };
          } catch(e) {
            console.error(`Failed to generate image for prompt: ${img.prompt}`, e);
            return { id: img.id, data: null, mimeType: null };
          }
        });
        const images = await Promise.all(imagePromises);
        finalHtml = this.replaceImagePlaceholders(finalHtml, images);
      }

      this.generatedStudyGuide.set(finalHtml);
      this.aiStudyGuideGenState.set('review');
    } catch (error: any) {
      this.aiStudyGuideGenError.set(error.message || this.t.translate('admin.pdfError'));
      this.aiStudyGuideGenState.set('form');
    } finally {
      this.pdfProcessingState.set(null);
      this.pdfProcessingProgress.set(0);
      this.aiLoadingMessage.set(null);
    }
  }

  async handleSaveStudyGuide() {
    const guideContent = this.generatedStudyGuide();
    if (!guideContent) {
      this.toastService.show(this.t.translate('admin.errors.noGuideContent'), 'error');
      return;
    }
    const active = this.activeContentItem();
    if (active?.type !== 'subchapter') {
      this.toastService.show(this.t.translate('admin.errors.noActiveSubchapter'), 'error');
      return;
    }
    
    this.isModalSaving.set(true);
    try {
      await this.supabase.upsertStudyGuide({
        subchapter_id: active.item.id,
        language: active.item.language,
        content: guideContent,
        source_text: this.aiStudyGuideGenForm?.value?.context || '',
        isPublished: this.isStudyGuidePublished(),
      });
      this.toastService.show(this.t.translate('admin.toast.studyGuideSaved'), 'success');
      this.closeModal();
      await this.quizService.loadCoreData();
    } catch (error: any) {
      this.toastService.show(error.message, 'error');
    } finally {
      this.isModalSaving.set(false);
    }
  }

  async handleGenerateVisuals() {
    const currentHtml = this.generatedStudyGuide();
    if (!currentHtml) return;

    const active = this.activeContentItem();
    if (active?.type !== 'subchapter') return;

    const subchapter = active.item as Subchapter;
    const chapter = this.quizService.chaptersMap().get(subchapter.chapter_id);
    if (!chapter) return;
    const subject = this.quizService.subjectsMap().get(chapter.subject_id);
    if (!subject) return;

    this.isGeneratingVisuals.set(true);
    this.aiLoadingMessage.set(this.t.translate('admin.generatingVisuals'));

    try {
      const params: VisualsGenerationParams = {
        htmlContent: currentHtml,
        language: subject.language,
        grade: subject.grade,
        subject: subject.name,
        chapter: chapter.name,
        subchapter: subchapter.name,
        useCheapModel: true // Default to cheap model for visuals generation
      };

      const { updated_html, image_prompts } = await this.geminiService.generateVisualsForStudyGuide(params);
      let finalHtml = updated_html;

      if (image_prompts && image_prompts.length > 0) {
        this.aiLoadingMessage.set(this.t.translate('admin.generatingImages', { count: image_prompts.length }));
        const imagePromises = image_prompts.map(async (img) => {
          try {
            const result = await this.geminiService.generateImage(img.prompt);
            return { id: img.id, ...result };
          } catch(e) {
            console.error(`Failed to generate image for prompt: ${img.prompt}`, e);
            return { id: img.id, data: null, mimeType: null };
          }
        });
        const images = await Promise.all(imagePromises);
        finalHtml = this.replaceImagePlaceholders(finalHtml, images);
      }

      // Replace the entire guide with the updated HTML
      this.generatedStudyGuide.set(finalHtml);
      this.studyGuideEditMode.set('preview');
      this.toastService.show(this.t.translate('admin.toast.visualsGenerated'), 'success');
    } catch (error: any) {
      this.toastService.show(error.message, 'error');
    } finally {
      this.isGeneratingVisuals.set(false);
      this.aiLoadingMessage.set(null);
    }
  }

  private replaceImagePlaceholders(html: string, images: { id: string, data: string | null, mimeType: string | null }[]): string {
    let updatedHtml = html;
    console.log(`[Admin] Replacing placeholders for ${images.length} images`);
    
    for (const image of images) {
      if (image.data) {
        const imageUrl = `data:${image.mimeType || 'image/png'};base64,${image.data}`;
        console.log(`[Admin] Replacing image ID: ${image.id}, Data length: ${image.data.length}`);
        
        // Find the entire <img> tag that has the specific id
        // This regex is more flexible: matches id="ID" or id='ID' or id=ID
        const tagRegex = new RegExp(`(<img[^>]*id\\s*=\\s*["']?${image.id}["']?[^>]*>)`, 'gi');
        
        let matchFound = false;
        updatedHtml = updatedHtml.replace(tagRegex, (match) => {
          matchFound = true;
          console.log(`[Admin] Found match for tag with ID ${image.id}: ${match.substring(0, 50)}...`);
          
          // Within the matched <img> tag, replace the src attribute content
          if (match.match(/src\s*=\s*["']/i)) {
            return match.replace(/(src\s*=\s*["'])(.*?)(["'])/i, `$1${imageUrl}$3`);
          } else if (match.match(/src\s*=\s*/i)) {
            return match.replace(/(src\s*=\s*)([^\s>]+)/i, `$1${imageUrl}`);
          } else {
            // If src is missing, add it
            if (match.endsWith('/>')) {
              return match.replace(/\s*\/>/, ` src="${imageUrl}" />`);
            } else {
              return match.replace(/\s*>$/, ` src="${imageUrl}">`);
            }
          }
        });
        
        if (!matchFound) {
          console.warn(`[Admin] No <img> tag found with ID: ${image.id}`);
        }
      } else {
        console.warn(`[Admin] Image data is missing for ID: ${image.id}`);
      }
    }
    return updatedHtml;
  }

  async duplicateQuestionToArabic(question: Question) {
    const chapter = this.quizService.chaptersMap().get(question.chapter_id);
    const subchapter = this.quizService.subchaptersMap().get(question.subchapter_id);
    const subject = this.quizService.subjectsMap().get(question.subject_id);
    
    if (!subject || !chapter || !subchapter) {
      this.toastService.show('Cannot find parent subject/chapter/subchapter.', 'error');
      return;
    }

    if (subject.language !== 'en') return;

    this.toastService.show('Translating question to Arabic...', 'info');
    
    try {
      // 1. Find or create Arabic subject
      const arSubject = this.quizService.allSubjects().find(s => 
        s.language === 'ar' && 
        s.grade === subject.grade && 
        s.branch === subject.branch &&
        (s.name === subject.name || this.subjectMapping[subject.name] === s.name || this.subjectMapping[subject.name.toLowerCase()] === s.name)
      );

      if (!arSubject) {
        throw new Error('Arabic counterpart for this subject not found. Please sync the subject first.');
      }

      // 2. Find or create Arabic Chapter
      let arChapter = (await this.supabase.getChaptersForSubject(arSubject.id)).find(c => 
        c.name === chapter.name || c.name.toLowerCase().includes(chapter.name.toLowerCase())
      );

      if (!arChapter) {
        const translatedName = await this.geminiService.translateText(chapter.name, 'ar');
        arChapter = await this.supabase.addChapter({
          name: translatedName,
          subject_id: arSubject.id,
          language: 'ar'
        });
      }

      // 3. Find or create Arabic Subchapter
      let arSub = (await this.supabase.getSubchaptersForChapter(arChapter.id)).find(s => 
        s.name === subchapter.name || s.name.toLowerCase().includes(subchapter.name.toLowerCase())
      );

      if (!arSub) {
        const translatedName = await this.geminiService.translateText(subchapter.name, 'ar');
        arSub = await this.supabase.addSubchapter({
          name: translatedName,
          chapter_id: arChapter.id,
          language: 'ar',
          isPublished: true
        });
      }

      // 4. Translate question
      const translated = await this.geminiService.translateQuestions([question], 'ar');
      if (translated.length > 0) {
        const q = translated[0];
        await this.supabase.addQuestion({
          ...q,
          language: 'ar',
          grade: arSubject.grade,
          branch: arSubject.branch,
          subject_id: arSubject.id,
          chapter_id: arChapter.id,
          subchapter_id: arSub.id,
          isPublished: true
        });
        this.toastService.show('Question duplicated and translated to Arabic.', 'success');
        this.quizService.loadCoreData();
      }
    } catch (error: any) {
        console.error('Duplicate question error:', error);
        this.toastService.show(`Duplication failed: ${error.message}`, 'error');
    }
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = error => reject(error);
    });
  }
}
