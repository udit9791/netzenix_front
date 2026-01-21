import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { AirlineService } from '../../../../../services/airline.service';
import { environment } from '../../../../../../environments/environment';

@Component({
  selector: 'app-airline-form',
  templateUrl: './airline-form.component.html',
  styleUrls: ['./airline-form.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    MatIconModule
  ]
})
export class AirlineFormComponent implements OnInit {
  environment = environment;
  airlineForm!: FormGroup;
  isSubmitting = false;
  dialogTitle = 'Add Airline';
  logoFile: File | null = null;
  logoPreview: string | null = null;
  logoError: string | null = null;
  
  constructor(
    private fb: FormBuilder,
    private airlineService: AirlineService,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<AirlineFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { mode: 'add' | 'edit', airline?: any }
  ) {}

  ngOnInit(): void {
    this.initForm();
    
    if (this.data.mode === 'edit' && this.data.airline) {
      this.dialogTitle = 'Edit Airline';
      this.airlineForm.patchValue({
        code: this.data.airline.code,
        name: this.data.airline.name,
        is_active: this.data.airline.is_active
      });
    }
  }

  initForm(): void {
    this.airlineForm = this.fb.group({
      code: ['', [Validators.required, Validators.maxLength(5)]],
      name: ['', [Validators.required, Validators.maxLength(255)]],
      is_active: [true],
      logo: [null]
    });
  }
  
  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      
      // Validate file type
      if (!file.type.includes('image/')) {
        this.logoError = 'Please select an image file';
        return;
      }
      
      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        this.logoError = 'Image size should not exceed 2MB';
        return;
      }
      
      this.logoFile = file;
      this.logoError = null;
      
      // Create preview
      const reader = new FileReader();
      reader.onload = () => {
        this.logoPreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }
  
  removeLogo(): void {
    this.logoFile = null;
    this.logoPreview = null;
    this.airlineForm.get('logo')?.setValue(null);
  }

  onSubmit(): void {
    if (this.airlineForm.invalid) {
      return;
    }

    this.isSubmitting = true;
    const formData = new FormData();
    const airlineData = this.airlineForm.value;
    
    // Add form fields to FormData - ensure field names match exactly what the backend expects
    formData.append('code', airlineData.code);
    formData.append('name', airlineData.name);
    formData.append('is_active', airlineData.is_active ? '1' : '0');
    
    // Add logo file if selected
    if (this.logoFile) {
      formData.append('logo', this.logoFile);
    } else if (this.data.mode === 'edit' && this.data.airline?.logo && !this.logoPreview) {
      // If editing and logo was removed
      formData.append('remove_logo', '1');
    }

    if (this.data.mode === 'add') {
      this.airlineService.createAirlineWithLogo(formData).subscribe({
        next: (response) => {
          this.snackBar.open('Airline created successfully', 'Close', { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: (error) => {
          console.error('Error creating airline:', error);
          this.snackBar.open('Failed to create airline', 'Close', { duration: 3000 });
          this.isSubmitting = false;
        }
      });
    } else {
      this.airlineService.updateAirlineWithLogo(this.data.airline.id, formData).subscribe({
        next: (response) => {
          this.snackBar.open('Airline updated successfully', 'Close', { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: (error) => {
          console.error('Error updating airline:', error);
          this.snackBar.open('Failed to update airline', 'Close', { duration: 3000 });
          this.isSubmitting = false;
        }
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}