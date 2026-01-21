import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { HotelOptionService } from 'src/app/services/hotel-option.service';

@Component({
  selector: 'app-hotel-option-create-update',
  templateUrl: './hotel-option-create-update.component.html',
  styleUrls: [],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatSnackBarModule,
    MatIconModule
  ]
})
export class HotelOptionCreateUpdateComponent implements OnInit {
  form!: FormGroup;
  mode: 'create' | 'update' = 'create';
  isLoading = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public defaults: any,
    private dialogRef: MatDialogRef<HotelOptionCreateUpdateComponent>,
    private fb: FormBuilder,
    private optionService: HotelOptionService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    if (this.defaults) {
      this.mode = 'update';
    } else {
      this.defaults = {};
    }

    this.form = this.fb.group({
      type: [this.defaults.type || 'meal_option', Validators.required],
      name: [this.defaults.name || '', [Validators.required, Validators.maxLength(160)]]
    });
  }

  save(): void {
    if (this.form.invalid) return;
    this.isLoading = true;
    const payload = this.form.value;

    if (this.mode === 'create') {
      this.optionService.createOption(payload).subscribe({
        next: () => {
          this.snackBar.open('Hotel option created successfully', 'Close', { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: () => {
          this.isLoading = false;
          this.snackBar.open('Failed to create option', 'Close', { duration: 3000 });
        }
      });
    } else {
      this.optionService.updateOption(this.defaults.id, payload).subscribe({
        next: () => {
          this.snackBar.open('Hotel option updated successfully', 'Close', { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: () => {
          this.isLoading = false;
          this.snackBar.open('Failed to update option', 'Close', { duration: 3000 });
        }
      });
    }
  }
}

