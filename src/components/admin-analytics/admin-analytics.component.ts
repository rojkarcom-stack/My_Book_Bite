import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit, AfterViewInit, OnDestroy, viewChild, ElementRef, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { Chart } from 'chart.js/auto';

import { debounceTime, distinctUntilChanged } from 'rxjs';
import { QuizService } from '../../services/quiz.service';
import { SupabaseService } from '../../services/supabase.service';
import { TranslationService } from '../../services/translation.service';
import { QuizAttempt, Question, Subject } from '../../models';

interface SubjectPerformance {
  id: string;
  name: string;
  averageScore: number;
  attempts: number;
}

interface DifficultQuestion {
  id: string;
  text: string;
  correctRate: number;
  attempts: number;
}

@Component({
  selector: 'app-admin-analytics',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
<div class="animate-fade-in space-y-8">
  <div class="flex justify-between items-start sm:items-center flex-col sm:flex-row gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
    <div>
      <h2 class="text-2xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">{{ t.translate('admin.analytics.title') || 'Platform Analytics' }}</h2>
      <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">Real-time website traffic monitors, active visitor sessions, and quiz performance analytics.</p>
    </div>
    <button (click)="loadVisitorStats()" class="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl font-bold text-xs shadow-sm flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer">
      <svg class="h-4 w-4" [class.animate-spin]="isRefreshingVisits()" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
      </svg>
      <span>Refresh Traffic Statistics</span>
    </button>
  </div>

  <!-- Real-time Website Visitor Counter / KPI Cards section -->
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
    <!-- Card 1: Total Website Views -->
    <div class="bg-gradient-to-br from-indigo-50/40 to-indigo-100/10 dark:from-indigo-950/20 dark:to-slate-900/40 p-6 rounded-2xl border border-indigo-100/45 dark:border-indigo-950/50 shadow-sm hover:shadow-md transition-all duration-350">
      <div class="flex items-center justify-between mb-3.5">
        <span class="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">Website Views</span>
        <div class="p-2.5 rounded-xl bg-indigo-100/80 dark:bg-indigo-950/85 text-indigo-600 dark:text-indigo-400 border border-indigo-200/20 shadow-inner">
          <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
        </div>
      </div>
      <p class="text-4xl font-extrabold text-slate-800 dark:text-slate-50 font-sans tracking-tight">{{ visitorTotalViews() }}</p>
      <p class="text-[10px] text-slate-500 dark:text-slate-400 mt-2 font-medium">Accumulated page requests</p>
    </div>

    <!-- Card 2: Unique Visitors -->
    <div class="bg-gradient-to-br from-emerald-50/40 to-emerald-100/10 dark:from-emerald-950/15 dark:to-slate-900/40 p-6 rounded-2xl border border-emerald-100/30 dark:border-emerald-900/20 shadow-sm hover:shadow-md transition-all duration-350">
      <div class="flex items-center justify-between mb-3.5">
        <span class="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">Unique Visitors</span>
        <div class="p-2.5 rounded-xl bg-emerald-100/80 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-200/20 shadow-inner">
          <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
        </div>
      </div>
      <p class="text-4xl font-extrabold text-slate-800 dark:text-slate-50 font-sans tracking-tight">{{ visitorUniqueCount() }}</p>
      <p class="text-[10px] text-slate-500 dark:text-slate-400 mt-2 font-medium">Distinct browser installations</p>
    </div>

    <!-- Card 3: Quiz Attempts -->
    <div class="bg-gradient-to-br from-indigo-50/40 to-indigo-100/10 dark:from-indigo-950/20 dark:to-slate-900/40 p-6 rounded-2xl border border-indigo-100/45 dark:border-indigo-950/50 shadow-sm hover:shadow-md transition-all duration-350">
      <div class="flex items-center justify-between mb-3.5">
        <span class="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">{{ t.translate('admin.analytics.totalAttempts') }}</span>
        <div class="p-2.5 rounded-xl bg-indigo-100/80 dark:bg-indigo-950/85 text-indigo-600 dark:text-indigo-400 border border-indigo-200/20 shadow-inner">
          <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.03 0 1.9.693 2.166 1.638m-7.377 12.408-.09.09m0 0A1.914 1.914 0 0 1 8.64 18l-1.93-.386M18 12.008V15H9v-2.992M6.16 6.16a11.385 11.385 0 0 0-1.393.7l-.386 1.93A1.914 1.914 0 0 0 5.4 10.05l.09-.09M3.5 12.75a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 .75.75V15a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1-.75-.75v-2.25Z" />
          </svg>
        </div>
      </div>
      <p class="text-4xl font-extrabold text-slate-800 dark:text-slate-50 font-sans tracking-tight">{{ totalAttempts() }}</p>
      <p class="text-[10px] text-slate-500 dark:text-slate-400 mt-2 font-medium">Completed practice tests</p>
    </div>

    <!-- Card 4: Average Score -->
    <div class="bg-gradient-to-br from-emerald-50/40 to-emerald-100/10 dark:from-emerald-950/15 dark:to-slate-900/40 p-6 rounded-2xl border border-emerald-100/30 dark:border-emerald-900/20 shadow-sm hover:shadow-md transition-all duration-350">
      <div class="flex items-center justify-between mb-3.5">
        <span class="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">{{ t.translate('admin.analytics.averageScore') }}</span>
        <div class="p-2.5 rounded-xl bg-emerald-100/80 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-200/20 shadow-inner">
          <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
          </svg>
        </div>
      </div>
      <p class="text-4xl font-extrabold text-slate-800 dark:text-slate-50 font-sans tracking-tight">{{ averageScore().toFixed(1) }}%</p>
      <p class="text-[10px] text-slate-500 dark:text-slate-400 mt-2 font-medium">Accumulated mean test score</p>
    </div>
  </div>

  <!-- Live Traffic Layout Metrics (Bento cockpit) -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
    <!-- Visitor Trend Chart -->
    <div class="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm flex flex-col">
      <div class="mb-5">
        <h3 class="text-lg font-bold text-slate-800 dark:text-slate-100">Website Traffic Trend</h3>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Daily pageviews and unique visitors over the last 14 days.</p>
      </div>
      <div class="h-72 w-full relative">
        <canvas #visitorTrendChart></canvas>
      </div>
    </div>

    <!-- Recent Website Visitor Log -->
    <div class="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm flex flex-col justify-between">
      <div>
        <div class="flex justify-between items-center mb-1">
          <h3 class="text-lg font-bold text-slate-800 dark:text-slate-100">Live Website Visitor Log</h3>
          <span class="inline-flex items-center gap-1.5 py-0.5 px-2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 text-[10px] font-bold rounded-full border border-emerald-200/20 shadow-sm">
            <span class="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
            Real-Time Tracker
          </span>
        </div>
        <p class="text-xs text-slate-500 dark:text-slate-400 mb-5">Monitor recent user sessions, used devices, and languages.</p>
        
        <div class="overflow-y-auto max-h-72 border border-slate-100 dark:border-slate-800 rounded-xl scrollbar-thin">
          <table class="w-full text-xs text-left text-slate-500 dark:text-slate-400">
            <thead class="text-[10px] font-extrabold text-slate-700 dark:text-slate-300 uppercase bg-slate-50/85 dark:bg-slate-800sticky top-0 border-b border-slate-100 dark:border-slate-800 z-10">
              <tr>
                <th scope="col" class="px-4 py-3">Visitor Identity</th>
                <th scope="col" class="px-4 py-3">Device / Browser</th>
                <th scope="col" class="px-4 py-3 text-center">Language</th>
                <th scope="col" class="px-4 py-3 text-right">Time</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              @for (v of visitorRecentVisits(); track v.timestamp + v.ip) {
                <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition duration-150">
                  <td class="px-4 py-3">
                    <div class="flex flex-col">
                      @if (v.email && v.email !== 'Anonymous Student') {
                        <span class="font-bold text-indigo-600 dark:text-indigo-400 truncate max-w-[170px]" title="{{ v.email }}">{{ v.email }}</span>
                      } @else {
                        <span class="font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">👤 Guest Student</span>
                      }
                      <span class="text-[9px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">{{ v.ip }}</span>
                    </div>
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                      <span class="text-xs">{{ v.device === 'Mobile' ? '📱' : v.device === 'Tablet' ? '📟' : '💻' }}</span>
                      <span class="font-medium text-slate-600 dark:text-slate-400">{{ v.browser }}</span>
                    </div>
                  </td>
                  <td class="px-4 py-3 text-center">
                    <span class="px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider"
                          [class]="v.language.startsWith('ku') ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400' : v.language === 'ar' ? 'bg-red-100 dark:bg-red-950/30 text-red-800 dark:text-red-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300'">
                      {{ getLanguageName(v.language) }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-right font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {{ getRelativeTime(v.timestamp) }}
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="4" class="px-4 py-12 text-center text-slate-400 dark:text-slate-500 font-medium">
                    No active visitor sessions recorded.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  @if (isLoading()) {
    <p class="text-slate-500 dark:text-slate-400 text-center py-10">{{ t.translate('admin.generating') }}</p>
  } @else if (allAttempts().length === 0) {
    <div class="text-center py-16 px-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
      <svg class="mx-auto h-12 w-12 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
      </svg>
      <h3 class="mt-2 text-lg font-medium text-slate-800 dark:text-slate-100">Quiz Analytics</h3>
      <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ t.translate('admin.analytics.noData') }}</p>
    </div>
  } @else {
    <div>
      <!-- Date Filter -->
      <div class="p-5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 rounded-2xl mb-8">
          <h3 class="font-extrabold text-slate-700 dark:text-slate-200 mb-3 tracking-tight text-sm uppercase">Filter Quiz Attempts By Date</h3>
          <form [formGroup]="dateFilterForm" class="flex flex-wrap items-center gap-4">
              <div class="flex-1 min-w-[150px]">
                  <label for="startDate" class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{{ t.translate('admin.analytics.startDate') }}</label>
                  <input type="date" id="startDate" formControlName="startDate" class="mt-1.5 w-full p-2.5 border rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm text-xs font-semibold">
              </div>
              <div class="flex-1 min-w-[150px]">
                  <label for="endDate" class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{{ t.translate('admin.analytics.endDate') }}</label>
                  <input type="date" id="endDate" formControlName="endDate" class="mt-1.5 w-full p-2.5 border rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm text-xs font-semibold">
              </div>
              <div class="self-end">
                  <button type="button" (click)="resetFilters()" class="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition duration-200 cursor-pointer">
                    {{ t.translate('admin.analytics.reset') }}
                  </button>
              </div>
          </form>
      </div>

      @if (totalAttempts() > 0) {
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
          <!-- Performance by Subject Chart -->
          <div class="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div>
              <h3 class="text-lg font-bold text-slate-850 dark:text-slate-100 mb-1">{{ t.translate('admin.analytics.performanceBySubject') }}</h3>
              <p class="text-xs text-slate-500 dark:text-slate-400 mb-6">Comparative grade percentage achieved by course/subject.</p>
            </div>
            <div class="h-80 w-full relative">
              <canvas #subjectPerformanceChart></canvas>
            </div>
          </div>

          <!-- Most Difficult Questions -->
          <div class="bg-white dark:bg-slate-905 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col">
            <div class="mb-4">
              <h3 class="text-lg font-bold text-slate-850 dark:text-slate-100 mb-1">{{ t.translate('admin.analytics.mostDifficultQuestions') }}</h3>
              <p class="text-xs text-slate-500 dark:text-slate-400">Questions with low accuracy rates across attempts (min. 3 loads).</p>
            </div>
            <div class="border dark:border-slate-800 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
              <table class="w-full text-xs text-left text-slate-500 dark:text-slate-400">
                <thead class="text-[10px] font-extrabold text-slate-700 dark:text-slate-300 uppercase bg-slate-50 dark:bg-slate-800 sticky top-0 border-b border-slate-100 dark:border-slate-800 z-10">
                  <tr>
                    <th scope="col" class="px-4 py-3 min-w-[200px]">{{ t.translate('admin.analytics.question') }}</th>
                    <th scope="col" class="px-4 py-3 text-center">{{ t.translate('admin.analytics.correctRate') }}</th>
                    <th scope="col" class="px-4 py-3 text-center">Tries</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                  @for (q of mostDifficultQuestions(); track q.id) {
                    <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition">
                      <td class="px-4 py-3.5 font-medium text-slate-900 dark:text-slate-100 max-w-[220px]">
                        <div class="truncate font-semibold" title="{{q.text}}">{{ q.text }}</div>
                      </td>
                      <td class="px-4 py-3.5 text-center font-extrabold" [class.text-red-500]="q.correctRate < 50" [class.text-amber-500]="q.correctRate >= 50 && q.correctRate < 75" [class.text-emerald-500]="q.correctRate >= 75">
                        {{ q.correctRate.toFixed(1) }}%
                      </td>
                      <td class="px-4 py-3.5 text-center font-bold text-slate-600 dark:text-slate-400">{{ q.attempts }}</td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="3" class="px-4 py-10 text-center font-medium text-slate-400 dark:text-slate-500">No difficult questions identified.</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      }
    </div>
  }
</div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminAnalyticsComponent implements OnInit, AfterViewInit, OnDestroy {
  private quizService = inject(QuizService);
  private supabase = inject(SupabaseService);
  t = inject(TranslationService);
  private fb: FormBuilder = inject(FormBuilder);
  
  chartCanvas = viewChild<ElementRef<HTMLCanvasElement>>('subjectPerformanceChart');
  visitorCanvas = viewChild<ElementRef<HTMLCanvasElement>>('visitorTrendChart');
  
  private chart: Chart | null = null;
  private visitorChart: Chart | null = null;
  
  // Data from service
  private allSubjectsMap = this.quizService.subjectsMap;
  private allQuestions = this.quizService.allQuestions;
  
  // Local state
  isLoading = signal(true);
  isRefreshingVisits = signal(false);
  allAttempts = signal<QuizAttempt[]>([]);
  dateFilterForm = this.fb.group({
    startDate: [''],
    endDate: [''],
  });
  
  // Visitor metrics signals
  visitorTotalViews = signal<number>(0);
  visitorUniqueCount = signal<number>(0);
  visitorRecentVisits = signal<any[]>([]);
  visitorDailyStats = signal<Record<string, { views: number; visitors: number }>>({});
  
  // Memoized map for faster question lookups
  private allQuestionsMap = computed(() => new Map(this.allQuestions().map(q => [q.id, q])));
  
  // --- Computed Analytics ---
  filteredAttempts = computed(() => {
    const { startDate, endDate } = this.dateFilterForm.value;
    let attempts = this.allAttempts();
    
    if (startDate) {
      const start = new Date(startDate).setHours(0, 0, 0, 0);
      attempts = attempts.filter(a => new Date(a.created_at!).getTime() >= start);
    }
    if (endDate) {
      const end = new Date(endDate).setHours(23, 59, 59, 999);
      attempts = attempts.filter(a => new Date(a.created_at!).getTime() <= end);
    }
    return attempts;
  });

  totalAttempts = computed(() => this.filteredAttempts().length);
  
  averageScore = computed(() => {
    const attempts = this.filteredAttempts();
    if (attempts.length === 0) return 0;
    const totalScoreSum = attempts.reduce((acc, attempt) => acc + (attempt.score / attempt.total_questions), 0);
    return (totalScoreSum / attempts.length) * 100;
  });

  performanceBySubject = computed<SubjectPerformance[]>(() => {
    const attemptsBySubject = new Map<string, { totalScore: number; count: number }>();

    for (const attempt of this.filteredAttempts()) {
      const subjectId = attempt.subject_id;
      const stats = attemptsBySubject.get(subjectId) ?? { totalScore: 0, count: 0 };
      stats.totalScore += (attempt.score / attempt.total_questions);
      stats.count++;
      attemptsBySubject.set(subjectId, stats);
    }
    
    const performance: SubjectPerformance[] = [];
    for (const [subjectId, stats] of attemptsBySubject.entries()) {
      const subject = this.allSubjectsMap().get(subjectId);
      if (subject) {
        performance.push({
          id: subjectId,
          name: subject.name,
          averageScore: (stats.totalScore / stats.count) * 100,
          attempts: stats.count,
        });
      }
    }
    
    return performance.sort((a, b) => a.averageScore - b.averageScore);
  });
  
  mostDifficultQuestions = computed<DifficultQuestion[]>(() => {
    const questionStats = new Map<string, { correct: number; total: number }>();
    
    for (const attempt of this.filteredAttempts()) {
      for (const result of attempt.results) {
        const questionId = result.questionId;
        const stats = questionStats.get(questionId) ?? { correct: 0, total: 0 };
        stats.total++;
        if (result.isCorrect) {
          stats.correct++;
        }
        questionStats.set(questionId, stats);
      }
    }
    
    const difficultQuestions: DifficultQuestion[] = [];
    for (const [questionId, stats] of questionStats.entries()) {
        const question = this.allQuestionsMap().get(questionId);
        if (question && stats.total > 2) { // Only include questions with at least 3 attempts
            difficultQuestions.push({
                id: questionId,
                text: question.text,
                correctRate: (stats.correct / stats.total) * 100,
                attempts: stats.total,
            });
        }
    }

    return difficultQuestions.sort((a, b) => a.correctRate - b.correctRate).slice(0, 10);
  });

  constructor() {
    effect(() => {
      // Re-render chart if filtered data changes
      this.updateChart();
    });

    this.dateFilterForm.valueChanges.pipe(
      debounceTime(1000),
      distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr))
    ).subscribe((value: any) => {
        if (value.startDate && value.endDate) {
          this.loadAttemptsByDateRange(value.startDate, value.endDate);
        }
    });
  }
  
  ngOnInit() {
    this.loadAttempts();
    this.loadVisitorStats();
  }
  
  ngAfterViewInit(): void {
    if (this.performanceBySubject().length > 0) {
      this.createChart();
    }
    this.createVisitorTrendChart();
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
    this.visitorChart?.destroy();
  }

  async loadVisitorStats(silent = false) {
    if (!silent) this.isRefreshingVisits.set(true);
    try {
      const stats = await this.supabase.getVisitorStats();
      this.visitorTotalViews.set(stats.totalViews);
      this.visitorUniqueCount.set(stats.uniqueCount);
      this.visitorRecentVisits.set(stats.recentVisits || []);
      this.visitorDailyStats.set(stats.dailyStats || {});
      
      setTimeout(() => {
        this.createVisitorTrendChart();
      }, 50);
    } catch (e) {
      console.error('Error extracting audience logs from server:', e);
    } finally {
      this.isRefreshingVisits.set(false);
    }
  }

  getRelativeTime(timestamp: string): string {
    try {
      const diffMs = Date.now() - new Date(timestamp).getTime();
      if (diffMs < 0) return 'Just now';
      
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch (e) {
      return '';
    }
  }

  getLanguageName(lang: string): string {
    const names: Record<string, string> = {
      en: '🇬🇧 EN',
      ar: '🇮🇶 AR',
      ku_sorani: '☀️ KU-S',
      ku_badini: '🏔️ KU-B'
    };
    return names[lang] || lang.toUpperCase();
  }

  createVisitorTrendChart(): void {
    const canvas = this.visitorCanvas()?.nativeElement;
    if (!canvas) return;

    if (this.visitorChart) {
      this.visitorChart.destroy();
    }

    const stats = this.visitorDailyStats();
    const sortedDates = Object.keys(stats).sort();
    
    // Slice to most recent consecutive 14 days
    const activeDates = sortedDates.slice(-14);
    
    const viewsData = activeDates.map(d => stats[d]?.views || 0);
    const visitorsData = activeDates.map(d => stats[d]?.visitors || 0);
    
    const formattedLabels = activeDates.map(d => {
      try {
        const parts = d.split('-');
        if (parts.length === 3) {
          return `${parts[1]}/${parts[2]}`; // MM/DD format for cleaner labeling
        }
        return d;
      } catch (e) {
        return d;
      }
    });

    this.visitorChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: formattedLabels.length > 0 ? formattedLabels : ['Today'],
        datasets: [
          {
            label: 'Page Views',
            data: viewsData.length > 0 ? viewsData : [this.visitorTotalViews()],
            borderColor: '#4f46e5', // Indigo-600
            backgroundColor: 'rgba(79, 70, 229, 0.08)',
            borderWidth: 2,
            tension: 0.35,
            fill: true
          },
          {
            label: 'Unique Visitors',
            data: visitorsData.length > 0 ? visitorsData : [this.visitorUniqueCount()],
            borderColor: '#10b981', // Emerald-500
            backgroundColor: 'rgba(16, 185, 129, 0.03)',
            borderWidth: 2,
            tension: 0.35,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              boxWidth: 8,
              font: { weight: 'bold', size: 10 }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0
            }
          }
        }
      }
    });
  }

  async loadAttemptsByDateRange(start: string, end: string) {
    this.isLoading.set(true);
    try {
      const attempts = await this.supabase.getQuizAttemptsByDateRange(
        new Date(start).toISOString(),
        new Date(end).toISOString()
      );
      this.allAttempts.set(attempts);
      await this.fetchMissingQuestions(attempts);
    } catch (error) {
      console.error('Error loading quiz attempts by date range:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadAttempts() {
    this.isLoading.set(true);
    try {
      const attempts = await this.supabase.getAllQuizAttempts(100);
      this.allAttempts.set(attempts);
      await this.fetchMissingQuestions(attempts);
    } catch (error) {
      console.error('Error loading quiz attempts:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  private async fetchMissingQuestions(attempts: QuizAttempt[]) {
    const questionStats = new Map<string, number>();
    attempts.forEach(a => a.results.forEach(r => {
      questionStats.set(r.questionId, (questionStats.get(r.questionId) || 0) + 1);
    }));
    
    const questionIdsToFetch = Array.from(questionStats.entries())
      .filter(([id, count]) => count > 2)
      .map(([id]) => id)
      .filter(id => !this.quizService.allQuestions().some(q => q.id === id));
      
    if (questionIdsToFetch.length > 0) {
      const questions = await this.supabase.getQuestionsByIds(questionIdsToFetch);
      this.quizService.allQuestions.update(all => {
        const existingIds = new Set(all.map(q => q.id));
        const newOnes = questions.filter(q => !existingIds.has(q.id));
        return [...all, ...newOnes];
      });
    }
  }

  resetFilters() {
    this.dateFilterForm.reset();
  }
  
  createChart(): void {
    const canvas = this.chartCanvas()?.nativeElement;
    if (!canvas || this.performanceBySubject().length === 0) return;

    if (this.chart) {
      this.chart.destroy();
    }
    
    const chartData = this.performanceBySubject();
    
    this.chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: chartData.map(s => s.name),
        datasets: [{
          label: this.t.translate('student.averageScore'),
          data: chartData.map(s => s.averageScore),
          backgroundColor: chartData.map(s => s.averageScore < 50 ? 'rgba(239, 68, 68, 0.6)' : 'rgba(79, 70, 229, 0.6)'),
          borderColor: chartData.map(s => s.averageScore < 50 ? 'rgb(239, 68, 68)' : 'rgb(79, 70, 229)'),
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: { callback: (value) => `${value}%` }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => `${context.dataset.label}: ${Number(context.raw).toFixed(1)}%`
            }
          }
        }
      }
    });
  }

  updateChart(): void {
    if (!this.chart) {
      if (this.performanceBySubject().length > 0 && this.chartCanvas()) {
        this.createChart();
      }
      return;
    }
    
    const chartData = this.performanceBySubject();
    this.chart.data.labels = chartData.map(s => s.name);
    this.chart.data.datasets[0].data = chartData.map(s => s.averageScore);
    this.chart.update();
  }
}
