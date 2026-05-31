import { Component, ChangeDetectionStrategy, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuizService } from '../../services/quiz.service';
import { TranslationService } from '../../services/translation.service';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';

interface PricingPlan {
  id: string;
  nameKey: string;
  price: string;
  periodKey: string;
  featuresKeys: string[];
  type: 'monthly' | 'annual' | 'lifetime';
  priceId?: string;
}

@Component({
  selector: 'app-student-billing',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white dark:bg-slate-800 p-6 sm:p-10 rounded-2xl shadow-xl max-w-4xl mx-auto animate-fade-in-up">
      <!-- Header -->
      <div class="flex justify-between items-center mb-8 border-b border-slate-200 dark:border-slate-700 pb-5">
        <div>
          <h1 class="text-2xl sm:text-3xl font-bold text-indigo-600 dark:text-indigo-400">
            {{ t.translate('student.premiumAccess') || 'Premium Membership' }}
          </h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {{ t.translate('student.premiumSubtitle') || 'Support our classroom and unlock premium study guides & complete quiz banks!' }}
          </p>
        </div>
        <button (click)="quizService.goBack()" class="text-sm font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition">
          <span>{{ t.isRtl() ? '→' : '←' }}</span> {{ t.translate('back') }}
        </button>
      </div>

      <!-- Current Subscription Status -->
      <div class="mb-8 p-6 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-950/30">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span class="text-xs font-bold uppercase tracking-wider text-indigo-500 block mb-1">
              {{ t.translate('student.subscriptionStatus') || 'Your Status' }}
            </span>
            <div class="flex items-center gap-2.5">
              @if (hasActiveSubscription()) {
                <span class="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span class="text-lg font-bold text-slate-800 dark:text-slate-100">
                  {{ t.translate('student.premiumActive') || 'Premium Access Active' }}
                </span>
                <span class="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 px-2.5 py-1 rounded-full font-bold uppercase">
                  {{ t.translate('student.unlocked') || 'PRO' }}
                </span>
              } @else {
                <span class="inline-block w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                <span class="text-lg font-semibold text-slate-700 dark:text-slate-300">
                  {{ t.translate('student.freeTier') || 'Free Tier (Limited Access)' }}
                </span>
              }
            </div>
            @if (hasActiveSubscription()) {
              <p class="text-xs text-indigo-600/80 dark:text-indigo-400/80 mt-2">
                {{ t.translate('student.premiumActiveDesc') || 'You have unlimited access to study guides and exam generators.' }}
              </p>
            }
          </div>

          @if (hasActiveSubscription()) {
            <div class="flex items-center gap-2">
              <span class="text-xs text-slate-400 italic">Connected with Paddle Billing</span>
            </div>
          }
        </div>
      </div>

      <!-- Main Pricing Tier Cards -->
      <div class="grid md:grid-cols-2 gap-6 mb-10">
        @for (plan of plans; track plan.id) {
          <div class="relative group p-6 rounded-2xl border-2 transition-all flex flex-col justify-between"
               [class.border-indigo-600]="plan.type === 'annual'"
               [class.dark:border-indigo-500]="plan.type === 'annual'"
               [class.border-slate-100]="plan.type !== 'annual'"
               [class.dark:border-slate-700]="plan.type !== 'annual'"
               [class.bg-slate-50/50]="plan.type !== 'annual'"
               [class.dark:bg-slate-900/30]="plan.type !== 'annual'"
               [class.shadow-xl]="plan.type === 'annual'"
               [class.shadow-slate-100]="plan.type === 'annual'"
               [class.dark:shadow-none]="plan.type === 'annual'">
            
            @if (plan.type === 'annual') {
              <span class="absolute -top-3.5 left-6 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white text-[10px] font-extrabold tracking-widest uppercase px-3.5 py-1 rounded-full shadow-md">
                {{ t.translate('student.bestValue') || 'BEST VALUE' }}
              </span>
            }

            <div>
              <h3 class="text-xl font-bold text-slate-800 dark:text-slate-100">{{ plan.nameKey }}</h3>
              
              <div class="mt-4 flex items-baseline">
                <span class="text-4xl font-black text-slate-900 dark:text-white leading-none">{{ plan.price }}</span>
                <span class="text-sm text-slate-400 dark:text-slate-500 ml-1 font-semibold">/ {{ plan.periodKey }}</span>
              </div>

              <!-- Features list -->
              <ul class="mt-6 space-y-3.5">
                @for (feature of plan.featuresKeys; track feature) {
                  <li class="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300">
                    <svg class="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd" />
                    </svg>
                    <span>{{ feature }}</span>
                  </li>
                }
              </ul>
            </div>

            <div class="mt-8">
              <button (click)="checkout(plan)" 
                      [disabled]="isLoadingConfig() || isCheckingOut()"
                      class="w-full py-3 px-4 rounded-xl font-bold transition text-center cursor-pointer active:scale-95 text-sm"
                      [class.bg-indigo-600]="plan.type === 'annual'"
                      [class.hover:bg-indigo-700]="plan.type === 'annual'"
                      [class.text-white]="plan.type === 'annual'"
                      [class.bg-slate-200]="plan.type !== 'annual'"
                      [class.hover:bg-slate-300]="plan.type !== 'annual'"
                      [class.text-slate-800]="plan.type !== 'annual'"
                      [class.dark:bg-slate-700]="plan.type !== 'annual'"
                      [class.dark:hover:bg-slate-600]="plan.type !== 'annual'"
                      [class.dark:text-slate-100]="plan.type !== 'annual'">
                @if (isCheckingOut() && activeCheckoutPlanId() === plan.id) {
                  <span class="flex items-center justify-center gap-2">
                    <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {{ t.translate('student.openingCheckout') || 'Opening Checkout...' }}
                  </span>
                } @else {
                  {{ t.translate('student.upgradeWithPaddle') || 'Upgrade with Paddle' }}
                }
              </button>
            </div>
          </div>
        }
      </div>

      <!-- Developer Quick Sandbox Simulator Block -->
      <div class="p-6 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30">
        <div class="flex items-start gap-4">
          <div class="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 shrink-0">
            <svg class="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9.75 3.104v1.244c0 .597-.484 1.081-1.081 1.081a2.25 2.25 0 0 1-2.25-2.25h-.005a2.25 2.25 0 0 0-2.235 2.56c.123.847.63 1.58 1.345 1.996.598.349.81 1.114.475 1.731l-.225.414c-.312.573-1.012.78-1.58.468a3.75 3.75 0 0 0-4.887 1.065 2.247 2.247 0 0 0 .546 2.06c.453.435.632 1.083.475 1.693l-.113.43c-.156.6-.74 1.002-1.353.94a3.75 3.75 0 0 0-3.3 5.483 1.5 1.5 0 0 0 1.259.851h18.36a1.5 1.5 0 0 0 1.258-.85a3.75 3.75 0 0 0-3.3-5.485c-.613.064-1.198-.34-1.354-.94l-.113-.43a1.724 1.724 0 0 1 .475-1.693 2.247 2.247 0 0 0 .546-2.06 3.75 3.75 0 0 0-4.887-1.065c-.568.312-1.268.106-1.58-.468l-.225-.414a1.324 1.324 0 0 1 .475-1.731c.715-.416 1.222-1.15 1.345-1.996a2.25 2.25 0 0 0-2.235-2.56h-.005a2.25 2.25 0 0 1-2.25 2.25c-.597 0-1.081-.484-1.081-1.08V3.104c0-.903-.73-1.636-1.635-1.636h-1.03c-.905 0-1.635.733-1.635 1.636Z" />
            </svg>
          </div>
          <div class="flex-1">
            <h4 class="font-bold text-amber-800 dark:text-amber-400 text-base">Paddle Sandbox & Developer Simulator</h4>
            <p class="text-xs text-amber-700/80 dark:text-amber-300/60 mt-1">
              Test payments inside your development loop! Even if you haven't filled in real Paddle API keys in settings yet, you can use the instant simulation check to grant immediate premium permissions to your trial user in Supabase securely.
            </p>
            
            <div class="mt-4 flex flex-wrap items-center gap-3">
              <button (click)="simulateUnlock()" 
                      [disabled]="isSimulating()"
                      class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg cursor-pointer transition text-xs active:scale-95">
                @if (isSimulating()) {
                  <span>Activating Sandbox...</span>
                } @else {
                  <span>Instant Premium Unlock (Demo)</span>
                }
              </button>
              
              <button (click)="clearPermissions()" 
                      class="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold rounded-lg cursor-pointer transition text-xs active:scale-95">
                Reset to Free Tier
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentBillingComponent {
  quizService = inject(QuizService);
  t = inject(TranslationService);
  supabase = inject(SupabaseService);
  toast = inject(ToastService);

  hasActiveSubscription = this.quizService.hasActiveSubscription;
  currentUser = this.supabase.currentUser;

  isLoadingConfig = signal(false);
  isCheckingOut = signal(false);
  isSimulating = signal(false);
  activeCheckoutPlanId = signal<string | null>(null);

  paddleConfig: any = null;

  plans: PricingPlan[] = [
    {
      id: 'monthly_access',
      nameKey: 'Monthly Access',
      price: '$9.99',
      periodKey: 'month',
      type: 'monthly',
      featuresKeys: [
        'Complete access to all 12th-grade subjects',
        'Offline PDF study guides download',
        'Detailed answer rationales generated by Gemini',
        'Adaptive practice mode with quiz history',
        'Unlock study chapters & expert reviews'
      ]
    },
    {
      id: 'annual_access',
      nameKey: 'Annual All Access',
      price: '$59.99',
      periodKey: 'year',
      type: 'annual',
      featuresKeys: [
        'Save over 50% compared to monthly tier',
        'Complete access to all 12th-grade subjects',
        'Offline PDF study guides download',
        'Unlimited AI chat support with study sheets',
        'Expert evaluation generator tools for teachers',
        'Priority feature updates & custom curriculum'
      ]
    }
  ];

  constructor() {
    this.loadBillingConfig();

    // Re-verify checkout state when subscription changes
    effect(() => {
      if (this.hasActiveSubscription()) {
        this.isCheckingOut.set(false);
        this.activeCheckoutPlanId.set(null);
      }
    });
  }

  async loadBillingConfig() {
    this.isLoadingConfig.set(true);
    try {
      const res = await fetch('/api/billing/config');
      if (res.ok) {
        this.paddleConfig = await res.json();
      }
    } catch (err) {
      console.error('Failed to parse billing config:', err);
    } finally {
      this.isLoadingConfig.set(false);
    }
  }

  checkout(plan: PricingPlan) {
    const user = this.currentUser();
    if (!user) {
      this.toast.show(this.t.translate('auth.signInToContinue') || 'Please sign in to upgrade!', 'error');
      this.quizService.view.set('auth');
      return;
    }

    this.isCheckingOut.set(true);
    this.activeCheckoutPlanId.set(plan.id);

    // Initialize Paddle SDK
    if (typeof Paddle === 'undefined') {
      this.toast.show('Paddle Payment SDK failed to load. Please check your network or adblocker.', 'error');
      this.isCheckingOut.set(false);
      this.activeCheckoutPlanId.set(null);
      return;
    }

    try {
      const clientToken = this.paddleConfig?.clientToken || 'vendor_mock_token';
      const isSandbox = (this.paddleConfig?.environment || 'sandbox') === 'sandbox';

      if (isSandbox) {
        Paddle.Environment.set('sandbox');
      } else {
        Paddle.Environment.set('production');
      }

      Paddle.Initialize({
        token: clientToken,
        eventCallback: (data: any) => {
          console.log('Paddle checkout event received:', data);
          if (data.name === 'checkout.completed' || data.name === 'transaction.completed') {
            this.toast.show('Thank you! Your transaction is being processed.', 'success');
            // Gracefully poll for updated profile/permissions inside quiz service
            setTimeout(() => {
              this.quizService.refreshPermissions();
            }, 3000);
          }
        }
      });

      // Fetch dynamic price ID based on tier selection
      const priceId = plan.type === 'annual' 
        ? (this.paddleConfig?.prices?.annual || 'pri_annual_test') 
        : (this.paddleConfig?.prices?.monthly || 'pri_monthly_test');

      console.log(`Opening checkout overlay for price ID ${priceId}`);

      Paddle.Checkout.open({
        items: [
          {
            priceId: priceId,
            quantity: 1
          }
        ],
        customer: {
          email: user.email
        },
        customData: {
          userId: user.id,
          subjectId: 'all_subjects'
        },
        settings: {
          displayMode: 'overlay',
          theme: 'light',
          successUrl: window.location.href
        }
      });
    } catch (error: any) {
      console.error('Paddle open exception:', error);
      this.toast.show(`Paddle SDK error: ${error.message || error}`, 'error');
      this.isCheckingOut.set(false);
      this.activeCheckoutPlanId.set(null);
    }
  }

  async simulateUnlock() {
    const user = this.currentUser();
    if (!user) {
      this.toast.show('Please login first to simulate an account upgrade!', 'error');
      return;
    }

    this.isSimulating.set(true);
    try {
      const response = await fetch('/api/billing/simulate-purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          subjectId: 'all_subjects'
        })
      });

      if (response.ok) {
        this.toast.show('SaaS Premium has been successfully simulated and granted! All subjects unlocked.', 'success');
        await this.quizService.refreshPermissions();
      } else {
        const errData = await response.json();
        this.toast.show(`Unlock failure: ${errData.error || 'Server error'}`, 'error');
      }
    } catch (e: any) {
      this.toast.show(`Error calling sandbox simulator: ${e.message}`, 'error');
    } finally {
      this.isSimulating.set(false);
    }
  }

  async clearPermissions() {
    const user = this.currentUser();
    if (!user) {
      this.toast.show('Not signed in.', 'error');
      return;
    }

    try {
      // Clear permissions subject_access
      await this.supabase.upsertUserPermissions({
        user_id: user.id,
        allowed_languages: ['en', 'ar', 'ku_sorani', 'ku_badini'],
        allowed_grades: [12],
        subject_access: null,
        role: 'student'
      });

      this.toast.show('Permissions reset. Back to restricted free tier access!', 'success');
      await this.quizService.refreshPermissions();
    } catch (e: any) {
      this.toast.show(e.message, 'error');
    }
  }
}
