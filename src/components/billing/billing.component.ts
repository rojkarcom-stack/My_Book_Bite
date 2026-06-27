import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuizService } from '../../services/quiz.service';
import { TranslationService } from '../../services/translation.service';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';

interface I18nBilling {
  title: string;
  subtitle: string;
  statusTitle: string;
  proBadge: string;
  freeBadge: string;
  proDesc: string;
  freeDesc: string;
  featuresTitle: string;
  feature1: string;
  feature2: string;
  feature3: string;
  feature4: string;
  memberZone: string;
  portalSubtitle: string;
  backButton: string;
  unlockPremiumBtn: string;
  activeSubscriptionBadge: string;
  pricingPlansTab: string;
  benefitsStatsTab: string;
  walletLabel: string;
  tokensAvailable: string;
  walletDesc: string;
  redeemCodeBtn: string;
  walletEmpty: string;
  selectAccessTier: string;
  selectAccessTierDesc: string;
  freeBadgeLabel: string;
  freeActiveLabel: string;
  freeTitle: string;
  freeDescLabel: string;
  freeUnit: string;
  freeFeat1: string;
  freeFeat2: string;
  freeFeat3: string;
  freeFeat4: string;
  freeBtnLabel: string;
  popularLabel: string;
  proBadgeLabel: string;
  proTitle: string;
  proDescLabel: string;
  proUnit: string;
  proFeatSub: string;
  proFeat1: string;
  proFeat2: string;
  proFeat3: string;
  proFeat4: string;
  proBtnCheckout: string;
  schoolBadgeLabel: string;
  schoolTitle: string;
  schoolDescLabel: string;
  schoolUnit: string;
  schoolFeat1: string;
  schoolFeat2: string;
  schoolFeat3: string;
  schoolFeat4: string;
  schoolBtnLabel: string;
  pciTitle: string;
  pciDesc: string;
  securePortal: string;
  instantDispatch: string;
  chartTitle: string;
  chartSubtitle: string;
  valueMultipliersTitle: string;
  valueMult1Title: string;
  valueMult1Desc: string;
  valueMult2Title: string;
  valueMult2Desc: string;
  valueMult3Title: string;
  valueMult3Desc: string;
  consultingText: string;
  submitRequestBtn: string;
  finalExamsAvgTitle: string;
  finalExamsAvgDesc: string;
  passRateAdvantageTitle: string;
  passRateAdvantageDesc: string;
  barFreeLabel: string;
  barProLabel: string;
  barPerpetualLabel: string;
}

@Component({
  selector: 'app-student-billing',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in text-slate-800 dark:text-slate-100">
      
      <!-- Top Luxury Header Section -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 pb-8 border-b border-slate-200/60 dark:border-slate-800/60">
        <div>
          <span class="inline-flex items-center gap-2 px-3 py-1 mb-2.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 border border-violet-100/50 dark:border-violet-900/30">
            👑 {{ activeI18n().memberZone }}
          </span>
          <h1 class="text-3xl font-black font-sans tracking-tight text-slate-900 dark:text-white bg-gradient-to-r from-slate-900 to-indigo-950 dark:from-white dark:to-indigo-200 bg-clip-text text-transparent">
            {{ t.translate('billingTitle') || activeI18n().title }}
          </h1>
          <p class="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-2xl font-medium leading-relaxed">
            {{ activeI18n().portalSubtitle }}
          </p>
        </div>
        
        <!-- Back Button -->
        <button (click)="quizService.goBack()" id="billing-back-button" class="group flex items-center gap-2 px-5 py-3 text-xs font-bold rounded-2xl text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:shadow-sm active:scale-95 transition-all duration-150 cursor-pointer shrink-0">
          <svg class="h-4 w-4 transform group-hover:-translate-x-0.5 transition-transform duration-150" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          {{ t.translate('back') || activeI18n().backButton }}
        </button>
      </div>

      <!-- Current Subscription Status Bar -->
      <div id="subscription-status-card" class="mb-10 p-6 sm:p-8 rounded-3xl transition-all duration-300 relative overflow-hidden"
           [class]="hasActiveSubscription() ? 'bg-gradient-to-br from-emerald-500/[0.04] to-teal-500/[0.04] border-2 border-emerald-500/20 shadow-xs' : 'bg-slate-50/50 dark:bg-slate-900/20 border border-slate-200 dark:border-slate-800'">
        <div class="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" *ngIf="hasActiveSubscription()"></div>
        <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 relative z-10">
          <div class="flex-1 space-y-3">
            <span class="text-[10px] font-black uppercase tracking-widest text-[#4f46e5] dark:text-[#818cf8] block">
              {{ activeI18n().statusTitle }}
            </span>
            <div class="flex items-center gap-3.5 flex-wrap">
              @if (hasActiveSubscription()) {
                <span class="relative flex h-3 w-3">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <span class="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2 tracking-tight">
                  {{ activeI18n().proBadge }}
                </span>
              } @else {
                <span class="inline-block w-3.5 h-3.5 rounded-full bg-amber-400 dark:bg-amber-600 animate-pulse"></span>
                <span class="text-2xl font-black text-slate-700 dark:text-slate-300 tracking-tight">
                  {{ activeI18n().freeBadge }}
                </span>
              }
            </div>
            
            <p class="text-sm text-slate-650 dark:text-slate-400 max-w-3xl leading-relaxed">
              {{ hasActiveSubscription() ? activeI18n().proDesc : activeI18n().freeDesc }}
            </p>
          </div>

          <!-- Quick Actions Panel -->
          <div class="flex flex-wrap gap-3.5 shrink-0 w-full lg:w-auto">
            @if (!hasActiveSubscription()) {
              <button (click)="activeTab.set('pricing')" class="w-full lg:w-auto flex items-center justify-center gap-2 px-6 py-3.5 text-xs font-black rounded-2xl text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/10 active:scale-95 transition-all duration-150 cursor-pointer uppercase tracking-wider">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                {{ activeI18n().unlockPremiumBtn }}
              </button>
            } @else {
              <span class="px-5 py-3 text-xs font-bold rounded-2xl text-emerald-700 dark:text-emerald-400 bg-emerald-500/[0.08] dark:bg-emerald-500/[0.12] border border-emerald-500/20 inline-flex items-center gap-1.5 select-none">
                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                {{ activeI18n().activeSubscriptionBadge }}
              </span>
            }
          </div>
        </div>
      </div>

      <!-- SaaS Tabs Segmented Navigation -->
      <div class="flex items-center p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl max-w-md mx-auto mb-10 border border-slate-200/50 dark:border-slate-850">
        <button (click)="activeTab.set('pricing')" 
                 class="flex-1 py-3 text-xs font-extrabold rounded-xl transition-all duration-150 cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wider"
                 [class]="activeTab() === 'pricing' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
          {{ activeI18n().pricingPlansTab }}
        </button>
        <button (click)="activeTab.set('benefits')" 
                 class="flex-1 py-3 text-xs font-extrabold rounded-xl transition-all duration-150 cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wider"
                 [class]="activeTab() === 'benefits' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" /></svg>
          {{ activeI18n().benefitsStatsTab }}
        </button>
      </div>

      <!-- Content Pages based on Active Tab -->
      @switch (activeTab()) {
        
        <!-- Tab 1: Pricing Plans -->
        @case ('pricing') {
          <div class="animate-fade-in space-y-10">
            
            <!-- Elegant Digital Token Balance Voucher Card -->
            <div id="token-voucher-card" class="p-6 sm:p-8 bg-gradient-to-br from-[#4f46e5]/[0.02] via-[#818cf8]/[0.02] to-transparent dark:from-[#818cf8]/[0.05] dark:via-slate-900/10 dark:to-transparent border border-indigo-500/15 dark:border-indigo-500/10 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden shadow-xs hover:shadow-sm duration-300 transition-all">
              <div class="absolute -top-12 -left-12 w-32 h-32 bg-[#4f46e5]/[0.03] dark:bg-[#818cf8]/[0.05] rounded-full blur-2xl pointer-events-none"></div>
              <div class="absolute -bottom-12 -right-12 w-32 h-32 bg-[#4f46e5]/[0.03] dark:bg-[#818cf8]/[0.05] rounded-full blur-2xl pointer-events-none"></div>
              
              <div class="flex items-center gap-5 w-full md:w-auto relative z-10">
                <div class="p-4 bg-white dark:bg-slate-900 text-3xl rounded-2xl shadow-xs border border-indigo-100/80 dark:border-indigo-950/80 flex items-center justify-center shrink-0 w-16 h-16 transition-transform duration-300 hover:scale-105 select-none">
                  🪙
                </div>
                <div>
                  <span class="block text-[10px] font-black uppercase tracking-widest text-[#4f46e5] dark:text-[#818cf8]">{{ activeI18n().walletLabel }}</span>
                  <h3 class="text-xl sm:text-2xl font-black text-slate-950 dark:text-white leading-tight mt-0.5">
                    {{ translateTokenLabel() }}
                  </h3>
                  <p class="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl leading-relaxed font-semibold">
                    {{ activeI18n().walletDesc }}
                  </p>
                </div>
              </div>
              
              <div class="w-full md:w-auto shrink-0 relative z-10">
                @if (quizService.proTokens() > 0) {
                  <button (click)="navigateToUnlock()" type="button" class="w-full md:w-auto px-6 py-4 bg-[#4f46e5] hover:bg-[#4338ca] text-white font-extrabold text-xs rounded-2xl shadow-md hover:shadow-indigo-600/15 active:translate-y-0.5 transition-all duration-150 cursor-pointer text-center uppercase tracking-wider">
                    {{ activeI18n().redeemCodeBtn }}
                  </button>
                } @else {
                  <span class="block text-center text-[10px] font-extrabold text-slate-400 dark:text-slate-500 bg-slate-100/50 dark:bg-slate-900/60 px-4 py-3 rounded-xl border border-slate-200/50 dark:border-slate-800/80">
                    {{ activeI18n().walletEmpty }}
                  </span>
                }
              </div>
            </div>

            <!-- Beautiful Tiered Pricing Grid -->
            <div>
              <div class="text-center mb-10">
                <h2 class="text-xl font-black text-slate-900 dark:text-white mb-2">{{ activeI18n().selectAccessTier }}</h2>
                <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">{{ activeI18n().selectAccessTierDesc }}</p>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch max-w-4xl mx-auto">
                <!-- Tier 1: Free Tier -->
                <div class="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 flex flex-col justify-between shadow-xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700/80 transition-all duration-300">
                  <div>
                    <div class="flex items-center justify-between">
                      <span class="text-[9px] uppercase font-black tracking-widest text-slate-400 dark:text-slate-500">{{ activeI18n().freeBadgeLabel }}</span>
                      <span class="px-2 py-0.5 text-[9px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 rounded-md select-none">{{ activeI18n().freeActiveLabel }}</span>
                    </div>
                    <h3 class="font-extrabold text-slate-800 dark:text-slate-100 text-xl mt-2">{{ activeI18n().freeTitle }}</h3>
                    <p class="text-xs text-slate-450 dark:text-slate-500 mt-1 pb-4 border-b border-slate-100 dark:border-slate-800/80">{{ activeI18n().freeDescLabel }}</p>
                    
                    <div class="my-6">
                      <span class="text-4xl font-black text-slate-950 dark:text-white">$0</span>
                      <span class="text-xs text-slate-450 dark:text-slate-400 ml-1.5 font-bold">{{ activeI18n().freeUnit }}</span>
                    </div>

                    <ul class="space-y-3.5 pt-4">
                      <li class="flex items-start gap-2.5 text-xs text-slate-605 dark:text-slate-300">
                        <svg class="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                        <span>{{ activeI18n().freeFeat1 }}</span>
                      </li>
                      <li class="flex items-start gap-2.5 text-xs text-slate-605 dark:text-slate-300">
                        <svg class="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                        <span>{{ activeI18n().freeFeat2 }}</span>
                      </li>
                      <li class="flex items-start gap-2.5 text-xs text-slate-400/80 dark:text-slate-600 line-through">
                        <svg class="h-4 w-4 text-slate-300 dark:text-slate-800 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                        <span>{{ activeI18n().freeFeat3 }}</span>
                      </li>
                      <li class="flex items-start gap-2.5 text-xs text-slate-400/80 dark:text-slate-600 line-through">
                        <svg class="h-4 w-4 text-slate-300 dark:text-slate-800 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                        <span>{{ activeI18n().freeFeat4 }}</span>
                      </li>
                    </ul>
                  </div>

                  <button disabled class="mt-8 w-full py-3.5 bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 text-xs font-black rounded-2xl select-none cursor-not-allowed">
                    {{ activeI18n().freeBtnLabel }}
                  </button>
                </div>

                <!-- Tier 2: Study Pro Monthly Plan -->
                <div class="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border-2 border-[#4f46e5] dark:border-[#818cf8] shadow-md relative overflow-hidden flex flex-col justify-between hover:shadow-xl duration-300 transition-all group/card">
                  <div class="absolute top-0 right-0 bg-[#4f46e5]/10 dark:bg-[#818cf8]/15 text-[#4f46e5] dark:text-[#818cf8] text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-bl-2xl border-l border-b border-indigo-500/10">
                    {{ activeI18n().popularLabel }}
                  </div>
                  
                  <div>
                    <span class="text-[9px] uppercase font-black tracking-widest text-[#4f46e5] dark:text-[#818cf8]">{{ activeI18n().proBadgeLabel }}</span>
                    <h3 class="font-extrabold text-slate-900 dark:text-white text-xl mt-2">{{ activeI18n().proTitle }}</h3>
                    <p class="text-xs text-indigo-600 dark:text-indigo-400 mt-1 pb-4 border-b border-indigo-100/50 dark:border-indigo-900/30">{{ activeI18n().proDescLabel }}</p>
                    
                    <div class="my-6">
                      <span class="text-4xl font-black text-slate-950 dark:text-white">$29.90</span>
                      <span class="text-xs text-slate-450 dark:text-slate-400 ml-1.5 font-bold">{{ activeI18n().proUnit }}</span>
                      <div class="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-2.5 flex items-center gap-1.5">
                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        {{ activeI18n().proFeatSub }}
                      </div>
                    </div>

                    <ul class="space-y-3.5 pt-4">
                      <li class="flex items-start gap-2.5 text-xs text-slate-605 dark:text-slate-300">
                        <svg class="h-4 w-4 text-emerald-500 shrink-0 mt-0.5 group-hover/card:scale-110 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                        <span>{{ activeI18n().proFeat1 }}</span>
                      </li>
                      <li class="flex items-start gap-2.5 text-xs text-slate-605 dark:text-slate-300">
                        <svg class="h-4 w-4 text-emerald-500 shrink-0 mt-0.5 group-hover/card:scale-110 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                        <span>{{ activeI18n().proFeat2 }}</span>
                      </li>
                      <li class="flex items-start gap-2.5 text-xs text-slate-605 dark:text-slate-300">
                        <svg class="h-4 w-4 text-emerald-500 shrink-0 mt-0.5 group-hover/card:scale-110 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                        <span>{{ activeI18n().proFeat3 }}</span>
                      </li>
                      <li class="flex items-start gap-2.5 text-xs text-slate-605 dark:text-slate-300">
                        <svg class="h-4 w-4 text-emerald-500 shrink-0 mt-0.5 group-hover/card:scale-110 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                        <span>{{ activeI18n().proFeat4 }}</span>
                      </li>
                    </ul>
                  </div>

                  <div class="mt-8">
                    <a [href]="getCheckoutUrl()" target="_blank" class="block w-full text-center py-4 bg-[#4f46e5] hover:bg-[#4338ca] hover:shadow-md hover:shadow-indigo-600/10 text-white font-black text-xs rounded-2xl transition duration-150 cursor-pointer uppercase tracking-wider select-none active:scale-98">
                      {{ activeI18n().proBtnCheckout }}
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <!-- Trust / SSL Banner -->
            <div class="p-6 rounded-3xl bg-slate-50/50 dark:bg-slate-900/20 border border-slate-200/60 dark:border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-5 text-xs leading-normal">
              <div class="flex items-center gap-3.5 w-full sm:w-auto">
                <div class="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800/80 shrink-0 text-slate-500 flex items-center justify-center">
                  <svg class="h-5 w-5 text-slate-650 dark:text-slate-350" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                </div>
                <div>
                  <p class="font-bold text-slate-800 dark:text-slate-200">{{ activeI18n().pciTitle }}</p>
                  <p class="text-slate-450 dark:text-slate-400 font-medium text-[11px] mt-0.5">{{ activeI18n().pciDesc }}</p>
                </div>
              </div>
              <div class="flex items-center gap-2.5 opacity-65 text-[10px] font-black shrink-0 tracking-widest text-[#4f46e5] dark:text-[#818cf8] select-none">
                <span>{{ activeI18n().securePortal }}</span>
                <span>•</span>
                <span>{{ activeI18n().instantDispatch }}</span>
              </div>
            </div>
          </div>
        }

        <!-- Tab 2: SaaS Analytics & Benefits Chart -->
        @case ('benefits') {
          <div class="animate-fade-in space-y-8">
            <div class="space-y-2">
              <h3 class="font-extrabold text-xl text-slate-900 dark:text-white tracking-tight">{{ activeI18n().chartTitle }}</h3>
              <p class="text-sm text-slate-500 dark:text-slate-400 max-w-3xl leading-relaxed font-medium">
                {{ activeI18n().chartSubtitle }}
              </p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
              <!-- Benefit List -->
              <div class="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between shadow-xs">
                <div class="space-y-6">
                  <h4 class="font-black text-xs text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{{ activeI18n().valueMultipliersTitle }}</h4>
                  
                  <div class="space-y-5">
                    <div class="relative pl-6 before:absolute before:left-0 before:top-2 before:w-2 before:h-2 before:bg-emerald-500 before:rounded-full">
                      <h5 class="text-sm font-extrabold text-slate-800 dark:text-white">{{ activeI18n().valueMult1Title }}</h5>
                      <p class="text-xs text-slate-550 dark:text-slate-400 mt-1 leading-relaxed">
                        {{ activeI18n().valueMult1Desc }}
                      </p>
                    </div>
                    
                    <div class="relative pl-6 before:absolute before:left-0 before:top-2 before:w-2 before:h-2 before:bg-emerald-500 before:rounded-full">
                      <h5 class="text-sm font-extrabold text-slate-800 dark:text-white">{{ activeI18n().valueMult2Title }}</h5>
                      <p class="text-xs text-slate-550 dark:text-slate-400 mt-1 leading-relaxed">
                        {{ activeI18n().valueMult2Desc }}
                      </p>
                    </div>
                    
                    <div class="relative pl-6 before:absolute before:left-0 before:top-2 before:w-2 before:h-2 before:bg-emerald-500 before:rounded-full">
                      <h5 class="text-sm font-extrabold text-slate-800 dark:text-white">{{ activeI18n().valueMult3Title }}</h5>
                      <p class="text-xs text-slate-550 dark:text-slate-400 mt-1 leading-relaxed">
                        {{ activeI18n().valueMult3Desc }}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div class="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap gap-4 justify-between items-center text-xs">
                  <span class="text-slate-400 font-medium">{{ activeI18n().consultingText }}</span>
                  <button (click)="toast.show('Loading ticket submittal...', 'info')" class="text-indigo-600 dark:text-indigo-450 font-black hover:underline cursor-pointer">{{ activeI18n().submitRequestBtn }}</button>
                </div>
              </div>

              <!-- Interactive Benefit Chart (D3 Styled pure CSS mockup) -->
              <div class="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between shadow-xs">
                <div>
                  <h4 class="font-extrabold text-sm text-slate-905 dark:text-white tracking-tight">{{ activeI18n().finalExamsAvgTitle }}</h4>
                  <p class="text-xs text-slate-400 mt-1 pb-4 border-b border-slate-100 dark:border-slate-800/80">{{ activeI18n().finalExamsAvgDesc }}</p>

                  <div class="space-y-6 my-8">
                    <!-- Bar 1 -->
                    <div class="space-y-1.5">
                      <div class="flex justify-between items-center text-xs">
                        <span class="text-slate-550 dark:text-slate-400 font-mono">{{ activeI18n().barFreeLabel }}</span>
                        <span class="text-slate-900 dark:text-white font-black">58% Score Avg</span>
                      </div>
                      <div class="h-3.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div class="h-full bg-slate-450 dark:bg-slate-650 rounded-full transition-all duration-1000" style="width: 58%"></div>
                      </div>
                    </div>

                    <!-- Bar 2 -->
                    <div class="space-y-1.5">
                      <div class="flex justify-between items-center text-xs">
                        <span class="text-indigo-600 dark:text-indigo-400 font-extrabold">{{ activeI18n().barProLabel }}</span>
                        <span class="text-indigo-600 dark:text-indigo-400 font-black">84% Score Avg</span>
                      </div>
                      <div class="h-3.5 w-full bg-indigo-50 dark:bg-slate-800/60 rounded-full overflow-hidden">
                        <div class="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-1000" style="width: 84%"></div>
                      </div>
                    </div>

                    <!-- Bar 3 -->
                    <div class="space-y-1.5">
                      <div class="flex justify-between items-center text-xs">
                        <span class="text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-1">
                          {{ activeI18n().barPerpetualLabel }}
                        </span>
                        <span class="text-emerald-600 dark:text-emerald-400 font-black">94% Score Avg</span>
                      </div>
                      <div class="h-3.5 w-full bg-emerald-50 dark:bg-slate-800/60 rounded-full overflow-hidden">
                        <div class="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-1000 animate-pulse" style="width: 94%"></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="p-4 bg-amber-50 dark:bg-amber-950/20 border border-dashed border-amber-200 dark:border-amber-900/50 rounded-2xl text-[11px] text-amber-850 dark:text-amber-400 flex items-start gap-2.5">
                  <span class="flex h-2 w-2 rounded-full bg-amber-450 mt-1 shrink-0 animate-ping"></span>
                  <p class="leading-relaxed">
                    <strong>{{ activeI18n().passRateAdvantageTitle }}</strong>: {{ activeI18n().passRateAdvantageDesc }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        }
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentBillingComponent implements OnInit {
  quizService = inject(QuizService);
  t = inject(TranslationService);
  supabase = inject(SupabaseService);
  toast = inject(ToastService);
  
  activeTab = signal<'pricing' | 'benefits'>('pricing');
  
  // Freemius dynamic configurations
  pluginId = signal('31983');
  planId = signal('52466');
  publicKey = signal('');
  sandbox = signal(true);

  hasActiveSubscription = this.quizService.hasActiveSubscription;
  currentUser = this.supabase.currentUser;

  ngOnInit() {
    this.loadBillingConfig();
  }

  async loadBillingConfig() {
    try {
      const response = await fetch('/api/billing/config');
      if (response.ok) {
        const config = await response.json();
        if (config.pluginId) this.pluginId.set(config.pluginId);
        if (config.plans?.monthly) this.planId.set(config.plans.monthly);
        if (config.publicKey) this.publicKey.set(config.publicKey);
        if (config.hasOwnProperty('sandbox')) this.sandbox.set(config.sandbox);
      }
    } catch (err) {
      console.warn('Failed to load dynamic freemius billing configs:', err);
    }
  }

  getCheckoutUrl() {
    const pId = this.pluginId();
    const plId = this.planId();
    
    // Respect environment configured sandbox value
    let isSandbox = this.sandbox();

    let baseUrl = `https://checkout.freemius.com/product/${pId}/plan/${plId}/`;
    const params: string[] = [];

    if (isSandbox) {
      params.push(`sandbox=true`);
    }

    const user = this.supabase.currentUser();
    if (user) {
      if (user.email) {
        params.push(`user_email=${encodeURIComponent(user.email)}`);
      }
      if (user.id) {
        params.push(`user_id=${encodeURIComponent(user.id)}`);
      }
    }

    try {
      const returnUrl = `${window.location.origin}/payment-success`;
      params.push(`success_url=${encodeURIComponent(returnUrl)}`);
      params.push(`redirect_url=${encodeURIComponent(returnUrl)}`);
    } catch (e) {
      // Fallback
    }

    if (params.length > 0) {
      return `${baseUrl}?${params.join('&')}`;
    }
    return baseUrl;
  }

  navigateToUnlock() {
    this.quizService.view.set('subscription_success');
  }

  translateTokenLabel(): string {
    const tokens = this.quizService.proTokens();
    const template = this.activeI18n().tokensAvailable;
    return template.replace('{{count}}', String(tokens));
  }

  private translationsMap: Record<string, I18nBilling> = {
    en: {
      title: 'Premium Access Status',
      subtitle: 'Review your student account status and premium feature options.',
      statusTitle: 'Your Account Status',
      proBadge: 'PRO ACCESS ACTIVE',
      freeBadge: 'FREE TIER (LIMITED ACCESS)',
      proDesc: 'Congratulations! Your account has active premium access. You have unlimited access to study guides, custom quiz banks, and dynamic exam generators.',
      freeDesc: 'Your student account is currently on the free status. Access is limited to basic quizzes and chapter previews.',
      featuresTitle: 'Included in Premium',
      feature1: 'Full access to all 12th-grade subjects (Scientific/Literary)',
      feature2: 'Instant PDF downloads of premium study guides',
      feature3: 'Detailed answer explanations generated by Gemini 1.5 Pro',
      feature4: 'Adaptive practice modes with detailed analytics & exam generator',
      memberZone: 'MEMBER ZONE',
      portalSubtitle: 'Configure premium school curriculums, acquire student learning passes, manage your secure subscription ledger, and customize grades to lift limitations.',
      backButton: 'Go Back',
      unlockPremiumBtn: 'Unlock Premium Classes',
      activeSubscriptionBadge: 'Active Subscription',
      pricingPlansTab: '💳 Pricing plans',
      benefitsStatsTab: '📊 Benefits & Stats',
      walletLabel: 'Your Dynamic Learning Wallet',
      tokensAvailable: '{{count}} Pro Tokens Available',
      walletDesc: 'Every 29.9 redeemable pro tokens unlocks all subjects for any single grade and language of your choosing. Unlock instantly at zero extra cost.',
      redeemCodeBtn: 'Redeem Token To Unlock Grade',
      walletEmpty: 'Wallet empty. Acquire a Curriculum Token below to unlock premium access.',
      selectAccessTier: 'Select Your Access Tier',
      selectAccessTierDesc: 'Get absolute access to master materials. Choose standard credit tokens or continuous developer passes.',
      freeBadgeLabel: 'STANDARD PREVIEW',
      freeActiveLabel: 'Active',
      freeTitle: 'Free Preview',
      freeDescLabel: 'Basic evaluation mode',
      freeUnit: 'forever',
      freeFeat1: 'Basic evaluation quiz access',
      freeFeat2: 'Limited Chapter previews',
      freeFeat3: 'Unrestricted PDF download access',
      freeFeat4: 'Priority Gemini AI Explanations',
      freeBtnLabel: 'Current Evaluation Mode',
      popularLabel: 'MOST POPULAR',
      proBadgeLabel: 'MONTHLY SUBSCRIPTION',
      proTitle: 'Study Pro Monthly',
      proDescLabel: 'Continuous access to 1 full grade curriculum',
      proUnit: '/ month',
      proFeatSub: 'Active monthly pass & premium features!',
      proFeat1: 'Full access to chosen grade and language subjects',
      proFeat2: 'Sleek downloadable offline PDF study books',
      proFeat3: 'First tier priority Gemini AI explanations',
      proFeat4: 'Advanced teacher-grade custom exam creator',
      proBtnCheckout: 'Secure Checkout with Freemius',
      schoolBadgeLabel: 'CLASSROOM SUITE',
      schoolTitle: 'School License',
      schoolDescLabel: 'For academic centers and schools',
      schoolUnit: '/term',
      schoolFeat1: 'Up to 45 student seats with unified school code logins',
      schoolFeat2: 'Unified group stats, custom reporting panels & analytics',
      schoolFeat3: 'Syllabus customization alignment support desk',
      schoolFeat4: 'Dedicated school success representative (24h SLA)',
      schoolBtnLabel: 'Contact Academic Success Sales',
      pciTitle: 'PCI-DSS Compliant Credit Card Settlement',
      pciDesc: 'Billed securely in partnership with Freemius Payment Solutions. We enforce TLS 1.3 encryption protocol.',
      securePortal: '🛡️ SECURE PORTAL',
      instantDispatch: '⚡ INSTANT CREDENTIALS DISPATCH',
      chartTitle: 'Student Premium Tier Benefit Performance Chart',
      chartSubtitle: 'Analysis comparing average weekly student performance metrics. Transitioning to Study Pro with PDF guides and adaptive explanation engines demonstrates statistical scoring advantages.',
      valueMultipliersTitle: 'Premium Value Multipliers',
      valueMult1Title: 'Unlimited PDF Offline Portals',
      valueMult1Desc: 'Free users can only preview files, while Pro members unlock full offline PDF study booklets. Study anywhere, print, and study without screen fatigue.',
      valueMult2Title: 'Priority Gemini 1.5 Pro Explanations',
      valueMult2Desc: 'Say goodbye to standard text answers. Our generative explanation system analyzes wrong quiz attempts, drafting detailed, step-by-step logic.',
      valueMult3Title: 'Custom Adaptive Exam Creators',
      valueMult3Desc: 'Build customized teacher-grade mock test setups. Set filters for timed questions, specify difficult subchapters, and simulate the exact state of final regional final exams.',
      consultingText: 'Need curriculum consulting? Get assistance',
      submitRequestBtn: 'Submit Help Request',
      finalExamsAvgTitle: 'Averages on Final Secondary Exams',
      finalExamsAvgDesc: 'Verified student outcomes tracked annually across 3 study modules.',
      passRateAdvantageTitle: 'Secondary Pass Rates',
      passRateAdvantageDesc: 'Upgraded users exhibit an average score boost of 26% on high-stakes official secondary curriculum certifications.',
      barFreeLabel: '1. Basic Guest Tier (Free)',
      barProLabel: '2. Study Pro Token (1 Grade)',
      barPerpetualLabel: '3. Premium Perpetual Membership'
    },
    ar: {
      title: 'حالة ترقية الحساب (Premium)',
      subtitle: 'راجع حالة حسابك وميزات الترقية المتاحة لطلابنا.',
      statusTitle: 'حالة حسابك الحالي',
      proBadge: 'الحساب الذهبي (نشط)',
      freeBadge: 'الحساب العادي (محدود)',
      proDesc: 'تهانينا! حسابك مفعل بالميزات الذهبية الكاملة. يمكنك الآن الوصول غير المحدود لجميع ملخصات المواد، وبنوك الأسئلة الشاملة، ومولد الامتحانات الرائع.',
      freeDesc: 'حسابك الحالي في الفئة المجانية المحدودة. يمكنك تصفح وتقديم الكويزات الأساسية فقط.',
      featuresTitle: 'المزايا المتاحة في الحساب الذهبي',
      feature1: 'الوصول الكامل والشامل لجميع مواد الصف الثاني عشر (العلمي والأدبي)',
      feature2: 'تحميل وتنزيل كراسات الشرح والملخصات بصيغة PDF فوراً',
      feature3: 'توليد شروحات وتفسيرات دقيقة ومفصلة بواسطة الذكاء الاصطناعي Gemini 1.5 Pro',
      feature4: 'نظام المذاكرة التفاعلي والامتحانات التجريبية المتقدمة مع الإحصائيات',
      memberZone: 'منطقة الأعضاء',
      portalSubtitle: 'قم بتهيئة المناهج الدراسية المتميزة، واحصل على بطاقات التعلم للطلاب، وإدارة سجل الاشتراك الآمن الخاص بك، وتخصيص الصفوف لرفع القيود.',
      backButton: 'الرجوع للخلف',
      unlockPremiumBtn: 'الاشتراك والترقية للذهبي',
      activeSubscriptionBadge: 'اشتراك نشط',
      pricingPlansTab: '💳 خطط الأسعار',
      benefitsStatsTab: '📊 الفوائد والإحصائيات',
      walletLabel: 'محفظة التعلم التفاعلية الخاصة بك',
      tokensAvailable: '{{count}} رمز مميز (Tokens) متوفر',
      walletDesc: 'كل 29.9 رمز مميز مفعل يعيد فتح جميع المواد لأي صف ولغة تختارها. قم لإلغاء القفل فورًا دون أي تكلفة إضافية.',
      redeemCodeBtn: 'تفعيل الرمز لفتح الصف',
      walletEmpty: 'المحفظة فارغة. قم بشراء رمز المنهج الدراسي أدناه لفتح الميزات المميزة.',
      selectAccessTier: 'اختر فئة الاشتراك المناسبة لك',
      selectAccessTierDesc: 'احصل على وصول كامل وحصري لجميع المواد الأساسية. اختر الفئات القياسية أو باقات الاشتراك الشهري المستمرة.',
      freeBadgeLabel: 'نسخة تجريبية قياسية',
      freeActiveLabel: 'نشط',
      freeTitle: 'الفئة المجانية',
      freeDescLabel: 'وضع التقييم الأساسي',
      freeUnit: 'للأبد',
      freeFeat1: 'الوصول للاختبارات التجريبية والأساسية',
      freeFeat2: 'تجربة واستعراض فصول محدودة',
      freeFeat3: 'تحميل غير محدود في الفئة المميزة فقط',
      freeFeat4: 'شروحات وافية عبر الذكاء الاصطناعي في الفئة المميزة فقط',
      freeBtnLabel: 'وضع التقييم النشط حالياً',
      popularLabel: 'الأكثر طلباً',
      proBadgeLabel: 'اشتراك شهري',
      proTitle: 'باقة الدراسة الاحترافية (شهري)',
      proDescLabel: 'وصول مستمر طوال الشهر لمنهج دراسي كامل لأي صف',
      proUnit: '/ شهرياً',
      proFeatSub: 'اشتراك فعال ومميزات ذهبية مفعّلة!',
      proFeat1: 'الوصول الكامل لجميع مواد الصف واللغة المحددة',
      proFeat2: 'كتب شرح وملخصات تفصيلية جاهزة للتحميل كـ PDF للطباعة',
      proFeat3: 'الأولوية القصوى لشروحات الذكاء الاصطناعي الفورية',
      proFeat4: 'مولد وصانع الامتحانات الشامل والتفاعلي للأساتذة والطلاب',
      proBtnCheckout: 'دفع آمن بالكامل عبر شريكنا Freemius',
      schoolBadgeLabel: 'الحزمة المدرسية الكاملة',
      schoolTitle: 'رخصة المدارس والمراكز',
      schoolDescLabel: 'للمراكز التعليمية والمدارس والأساتذة',
      schoolUnit: '/ للفصل الدراسي',
      schoolFeat1: 'ما يصل إلى 45 مقعداً للطلاب مع تسجيل دخول موحد بكود خاص',
      schoolFeat2: 'لوحة تحكم شاملة لإحصائيات المجموعات والتقارير الدقيقة',
      schoolFeat3: 'دعم كامل لمواءمة وتخصيص المناهج الدراسية الخاصة بالمؤسسة',
      schoolFeat4: 'ممثل دعم خاص ومباشر للمؤسسة لحل المشكلات خلال 24 ساعة',
      schoolBtnLabel: 'تواصل مع قسم مبيعات المؤسسات',
      pciTitle: 'تسوية آمنة لبطاقات الائتمان متوافقة مع معايير PCI-DSS',
      pciDesc: 'تتم عمليات الدفع بأمان بالتعاون مع Freemius وحلول الدفع العالمية. نحن نطبق بروتوكولات تشفير TLS 1.3 الصارمة لبياناتك.',
      securePortal: '🛡️ بوابة تشفير آمنة',
      instantDispatch: '⚡ تفعيل وإرسال فوري للحساب',
      chartTitle: 'مخطط مقارنة الأداء لطلاب الفئة المميزة (Premium)',
      chartSubtitle: 'تحليل يقارن متوسط مقاييس الأداء الأسبوعي للطلاب. الترقية إلى باقة الدراسة الاحترافية مع ملخصات PDF ومولد الشروحات الذكي تظهر تفوقاً إحصائياً واضحاً في الدرجات.',
      valueMultipliersTitle: 'مضاعفات القيمة المميزة',
      valueMult1Title: 'تحميل ملفات PDF غير محدود والدراسة بدون إنترنت',
      valueMult1Desc: 'يمكن للمستخدمين المجانيين معاينة الملفات فقط، بينما يفتح أعضاء Pro كتيبات دراسية كاملة كملفات PDF قابلة للطباعة لتقليل إجهاد العين.',
      valueMult2Title: 'شروحات فورية ذات أولوية من Gemini 1.5 Pro',
      valueMult2Desc: 'وداعًا للإجابات النصية العادية. يقوم نظام الشرح التوليدي الخاص بنا بتحليل محاولات الاختبار غير الصحيحة ويضع شرحاً مفصلاً خطوة بخطوة.',
      valueMult3Title: 'صانع امتحانات مخصص للمحاكاة الواقعية',
      valueMult3Desc: 'قم بإنشاء اختبارات تجريبية مطابقة للامتحانات الرسمية. حدد وقت الأسئلة، واضبط الفصول الصعبة، وحاكي جو الامتحان الإقليمي بدقة.',
      consultingText: 'هل تحتاج إلى استشارة في المناهج؟ احصل على مساعدة',
      submitRequestBtn: 'تقديم طلب دعم',
      finalExamsAvgTitle: 'متوسط الدرجات في الامتحانات الثانوية النهائية',
      finalExamsAvgDesc: 'نتائج الطلاب الموثقة والمتبعة سنوياً عبر ثلاث فئات دراسية.',
      passRateAdvantageTitle: 'نسب النجاح الثانوية',
      passRateAdvantageDesc: 'يظهر الطلاب الذين تمت ترقية حساباتهم زيادة في معدل الدرجات بنسبة 26٪ في الامتحانات الوزارية الرسمية الصعبة.',
      barFreeLabel: '١. الفئة العادية المجانية',
      barProLabel: '٢. باقة الدراسة الاحترافية (صف واحد)',
      barPerpetualLabel: '٣. الاشتراك الذهبي الدائم والمفتوح'
    },
    ku_sorani: {
      title: 'دۆخی دەستگەیشتنی تایبەت (Premium)',
      subtitle: 'پێداچوونەوە بە دۆخی ئەکاونتەکەت و تایبەتمەندییە نایابەکان بکە.',
      statusTitle: 'دۆخی ئەکاونتی تۆ',
      proBadge: 'دەستگەیشتنی پڕۆ (زانستی/وێژەیی)',
      freeBadge: 'ئاستی خۆڕایی (سنووردار)',
      proDesc: 'پیرۆزە! ئەکاونتەکەت دەستگەیشتنی نایابی چالاکی هەیە. تۆ دەتوانیت بە بێ سنوور دەستت بە ڕێبەرەکانی خوێندن، بانکەکانی پرسیار و دروستکەری تاقیکردنەوەکان بگات.',
      freeDesc: 'ئکاونتی تۆ ئێستا لەسەر ئاستی خۆڕاییە. دەستگەیشتنت سنووردارە بۆ کویزە سەرەتاییەکان و پێشاندانی بەشەکان.',
      featuresTitle: 'تایبەتمەندییە کراوەکان لە دۆخی پڕۆدا',
      feature1: 'دەستگەیشتنی تەواو بە هەموو بابەتەکانی پۆلی ١٢ (زانستی و وێژەیی)',
      feature2: 'داگرتنی ڕاستەوخۆ یا ڕێبەرەکانی خوێندن بە شێوەی PDF',
      feature3: 'ڕوونکردنەوەی وردی وەڵامەکان لەلایەن ژیريی دەستکردی Gemini 1.5 Pro',
      feature4: 'مۆدی ڕاهێنانی گونجاو لەگەڵ شیکاری ورد و مۆدی تاقیکردنەوە',
      memberZone: 'ناوچەی ئەندامان',
      portalSubtitle: 'مەنهەجەکانی خوێندنی نایاب ڕێکبخە، کارتەکانی فێربوونی قوتابی بەدەستبهێنە، پەڕاوی پارەدانی پارێزراوت بەڕێوەببەر، و پۆلەکان دابنێ بۆ لادانی سنووردارکردنەکان.',
      backButton: 'گەڕانەوە',
      unlockPremiumBtn: 'کردنەوەی پۆلە نایابەکان',
      activeSubscriptionBadge: 'بەرکەوتنی چالاک',
      pricingPlansTab: '💳 پلانەکانی نرخ',
      benefitsStatsTab: '📊 سوودەکان و ئامارەکان',
      walletLabel: 'جزدانی فێربوونی داینامیکی تۆ',
      tokensAvailable: '{{count}} تۆکنی پڕۆ بەردەستە',
      walletDesc: 'هەر ٢٩.٩ تۆکنێکی پڕۆ تەواوی بابەتەکان بۆ هەر پۆلێک و زمانێک کە هەڵیدەبژێریت دەکاتەوە. دەستبەجێ بەبێ هیچ تێچوویەکی زیادە لایببە.',
      redeemCodeBtn: 'بەکارهێنانی تۆکن بۆ کردنەوەی پۆل',
      walletEmpty: 'جزدان بەتاڵە. تۆکنێکی مەنهەجی خوێندن لە خوارەوە بەدەستبهێنە بۆ کردنەوەی دەستگەیشتنی تایبەت.',
      selectAccessTier: 'ئاستی دەستگەیشتنی خۆت هەڵبژێرە',
      selectAccessTierDesc: 'دەستگەیشتنی تەواو بە ماددە سەرەکییەکان بەدەستبهێنە. تۆکنە پێوانەییەکان یان بەشداریکردنی بەردەوام هەڵبژێرە.',
      freeBadgeLabel: 'پێشاندانی پێوانەیی',
      freeActiveLabel: 'چالاک',
      freeTitle: 'پێشاندانی خۆڕایی',
      freeDescLabel: 'مۆدی هەڵسەنگاندنی سەرەتایی',
      freeUnit: 'بۆ هەمیشە',
      freeFeat1: 'دەستگەیشتن بە کویزە سەرەتاییەکان',
      freeFeat2: 'پێشاندانی سنوورداری بەشەکان',
      freeFeat3: 'تەنها بۆ ئەندامانی پڕۆ: داگرتنی بێسنووری فایلی PDF',
      freeFeat4: 'تەنها بۆ ئەندامانی پڕۆ: ڕوونکردنەوەی فۆریی ژیریی دەستکردی Gemini',
      freeBtnLabel: 'مۆدی هەڵسەنگاندنی ئێستا',
      popularLabel: 'زۆرترین خوازراو',
      proBadgeLabel: 'بەشداریکردنی مانگانە',
      proTitle: 'مۆدی پڕۆی مانگانە',
      proDescLabel: 'دەستگەیشتنی بەردەوام بە تەواوی مەنهەجی یەک پۆل',
      proUnit: '/ مانگێک',
      proFeatSub: 'بەشداریکردنی مانگانەی چالاک و متمانە پێکراو!',
      proFeat1: 'دەستگەیشتنی تەواو بە پۆل و زمانە دەستنیشانکراوەکان',
      proFeat2: 'داگرتنی کتێبەکانی خوێندن بە شێوازی PDF',
      proFeat3: 'ڕوونکردنەوەی ژیریی دەستکرد بە یەکەمین ئاستی گرنگی',
      proFeat4: 'دروستکەری پێشکەوتووی تاقیکردنەوەی تایبەت بە مامۆستایان',
      proBtnCheckout: 'پارەدانی پارێزراو لە ڕێگەی Freemius',
      schoolBadgeLabel: 'باکێجی قوتابخانە',
      schoolTitle: 'مۆڵەتی قوتابخانە',
      schoolDescLabel: 'بۆ سەنتەرەکان و قوتابخانەکان',
      schoolUnit: '/ وەرزی خوێندن',
      schoolFeat1: 'تا ٤٥ کورسی قوتابی بە چوونەژوورەوەی یەکگرتوو',
      schoolFeat2: 'ئاماری گرووپی یەکگرتوو، پانێڵی ڕاپۆرتکردن و شیکاری تایبەت',
      schoolFeat3: 'پشتیوانی تەواو بۆ هاوتەریبکردن و تایبەتکردنی پرۆگرامەکە',
      schoolFeat4: 'نوێنەری تایبەت بۆ سەرکەوتنی قوتابخانە (پشتیوانی ٢٤ کاتژمێر)',
      schoolBtnLabel: 'پەیوەندی بە بەشی فرۆشتنی ئەکادیمی بکە',
      pciTitle: 'پارەدانی کارتی متمانەپێکراو بەپێی ستانداردەکانی PCI-DSS',
      pciDesc: 'پارەدانەکە بە پارێزراوی بە هاوبەشی لەگەڵ Freemius بەڕێوەدەچێت. ئێمە پرۆتۆکۆلی پاراستنی TLS 1.3 جێبەجێ دەکەین.',
      securePortal: '🛡️ دەروازەی پارێزراو',
      instantDispatch: '⚡ چالاککردن و ناردنی دەستبەجێ',
      chartTitle: 'پلانی سوود و ئاستی قوتابیانی پڕۆ',
      chartSubtitle: 'شیکردنەوەی بەراوردکاری بۆ تێکڕای دەرئەنجامەکانی قوتابییان. بەکارهێنانی مۆدی پڕۆ لەگەڵ ڕێبەرەکانی PDF و ڕوونکردنەوەی ژیریی دەستکرد گەشەکردنی ئاستی قوتابی نیشان دەدات.',
      valueMultipliersTitle: 'فاکتەرەکانی سوودی دەستکەوتی تایبەت',
      valueMult1Title: 'داگرتنی بێسنووری کتێبەکانی خوێندن بۆ خوێندنەوەی ئۆفلاین',
      valueMult1Desc: 'قوتابیانی خۆڕایی تەنها دەتوانن پێشاندانی فایلەکان ببینن، لە ک کاتێکدا ئەندامانی پڕۆ کتێبی تەواوی PDF ئۆفلاین دەکەنەوە بۆ خوێندنەوەی بەبێ ماندووبوونی چاو.',
      valueMult2Title: 'ڕوونکردنەوەی ناوازە و بەپەلەی Gemini 1.5 Pro',
      valueMult2Desc: 'ماڵئاوا لە وەڵامی تێکستی ئاسایی بکە. ژیریی دەستکرديی ئێمە هەڵەکانی تاقیکردنەوە شیدەکاتەوە و بە هەنگاو ڕوونکردنەوە دەنووسێت.',
      valueMult3Title: 'دروستکەری تاقیکردنەوەی تایبەت و گونجاو',
      valueMult3Desc: 'تاقیکردنەوەی هاوشێوەی وزاری دروست بکە. کاتی دیاریکراو دابنێ، ڕێکبەر بۆ بەشە قورسەکان دابنێ و خۆت بۆ تاقیکردنەوەی کۆتایی ئامادە بکە.',
      consultingText: 'پێویستت بە ڕاوێژکاری مەنهەج هەیە؟ یارمەتی بەدەستبهێنە',
      submitRequestBtn: 'ناردنی داواکاری یارمەتی',
      finalExamsAvgTitle: 'تێکڕای دەرئەنجامەکان لە تاقیکردنەوەی نیشتمانی کۆتایی',
      finalExamsAvgDesc: 'ئەنجامەکانی قوتابیان کە بە شێوەی ساڵانە بەدواداچوونی بۆ کراوە لە ٣ بەشدا.',
      passRateAdvantageTitle: 'ڕێژەی دەرچوونی تاقیکردنەوەی وزاری',
      passRateAdvantageDesc: 'قوتابیانی خاوەن پلانی پڕۆ تێکڕای نمرەکانیان بە ڕێژەی ٢٦٪ زیاد دەکات لە تاقیکردنەوە فەرمییەکانی نیشتمانیدا.',
      barFreeLabel: '١. ئاستی سەرەتایی خۆڕایی',
      barProLabel: '٢. تۆکنی پڕۆ بۆ یەک پۆل',
      barPerpetualLabel: '٣. بەشداریکردنی هەمیشەیی تایبەت'
    },
    ku_badini: {
      title: 'بارودۆخێ دەستگەهشتنا تایبەت (Premium)',
      subtitle: 'پێداچوونەوەیێ ب بارودۆخێ ئەکاونتێ خۆ و تایبەتمەندیێن ناياب بکە.',
      statusTitle: 'بارودۆخێ ئەکاونتێ تە',
      proBadge: 'دەستگەهشتنا پڕۆ (چالاک)',
      freeBadge: 'ئاستێ بێبەرامبەر (سنووردار)',
      proDesc: 'پیرۆزە! ئەکاونتێ تە دەستگەهشتنا نایاب یا چالاک هەیە. تە دەستگەهشتنا بێسنوور ب ڕێبەرێن خواندنێ، بانکێن پسیاران و چێکەرێ ئەزموونان هەیە.',
      freeDesc: 'ئەکاونتێ تە نوکە لسەر ئاستێ بێبەرامبەرە. دەستگەهشتنا تە یا سنووردارە بۆ کویزێن سەرەتایی و پێشاندانا پشکان.',
      featuresTitle: 'تایبەتمەندیێن ڤەکری د دۆخی پڕۆ دا',
      feature1: 'دەستگەهشتنا تەمام ب هەمی بابەتێن پۆلا ١٢ (زانستی و وێژەیی)',
      feature2: 'داگرتنا راستەوخۆ یا ڕێبەرێن خواندنێ ب شێوازێ PDF',
      feature3: 'شیکاريا هوور یا وەڵامان ژلایێ ژیرییا دەستکرد یا Gemini 1.5 Pro ڤە',
      feature4: 'شێوازێ راهێنانا گونجای دگەل شیکاريا هوور و چێکەرێ ئەزموونان',
      memberZone: 'دەڤەرا ئەندامان',
      portalSubtitle: 'پڕۆگرامێن خواندنا ناوازە ڕێکبێخە، کارتێن فێربوونا قوتابیان بدەستڤەبینە، تۆمارا پارەدانا خۆ یا پاراستی بهەڵسەنگینە، و پۆلان دەستنیشان بکە بۆ لادانا سنووردارکرنان.',
      backButton: 'گەڕیان بۆ پاش',
      unlockPremiumBtn: 'ڤەکرنا پۆلێن نایاب',
      activeSubscriptionBadge: 'پشکداریا چالاک',
      pricingPlansTab: '💳 پلانێن نرخی',
      benefitsStatsTab: '📊 مفاو ئامار',
      walletLabel: 'بەرھەڤکەرێ داینامیکی یێ فێربوونا تە',
      tokensAvailable: '{{count}} تۆکنێن پڕۆ بەردەستن',
      walletDesc: 'هەر ٢٩.٩ تۆکنێن پڕۆ هەمی بابەتان بۆ هەر پۆلەک و زمانەکێ تو دەستنیشان دکەی دڤەکەت. دەستبەجێ بێی چ جۆرە پارەکێ زێدە ڤەکە.',
      redeemCodeBtn: 'بکارئینانا تۆکنی بۆ ڤەکرنا پۆلێ',
      walletEmpty: 'جزدان ڤاڵایە. تۆکنەکێ پڕۆگرامێ خواندنێ ل خوارێ بدەستڤەبینە بۆ ڤەکرنا دەستگەهشتنا تایبەت.',
      selectAccessTier: 'ئاستێ دەستگەهشتنا خۆ هەلبژێرە',
      selectAccessTierDesc: 'دەستگەهشتنا تەمام ب بابەتێن سەرەکی بدەستڤەبینە. تۆکنێن پێوانەیی یان پشکدارین بەردەوام هەلبژێرە.',
      freeBadgeLabel: 'پێشاندانا پێوانەیی',
      freeActiveLabel: 'چالاک',
      freeTitle: 'پێشاندانا بێبەرامبەر',
      freeDescLabel: 'شێوازێ هەڵسەنگاندنا سەرەتایی',
      freeUnit: 'بۆ هەمیشە',
      freeFeat1: 'دەستگەهشتن ب کویزێن سەرەتایی',
      freeFeat2: 'پێشاندانا سنووردار یا پشکان',
      freeFeat3: 'تەنها بۆ پڕۆ: داگرتنا راستەوخۆ یا فایلا PDF',
      freeFeat4: 'تەنها بۆ پڕۆ: ڕوونکردنەوا فۆری یا ژيرییا دەستکرد یا Gemini',
      freeBtnLabel: 'شێوازێ هەڵسەنگاندنا نوکە',
      popularLabel: 'یا هەرە دیار',
      proBadgeLabel: 'پشکداریا هەیڤانە',
      proTitle: 'شێوازێ پڕۆ یێ هەیڤانە',
      proDescLabel: 'دەستگەهشتنا بەردەوام ب هەمی پڕۆگرامێ ئێک پۆل',
      proUnit: '/ هەیڤەک',
      proFeatSub: 'پشکداریا هەیڤانە یا چالاک و باوەرپێکری!',
      proFeat1: 'دستگەهشتنا تەمام ب پۆل و زمانێن دەستنیشانکری',
      proFeat2: 'داگرتنا پەرتووکێن خواندنێ ب شێوازێ PDF',
      proFeat3: 'ڕوونکردنەوا ژیرییا دەستکرد ب ئاستێ ئێکێ یێ گرنگیێ',
      proFeat4: 'چێکەرێ پێشکەفتی یێ ئەزموونێن تایبەت ب مامۆستایان',
      proBtnCheckout: 'Secure Checkout with Freemius',
      schoolBadgeLabel: 'باکێجێ قوتابخانێ',
      schoolTitle: 'مۆڵەتا قوتابخانێ',
      schoolDescLabel: 'بۆ سەنتەران و قوتابخانان',
      schoolUnit: '/ وەرزێ خواندنێ',
      schoolFeat1: 'تا ٤٥ کورسیێن قوتابیان ب چوونەژوورا ئێکگرتی',
      schoolFeat2: 'ئامارێن کۆمێ یێن ئێکگرتی، پانێلا ڕاپۆرتکرنێ و شیکاریا تایبەت',
      schoolFeat3: 'پشتهەڤییا تەمام بۆ ڕێکخستن و تایبەتکرنا پڕۆگرامی',
      schoolFeat4: 'نوێنەرێ تایبەت بۆ سەرکەفتنا قوتابخانێ (پشتهەڤییا ٢٤ دەمژمێر)',
      schoolBtnLabel: 'Contact Academic Success Sales',
      pciTitle: 'PCI-DSS Compliant Credit Card Settlement',
      pciDesc: 'Billed securely in partnership with Freemius Payment Solutions. We enforce TLS 1.3 encryption protocol.',
      securePortal: '🛡️ دەروازێ پاراستی',
      instantDispatch: '⚡ چالاککرن و هنارتنا دەستبەجێ',
      chartTitle: 'پلانا مفاو کارهێنانێن قوتابیێن پڕۆ',
      chartSubtitle: 'شیکاریا بەراوردکاری بۆ تێکڕایا ئەنجامێن قوتابیان. بکارئینانا مۆدی پڕۆ دگەل ڕێبەرێن PDF و ڕوونکردنەوا ژیرییا دەستکرد باشبوونا ئاستێ قوتابی نیشان ددەت.',
      valueMultipliersTitle: 'Premium Value Multipliers',
      valueMult1Title: 'Unlimited PDF Offline Portals',
      valueMult1Desc: 'Free users can only preview files, while Pro members unlock full offline PDF study booklets. Study anywhere, print, and study without screen fatigue.',
      valueMult2Title: 'Priority Gemini 1.5 Pro Explanations',
      valueMult2Desc: 'Say goodbye to standard text answers. Our generative explanation system analyzes wrong quiz attempts, drafting detailed, step-by-step logic.',
      valueMult3Title: 'Custom Adaptive Exam Creators',
      valueMult3Desc: 'Build customized teacher-grade mock test setups. Set filters for timed questions, specify difficult subchapters, and simulate the exact state of final regional final exams.',
      consultingText: 'Need curriculum consulting? Get assistance',
      submitRequestBtn: 'Submit Help Request',
      finalExamsAvgTitle: 'Averages on Final Secondary Exams',
      finalExamsAvgDesc: 'Verified student outcomes tracked annually across 3 study modules.',
      passRateAdvantageTitle: 'Secondary Pass Rates',
      passRateAdvantageDesc: 'Upgraded users exhibit an average score boost of 26% on high-stakes official secondary curriculum certifications.',
      barFreeLabel: '1. Basic Guest Tier (Free)',
      barProLabel: '2. Study Pro Token (1 Grade)',
      barPerpetualLabel: '3. Premium Perpetual Membership'
    }
  };

  activeI18n = computed<I18nBilling>(() => {
    const lang = this.quizService.selectedLanguage() || 'en';
    return this.translationsMap[lang] || this.translationsMap['en'];
  });
}
