import { Component, ChangeDetectionStrategy, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuizService } from '../../services/quiz.service';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import { TranslationService } from '../../services/translation.service';
import { Language } from '../../models';

const MESSAGES: Record<string, {
  title: string;
  subtitle: string;
  status: string;
  active: string;
  paymentVerified: string;
  chooseTitle: string;
  langLabel: string;
  gradeLabel: string;
  branchLabel: string;
  scientific: string;
  literary: string;
  general: string;
  unlockBtn: string;
  unlocking: string;
  placeholder: string;
  successUnlock: string;
  featureTitle: string;
  gradeText: string;
  transactionId: string;
  amountPaid: string;
  statusLabel: string;
  verifiedLabel: string;
  redeemableBonus: string;
  proGradeUnlocked: string;
  proTokenBalance: string;
  tokensAvailable: string;
  manageBillingBtn: string;
}> = {
  en: {
    title: 'Payment Successful!',
    subtitle: 'Thank you for upgrading to School Quiz Pro! Your purchase of $29.90 has been verified.',
    status: 'Purchase Verification',
    active: 'Single Grade Pro Token Verified',
    paymentVerified: 'Payment verified! Please finalize your curriculum options below.',
    chooseTitle: 'Which curriculum would you like to unlock?',
    langLabel: '1. Select Main Study Language',
    gradeLabel: '2. Select School Grade',
    branchLabel: '3. Select Curriculum Branch',
    scientific: '🔬 Scientific Branch',
    literary: '📚 Literary Branch',
    general: 'General subjects (Grades 1-9)',
    unlockBtn: 'Unlock Selected Grade & Start',
    unlocking: 'Activating study materials...',
    placeholder: 'Please select language and grade',
    successUnlock: 'Curriculum unlocked successfully! Redirecting to student dashboard.',
    featureTitle: 'Unlocked for Selected Grade:',
    gradeText: 'Grade',
    transactionId: 'TRANSACTION ID',
    amountPaid: 'AMOUNT PAID',
    statusLabel: 'STATUS',
    verifiedLabel: 'Verified',
    redeemableBonus: 'REDEEMABLE BONUS',
    proGradeUnlocked: '1x Pro Grade Unlocked',
    proTokenBalance: 'PRO TOKEN BALANCE',
    tokensAvailable: 'Pro Tokens Available',
    manageBillingBtn: 'Manage Billing'
  },
  ar: {
    title: 'تمت عملية الدفع بنجاح!',
    subtitle: 'شكرًا لترقيتك إلى ميزات Pro! تم تأكيد عملية الدفع بقيمة 29.90 دولارًا أمريكيًا.',
    status: 'تأكيد الدفع',
    active: 'تم تأكيد مفتاح الاشتراك لصف دراسي واحد',
    paymentVerified: 'تمت عملية الدفع بنجاح! الرجاء تحديد خيارات المنهج الدراسي أدناه.',
    chooseTitle: 'أي صف دراسي ومنهج ترغب في تفعيله؟',
    langLabel: '١. اختر لغة الدراسة الأساسية',
    gradeLabel: '٢. اختر الصف الدراسي',
    branchLabel: '٣. اختر الفرع الدراسي (للصفوف ۱۰-١٢)',
    scientific: '🔬 الفرع العلمي',
    literary: '📚 الفرع الأدبي',
    general: 'المواد العامة (الصفوف ١-٩)',
    unlockBtn: 'تفعيل الصف المحدد وبدء الدراسة',
    unlocking: 'جاري تفعيل مواد الدراسة...',
    placeholder: 'يرجى تحديد اللغة والصف الدراسي أولاً',
    successUnlock: 'تم تفعيل المنهج بنجاح! جاري تحويلك إلى لوحة التحكم.',
    featureTitle: 'الميزات المفتوحة للصف المحدد:',
    gradeText: 'الصف',
    transactionId: 'رقم المعاملة',
    amountPaid: 'المبلغ المدفوع',
    statusLabel: 'حالة الدفع',
    verifiedLabel: 'مؤكد',
    redeemableBonus: 'مكافأة قابلة للتفعيل',
    proGradeUnlocked: 'تفعيل صف دراسي واحد',
    proTokenBalance: 'رصيد نقاط الاشتراك',
    tokensAvailable: 'نقطة اشتراك متاحة',
    manageBillingBtn: 'إدارة الفواتير'
  },
  ku_sorani: {
    title: 'پاداشتکردنی سەرکەوتوو!',
    subtitle: 'سوپاس بۆ کڕینی پلانی School Quiz Pro! بڕی کڕینی 29.90$ پشتڕاستکرایەوە.',
    status: 'پشتڕاستکردنەوە',
    active: 'کۆدی پرۆ بۆ یەک پۆل چالاککرا',
    paymentVerified: 'پارەدانەکەت سەرکەوتووبوو! تکایە لێرەوە پۆل و بابەتی خوێندنی خۆت دیاری بکە.',
    chooseTitle: 'پۆل و زمان و لقی خوێندنی کامە بابەت دەکەیتەوە؟',
    langLabel: '١. زمانی بنەڕەتی خوێندن دیاری بکە',
    gradeLabel: '٢. پۆلی خوێندن دیاری بکە',
    branchLabel: '٣. لقی بابەت دیاری بکە (بۆ پۆلەکانی ١٠-١٢)',
    scientific: '🔬 لقی زانستی',
    literary: '📚 لقی وێژەیی',
    general: 'بابەتە گشتییەکان (پۆلەکانی ١-٩)',
    unlockBtn: 'چالاککردنی پۆلی هەڵبژێردراو و دەستپێکردن',
    unlocking: 'خەریکە کەرەستەکانی خوێندن کارا دەبن...',
    placeholder: 'تکایە زمان و پۆلەکەت هەڵبژێرە',
    successUnlock: 'پۆلی خوێندنەکەت بە سەرکەوتوویی کرایەوە! دەچیتە داشبۆرد.',
    featureTitle: 'مەنهەجی چالاککراو بۆ پۆلەکەت:',
    gradeText: 'پۆلی',
    transactionId: 'ژمارەی مامەڵە',
    amountPaid: 'بڕی دراو',
    statusLabel: 'دۆخی دراو',
    verifiedLabel: 'پشتڕاستکراوە',
    redeemableBonus: 'پاداشتی شایەنی تفعيل',
    proGradeUnlocked: '١ پۆلی خوێندنی پرۆ دیاریکرا',
    proTokenBalance: 'هاوسەنگی تۆکینەکانی پرۆ',
    tokensAvailable: 'تۆکینی پرۆ بەردەستە',
    manageBillingBtn: 'بەڕێوەبردنی پارەدان'
  },
  ku_badini: {
    title: 'پارەدان بسەرکەفتیانە بوو!',
    subtitle: 'سۆپاسیا تە دکەین بۆ کڕینا پلانا School Quiz Pro! بڕێ کڕینا 29.90$ هاتە پشتڕاستکرن.',
    status: 'پشتڕاستکرن',
    active: 'کۆدێ پرۆ بۆ ئێک پۆل هاتە چالاککرن',
    paymentVerified: 'پارەدان بسەرکەفتیانە بوو! هیڤیە ل ڤێرە پۆل و بابەتی دیار بکەی بۆ دەستپێکرنێ.',
    chooseTitle: 'کیش پۆل و زمان وبابەت دێ چالاک کەی؟',
    langLabel: '١. زمانی سەرەکی یێ خواندنێ هەلبژێرە',
    gradeLabel: '٢. پۆلا خواندنێ دیار بکە',
    branchLabel: '٣. تایبەتمەندی پۆلێ هەلبژێرە (بۆ پۆلێن ١٠-١٢)',
    scientific: '🔬 تاقیکارییا زانستی',
    literary: '📚 تاقیکارییا وێژەیی',
    general: 'بابەتێن گشتی (پۆلا ١ تا ٩)',
    unlockBtn: 'چالاککردنا پۆلا هەلبژارتی و دەستپێکرن',
    unlocking: 'بەرنامە یێ کارا دبیت...',
    placeholder: 'هیڤیە ل دەسپێکێ زمان و پۆلێ دیار بکە',
    successUnlock: 'پۆلا خواندنا تە بسەرکەفتیانە هاتە ڤەکرن! دێ چیه داشبۆردێ.',
    featureTitle: 'مەنهەجێ چالاککری بۆ پۆلا تە:',
    gradeText: 'پۆلا',
    transactionId: 'ژمارا وەرگرتنێ',
    amountPaid: 'بڕێ پارەی',
    statusLabel: 'دۆخێ پارەدانێ',
    verifiedLabel: 'پشتڕاستکری',
    redeemableBonus: 'پاداشتا چالاکبوونێ',
    proGradeUnlocked: 'ئێک پۆل هاتە چالاککرن',
    proTokenBalance: 'کۆما تۆکێنێن پرۆ',
    tokensAvailable: 'تۆکێن بەردەستن',
    manageBillingBtn: 'بڕێڤەبرنا پارەدانێ'
  }
};

@Component({
  selector: 'app-subscription-success',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen py-10 sm:py-16 px-4 bg-gradient-to-b from-slate-50 to-slate-100/60 dark:from-slate-950 dark:to-slate-900/40 flex flex-col items-center justify-center animate-fade-in">
      <div id="success-card-container" class="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 max-w-2xl w-full rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden transition-all duration-300">
        
        <!-- Premium Aesthetic Colored Top Glow Strip -->
        <div class="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-400 via-teal-500 to-indigo-600"></div>
        
        <!-- Beautiful Background Glow Spheres -->
        <div class="absolute -top-32 -right-32 w-64 h-64 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute -bottom-32 -left-32 w-64 h-64 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <!-- Checkmark Badge Header Section -->
        <div class="text-center mb-6">
          <div class="mx-auto mb-4 flex items-center justify-center h-16 w-16 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 relative">
            <div class="h-12 w-12 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <svg class="h-6 w-6 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <div class="absolute -inset-1.5 rounded-full border border-emerald-550/20 animate-ping opacity-35"></div>
          </div>

          <h1 class="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
            {{ msg().title }}
          </h1>
          <p class="mt-2 text-sm text-slate-500 dark:text-slate-450 px-2 leading-relaxed">
            {{ msg().subtitle }}
          </p>
        </div>

        <!-- Payment Receipt Info Grid styled like a high-end luxury invoice voucher -->
        <div class="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/60 mb-6 relative overflow-hidden">
          <div class="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-600 dark:text-slate-400">
            <div>
              <span class="block text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">{{ msg().transactionId }}</span>
              <span class="font-mono text-slate-800 dark:text-slate-200 font-bold">{{ orderId() }}</span>
            </div>
            <div>
              <span class="block text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">{{ msg().amountPaid }}</span>
              <span class="text-emerald-700 dark:text-emerald-400 font-extrabold">$29.90 USD</span>
            </div>
            <div>
              <span class="block text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">{{ msg().statusLabel }}</span>
              <span class="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                {{ msg().verifiedLabel }}
              </span>
            </div>
            <div>
              <span class="block text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">{{ msg().redeemableBonus }}</span>
              <span class="font-bold text-indigo-600 dark:text-indigo-400">{{ msg().proGradeUnlocked }}</span>
            </div>
          </div>
          <p class="mt-4 pt-3.5 border-t border-slate-200/60 dark:border-slate-800/60 text-xs font-medium text-slate-600 dark:text-slate-350 leading-relaxed">
            {{ msg().paymentVerified }}
          </p>
        </div>

        <!-- Token Counter Balance Banner styled like a elegant voucher ticket -->
        <div class="p-4.5 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-500/25 dark:border-indigo-500/15 flex flex-col sm:flex-row items-center justify-between gap-4 text-left mb-8 relative overflow-hidden">
          <div class="absolute -top-6 -right-6 w-20 h-20 bg-indigo-500/5 rounded-full pointer-events-none"></div>
          <div class="flex items-center gap-3.5 relative z-10 w-full sm:w-auto">
            <div class="text-2xl shrink-0 p-2 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-indigo-500/10">🪙</div>
            <div>
              <span class="block text-[9px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 leading-none mb-1">{{ msg().proTokenBalance }}</span>
              <p class="text-base font-black text-slate-950 dark:text-white leading-tight">
                {{ quizService.proTokens() }} {{ msg().tokensAvailable }}
              </p>
            </div>
          </div>
          <button (click)="navigateToBilling()" type="button" class="w-full sm:w-auto px-4.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[11px] rounded-xl transition cursor-pointer select-none shrink-0 text-center shadow-md shadow-indigo-600/15 active:scale-95">
            {{ msg().manageBillingBtn }}
          </button>
        </div>

        <!-- Curriculum Customization Dashboard -->
        <div class="border-t border-slate-150 dark:border-slate-800/80 pt-6 text-left">
          <div class="flex items-center gap-2 mb-5">
            <span class="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs leading-none">⚙️</span>
            <p class="text-sm font-black text-slate-850 dark:text-slate-200 tracking-tight leading-none">
              {{ msg().chooseTitle }}
            </p>
          </div>

          <!-- 1. Language Selection -->
          <div class="space-y-2 mb-6">
            <span class="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{{ msg().langLabel }}</span>
            <div class="grid grid-cols-2 gap-3">
              @for (lang of languages; track lang.id) {
                <button (click)="selectLanguage(lang.id)" 
                        type="button"
                        class="px-4 py-3 text-xs font-extrabold rounded-2xl border transition duration-200 cursor-pointer text-center select-none active:scale-[0.98]"
                        [class]="selectedLang() === lang.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20' : 'bg-slate-50/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'">
                  <span class="mr-1.5 text-sm">{{ lang.flag }}</span> {{ lang.name }}
                </button>
              }
            </div>
          </div>

          <!-- 2. Grade Grid Selection -->
          <div class="space-y-2 mb-6">
            <span class="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{{ msg().gradeLabel }}</span>
            <div class="grid grid-cols-4 sm:grid-cols-6 gap-2">
              @for (g of gradesList; track g) {
                <button (click)="selectGrade(g)" 
                        type="button"
                        class="p-2 text-sm font-bold rounded-2xl border transition duration-200 cursor-pointer text-center flex flex-col justify-center items-center select-none active:scale-90"
                        [class]="selectedGrade() === g ? 'bg-indigo-600 text-white border-indigo-600 shadow-md scale-[1.03]' : 'bg-slate-50/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-850'">
                  <span class="font-black text-base">{{ g }}</span>
                  <span class="text-[8px] uppercase tracking-tighter text-slate-405 dark:text-slate-500 font-bold" [class.text-indigo-200]="selectedGrade() === g">
                    {{ msg().gradeText }}
                  </span>
                </button>
              }
            </div>
          </div>

          <!-- 3. Branch Selector (Only if Grade is >= 10) -->
          @if (isBranchRequired()) {
            <div class="space-y-2 mb-6 animate-fade-in">
              <span class="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{{ msg().branchLabel }}</span>
              <div class="grid grid-cols-2 gap-3">
                <button (click)="selectBranch('scientific')" 
                        type="button"
                        class="px-4 py-3 text-xs font-black rounded-2xl border transition duration-200 cursor-pointer text-center select-none active:scale-[0.98]"
                        [class]="selectedBranch() === 'scientific' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/15' : 'bg-slate-50/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'">
                  {{ msg().scientific }}
                </button>
                <button (click)="selectBranch('literary')" 
                        type="button"
                        class="px-4 py-3 text-xs font-black rounded-2xl border transition duration-200 cursor-pointer text-center select-none active:scale-[0.98]"
                        [class]="selectedBranch() === 'literary' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/15' : 'bg-slate-50/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'">
                  {{ msg().literary }}
                </button>
              </div>
            </div>
          } @else if (selectedGrade() !== null) {
            <!-- Helper text for general grade branches -->
            <div class="mb-5 p-3.5 bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800 rounded-2xl flex items-center gap-3">
              <svg class="h-4.5 w-4.5 text-indigo-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 111.063.852l-.708 2.836a.75.75 0 001.063.852l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
              <p class="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-normal">
                {{ msg().general }}
              </p>
            </div>
          }

          <!-- Checkout Activation Trigger CTA -->
          <div class="mt-8 pt-6 border-t border-slate-150 dark:border-slate-800/60">
            <button (click)="activateCurriculum()" 
                    [disabled]="!isFormValid() || isActivating()"
                    type="button"
                    class="w-full py-4 px-6 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-extrabold text-sm rounded-2xl shadow-xl shadow-emerald-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition duration-200 select-none tracking-wide flex items-center justify-center gap-2 active:scale-[0.99] cursor-pointer">
              @if (isActivating()) {
                <svg class="animate-spin h-5 w-5 text-white shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                <span>{{ msg().unlocking }}</span>
              } @else {
                <svg class="h-5 w-5 text-white stroke-[2.2] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                <span>{{ isFormValid() ? msg().unlockBtn : msg().placeholder }}</span>
              }
            </button>
          </div>

        </div>

      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubscriptionSuccessComponent implements OnInit {
  quizService = inject(QuizService);
  supabase = inject(SupabaseService);
  toast = inject(ToastService);
  t = inject(TranslationService);

  isActivating = signal<boolean>(false);
  orderId = signal<string>('SQP-TXN-' + Math.floor(Math.random() * 89999 + 10000));

  // Curriculum selections
  selectedLang = signal<Language | null>(null);
  selectedGrade = signal<number | null>(null);
  selectedBranch = signal<'scientific' | 'literary' | null>(null);

  // Available selections helper structures
  languages = [
    { id: 'en' as Language, name: 'English', flag: '🇬🇧' },
    { id: 'ar' as Language, name: 'العربية (Arabic)', flag: '🇸🇦' },
    { id: 'ku_sorani' as Language, name: 'سۆرانی (Kurdish Sorani)', flag: '☀️' },
    { id: 'ku_badini' as Language, name: 'بادینی (Kurdish Badini)', flag: '🏔️' },
  ];

  gradesList = Array.from({ length: 12 }, (_, i) => i + 1);

  // Active translation set
  msg = signal(MESSAGES['en']);

  ngOnInit() {
    this.updateLanguage();
    
    // Auto-prepopulate parameters from student's current local session to make selecting super fast and frictionless
    const localLang = this.quizService.selectedLanguage();
    if (localLang) {
      this.selectedLang.set(localLang);
    }
    const localGrade = this.quizService.selectedGrade();
    if (localGrade) {
      this.selectedGrade.set(localGrade);
    }
    const localBranch = this.quizService.selectedBranch();
    if (localBranch) {
      this.selectedBranch.set(localBranch);
    }
  }

  isBranchRequired(): boolean {
    const grade = this.selectedGrade();
    return grade !== null && grade >= 10;
  }

  isFormValid(): boolean {
    if (!this.selectedLang() || !this.selectedGrade()) return false;
    if (this.isBranchRequired() && !this.selectedBranch()) return false;
    return true;
  }

  selectLanguage(lang: Language) {
    this.selectedLang.set(lang);
    this.updateLanguageBySelected(lang);
  }

  selectGrade(grade: number) {
    this.selectedGrade.set(grade);
    if (grade < 10) {
      this.selectedBranch.set(null);
    }
  }

  selectBranch(branch: 'scientific' | 'literary') {
    this.selectedBranch.set(branch);
  }

  private updateLanguage() {
    const lang = this.quizService.selectedLanguage() || 'en';
    this.updateLanguageBySelected(lang);
  }

  private updateLanguageBySelected(lang: Language) {
    if (lang === 'ar') this.msg.set(MESSAGES['ar']);
    else if (lang === 'ku_sorani') this.msg.set(MESSAGES['ku_sorani']);
    else if (lang === 'ku_badini') this.msg.set(MESSAGES['ku_badini']);
    else this.msg.set(MESSAGES['en']);
  }

  async activateCurriculum() {
    if (!this.isFormValid()) return;

    const user = this.supabase.currentUser();
    if (!user) {
      this.toast.show('Please sign in to your student account first to unlock a course curriculum.', 'error', 5000);
      return;
    }

    const permissions = this.quizService.userPermissions();
    const isMasterPremium = permissions?.is_premium;
    const tokens = this.quizService.proTokens();

    if (tokens < 29.9 && !isMasterPremium) {
      this.toast.show('You have insufficient Pro Curriculum tokens (required: 29.9 tokens). Please purchase tokens first ($29.90)!', 'error', 6000);
      this.quizService.view.set('student_billing');
      return;
    }

    try {
      this.isActivating.set(true);

      const payload = {
        grade: this.selectedGrade()!,
        language: this.selectedLang()!,
        branch: this.selectedBranch()
      };

      // Call the billing activation endpoint on backend with grade selection payload!
      // This will lookup the subjects and unlock only them, while setting profile to pro.
      await this.quizService.activatePurchase('selected_grade', payload);
      
      // Also pre-select these options automatically on their dashboard for immediate access
      this.quizService.selectedLanguage.set(payload.language);
      this.quizService.selectedGrade.set(payload.grade);
      this.quizService.selectedBranch.set(payload.branch);

      this.toast.show(this.msg().successUnlock, 'success', 6000);
      this.isActivating.set(false);
      
      // Navigate to Dashboard
      this.quizService.view.set('student_dashboard');
    } catch (err: any) {
      console.error('Curriculum activation failed:', err);
      this.toast.show(`Failed to unlock course curriculum: ${err.message || err}`, 'error', 8000);
      this.isActivating.set(false);
    }
  }

  navigateToBilling() {
    this.quizService.view.set('student_billing');
  }
}
