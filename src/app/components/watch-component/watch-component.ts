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
  
  // Полета за настройки от потребителя
  prepareTimeInput: number = 5;
  mainTimeInput: number = 3; // в минути
  roundsInput: number = 3;    // НОВО: Брой рундове
  restTimeInput: number = 30; // НОВО: Почивка в секунди

  // Състояния за интерфейса
  isPreparing: boolean = false;
  isResting: boolean = false; // НОВО: Дали сме в почивка
  isPaused: boolean = false;
  isResultShown: boolean = false;
  currentRound: number = 1;   // НОВО: Текущ рунд

  // Вътрешни променливи за времето
  private currentTick: number = 0;
  private phaseSecondsLeft: number = 0;
  private currentPhase: 'prepare' | 'work' | 'rest' = 'prepare';
  
  private isRunning$ = new BehaviorSubject<boolean>(false);
  displayValue: string = '03:00';
  private timerSubscription!: Subscription;

  // Звукови ефекти
  private prepareTickSound = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
  private startBellSound = new Audio('https://actions.google.com/sounds/v1/transportation/ship_bell.ogg');
  private endBellSound = new Audio('https://actions.google.com/sounds/v1/alarms/clock_chime.ogg');

  ngOnInit() {
    this.currentTime$ = interval(1000).pipe(
      startWith(0),
      map(() => new Date())
    );

    this.timerSubscription = this.isRunning$.pipe(
      switchMap(running => running ? interval(1000) : NEVER)
    ).subscribe(() => {
      this.tick();
    });

    this.prepareTickSound.load();
    this.startBellSound.load();
    this.endBellSound.load();

    this.updateDefaultDisplay();
  }

  updateDefaultDisplay() {
    if (!this.isResultShown) {
      this.displayValue = `${this.mainTimeInput.toString().padStart(2, '0')}:00`;
      this.currentRound = 1;
    }
  }

  startTimer() {
    if (this.isPaused) {
      this.isPaused = false;
      this.isRunning$.next(true);
      return;
    }

    // Инициализиране на изцяло нова тренировка
    this.isResultShown = true;
    this.isPaused = false;
    this.currentRound = 1;

    if (this.prepareTimeInput > 0) {
      this.currentPhase = 'prepare';
      this.phaseSecondsLeft = this.prepareTimeInput;
      this.isPreparing = true;
      this.isResting = false;
      this.playSound(this.prepareTickSound);
    } else {
      this.currentPhase = 'work';
      this.phaseSecondsLeft = this.mainTimeInput * 60;
      this.isPreparing = false;
      this.isResting = false;
      this.playSound(this.startBellSound);
    }

    this.formatDisplay();
    this.isRunning$.next(true);
  }

  private tick() {
    this.phaseSecondsLeft--;

    // Логика за управление на звуците секунда по секунда
    if (this.currentPhase === 'prepare' && this.phaseSecondsLeft > 0) {
      this.playSound(this.prepareTickSound);
    }

    // Когато текущата фаза изтече (стигне 0)
    if (this.phaseSecondsLeft <= 0) {
      this.stopAllSounds();

      if (this.currentPhase === 'prepare') {
        // Преход: От Подготовка към Рунд 1
        this.currentPhase = 'work';
        this.phaseSecondsLeft = this.mainTimeInput * 60;
        this.isPreparing = false;
        this.playSound(this.startBellSound); // Удря камбана за старт на рунда
      } 
      else if (this.currentPhase === 'work') {
        // Рундът е свършил. Има ли още рундове?
        if (this.currentRound < this.roundsInput) {
          // Преход: Към Почивка
          this.currentPhase = 'rest';
          this.phaseSecondsLeft = this.restTimeInput;
          this.isResting = true;
          this.playSound(this.startBellSound); // Удря камбана за край на рунда / начало на почивка
        } else {
          // Финал: Всички рундове са завършени
          this.playSound(this.endBellSound);
          this.stopTimer();
          return;
        }
      } 
      else if (this.currentPhase === 'rest') {
        // Преход: От Почивка към следващ Рунд
        this.currentRound++;
        this.currentPhase = 'work';
        this.phaseSecondsLeft = this.mainTimeInput * 60;
        this.isResting = false;
        this.playSound(this.startBellSound); // Удря камбана за старт на новия рунд
      }
    }

    this.formatDisplay();
  }

  private formatDisplay() {
    if (this.currentPhase === 'prepare') {
      this.displayValue = this.phaseSecondsLeft.toString();
    } else {
      const mins = Math.floor(this.phaseSecondsLeft / 60);
      const secs = this.phaseSecondsLeft % 60;
      this.displayValue = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  }

  private playSound(audio: HTMLAudioElement) {
    audio.currentTime = 0;
    audio.play().catch(err => console.log('Аудио блокирано:', err));
  }

  private stopAllSounds() {
    this.prepareTickSound.pause();
    this.prepareTickSound.currentTime = 0;
    this.startBellSound.pause();
    this.startBellSound.currentTime = 0;
    this.endBellSound.pause();
    this.endBellSound.currentTime = 0;
  }

  pauseTimer() {
    this.isPaused = true;
    this.isRunning$.next(false);
    this.stopAllSounds();
  }

  stopTimer() {
    this.isRunning$.next(false);
    this.isPaused = false;
    this.isPreparing = false;
    this.isResting = false;
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