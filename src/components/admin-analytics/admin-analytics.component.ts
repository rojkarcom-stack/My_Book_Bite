
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
  <div>
    <h2 class="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{{ t.translate('admin.analytics.title') }}</h2>
    <p class="text-slate-500 dark:text-slate-400 mt-1">{{ t.translate('admin.analytics.subtitle') }}</p>
  </div>

  @if (isLoading()) {
    <p class="text-slate-500 dark:text-slate-400 text-center py-10">{{ t.translate('admin.generating') }}</p>
  } @else if (allAttempts().length === 0) {
    <div class="text-center py-16 px-6 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
      <svg class="mx-auto h-12 w-12 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
      </svg>
      <h3 class="mt-2 text-lg font-medium text-slate-800 dark:text-slate-100">{{ t.translate('admin.analytics.title') }}</h3>
      <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ t.translate('admin.analytics.noData') }}</p>
    </div>
  } @else {
    <div>
      <!-- Date Filter -->
      <div class="p-4 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 rounded-lg mb-8">
          <h3 class="font-semibold text-slate-700 dark:text-slate-200 mb-2">{{ t.translate('admin.analytics.filterByDate') }}</h3>
          <form [formGroup]="dateFilterForm" class="flex flex-wrap items-center gap-4">
              <div class="flex-1 min-w-[150px]">
                  <label for="startDate" class="block text-sm font-medium text-slate-600 dark:text-slate-400">{{ t.translate('admin.analytics.startDate') }}</label>
                  <input type="date" id="startDate" formControlName="startDate" class="mt-1 w-full p-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 shadow-sm text-sm">
              </div>
              <div class="flex-1 min-w-[150px]">
                  <label for="endDate" class="block text-sm font-medium text-slate-600 dark:text-slate-400">{{ t.translate('admin.analytics.endDate') }}</label>
                  <input type="date" id="endDate" formControlName="endDate" class="mt-1 w-full p-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 shadow-sm text-sm">
              </div>
              <div class="self-end">
                  <button type="button" (click)="resetFilters()" class="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-semibold rounded-md hover:bg-slate-300 dark:hover:bg-slate-500 transition">
                    {{ t.translate('admin.analytics.reset') }}
                  </button>
              </div>
          </form>
      </div>

      <!-- KPIs -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        <div class="bg-slate-50 dark:bg-slate-700/50 p-6 rounded-lg">
          <p class="text-sm font-medium text-slate-500 dark:text-slate-400">{{ t.translate('admin.analytics.totalAttempts') }}</p>
          <p class="text-4xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{{ totalAttempts() }}</p>
        </div>
        <div class="bg-slate-50 dark:bg-slate-700/50 p-6 rounded-lg">
          <p class="text-sm font-medium text-slate-500 dark:text-slate-400">{{ t.translate('admin.analytics.averageScore') }}</p>
          <p class="text-4xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{{ averageScore().toFixed(1) }}%</p>
        </div>
      </div>

      @if (totalAttempts() > 0) {
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <!-- Performance by Subject Chart -->
          <div class="space-y-4">
            <h3 class="text-xl font-semibold text-slate-700 dark:text-slate-200">{{ t.translate('admin.analytics.performanceBySubject') }}</h3>
            <div class="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg h-80">
              <canvas #subjectPerformanceChart></canvas>
            </div>
          </div>

          <!-- Most Difficult Questions -->
          <div class="space-y-4">
            <h3 class="text-xl font-semibold text-slate-700 dark:text-slate-200">{{ t.translate('admin.analytics.mostDifficultQuestions') }}</h3>
            <div class="border dark:border-slate-700 rounded-lg max-h-96 overflow-y-auto">
              <table class="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                <thead class="text-xs text-slate-700 dark:text-slate-300 uppercase bg-slate-100 dark:bg-slate-700 sticky top-0">
                  <tr>
                    <th scope="col" class="px-6 py-3 min-w-[200px]">{{ t.translate('admin.analytics.question') }}</th>
                    <th scope="col" class="px-6 py-3 text-center">{{ t.translate('admin.analytics.correctRate') }}</th>
                    <th scope="col" class="px-6 py-3 text-center">{{ t.translate('admin.analytics.attempts') }}</th>
                  </tr>
                </thead>
                <tbody>
                  @for (q of mostDifficultQuestions(); track q.id) {
                    <tr class="bg-white dark:bg-slate-800 border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td class="px-6 py-4 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap overflow-hidden text-ellipsis">
                        <div class="truncate" title="{{q.text}}">{{ q.text }}</div>
                      </td>
                      <td class="px-6 py-4 text-center font-bold" [class.text-red-600]="q.correctRate < 50" [class.text-amber-600]="q.correctRate >= 50 && q.correctRate < 75" [class.text-green-600]="q.correctRate >= 75">
                        {{ q.correctRate.toFixed(1) }}%
                      </td>
                      <td class="px-6 py-4 text-center">{{ q.attempts }}</td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="3" class="px-6 py-4 text-center">{{ t.translate('admin.analytics.noData')}}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      } @else {
         <div class="text-center py-10 px-6 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ t.translate('admin.analytics.noData') }}</p>
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
  // FIX: Explicitly type FormBuilder to avoid type inference issues.
  private fb: FormBuilder = inject(FormBuilder);
  
  chartCanvas = viewChild<ElementRef<HTMLCanvasElement>>('subjectPerformanceChart');
  private chart: Chart | null = null;
  
  // Data from service
  private allSubjectsMap = this.quizService.subjectsMap;
  private allQuestions = this.quizService.allQuestions;
  
  // Local state
  isLoading = signal(true);
  allAttempts = signal<QuizAttempt[]>([]);
  dateFilterForm = this.fb.group({
    startDate: [''],
    endDate: [''],
  });
  
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
  }
  
  ngAfterViewInit(): void {
    if (this.performanceBySubject().length > 0) {
      this.createChart();
    }
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
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
      // Default to last 100 attempts for performance/quota
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
    // Fetch questions needed for difficult questions analysis
    const questionStats = new Map<string, number>();
    attempts.forEach(a => a.results.forEach(r => {
      questionStats.set(r.questionId, (questionStats.get(r.questionId) || 0) + 1);
    }));
    
    const questionIdsToFetch = Array.from(questionStats.entries())
      .filter(([id, count]) => count > 2) // Match the logic in mostDifficultQuestions
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
