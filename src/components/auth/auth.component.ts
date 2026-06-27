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
<div class="flex flex-col items-center justify-center min-h-[70vh] px-4 py-8 animate-fade-in-up">
  <div class="p-8 sm:p-12 backdrop-blur-xl bg-white/75 dark:bg-slate-900/65 rounded-3xl shadow-xl border border-slate-200/50 dark:border-slate-800/80 max-w-md w-full relative overflow-hidden">
    
    <!-- Accent backdrop elements -->
    <div class="absolute -right-12 -top-12 w-28 h-28 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none"></div>
    
    <div class="text-center relative z-10">
      <div class="w-14 h-14 bg-indigo-50 dark:bg-indigo-950/45 text-indigo-600 dark:text-indigo-400 flex items-center justify-center rounded-2xl mx-auto mb-6 shadow-sm border border-indigo-100/30">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6 animate-pulse">
          <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
      </div>
      
      @if (mode() === 'signIn') {
        <h1 class="text-3xl font-black text-slate-900 dark:text-white mb-2 font-heading tracking-tight">
          {{ t.translate('auth.signInTitle') || 'Welcome Back' }}
        </h1>
        <p class="text-xs font-semibold text-slate-400 dark:text-slate-500">
          {{ t.translate('auth.noAccount') || "Don't have an account yet?" }} 
          <button (click)="toggleMode()" class="font-extrabold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 focus:outline-none focus:underline cursor-pointer">
            {{ t.translate('auth.signUpHere') || 'Create Account' }}
          </button>
        </p>
      } @else {
        <h1 class="text-3xl font-black text-slate-900 dark:text-white mb-2 font-heading tracking-tight">
          {{ t.translate('auth.signUpTitle') || 'Join School Quiz Pro' }}
        </h1>
        <p class="text-xs font-semibold text-slate-400 dark:text-slate-500">
          {{ t.translate('auth.haveAccount') || 'Already registered?' }} 
          <button (click)="toggleMode()" class="font-extrabold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 focus:outline-none focus:underline cursor-pointer">
            {{ t.translate('auth.signInHere') || 'Sign In' }}
          </button>
        </p>
      }
    </div>
    
    <form [formGroup]="authForm" (ngSubmit)="handleSubmit()" class="mt-8 space-y-5 relative z-10">
      <div>
        <label for="email" class="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
          {{ t.translate('auth.email') || 'Email Address' }}
        </label>
        <input id="email" 
               type="email" 
               formControlName="email" 
               required 
               placeholder="name@schoolmail.com"
               class="block w-full px-4 py-3.5 bg-slate-50/50 dark:bg-slate-905/40 border border-slate-200/60 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/80 focus:border-transparent transition-all sm:text-xs font-medium">
      </div>
      <div>
        <label for="password" class="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
          {{ t.translate('auth.password') || 'Password' }}
        </label>
        <input id="password" 
               type="password" 
               formControlName="password" 
               required 
               placeholder="At least 6 characters"
               class="block w-full px-4 py-3.5 bg-slate-50/50 dark:bg-slate-905/40 border border-slate-200/60 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/80 focus:border-transparent transition-all sm:text-xs font-medium">
      </div>
      
      @if (errorMessage()) {
        <div class="px-4 py-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30">
          <p class="text-xs text-rose-600 dark:text-rose-400 text-center font-bold">{{ errorMessage() }}</p>
        </div>
      }
      
      <div class="pt-2">
        <button type="submit" 
                [disabled]="authForm.invalid || isLoading()" 
                class="group relative w-full flex justify-center py-3.5 px-4 text-xs font-extrabold uppercase tracking-widest rounded-2xl text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/15 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-40 disabled:hover:translate-y-0 disabled:cursor-not-allowed transition-all cursor-pointer">
          @if (isLoading()) {
            <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          } @else {
            <span>{{ mode() === 'signIn' ? (t.translate('auth.signIn') || 'Sign In') : (t.translate('auth.signUp') || 'Register Now') }}</span>
          }
        </button>
      </div>
    </form>
    
    <div class="mt-8 text-center border-t border-slate-100 dark:border-slate-800/60 pt-6 relative z-10">
      <button (click)="quizService.goBack()" type="button" class="text-xs font-bold text-slate-450 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors focus:outline-none flex items-center justify-center gap-1.5 mx-auto cursor-pointer">
        <span>{{ t.isRtl() ? '→' : '←' }}</span>
        {{ t.translate('back') || 'Go Back Home' }}
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
