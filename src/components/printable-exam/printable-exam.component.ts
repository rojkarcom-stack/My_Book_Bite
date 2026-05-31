
import { Component, ChangeDetectionStrategy, inject, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuizService } from '../../services/quiz.service';
import { TranslationService } from '../../services/translation.service';
import { MathJaxService } from '../../services/mathjax.service';

@Component({
  selector: 'app-printable-exam',
  standalone: true,
  imports: [CommonModule],
  template: `
<div class="max-w-4xl mx-auto animate-fade-in-up print:m-0 print:max-w-none">
  
  <!-- Header & Actions (Hidden on Print) -->
  <header class="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-8 flex flex-col sm:flex-row justify-between items-center gap-4 print:hidden">
    <div class="flex items-center gap-4">
      <div class="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6">
          <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        </svg>
      </div>
      <div>
        <h1 class="text-xl font-bold text-slate-900 dark:text-white font-heading">
          {{ t.translate('teacher.examPreview') }}
        </h1>
        <p class="text-sm text-slate-500 dark:text-slate-400">{{ examConfig().title }}</p>
      </div>
    </div>
    <div class="flex items-center gap-3">
      <button (click)="quizService.goBack()" class="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
        {{ t.translate('back') }}
      </button>
      <button (click)="printAnswerKey()" class="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-all">
        {{ t.translate('teacher.printAnswerKey') }}
      </button>
      <button (click)="printExam()" class="px-6 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition-all hover:-translate-y-0.5">
        {{ t.translate('teacher.printExam') }}
      </button>
    </div>
  </header>

  <!-- Printable Exam Content -->
  <main id="exam-content" class="bg-white dark:bg-slate-800 rounded-3xl shadow-xl p-8 sm:p-12 print:shadow-none print:p-0 print:bg-transparent print:dark:bg-transparent font-serif">
    <!-- Formal Exam Header -->
    <div class="border-b-2 border-slate-900 dark:border-slate-100 pb-6 mb-8 text-center">
      <div class="flex justify-between items-start mb-4">
        <div class="text-start text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
          <p>{{ t.translate('teacher.schoolName') || 'Educational Institution' }}</p>
          <p>{{ t.translate('teacher.academicYear') || 'Academic Year 2025-2026' }}</p>
        </div>
        <div class="text-end text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
          <p>{{ t.translate('teacher.examDuration') || 'Duration: 60 Minutes' }}</p>
          <p>{{ t.translate('teacher.totalMarks') || 'Total Marks: 100' }}</p>
        </div>
      </div>
      <h2 class="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">{{ examConfig().title }}</h2>
      <div class="flex justify-center items-center gap-4 text-sm font-bold text-slate-600 dark:text-slate-300">
        <span class="px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-full">{{ t.translate('teacher.grade') }}: {{ examConfig().grade }}</span>
        <span class="px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-full">{{ t.translate('teacher.subject') }}: {{ examConfig().subject }}</span>
      </div>
    </div>

    <!-- Student Info Section -->
    <div class="grid grid-cols-2 gap-8 mb-8 pb-8 border-b border-slate-200 dark:border-slate-700 border-dashed">
      <div class="space-y-4">
        <div class="flex items-end gap-2">
          <span class="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">{{ t.translate('teacher.studentName') || 'Student Name' }}:</span>
          <div class="flex-1 border-b border-slate-400 dark:border-slate-500 h-6"></div>
        </div>
      </div>
      <div class="space-y-4">
        <div class="flex items-end gap-2">
          <span class="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">{{ t.translate('teacher.studentId') || 'Student ID' }}:</span>
          <div class="flex-1 border-b border-slate-400 dark:border-slate-500 h-6"></div>
        </div>
      </div>
    </div>

    <!-- Instructions -->
    <div class="bg-slate-50 dark:bg-slate-900/40 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 mb-10">
      <h3 class="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white mb-2">{{ t.translate('teacher.instructions') || 'General Instructions' }}</h3>
      <p class="text-sm leading-relaxed text-slate-700 dark:text-slate-300 italic">{{ examConfig().instructions }}</p>
    </div>
    
    <!-- Questions Section -->
    <section class="space-y-10">
      @for (question of examQuestions(); track question.id; let i = $index) {
        <div class="break-inside-avoid group">
          <div class="flex gap-4 mb-4">
            <span class="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center font-bold text-sm">{{ i + 1 }}</span>
            <p class="text-lg font-bold text-slate-900 dark:text-white leading-snug pt-0.5">
              {{ question.text }}
            </p>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-4 ps-12">
            @for (option of question.options; track $index; let j = $index) {
              <div class="flex items-start gap-3">
                <span class="flex-shrink-0 w-6 h-6 rounded border-2 border-slate-300 dark:border-slate-600 flex items-center justify-center text-xs font-black text-slate-500 dark:text-slate-400 uppercase">{{ 'ABCD'[j] }}</span>
                <span class="text-slate-800 dark:text-slate-200 font-medium">{{ option }}</span>
              </div>
            }
          </div>
        </div>
      } @empty {
        <div class="py-20 text-center">
          <div class="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <p class="text-slate-500 dark:text-slate-400 font-bold">{{ t.translate('teacher.noQuestionsGenerated') }}</p>
        </div>
      }
    </section>

    <!-- Footer -->
    <footer class="mt-20 pt-8 border-t border-slate-200 dark:border-slate-700 text-center text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
      <p>{{ t.translate('teacher.examFooter') || 'End of Examination - Good Luck!' }}</p>
    </footer>
  </main>

</div>
  `,
  styles: [`
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      
      .print\\:hidden {
        display: none;
      }

      .print\\:shadow-none {
        box-shadow: none;
      }
      
      .print\\:bg-transparent {
          background-color: transparent;
      }

      main#exam-content {
          padding: 0 !important;
      }

      .break-inside-avoid {
          break-inside: avoid;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrintableExamComponent implements AfterViewInit {
  quizService = inject(QuizService);
  t = inject(TranslationService);
  mathJaxService = inject(MathJaxService);

  examQuestions = this.quizService.examQuestions;
  examConfig = this.quizService.examConfig;

  ngAfterViewInit(): void {
    this.mathJaxService.render();
  }

  printExam() {
    window.print();
  }

  printAnswerKey() {
    const questions = this.examQuestions();
    const title = this.examConfig().title;
    const answerKeyHtml = `
      <html>
        <head>
          <title>${this.t.translate('teacher.answerKey')} - ${title}</title>
          <style>
            body { font-family: sans-serif; padding: 2rem; }
            h1 { font-size: 1.5rem; margin-bottom: 1rem; }
            ol { list-style-type: decimal; padding-left: 1.5rem; column-count: 4; column-gap: 2rem; }
            li { margin-bottom: 0.5rem; font-size: 1.1rem; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body dir="${this.t.isRtl() ? 'rtl' : 'ltr'}">
          <h1>${this.t.translate('teacher.answerKey')} - ${title}</h1>
          <ol>
            ${questions.map((q, i) => `<li>${'ABCD'[q.correctAnswerIndex]}</li>`).join('')}
          </ol>
        </body>
      </html>
    `;
    const printWindow = window.open('', '_blank');
    printWindow?.document.write(answerKeyHtml);
    printWindow?.document.close();
    printWindow?.focus();
    printWindow?.print();
  }
}
