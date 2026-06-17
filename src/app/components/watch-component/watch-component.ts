import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { interval, Observable, BehaviorSubject, Subscription, NEVER } from 'rxjs';
import { map, switchMap, startWith } from 'rxjs/operators';

// НОВО: Интерфейс за структурата на командите
interface SignalCommand {
  id: string;
  label: string;
  selected: boolean;
}

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
  mainTimeInput: number = 3; 
  roundsInput: number = 3;    
  restTimeInput: number = 30; 
  randomSignalMaxInput: number = 10; 

  // НОВО: Списък с възможните команди и техния статус
  availableCommands: SignalCommand[] = [
    { id: 'beep', label: '🔊 Beep Звук', selected: true },
    { id: 'left', label: '🥊 Left', selected: false },
    { id: 'right', label: '🥊 Right', selected: false },
    { id: 'jab', label: '💥 Jab', selected: false },
    { id: 'cross', label: '💥 Cross', selected: false },
    { id: 'uppercut', label: '⚡ Uppercut', selected: false },
    { id: 'back', label: '🛡️ Back', selected: false },
    { id: 'attack', label: '🔥 Attack', selected: false }
  ];

  // Състояния за интерфейса
  isPreparing: boolean = false;
  isResting: boolean = false; 
  isPaused: boolean = false;
  isResultShown: boolean = false;
  currentRound: number = 1;   

  // Вътрешни променливи за времето
  private phaseSecondsLeft: number = 0;
  private currentPhase: 'prepare' | 'work' | 'rest' = 'prepare';
  private randomSignalTicksLeft: number = 0;

  private isRunning$ = new BehaviorSubject<boolean>(false);
  displayValue: string = '03:00';
  private timerSubscription!: Subscription;

  // Звукови ефекти
  private prepareTickSound = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
  private startBellSound = new Audio('https://actions.google.com/sounds/v1/transportation/ship_bell.ogg');
  private endBellSound = new Audio('https://actions.google.com/sounds/v1/alarms/clock_chime.ogg');
  private beepSignalSound = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');

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
    this.beepSignalSound.load();

    this.updateDefaultDisplay();
  }

  updateDefaultDisplay() {
    if (!this.isResultShown) {
      this.displayValue = `${this.mainTimeInput.toString().padStart(2, '0')}:00`;
      this.currentRound = 1;
    }
  }

  // НОВО: Помощен метод за включване/изключване при клик в новия дизайн
  toggleCommand(command: SignalCommand) {
    if (!this.isResultShown) {
      command.selected = !command.selected;
    }
  }

  startTimer() {
    if (this.isPaused) {
      this.isPaused = false;
      this.isRunning$.next(true);
      return;
    }

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
      this.resetRandomSignalTimer(); 
    }

    this.formatDisplay();
    this.isRunning$.next(true);
  }

  private resetRandomSignalTimer() {
    if (this.randomSignalMaxInput > 1) {
      this.randomSignalTicksLeft = Math.floor(Math.random() * this.randomSignalMaxInput) + 1;
    } else {
      this.randomSignalTicksLeft = 0;
    }
  }

  private tick() {
    this.phaseSecondsLeft--;

    if (this.currentPhase === 'prepare' && this.phaseSecondsLeft > 0) {
      this.playSound(this.prepareTickSound);
    }

    // Логика за рандом сигнал
    if (this.currentPhase === 'work' && this.randomSignalMaxInput > 0 && this.phaseSecondsLeft > 0) {
      this.randomSignalTicksLeft--;
      
      if (this.randomSignalTicksLeft <= 0) {
        this.playRandomSelectedSignal(); // НОВО: Извиква рандомизирания избор
        this.resetRandomSignalTimer(); 
      }
    }

    if (this.phaseSecondsLeft <= 0) {
      this.stopAllSounds();

      if (this.currentPhase === 'prepare') {
        this.currentPhase = 'work';
        this.phaseSecondsLeft = this.mainTimeInput * 60;
        this.isPreparing = false;
        this.playSound(this.startBellSound); 
        this.resetRandomSignalTimer(); 
      } 
      else if (this.currentPhase === 'work') {
        if (this.currentRound < this.roundsInput) {
          this.currentPhase = 'rest';
          this.phaseSecondsLeft = this.restTimeInput;
          this.isResting = true;
          this.playSound(this.startBellSound); 
        } else {
          this.playSound(this.endBellSound);
          this.stopTimer();
          return;
        }
      } 
      else if (this.currentPhase === 'rest') {
        this.currentRound++;
        this.currentPhase = 'work';
        this.phaseSecondsLeft = this.mainTimeInput * 60;
        this.isResting = false;
        this.playSound(this.startBellSound); 
        this.resetRandomSignalTimer(); 
      }
    }

    this.formatDisplay();
  }

  // НОВО: Рандомизатор на избраните команди
  private playRandomSelectedSignal() {
    // Взимаме само тези команди, които потребителят е маркирал
    const selectedCommands = this.availableCommands.filter(c => c.selected);
    
    // Ако няма нито една избрана команда, спираме изпълнението
    if (selectedCommands.length === 0) return;

    // Избираме произволен индекс от филтрирания масив
    const randomIndex = Math.floor(Math.random() * selectedCommands.length);
    const chosenCommand = selectedCommands[randomIndex];

    // Изпълняваме съответния сигнал
    if (chosenCommand.id === 'beep') {
      this.playSound(this.beepSignalSound);
    } else {
      const utterance = new SpeechSynthesisUtterance(chosenCommand.id);
      utterance.lang = 'en-US';
      utterance.rate = 1.3; // Една идея по-бърз говор за боен фитнес темпо
      window.speechSynthesis.speak(utterance);
    }
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
    this.beepSignalSound.pause();
    this.beepSignalSound.currentTime = 0;
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