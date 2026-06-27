import { bootstrapApplication, BootstrapContext } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { provideServerRendering } from '@angular/platform-server';

export const config = {
    providers: [
        provideServerRendering()
    ]
};
