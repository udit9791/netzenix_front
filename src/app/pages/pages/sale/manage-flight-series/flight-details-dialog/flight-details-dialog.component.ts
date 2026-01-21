import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';

@Component({
  selector: 'app-flight-details-dialog',
  templateUrl: './flight-details-dialog.component.html',
  styleUrls: ['./flight-details-dialog.component.scss'],
  standalone: true,
  imports: [CommonModule, MatButtonModule]
})
export class FlightDetailsDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<FlightDetailsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private router: Router
  ) {}

  updateFlight() {
    console.log('Update flight clicked:', this.data);
    // Close the dialog
    this.dialogRef.close();
    // Navigate to the update flight details page with only the flight ID
    this.router.navigate(['/sale/update-flight-details'], {
      queryParams: { id: this.data.id }
    });
  }

  copyFlight() {
    console.log('Copy flight clicked:', this.data);
  }
}
