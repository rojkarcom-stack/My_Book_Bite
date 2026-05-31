
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class MathJaxService {
  
  render() {
    if ((window as any).MathJax && (window as any).MathJax.typesetPromise) {
      // Small delay to ensure the DOM has updated before typesetting
      setTimeout(() => {
        (window as any).MathJax.typesetPromise().catch((err: any) => console.error('MathJax typeset failed: ', err));
      }, 50);
    }
  }
}
