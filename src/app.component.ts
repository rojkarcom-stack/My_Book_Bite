

import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

import { QuizService } from './services/quiz.service';
import { TranslationService } from './services/translation.service';
import { QuizView } from './models';

// Import all view components
import { LanguageSelectorComponent } from './components/language-selector/language-selector.component';
import { LandingPageComponent } from './components/landing-page/landing-page.component';
import { AuthComponent } from './components/auth/auth.component';
import { RoleSelectorComponent } from './components/role-selector/role-selector.component';
// FIX: Reordered imports to potentially resolve a circular dependency issue causing the 'AdminComponent' export error.
import { AdminComponent } from './components/admin/admin.component';
import { AdminLoginComponent } from './components/admin-login/admin-login.component';
import { StudentGradeSelectorComponent } from './components/student-grade-selector/student-grade-selector.component';
import { StudentBranchSelectorComponent } from './components/student-branch-selector/student-branch-selector.component';
import { StudentSubjectSelectorComponent } from './components/student-subject-selector/student-subject-selector.component';
import { StudentTopicSelectorComponent } from './components/student-topic-selector/student-topic-selector.component';
import { StudentQuizComponent } from './components/student-quiz/student-quiz.component';
import { StudentResultsComponent } from './components/student-results/student-results.component';
import { StudentDashboardComponent } from './components/student-dashboard/student-dashboard.component';
import { ThemeSwitcherComponent } from './components/theme-switcher/theme-switcher.component';
import { HeaderComponent } from './components/header/header.component';
import { ToastComponent } from './components/toast/toast.component';
import { StudentStudyBrowseComponent } from './components/student-study-browse/student-study-browse.component';
import { StudentStudyGuideComponent } from './components/student-study-guide/student-study-guide.component';
import { StudentBillingComponent } from './components/billing/billing.component';
import { TeacherExamGeneratorComponent } from './components/teacher-exam-generator/teacher-exam-generator.component';
import { PrintableExamComponent } from './components/printable-exam/printable-exam.component';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    LanguageSelectorComponent,
    LandingPageComponent,
    AuthComponent,
    RoleSelectorComponent,
    AdminComponent,
    AdminLoginComponent,
    StudentGradeSelectorComponent,
    StudentBranchSelectorComponent,
    StudentSubjectSelectorComponent,
    StudentTopicSelectorComponent,
    StudentQuizComponent,
    StudentResultsComponent,
    StudentDashboardComponent,
    HeaderComponent,
    ToastComponent,
    StudentStudyBrowseComponent,
    StudentStudyGuideComponent,
    StudentBillingComponent,
    TeacherExamGeneratorComponent,
    PrintableExamComponent,
  ],
  template: `
    <main class="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50 min-h-screen font-sans relative">
      @if (isLoading()) {
        <div class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-indigo-900 via-slate-900 to-sky-900 text-white animate-fade-in">
          <div class="flex items-center gap-4 mb-4 animate-fade-in-up" style="animation-delay: 0.1s;">
              <svg class="h-12 w-auto text-indigo-400 animate-pulse" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
              </svg>
              <h1 class="text-4xl font-bold tracking-wider">{{ t.translate('landing.appName') }}</h1>
          </div>
          <div class="flex items-center gap-2 text-slate-300 animate-fade-in-up" style="animation-delay: 0.3s;">
              <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>{{ t.translate('loading') }}</span>
          </div>
        </div>
      }

      @if (coreDataLoadError() && !isLoading()) {
        <div class="fixed inset-0 z-40 flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900 text-center p-8 animate-fade-in">
          <div class="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl max-w-lg w-full">
            <svg class="mx-auto h-12 w-12 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <h2 class="mt-4 text-2xl font-bold text-slate-800 dark:text-slate-100">{{ t.translate('admin.errorTitle') }}</h2>
            <p class="mt-2 text-slate-600 dark:text-slate-400">{{ coreDataLoadError() }}</p>
            <button (click)="retryLoadData()" class="mt-6 px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition">
              {{ t.translate('errors.retry') }}
            </button>
          </div>
        </div>
      } @else {
        <div class="p-4 sm:p-6 lg:p-8">
          @if (isLoggedInView()) {
            <app-header />
          }
          @switch (quizService.view()) {
            @case ('language_select') {
              <app-language-selector />
            }
            @case ('landing') {
              <app-landing-page />
            }
            @case ('auth') {
              <app-auth />
            }
            @case ('role_select') {
              <app-role-selector />
            }
            @case ('admin') {
              <app-admin />
            }
            @case ('admin_login') {
              <app-admin-login />
            }
            @case ('student_grade_select') {
              <app-student-grade-selector />
            }
            @case ('student_branch_select') {
              <app-student-branch-selector />
            }
            @case ('student_subject_select') {
              <app-student-subject-selector />
            }
            @case ('student_topic_selector') {
              <app-student-topic-selector />
            }
            @case ('student_quiz') {
              <app-student-quiz />
            }
            @case ('student_results') {
              <app-student-results />
            }
            @case ('student_dashboard') {
              <app-student-dashboard />
            }
            @case ('student_study_guide_browse') {
              <app-student-study-browse />
            }
            @case ('student_study_guide') {
              <app-student-study-guide />
            }
            @case ('student_billing') {
              <app-student-billing />
            }
            @case ('teacher_exam_generator') {
              <app-teacher-exam-generator />
            }
            @case ('teacher_exam_preview') {
              <app-printable-exam />
            }
            @default {
              <app-language-selector />
            }
          }
        </div>
      }
      <app-toast></app-toast>

      @if (quizService.isQuotaExceeded()) {
        <div class="fixed bottom-4 left-4 right-4 z-50 animate-fade-in-up">
          <div class="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 p-4 rounded-xl shadow-lg flex items-start gap-3 max-w-2xl mx-auto">
            <div class="p-2 bg-amber-100 dark:bg-amber-800 rounded-full text-amber-600 dark:text-amber-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <div class="flex-1">
              <h3 class="text-sm font-bold text-amber-800 dark:text-amber-200">{{ t.translate('errors.quotaExceededTitle') || 'Offline Mode / Quota Exceeded' }}</h3>
              <p class="text-xs text-amber-700 dark:text-amber-300 mt-1">
                {{ t.translate('errors.quotaExceededDesc') || 'The app is currently using cached data because the database limit has been reached. Some new updates might not be visible until tomorrow.' }}
              </p>
            </div>
            <button (click)="quizService.isQuotaExceeded.set(false)" class="text-amber-400 hover:text-amber-600 dark:hover:text-amber-200">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      }
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  quizService = inject(QuizService);
  t = inject(TranslationService);
  isLoading = this.quizService.isLoading;
  coreDataLoadError = this.quizService.coreDataLoadError;

  isLoggedInView = computed(() => {
    const currentView = this.quizService.view();
    const loggedInViews: QuizView[] = [
      'role_select', 'admin', 'student_grade_select', 
      'student_branch_select', 'student_subject_select', 
      'student_topic_selector', 'student_quiz',
      'student_results', 'student_dashboard',
      'student_study_guide_browse', 'student_study_guide',
      'teacher_exam_generator', 'teacher_exam_preview'
    ];
    return loggedInViews.includes(currentView);
  });

  retryLoadData() {
    this.quizService.loadCoreData();
  }
}