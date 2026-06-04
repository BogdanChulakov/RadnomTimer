import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // Важно за async pipe и date pipe
import { interval, Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

@Component({
  selector: 'app-watch-component',
  standalone: true,
  imports: [CommonModule], // Добави CommonModule, ако ползваш Standalone компоненти
  templateUrl: './watch-component.html',
  styleUrls: ['./watch-component.css']
})
export class WatchComponent implements OnInit {
  currentTime$!: Observable<Date>;

  ngOnInit() {
    this.currentTime$ = interval(1000).pipe(
      // startWith(0) подсигурява, че часът ще се покаже веднага, 
      // а няма да чака 1 секунда за първото изпъление
      startWith(0),
      map(() => new Date())
    );
  }
}