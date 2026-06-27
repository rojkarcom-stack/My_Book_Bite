import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuizService } from '../../services/quiz.service';
import { TranslationService } from '../../services/translation.service';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-role-selector',
  standalone: true,
  imports: [CommonModule],
  template: `
<div class="flex flex-col items-center justify-center max-w-5xl mx-auto w-full px-4 sm:px-6 py-10 animate-fade-in-up">
  <div class="p-8 sm:p-12 backdrop-blur-xl bg-white/70 dark:bg-slate-905/65 rounded-3xl shadow-xl border border-slate-200/50 dark:border-slate-800/80 w-full relative overflow-hidden">
    
    <!-- Title Section -->
    <div class="max-w-xl mx-auto mb-10 text-center space-y-3">
      <div class="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/40 rounded-full text-indigo-600 dark:text-indigo-400 font-extrabold text-[9px] uppercase tracking-widest leading-none border border-indigo-100/20">
        {{ t.translate('roleSelector.hub') }}
      </div>
      <h1 class="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white font-heading tracking-tight">
        {{ t.translate('welcome') }}
      </h1>
      <p class="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
        {{ t.translate('roleSelector.selectYourRole') || t.translate('selectYourRole') }}
      </p>
    </div>
    
    <!-- Bento Role Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
      
      <!-- Option 1: Start Quiz / Student -->
      <button (click)="selectRole('student')" 
              class="group flex flex-col items-center justify-between p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800 bg-white/60 dark:bg-slate-905/30 hover:border-indigo-500/80 hover:bg-gradient-to-b hover:from-white hover:to-indigo-50/20 dark:hover:to-indigo-950/10 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg cursor-pointer">
        <div class="flex flex-col items-center text-center">
          <div class="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/45 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-5 group-hover:scale-110 transition duration-300 shadow-sm border border-indigo-100/30">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 14l9-5-9-5-9 5 9 5z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 01-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 14l9-5-9-5-9 5 9 5zm0 0v6" />
            </svg>
          </div>
          <span class="font-extrabold text-base text-slate-800 dark:text-slate-100 group-hover:text-indigo-650 dark:group-hover:text-indigo-400 transition-colors block mb-1 font-heading">
            {{ t.translate('imAStudent') }}
          </span>
          <p class="text-[11px] text-slate-400 dark:text-slate-500 leading-normal mb-4">
            {{ t.translate('roleSelector.studentDesc') }}
          </p>
        </div>
        <span class="text-[10px] uppercase font-bold tracking-widest text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/40 px-3 py-1 rounded-lg">
          {{ t.translate('roleSelector.practice') }} →
        </span>
      </button>
 
      <!-- Option 2: Teacher -->
      <button (click)="selectRole('teacher')" 
              class="group flex flex-col items-center justify-between p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800 bg-white/60 dark:bg-slate-905/30 hover:border-violet-500/80 hover:bg-gradient-to-b hover:from-white hover:to-violet-50/20 dark:hover:to-violet-950/10 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg cursor-pointer">
        <div class="flex flex-col items-center text-center">
          <div class="w-16 h-16 rounded-2xl bg-violet-50 dark:bg-violet-950/45 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-5 group-hover:scale-110 transition duration-300 shadow-sm border border-violet-100/30">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <span class="font-extrabold text-base text-slate-800 dark:text-slate-100 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors block mb-1 font-heading">
            {{ t.translate('imATeacher') }}
          </span>
          <p class="text-[11px] text-slate-400 dark:text-slate-500 leading-normal mb-4">
            {{ t.translate('roleSelector.teacherDesc') }}
          </p>
        </div>
        <span class="text-[10px] uppercase font-bold tracking-widest text-violet-600 dark:text-violet-400 bg-violet-50/50 dark:bg-violet-950/40 px-3 py-1 rounded-lg">
          {{ t.translate('roleSelector.instruct') }} →
        </span>
      </button>
      
      <!-- Option 3: Study Guides -->
      <button (click)="browseStudyGuides()" 
              class="group flex flex-col items-center justify-between p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800 bg-white/60 dark:bg-slate-905/30 hover:border-emerald-500/80 hover:bg-gradient-to-b hover:from-white hover:to-emerald-550/20 dark:hover:to-emerald-950/10 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg cursor-pointer">
        <div class="flex flex-col items-center text-center">
          <div class="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/45 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-5 group-hover:scale-110 transition duration-300 shadow-sm border border-emerald-100/30">
            <svg class="h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
            </svg>
          </div>
          <span class="font-extrabold text-base text-slate-800 dark:text-slate-100 group-hover:text-emerald-650 dark:group-hover:text-emerald-400 transition-colors block mb-1 font-heading">
            {{ t.translate('student.studyGuides') }}
          </span>
          <p class="text-[11px] text-slate-400 dark:text-slate-500 leading-normal mb-4">
            {{ t.translate('roleSelector.studyGuidesDesc') }}
          </p>
        </div>
        <span class="text-[10px] uppercase font-bold tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/40 px-3 py-1 rounded-lg">
          {{ t.translate('roleSelector.browse') }} →
        </span>
      </button>
      
      <!-- Option 4: My Progress -->
      <button (click)="showDashboard()" 
              class="group flex flex-col items-center justify-between p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800 bg-white/60 dark:bg-slate-905/30 hover:border-amber-500/80 hover:bg-gradient-to-b hover:from-white hover:to-amber-50/20 dark:hover:to-amber-950/10 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg cursor-pointer">
        <div class="flex flex-col items-center text-center">
          <div class="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/45 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-5 group-hover:scale-110 transition duration-300 shadow-sm border border-amber-100/30">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 10a8 8 0 0 1 8-8v8h8a8 8 0 1 1-16 0Z" />
              <path d="M12 2.252A8.014 8.014 0 0 1 17.748 8H12V2.252Z" />
            </svg>
          </div>
          <span class="font-extrabold text-base text-slate-800 dark:text-slate-100 group-hover:text-amber-650 dark:group-hover:text-amber-400 transition-colors block mb-1 font-heading">
            {{ t.translate('student.myProgress') }}
          </span>
          <p class="text-[11px] text-slate-400 dark:text-slate-500 leading-normal mb-4">
            {{ t.translate('roleSelector.progressDesc') }}
          </p>
        </div>
        <span class="text-[10px] uppercase font-bold tracking-widest text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/40 px-3 py-1 rounded-lg">
          {{ t.translate('roleSelector.analyse') }} →
        </span>
      </button>
 
      <!-- Admin Option (Full Width row if active) -->
      @if (isAdminUser()) {
        <button (click)="selectRole('admin')" 
                class="group flex items-center justify-between p-6 rounded-3xl border border-rose-200 dark:border-rose-950 bg-rose-50/30 dark:bg-rose-950/10 hover:border-rose-500 hover:bg-rose-50/50 transition-all duration-300 transform hover:-translate-y-1 sm:col-span-2 lg:col-span-4 cursor-pointer gap-4">
          <div class="flex items-center gap-4 text-left">
            <div class="w-12 h-12 rounded-xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-450 flex items-center justify-center shrink-0 shadow-sm border border-rose-200/30">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <span class="font-extrabold text-base text-slate-800 dark:text-slate-100 group-hover:text-rose-600 dark:group-hover:text-rose-450 transition-colors font-heading block">
                {{ t.translate('imAnAdmin') }}
              </span>
              <span class="text-xs text-slate-400 dark:text-slate-500">
                {{ t.translate('roleSelector.adminDesc') }}
              </span>
            </div>
          </div>
          <span class="text-[10px] uppercase font-extrabold tracking-wider text-rose-600 bg-rose-100/50 dark:bg-rose-950/60 px-4 py-2 rounded-xl">
            {{ t.translate('roleSelector.console') }}
          </span>
        </button>
      }
    </div>
    
    <!-- Secondary actions -->
    <div class="flex flex-col sm:flex-row justify-center items-center gap-6 pt-6 border-t border-slate-100 dark:border-slate-800/60 max-w-xl mx-auto font-sans">
      <button (click)="quizService.goBack()" class="text-xs font-bold text-slate-450 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all focus:outline-none flex items-center gap-1.5 py-2 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">
        <span>{{ t.isRtl() ? '→' : '←' }}</span>
        {{ t.translate('buttons.changeLanguage') || 'Change Interface Language' }}
      </button>
      <div class="hidden sm:inline-block w-1 h-4 bg-slate-200 dark:bg-slate-800 rounded"></div>
      <button (click)="quizService.signOut()" class="text-xs font-bold text-slate-450 dark:text-rose-400 hover:text-rose-600 transition-all focus:outline-none flex items-center gap-1.5 py-2 px-3 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
        </svg>
        {{ t.translate('roleSelector.signOutSecurely') }}
      </button>
    </div>
  </div>
</div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoleSelectorComponent {
  quizService = inject(QuizService);
  supabase = inject(SupabaseService);
  t = inject(TranslationService);

  isAdminUser = this.quizService.isAdmin;

  selectRole(role: 'student' | 'admin' | 'teacher') {
    this.quizService.selectRole(role);
  }

  showDashboard() {
    this.quizService.showDashboard();
  }

  browseStudyGuides() {
    this.quizService.browseStudyGuides();
  }

  signOut() {
    this.quizService.signOut();
  }
}
