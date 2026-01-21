import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FlightInventoryService } from 'src/app/services/flight-inventory.service';
import { HttpEventType } from '@angular/common/http';
import { MatProgressBarModule } from '@angular/material/progress-bar';

@Component({
  selector: 'app-flight-upload-dialog',
  templateUrl: './flight-upload-dialog.component.html',
  styleUrls: ['./flight-upload-dialog.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule
  ]
})
export class FlightUploadDialogComponent {
  selectedFile: File | null = null;
  uploadProgress: number = 0;
  isUploading: boolean = false;
  uploadError: string | null = null;
  uploadSuccess: boolean = false;

  constructor(
    public dialogRef: MatDialogRef<FlightUploadDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private flightService: FlightInventoryService
  ) {}

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Check if file is Excel
      if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
          file.type === 'application/vnd.ms-excel') {
        this.selectedFile = file;
        this.uploadError = null;
      } else {
        this.uploadError = 'Please select a valid Excel file (.xlsx or .xls)';
        this.selectedFile = null;
      }
    }
  }

  uploadFile(): void {
    if (!this.selectedFile) {
      this.uploadError = 'Please select a file first';
      return;
    }

    this.isUploading = true;
    this.uploadProgress = 0;
    this.uploadError = null;

    const formData = new FormData();
    formData.append('file', this.selectedFile);

    this.flightService.uploadFlightInventory(formData).subscribe({
      next: (event: any) => {
        if (event.type === HttpEventType.UploadProgress) {
          this.uploadProgress = Math.round(100 * event.loaded / event.total);
        } else if (event.type === HttpEventType.Response) {
          this.isUploading = false;
          this.uploadSuccess = true;
          // Close dialog and refresh data after 1.5 seconds
          setTimeout(() => {
            this.dialogRef.close({ success: true, refresh: true });
          }, 1500);
        }
      },
      error: (error) => {
        this.isUploading = false;
        this.uploadError = error.error?.message || 'An error occurred during upload';
      }
    });
  }

  downloadSampleFile(): void {
    this.flightService.downloadFlightInventorySample().subscribe({
      next: (response: any) => {
        // Create a blob from the response
        const blob = new Blob([response], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        
        // Create a link element and trigger download
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'flight_inventory_sample.xlsx';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      },
      error: (error) => {
        this.uploadError = 'Failed to download sample file';
      }
    });
  }

  closeDialog(): void {
    this.dialogRef.close({ success: this.uploadSuccess, refresh: this.uploadSuccess });
  }
}