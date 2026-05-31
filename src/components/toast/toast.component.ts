import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ToastService } from '../../services/toast.service';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
<div aria-live="assertive" class="pointer-events-none fixed inset-0 flex items-end px-4 py-6 sm:items-start sm:p-6 z-[100]">
  <div class="flex w-full flex-col items-center space-y-4 sm:items-end">
    @for (toast of toastService.toasts(); track toast.id) {
      <div class="pointer-events-auto w-full max-w-sm overflow-hidden rounded-lg bg-white dark:bg-slate-800 shadow-lg ring-1 ring-black ring-opacity-5 animate-fade-in-up">
        <div class="p-4">
          <div class="flex items-start">
            <div class="flex-shrink-0" 
              [class.text-green-400]="toast.type === 'success'"
              [class.text-red-400]="toast.type === 'error'"
              [class.text-sky-400]="toast.type === 'info'"
              [innerHTML]="getIcon(toast.type)">
            </div>
            <div class="ml-3 w-0 flex-1 pt-0.5">
              <p class="text-sm font-medium text-slate-900 dark:text-slate-50">{{ toast.message }}</p>
            </div>
            <div class="ml-4 flex flex-shrink-0">
              <button (click)="toastService.remove(toast.id)" type="button" class="inline-flex rounded-md bg-white dark:bg-slate-800 text-slate-400 hover:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                <span class="sr-only">Close</span>
                <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  </div>
</div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastComponent {
  toastService = inject(ToastService);
  t = inject(TranslationService);
  // FIX: Explicitly type DomSanitizer to resolve type inference issue.
  private sanitizer: DomSanitizer = inject(DomSanitizer);

  getIcon(type: 'success' | 'error' | 'info'): SafeHtml {
    let svgString: string;
    switch (type) {
      case 'success':
        svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.06 0l4-5.5Z" clip-rule="evenodd" /></svg>`;
        break;
      case 'error':
        svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z" clip-rule="evenodd" /></svg>`;
        break;
      case 'info':
        svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clip-rule="evenodd" /></svg>`;
        break;
    }
    return this.sanitizer.bypassSecurityTrustHtml(svgString);
  }
}
