import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { WatchComponent } from './components/watch-component/watch-component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, WatchComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('random-timer');
}
