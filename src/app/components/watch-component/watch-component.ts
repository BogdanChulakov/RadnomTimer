import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { interval, Observable, BehaviorSubject, Subscription, NEVER } from 'rxjs';
import { map, switchMap, startWith } from 'rxjs/operators';

@Component({
  selector: 'app-watch-component',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './watch-component.html',
  styleUrl: './watch-component.css'
})
export class WatchComponent implements OnInit, OnDestroy {
  currentTime$!: Observable<Date>;
  
  prepareTimeInput: number = 5;
  mainTimeInput: number = 3;

  isPreparing: boolean = false;
  isPaused: boolean = false;
  isResultShown: boolean = false;

  private totalTicks: number = 0;
  private currentTick: number = 0;
  private isRunning$ = new BehaviorSubject<boolean>(false);
  displayValue: string = '03:00';
  private timerSubscription!: Subscription;

  // --- ДЕФИНИРАНЕ НА ЗВУЦИТЕ ---
  // 1. Повтарящ се звук за подготовка (ще го пуснем и ще свири през цялото време)
  private prepareTickSound = new Audio('https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg');
  
  // 2. Единична чиста камбана/гонг за старта на таймера
 private startBellSound = new Audio('https://actions.google.com/sounds/v1/transportation/ship_bell.ogg');
  
  // 3. Единична камбана/сигнал за финала
  private endBellSound = new Audio('https://actions.google.com/sounds/v1/transportation/ship_bell.ogg');

ngOnInit() {
  // 1. Настройваме силата на звука на всички ефекти на максимум (1.0)
  this.prepareTickSound.volume = 1.0;
  this.startBellSound.volume = 1.0;
  this.endBellSound.volume = 1.0;

  // 2. Зареждаме новите кратки звуци предварително в паметта на браузъра
  this.prepareTickSound.load();
  this.startBellSound.load();
  this.endBellSound.load();

  // 3. Часовникът в реално време (най-отгоре)
  this.currentTime$ = interval(1000).pipe(
    startWith(0),
    map(() => new Date())
  );

  // 4. Главната RxJS машина, която управлява старта и паузата
  this.timerSubscription = this.isRunning$.pipe(
    switchMap(running => running ? interval(1000) : NEVER)
  ).subscribe(() => {
    this.tick();
  });

  // 5. Инициализиране на първоначалния дисплей
  this.updateDefaultDisplay();
}

  updateDefaultDisplay() {
    if (!this.isResultShown) {
      this.displayValue = `${this.mainTimeInput.toString().padStart(2, '0')}:00`;
    }
  }

  startTimer() {
    if (this.isPaused) {
      this.isPaused = false;
      this.isRunning$.next(true);
      // Ако сме паузирали по време на подготовка, пускаме звука пак
      if (this.isPreparing) {
        this.prepareTickSound.play().catch(err => console.log(err));
      }
      return;
    }

    const totalStartSeconds = this.mainTimeInput * 60;
    this.totalTicks = this.prepareTimeInput + totalStartSeconds;
    this.currentTick = 0;
    
    this.isResultShown = true;
    this.isPaused = false;
    this.isPreparing = this.prepareTimeInput > 0;

    // СТАРТ НА ПОДГОТОВКАТА: Пускаме звука да свири непрекъснато
    if (this.isPreparing) {
      this.prepareTickSound.currentTime = 0;
      this.prepareTickSound.play().catch(err => console.log(err));
    } else {
      // Ако потребителят е избрал 0 секунди подготовка, директно удряме стартовата камбана
      this.playSound(this.startBellSound);
    }

    this.calculateDisplay(this.currentTick);
    this.isRunning$.next(true);
  }

private tick() {
  this.currentTick++;

  // 1. Докато сме във фаза подготовка, пускаме краткото пиукане
  if (this.currentTick < this.prepareTimeInput) {
    this.playSound(this.prepareTickSound);
  } 
  
  // 2. ХВАЩАМЕ ТОЧНИЯ МОМЕНТ: Подготовката свърши, започва рундът!
  else if (this.currentTick === this.prepareTimeInput) {
    // СТОП НА ПРЕПАРЕ: Спираме и зануляваме подготвителния звук веднага, за да не прелива в рунда!
    this.prepareTickSound.pause();
    this.prepareTickSound.currentTime = 0;

    // Пускаме камбаната за старт на рунда
    this.playSound(this.startBellSound);
  }

  // 3. ФИНАЛ: Когато времето изтече напълно (00:00)
  if (this.currentTick > this.totalTicks) {
    this.isRunning$.next(false);
    this.isResultShown = false;
    
    // Спираме всичко останало за всеки случай
    this.prepareTickSound.pause();
    this.startBellSound.pause();

    // Пускаме финалната камбана
    this.playSound(this.endBellSound);
    
    this.updateDefaultDisplay();
    return;
  }

  this.calculateDisplay(this.currentTick);
}

  private playSound(audio: HTMLAudioElement) {
    audio.currentTime = 0;
    audio.play().catch(err => console.log('Аудиото е блокирано:', err));
  }

  private stopAllSounds() {
    this.prepareTickSound.pause();
    this.prepareTickSound.currentTime = 0;
    
    this.startBellSound.pause();
    this.startBellSound.currentTime = 0;
    
    this.endBellSound.pause();
    this.endBellSound.currentTime = 0;
  }

  private calculateDisplay(tick: number) {
    if (tick < this.prepareTimeInput) {
      this.isPreparing = true;
      const prepLeft = this.prepareTimeInput - tick;
      this.displayValue = prepLeft.toString();
    } else {
      this.isPreparing = false;
      const currentMainTick = tick - this.prepareTimeInput;
      const totalStartSeconds = this.mainTimeInput * 60;
      const secondsLeft = totalStartSeconds - currentMainTick;

      const mins = Math.floor(secondsLeft / 60);
      const secs = secondsLeft % 60;
      this.displayValue = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  }

  pauseTimer() {
    this.isPaused = true;
    this.isRunning$.next(false);
    this.prepareTickSound.pause(); // Паузираме фоновия звук, ако спрем по време на подготовка
  }

  stopTimer() {
    this.isRunning$.next(false);
    this.isPaused = false;
    this.isPreparing = false;
    this.isResultShown = false;
    this.stopAllSounds();
    this.updateDefaultDisplay();
  }

  restartTimer() {
    this.stopTimer();
    setTimeout(() => this.startTimer(), 50);
  }

  ngOnDestroy() {
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }
    this.stopAllSounds();
  }
}