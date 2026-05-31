import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';
import { QuizService } from '../../services/quiz.service';
import { TranslationService } from '../../services/translation.service';

type AuthMode = 'signIn' | 'signUp';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
<div class="flex flex-col items-center justify-center min-h-[70vh] px-4 animate-fade-in-up">
  <div class="p-8 sm:p-12 bg-white dark:bg-slate-800 rounded-3xl shadow-md border border-slate-200/60 dark:border-slate-700/60 max-w-md w-full">
    
    <div class="text-center">
      <div class="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center rounded-2xl mx-auto mb-5">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" class="w-6 h-6">
          <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
      </div>
      
      @if (mode() === 'signIn') {
        <h1 class="text-3xl font-extrabold text-slate-900 dark:text-white mb-2 font-heading tracking-tight">{{ t.translate('auth.signInTitle') }}</h1>
        <p class="text-sm font-medium text-slate-500 dark:text-slate-400">
          {{ t.translate('auth.noAccount') }} 
          <button (click)="toggleMode()" class="font-bold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 focus:outline-none focus:underline">{{ t.translate('auth.signUpHere') }}</button>
        </p>
      } @else {
        <h1 class="text-3xl font-extrabold text-slate-900 dark:text-white mb-2 font-heading tracking-tight">{{ t.translate('auth.signUpTitle') }}</h1>
        <p class="text-sm font-medium text-slate-500 dark:text-slate-400">
          {{ t.translate('auth.haveAccount') }} 
          <button (click)="toggleMode()" class="font-bold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 focus:outline-none focus:underline">{{ t.translate('auth.signInHere') }}</button>
        </p>
      }
    </div>
    
    <form [formGroup]="authForm" (ngSubmit)="handleSubmit()" class="mt-8 space-y-5">
      <div>
        <label for="email" class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">{{ t.translate('auth.email') }}</label>
        <input id="email" type="email" formControlName="email" required class="block w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition sm:text-sm">
      </div>
      <div>
        <label for="password" class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">{{ t.translate('auth.password') }}</label>
        <input id="password" type="password" formControlName="password" required class="block w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition sm:text-sm">
      </div>
      
      @if(errorMessage()) {
        <p class="text-sm text-rose-600 dark:text-rose-400 text-center font-medium">{{ errorMessage() }}</p>
      }
      
      <div class="pt-2">
        <button type="submit" [disabled]="authForm.invalid || isLoading()" class="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-2xl text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/20 active:translate-y-0.5 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-slate-200 dark:disabled:bg-slate-700 disabled:text-slate-400 dark:disabled:text-slate-500 disabled:shadow-none disabled:translate-y-0 disabled:cursor-not-allowed transition-all">
          @if (isLoading()) {
            <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          } @else {
            <span>{{ mode() === 'signIn' ? t.translate('auth.signIn') : t.translate('auth.signUp') }}</span>
          }
        </button>
      </div>
    </form>
    
    <div class="mt-8 text-center border-t border-slate-100 dark:border-slate-700/60 pt-6">
      <button (click)="quizService.goBack()" type="button" class="text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors focus:outline-none flex items-center justify-center gap-1.5 mx-auto">
        <span>{{ t.isRtl() ? '→' : '←' }}</span>
        {{ t.translate('back') }}
      </button>
    </div>
  </div>
</div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthComponent {
  supabase = inject(SupabaseService);
  quizService = inject(QuizService);
  t = inject(TranslationService);
  fb: FormBuilder = inject(FormBuilder);

  mode = signal<AuthMode>('signIn');
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  authForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  toggleMode() {
    this.mode.update(current => current === 'signIn' ? 'signUp' : 'signIn');
    this.errorMessage.set(null);
    this.authForm.reset();
  }

  async handleSubmit() {
    if (this.authForm.invalid) {
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    const { email, password } = this.authForm.value;

    try {
      if (this.mode() === 'signIn') {
        await this.supabase.signInWithPassword(email!, password!);
      } else {
        await this.supabase.signUp(email!, password!);
      }
      this.quizService.view.set('role_select');
    } catch (error: any) {
      this.errorMessage.set(error.message || this.t.translate('auth.unknownError'));
    } finally {
      this.isLoading.set(false);
    }
  }
}
