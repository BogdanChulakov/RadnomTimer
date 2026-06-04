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
  
  // Полета за въвеждане от потребителя
  prepareTimeInput: number = 5;
  mainTimeInput: number = 3;

  // Логически състояния за интерфейса
  isPreparing: boolean = false;
  isPaused: boolean = false;
  isResultShown: boolean = false; // Показва дали таймерът е пуснат изобщо

  // Вътрешни променливи за пресмятане на времето
  private totalTicks: number = 0;
  private currentTick: number = 0;

  // Контролира състоянието на таймера (true = работи, false = пауза)
  private isRunning$ = new BehaviorSubject<boolean>(false);
  
  // Публична променлива за HTML дисплея
  displayValue: string = '03:00';
  
  private timerSubscription!: Subscription;

  ngOnInit() {
    // Часовникът в реално време
    this.currentTime$ = interval(1000).pipe(
      startWith(0),
      map(() => new Date())
    );

    // Главната RxJS машина, която управлява брояча и поддържа Пауза
    this.timerSubscription = this.isRunning$.pipe(
      switchMap(running => {
        // Ако running е true -> тиктака на всяка секунда, ако е false -> спира (NEVER)
        return running ? interval(1000) : NEVER;
      })
    ).subscribe(() => {
      this.tick();
    });

    this.updateDefaultDisplay();
  }

  // Обновява времето на екрана, докато потребителят пише в полетата (преди старт)
  updateDefaultDisplay() {
    if (!this.isResultShown) {
      this.displayValue = `${this.mainTimeInput.toString().padStart(2, '0')}:00`;
    }
  }

  startTimer() {
    if (this.isPaused) {
      // Ако е бил на пауза, просто го възобновяваме
      this.isPaused = false;
      this.isRunning$.next(true);
      return;
    }

    // Инициализиране на чисто нов таймер
    const totalStartSeconds = this.mainTimeInput * 60;
    this.totalTicks = this.prepareTimeInput + totalStartSeconds;
    this.currentTick = 0;
    
    this.isResultShown = true;
    this.isPaused = false;
    this.isPreparing = this.prepareTimeInput > 0;

    // Първоначално изписване веднага при клик (0-вата секунда)
    this.calculateDisplay(this.currentTick);
    
    // Стартираме тиктакането
    this.isRunning$.next(true);
  }

  // Изпълнява се на всяка изминала секунда
  private tick() {
    this.currentTick++;

    if (this.currentTick > this.totalTicks) {
      this.stopTimer(); // Времето свърши
      return;
    }

    this.calculateDisplay(this.currentTick);
  }

  // Логиката за пресмятане какво да се покаже
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
    this.isRunning$.next(false); // Спира тиктакането, но пази текущата секунда
  }

  stopTimer() {
    this.isRunning$.next(false);
    this.isPaused = false;
    this.isPreparing = false;
    this.isResultShown = false;
    this.updateDefaultDisplay();
  }

  restartTimer() {
    this.stopTimer();
    // Изчакваме минимално време Angular да занули състоянието и стартираме наново
    setTimeout(() => this.startTimer(), 50);
  }

  ngOnDestroy() {
    // Важно за предотвратяване на memory leaks
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }
  }
}