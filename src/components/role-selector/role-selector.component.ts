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
<div class="flex flex-col items-center justify-center animate-fade-in-up">
  <div class="text-center p-8 sm:p-12 bg-white dark:bg-slate-800 rounded-3xl shadow-md border border-slate-200/60 dark:border-slate-700/60 max-w-5xl w-full">
    
    <div class="max-w-xl mx-auto mb-10">
      <h1 class="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mb-3 font-heading tracking-tight">
        {{ t.translate('welcome') }}
      </h1>
      <p class="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
        {{ t.translate('selectYourRole') }}
      </p>
    </div>
    
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
      <!-- Start Quiz / Student -->
      <button (click)="selectRole('student')" class="group flex flex-col items-center p-8 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 hover:border-indigo-500 hover:bg-indigo-50/45 dark:hover:bg-indigo-950/20 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-sm">
        <div class="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 14l9-5-9-5-9 5 9 5z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 01-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 14l9-5-9-5-9 5 9 5zm0 0v6" />
          </svg>
        </div>
        <span class="font-bold text-lg text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{{ t.translate('imAStudent') }}</span>
      </button>
 
      <!-- Teacher -->
      <button (click)="selectRole('teacher')" class="group flex flex-col items-center p-8 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 hover:border-indigo-500 hover:bg-indigo-50/45 dark:hover:bg-indigo-950/20 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-sm">
        <div class="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <span class="font-bold text-lg text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{{ t.translate('imATeacher') }}</span>
      </button>
      
      <!-- Study Guides -->
      <button (click)="browseStudyGuides()" class="group flex flex-col items-center p-8 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 hover:border-indigo-500 hover:bg-indigo-50/45 dark:hover:bg-indigo-950/20 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-sm">
        <div class="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
          <svg class="h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
          </svg>
        </div>
        <span class="font-bold text-lg text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{{ t.translate('student.studyGuides') }}</span>
      </button>
      
      <!-- My Progress -->
       <button (click)="showDashboard()" class="group flex flex-col items-center p-8 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 hover:border-indigo-500 hover:bg-indigo-50/45 dark:hover:bg-indigo-950/20 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-sm">
        <div class="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
            <path d="M2 10a8 8 0 0 1 8-8v8h8a8 8 0 1 1-16 0Z" />
            <path d="M12 2.252A8.014 8.014 0 0 1 17.748 8H12V2.252Z" />
          </svg>
        </div>
        <span class="font-bold text-lg text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{{ t.translate('student.myProgress') }}</span>
      </button>
 
      <!-- Admin -->
      @if (isAdminUser()) {
        <button (click)="selectRole('admin')" class="group flex flex-col items-center p-8 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 hover:border-indigo-500 hover:bg-indigo-50/45 dark:hover:bg-indigo-950/20 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-sm sm:col-span-2 lg:col-span-4">
          <div class="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066 2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <span class="font-bold text-lg text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{{ t.translate('imAnAdmin') }}</span>
        </button>
      }
    </div>
    
    <button (click)="quizService.goBack()" class="text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors focus:outline-none flex items-center gap-1.5 mx-auto">
      <span>{{ t.isRtl() ? '→' : '←' }}</span>
      {{ t.translate('buttons.changeLanguage') }}
    </button>
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
