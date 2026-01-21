import { Component } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'vex-add-money-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    FormsModule
  ],
  templateUrl: './add-money-dialog.component.html',
  styleUrl: './add-money-dialog.component.scss'
})
export class AddMoneyDialogComponent {
  amount: number = 0;

  constructor(
    private dialogRef: MatDialogRef<AddMoneyDialogComponent>,
    private router: Router
  ) {}

  proceed(): void {
    if (this.amount > 0) {
      // Store amount in sessionStorage with timestamp
      const paymentData = {
        amount: this.amount,
        timestamp: Date.now()
      };
      sessionStorage.setItem('paymentAmount', JSON.stringify(paymentData));
      this.dialogRef.close(true);
    }
  }
}
