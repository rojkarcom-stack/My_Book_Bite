import { Component, ChangeDetectionStrategy, inject, computed, viewChild, ElementRef, AfterViewInit, OnDestroy, effect } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { QuizService } from '../../services/quiz.service';
import { TranslationService } from '../../services/translation.service';
import { PerformanceService } from '../../services/performance.service';
import { SupabaseService } from '../../services/supabase.service';
import { Chart } from 'chart.js/auto';
import { Badge, FocusArea } from '../../models';

interface DisplayBadge extends Badge {
  isEarned: boolean;
}

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [CommonModule, DatePipe],
  template: `
<div class="max-w-7xl mx-auto space-y-8 animate-fade-in-up">
  
  <!-- Dashboard Hero Header -->
  <div class="bg-white dark:bg-slate-800 rounded-3xl shadow-md border border-slate-200/60 dark:border-slate-700/60 p-6 sm:p-8">
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
      <div>
        <h1 class="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white font-heading tracking-tight">
          {{ t.translate('student.progressDashboard') }}
        </h1>
        <p class="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
          {{ t.translate('student.dashboardDesc') || 'Monitor your accomplishments, identify focus topics, and review historic test results.' }}
        </p>
      </div>
      <div class="flex items-center gap-4 w-full md:w-auto">
        <button (click)="quizService.view.set('student_grade_select')" class="flex-1 md:flex-none justify-center px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-md shadow-indigo-500/20 active:translate-y-0.5 hover:-translate-y-0.5 transition-all text-sm flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-4 h-4">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          {{ t.translate('student.startNewQuiz') }}
        </button>
        <button (click)="quizService.goBack()" class="group flex items-center gap-2 px-4 py-3 text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/40 dark:border-slate-700/40 hover:shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-4 h-4 transition-transform group-hover:-translate-x-1" [class.rotate-180]="t.isRtl()">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          {{ t.translate('back') }}
        </button>
      </div>
    </div>

    <!-- Student Profile & Membership Status Strip -->
    <div class="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div class="flex items-center gap-3">
        <div class="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center font-black text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-800 text-lg uppercase tracking-tight shadow-inner">
          {{ currentUser()?.email?.charAt(0) || 'S' }}
        </div>
        <div>
          <span class="block text-sm font-extrabold text-slate-800 dark:text-slate-100 leading-tight">{{ currentUser()?.email }}</span>
          <span class="block text-xs font-semibold text-slate-400 mt-0.5 leading-none">{{ t.translate('student.registeredAccount') || 'Student Profile' }}</span>
        </div>
      </div>

      <div class="flex flex-wrap gap-2 items-center">
        <!-- Grade Allowance & Access Specs -->
        @if (quizService.selectedGrade()) {
          <span class="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 border border-slate-200/40 dark:border-slate-700/40">
            {{ t.translate('grade') || 'Grade' }}: {{ quizService.selectedGrade() }}
          </span>
        }
        @if (quizService.selectedLanguage()) {
          <span class="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 border border-slate-200/40 dark:border-slate-700/40 uppercase">
            {{ quizService.selectedLanguage() }}
          </span>
        }

        <!-- Premium Status Badge -->
        @if (quizService.hasActiveSubscription()) {
          <div class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500/10 dark:bg-amber-500/5 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-extrabold text-xs shadow-sm shadow-amber-500/10">
            <svg class="w-4 h-4 text-amber-500" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
              <path fill-rule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clip-rule="evenodd" />
            </svg>
            <span>{{ t.translate('student.proActive') || '💎 Pro Account Active' }}</span>
          </div>
        } @else {
          <button (click)="quizService.view.set('student_billing')" class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 dark:bg-slate-900 dark:hover:bg-indigo-950/20 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/20 font-bold text-xs transition duration-200 active:scale-95 shadow-inner">
            <span class="w-2 h-2 rounded-full bg-slate-400"></span>
            <span>{{ t.translate('student.freeStandard') || 'Free Standard Account' }}</span>
            <span class="text-[10px] bg-indigo-600 text-white font-black px-1.5 py-0.5 rounded-md uppercase ml-1 tracking-wider">{{ t.translate('student.upgrade') || 'Upgrade' }}</span>
          </button>
        }
      </div>
    </div>
  </div>

  <!-- Pro Token Balance Section -->
  <div id="pro-token-wallet-card" class="relative overflow-hidden p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#4f46e5]/[0.02] via-[#818cf8]/[0.02] to-transparent dark:from-[#312e81]/[0.15] dark:via-slate-900/20 dark:to-transparent border border-indigo-500/15 dark:border-indigo-500/10 shadow-xs hover:shadow-sm duration-350 transition-all flex flex-col md:flex-row items-center justify-between gap-6 group/wallet">
    <!-- Ambient Blur Background Blobs -->
    <div class="absolute -top-16 -left-16 w-36 h-36 bg-[#4f46e5]/[0.04] dark:bg-[#818cf8]/[0.08] rounded-full blur-2xl pointer-events-none transition-transform duration-700 group-hover/wallet:scale-110"></div>
    <div class="absolute -bottom-16 -right-16 w-36 h-36 bg-[#818cf8]/[0.03] dark:bg-[#4f46e5]/[0.05] rounded-full blur-2xl pointer-events-none transition-transform duration-700 group-hover/wallet:scale-110"></div>

    <div class="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left relative z-10 w-full md:w-auto">
      <div class="w-16 h-16 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-100/80 dark:border-indigo-950/80 shadow-xs flex items-center justify-center text-4xl select-none shrink-0 transition-all duration-300 hover:scale-105 active:scale-95 group-hover/wallet:border-indigo-550/25 md:group-hover/wallet:scale-110">
        🪙
      </div>
      <div>
         <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-indigo-50/50 dark:bg-indigo-950/40 text-[#4f46e5] dark:text-[#818cf8] border border-indigo-150/50 dark:border-indigo-900/30">
          💼 {{ t.translate('student.tokenWallet') || 'Learning Wallet' }}
         </span>
         <h2 class="text-2xl font-black text-slate-950 dark:text-white leading-tight mt-1.5 flex flex-wrap items-center justify-center sm:justify-start gap-2 tracking-tight">
          <span>{{ t.translate('student.proTokensCount', { count: quizService.proTokens() }) || (quizService.proTokens() + ' Pro Tokens') }}</span>
          <span class="text-slate-400 dark:text-slate-500 text-sm font-semibold select-none leading-none pt-0.5">{{ t.translate('student.available') || 'Available' }}</span>
         </h2>
         <p class="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-xl leading-relaxed font-semibold">
          {{ t.translate('student.walletDesc') || 'Every 29.9 redeemable tokens unlocks any single grade curriculum forever across all subjects and languages including Arabic and Kurdish.' }}
         </p>
       </div>
     </div>
     
     <div class="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0 relative z-10 font-[Inter]">
       @if (quizService.proTokens() > 0) {
         <button (click)="quizService.view.set('subscription_success')" type="button" class="group/btn w-full sm:w-auto px-6 py-3.5 h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl uppercase tracking-wider shadow-sm hover:shadow-emerald-600/15 active:translate-y-0.5 transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer select-none">
           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="h-4 w-4 shrink-0 transform group-hover/btn:scale-110 transition-transform duration-150">
             <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 ... 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
           </svg>
           {{ t.translate('student.redeemToken') || 'Redeem Token' }}
         </button>
       }
       <button (click)="quizService.view.set('student_billing')" type="button" class="group/btn w-full sm:w-auto px-6 py-3.5 h-12 bg-[#4f46e5] hover:bg-[#4338ca] text-white font-black text-xs rounded-xl uppercase tracking-wider shadow-sm hover:shadow-indigo-620/15 active:translate-y-0.5 transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer select-none">
         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="h-4 w-4 shrink-0 transform group-hover/btn:translate-x-0.5 transition-transform duration-150">
           <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
         </svg>
         {{ t.translate('student.addProTokens') || 'Add Pro Tokens' }}
       </button>
    </div>
  </div>
  
  @if (isLoading()) {
    <div class="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/60 dark:border-slate-700/60 shadow-md">
      <svg class="animate-spin h-10 w-10 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-4">
        {{ t.translate('student.loadingDashboardAnalytics') || 'Loading Dashboard Analytics...' }}
      </span>
    </div>
  } @else if (pastQuizzes().length > 0) {
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
      
      <!-- Left Column: Metrics & Achievements -->
      <div class="lg:col-span-8 space-y-8">
        
        <!-- Overall Performance Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div class="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 p-6 flex items-center justify-between group hover:shadow-md transition">
            <div>
              <span class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{{ t.translate('student.quizzesTaken') }}</span>
              <p class="text-4xl font-extrabold text-slate-800 dark:text-slate-100 font-heading mt-1">{{ totalQuizzesTaken() }}</p>
            </div>
             <div class="flex items-center justify-center h-14 w-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9 2 2 4-4" />
                </svg>
             </div>
          </div>
          
          <div class="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 p-6 flex items-center justify-between group hover:shadow-md transition">
             <div>
                <span class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{{ t.translate('student.averageScore') }}</span>
                <p class="text-4xl font-extrabold text-slate-800 dark:text-slate-100 font-heading mt-1">{{ averageScore().toFixed(1) }}%</p>
             </div>
             <div class="flex items-center justify-center h-14 w-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
             </div>
          </div>
        </div>

        <!-- Performance Graph -->
        @if (totalQuizzesTaken() > 1) {
          <section class="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 p-6">
            <h2 class="text-lg font-bold text-slate-800 dark:text-slate-100 font-heading mb-4">{{ t.translate('student.performanceOverTime') }}</h2>
            <div class="h-64">
              <canvas #performanceChart></canvas>
            </div>
          </section>
        }

        <!-- Focus Areas Section -->
        <section class="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 p-6">
          <h2 class="text-lg font-bold text-slate-800 dark:text-slate-100 font-heading mb-1">{{ t.translate('student.focusAreas.title') }}</h2>
          @if (focusAreas().length > 0) {
            <p class="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6">{{ t.translate('student.focusAreas.description') }}</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              @for(area of focusAreas(); track area.subchapter.id) {
                <div class="p-5 rounded-2xl border border-amber-200/50 dark:border-amber-900/40 bg-amber-50/30 dark:bg-amber-950/10 flex flex-col justify-between hover:shadow-sm transition">
                  <div>
                    <span class="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">{{ area.subject.name }} / {{ area.chapter.name }}</span>
                    <h3 class="font-extrabold text-slate-800 dark:text-slate-100 font-heading mt-1.5 leading-tight">{{ area.subchapter.name }}</h3>
                    <p class="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-2">
                      {{ t.translate('student.focusAreas.yourScore') }}: <span class="font-black text-sm text-yellow-600 dark:text-yellow-500">{{ area.averageScore.toFixed(0) }}%</span>
                    </p>
                  </div>
                  <div class="flex items-center gap-2.5 mt-5">
                    @if (hasStudyGuide(area.subchapter.id)) {
                      <button (click)="review(area)" class="flex-1 text-center py-2 px-3 text-xs font-bold rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 hover:bg-amber-200/60 dark:hover:bg-amber-900/50 transition">
                        {{ t.translate('student.focusAreas.reviewGuide') }}
                      </button>
                    }
                    <button (click)="practice(area)" class="flex-1 text-center py-2 px-3 text-xs font-bold rounded-xl bg-amber-500 text-white hover:bg-amber-600 transition shadow-sm shadow-amber-500/10 active:translate-y-0.5 hover:-translate-y-0.5">
                      {{ t.translate('student.focusAreas.practiceQuiz') }}
                    </button>
                  </div>
                </div>
              }
            </div>
          } @else {
            <div class="p-8 rounded-2xl border border-emerald-100 dark:border-emerald-950/30 bg-emerald-50/20 dark:bg-emerald-950/10 text-center mt-4">
              <div class="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.745 3.745 0 0 1 3.296-1.043A3.745 3.745 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.745 3.745 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
                </svg>
              </div>
              <p class="text-sm font-bold text-emerald-800 dark:text-emerald-400">{{ t.translate('student.focusAreas.noAreas') }}</p>
            </div>
          }
        </section>

        <!-- Achievements Section -->
        <section class="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 p-6">
          <h2 class="text-lg font-bold text-slate-800 dark:text-slate-100 font-heading mb-4">{{ t.translate('student.achievements') }}</h2>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
            @for(badge of displayBadges(); track badge.id) {
              <div class="group flex flex-col items-center p-5 rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/30 hover:border-indigo-500/20 transition-all duration-200" 
                   [title]="t.translate(badge.nameKey) + '\\n' + t.translate(badge.descriptionKey)">
                <div class="relative mb-3 group-hover:scale-110 transition-transform">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-14 w-14 transition-all" 
                       [class.text-amber-500]="badge.isEarned"
                       [class.dark:text-amber-400]="badge.isEarned"
                       [class.drop-shadow-md]="badge.isEarned"
                       [class.grayscale]="!badge.isEarned"
                       [class.opacity-30]="!badge.isEarned"
                       [class.text-slate-400]="!badge.isEarned"
                       fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" [attr.d]="badge.icon" />
                  </svg>
                </div>
                <p class="text-xs font-bold text-center text-slate-800 dark:text-slate-200 leading-tight"
                   [class.opacity-45]="!badge.isEarned">
                  {{ t.translate(badge.nameKey) }}
                </p>
              </div>
            }
          </div>
        </section>

      </div>
      
      <!-- Right Column: Historic Quiz Feed -->
      <div class="lg:col-span-4 space-y-6">
        <section class="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 p-6 flex flex-col h-full">
          <h2 class="text-lg font-bold text-slate-800 dark:text-slate-100 font-heading mb-4">{{ t.translate('student.recentQuizzes') }}</h2>
          
          <div class="divide-y divide-slate-100 dark:divide-slate-700/60 space-y-3 max-h-[80vh] overflow-y-auto pr-1">
            @for (quiz of pastQuizzes(); track quiz.id) {
              <div class="pt-3 first:pt-0 flex items-start justify-between gap-3 group">
                <div class="space-y-0.5 w-[65%]">
                  <h3 class="font-bold text-sm text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 transition-colors truncate" [title]="quiz.subjectName">{{ quiz.subjectName }}</h3>
                  <p class="text-xs font-semibold text-slate-400 dark:text-slate-500 truncate" [title]="quiz.topicName">{{ quiz.topicName }}</p>
                  <p class="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-wider">{{ quiz.date | date:'MMM d, h:mm a' }}</p>
                </div>
                <div class="text-right shrink-0">
                  <div class="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700/60">
                    <span class="text-base font-black font-heading leading-none" [class]="getScoreColor(quiz.score, quiz.totalQuestions)">
                      {{ quiz.score }}<span class="text-xs font-semibold text-slate-400 dark:text-slate-500">/{{ quiz.totalQuestions }}</span>
                    </span>
                  </div>
                </div>
              </div>
            }
          </div>
        </section>
      </div>

    </div>
  } @else {
    <div class="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/60 dark:border-slate-700/60 p-12 text-center shadow-md">
      <div class="w-16 h-16 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      </div>
      <h3 class="text-lg font-bold text-slate-800 dark:text-slate-100 font-heading">{{ t.translate('student.noHistory') }}</h3>
      <p class="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
        {{ t.translate('student.noHistoryDesc') || 'Complete your first assessment to unlock detailed dashboard analysis and performance graphs.' }}
      </p>
      <div class="mt-6">
        <button type="button" (click)="quizService.changeGrade()" class="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-md shadow-indigo-500/20 active:translate-y-0.5 hover:-translate-y-0.5 transition-all text-sm">
          {{ t.translate('student.selectASubject') }}
        </button>
      </div>
    </div>
  }

</div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentDashboardComponent implements AfterViewInit, OnDestroy {
  quizService = inject(QuizService);
  t = inject(TranslationService);
  performanceService = inject(PerformanceService);
  supabase = inject(SupabaseService);

  currentUser = this.supabase.currentUser;

  pastQuizzes = this.performanceService.pastQuizzes;
  isLoading = this.performanceService.isLoading;
  focusAreas = this.performanceService.focusAreas;
  
  chartCanvas = viewChild<ElementRef<HTMLCanvasElement>>('performanceChart');
  private chart: Chart | null = null;

  totalQuizzesTaken = computed(() => this.pastQuizzes().length);
  
  averageScore = computed(() => {
    const quizzes = this.pastQuizzes();
    if (quizzes.length === 0) return 0;
    
    const totalScore = quizzes.reduce((acc, quiz) => acc + (quiz.score / quiz.totalQuestions), 0);
    return (totalScore / quizzes.length) * 100;
  });

  displayBadges = computed<DisplayBadge[]>(() => {
    const allBadges = this.performanceService.allBadges;
    const earnedBadgeIds = new Set(this.performanceService.userAchievements().map(a => a.badge_id));
    return allBadges.map(badge => ({
      ...badge,
      isEarned: earnedBadgeIds.has(badge.id)
    }));
  });

  chartConfig = computed(() => {
    // A line chart needs at least 2 data points to be meaningful.
    if (this.pastQuizzes().length < 2) {
      return null;
    }
    // Take the last 10 quizzes and reverse for chronological order on the chart.
    const quizzes = this.pastQuizzes().slice(0, 10).reverse();
    
    const locale = this.getLocaleForDate();
    const labels = quizzes.map(q => new Date(q.date).toLocaleDateString(locale, { month: 'short', day: 'numeric' }));
    const data = quizzes.map(q => Math.round((q.score / q.totalQuestions) * 100));

    return { quizzes, labels, data };
  });

  constructor() {
    effect(() => {
      // This effect reacts to changes in quiz history and updates the chart.
      // The viewChild signal ensures this only runs after the canvas is available.
      this.updateOrCreateChart();
    });
  }

  ngAfterViewInit(): void {
    // This ensures the chart is created on initial load if data is already present.
    this.updateOrCreateChart();
  }
  
  ngOnDestroy(): void {
    this.chart?.destroy();
    this.chart = null;
  }
  
  hasStudyGuide(subchapterId: string): boolean {
    return this.quizService.allStudyGuides().some(g => g.subchapter_id === subchapterId);
  }

  practice(focus: FocusArea) {
    this.quizService.startPracticeQuizFor(focus.subchapter, focus.chapter, focus.subject);
  }

  review(focus: FocusArea) {
    this.quizService.goToStudyGuide(focus.chapter, focus.subchapter);
  }
  
  private getLocaleForDate(): string {
    const lang = this.quizService.selectedLanguage();
    switch (lang) {
        case 'ar': return 'ar-SA';
        case 'ku_sorani': return 'ckb'; // Central Kurdish
        case 'ku_badini': return 'ku'; // Generic Kurdish as a fallback
        default: return 'en-US';
    }
  }
  
  private updateOrCreateChart(): void {
    const config = this.chartConfig();
    const canvas = this.chartCanvas()?.nativeElement;

    if (!config || !canvas) {
      this.chart?.destroy();
      this.chart = null;
      return;
    }

    if (this.chart) {
        // Update existing chart with new data
        this.chart.data.labels = config.labels;
        this.chart.data.datasets[0].data = config.data;
        this.chart.update();
    } else {
        // Create a new chart instance
        this.chart = new Chart(canvas, {
            type: 'line',
            data: {
                labels: config.labels,
                datasets: [{
                    label: this.t.translate('student.averageScore'),
                    data: config.data,
                    fill: true,
                    backgroundColor: 'rgba(79, 70, 229, 0.1)',
                    borderColor: 'rgb(79, 70, 229)',
                    tension: 0.3,
                    pointBackgroundColor: 'rgb(79, 70, 229)',
                    pointRadius: 4,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: (value) => `${value}%`
                        }
                    },
                    x: {
                        ticks: {
                            maxRotation: 0,
                            minRotation: 0,
                            autoSkip: true,
                            maxTicksLimit: 7
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            title: (context) => {
                                const currentConfig = this.chartConfig();
                                if (!currentConfig) return '';
                                const index = context[0].dataIndex;
                                const quiz = currentConfig.quizzes[index];
                                return quiz ? quiz.subjectName : '';
                            },
                            label: (context) => {
                                const currentConfig = this.chartConfig();
                                if (!currentConfig) return '';
                                const quiz = currentConfig.quizzes[context.dataIndex];
                                const scoreLabel = `${this.t.translate('student.averageScore')}: ${context.formattedValue}%`;
                                const topicLabel = quiz ? quiz.topicName : '';
                                return [scoreLabel, topicLabel];
                            }
                        }
                    }
                }
            }
        });
    }
  }

  getScoreColor(score: number, total: number): string {
    const percentage = (score / total) * 100;
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 50) return 'text-amber-600';
    return 'text-red-600';
  }
}
