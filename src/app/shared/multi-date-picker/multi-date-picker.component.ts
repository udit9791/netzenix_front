import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule, DatePipe, NgFor, NgClass } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-multi-date-picker',
  templateUrl: './multi-date-picker.component.html',
  styleUrls: ['./multi-date-picker.component.scss'],
  standalone: true,
  imports: [CommonModule, NgFor, NgClass, DatePipe, MatIconModule, MatButtonModule]
})
export class MultiDatePickerComponent {
  @Input() numberOfMonths = 3;
  @Output() datesChange = new EventEmitter<Date[]>();

  selectedDates: Date[] = [];
  baseDate = new Date();

  get months(): Date[] {
    return Array.from({ length: this.numberOfMonths }, (_, i) =>
      new Date(this.baseDate.getFullYear(), this.baseDate.getMonth() + i, 1)
    );
  }

  // Build the grid of days for a given month
  getMonthDays(month: Date): (Date | null)[] {
    const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
    const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0);

    const days: (Date | null)[] = [];

    // pad before first day
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }

    // actual days
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(month.getFullYear(), month.getMonth(), d));
    }

    return days;
  }

  toggleDate(date: Date | null) {
    if (!date) return;

    const index = this.selectedDates.findIndex(
      (d) => d.toDateString() === date.toDateString()
    );

    if (index > -1) {
      this.selectedDates.splice(index, 1); // unselect
    } else {
      this.selectedDates.push(date); // select
    }

    this.datesChange.emit([...this.selectedDates]);
    console.log('Selected Dates:', this.selectedDates);
  }

  isSelected(date: Date | null): boolean {
    return !!date && this.selectedDates.some((d) => d.toDateString() === date.toDateString());
  }

  prev() {
    this.baseDate = new Date(this.baseDate.getFullYear(), this.baseDate.getMonth() - 1, 1);
  }

  next() {
    this.baseDate = new Date(this.baseDate.getFullYear(), this.baseDate.getMonth() + 1, 1);
  }

  get isPrevDisabled(): boolean {
    const now = new Date();
    return (
      this.baseDate.getFullYear() === now.getFullYear() &&
      this.baseDate.getMonth() === now.getMonth()
    );
  }
}
