import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';
import { QuizService } from '../../services/quiz.service';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
<div class="flex flex-col items-center justify-center h-full animate-fade-in-up">
      <div class="text-center p-8 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full">
        <h1 class="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-4">{{ t.translate('admin.loginTitle') }}</h1>
        <p class="text-slate-600 dark:text-slate-300 mb-8">{{ t.translate('admin.loginSubtitle') }}</p>
        
        <form [formGroup]="loginForm" (ngSubmit)="handleLogin()" class="space-y-4 text-start">
          <div>
            <label for="email" class="block text-sm font-medium text-slate-700 dark:text-slate-300">{{ t.translate('admin.email') }}</label>
            <input id="email" type="email" formControlName="email" class="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
          </div>
          <div>
            <label for="password" class="block text-sm font-medium text-slate-700 dark:text-slate-300">{{ t.translate('admin.password') }}</label>
            <input id="password" type="password" formControlName="password" class="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
          </div>
          
          @if(errorMessage()) {
            <p class="text-sm text-red-600">{{ errorMessage() }}</p>
          }
          
          <div class="flex items-center justify-between pt-2">
            <button (click)="quizService.goBack()" type="button" class="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
              &larr; {{ t.translate('back') }}
            </button>
            <button type="submit" [disabled]="loginForm.invalid || isLoading()" class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-slate-400">
              @if (isLoading()) {
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              }
              {{ t.translate('admin.loginBtn') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLoginComponent {
  supabase = inject(SupabaseService);
  quizService = inject(QuizService);
  t = inject(TranslationService);
  // FIX: Explicitly type FormBuilder to avoid type inference issues.
  fb: FormBuilder = inject(FormBuilder);

  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });
  
  async handleLogin() {
    if (this.loginForm.invalid) {
      return;
    }
    this.isLoading.set(true);
    this.errorMessage.set(null);
    try {
      const { email, password } = this.loginForm.value;
      await this.supabase.signInWithPassword(email!, password!);
      
      // Double check admin status before granting access
      const isAdmin = await this.supabase.isAdmin();
      
      if (!isAdmin) {
        // Not an admin, sign out
        await this.supabase.signOut();
        this.errorMessage.set('Only administrators are allowed to login here.');
        return;
      }
      
      this.quizService.view.set('admin');
    } catch (error: any) {
      this.errorMessage.set(error.message || 'An unknown error occurred.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
