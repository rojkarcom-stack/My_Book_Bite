import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
  duration: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  toasts = signal<Toast[]>([]);
  private nextId = 0;

  show(message: string, type: 'success' | 'error' | 'info' = 'info', duration = 5000) {
    const id = this.nextId++;
    const newToast: Toast = { id, message, type, duration };
    
    this.toasts.update(currentToasts => [...currentToasts, newToast]);

    setTimeout(() => this.remove(id), duration);
  }

  remove(id: number) {
    this.toasts.update(currentToasts => currentToasts.filter(toast => toast.id !== id));
  }
}
