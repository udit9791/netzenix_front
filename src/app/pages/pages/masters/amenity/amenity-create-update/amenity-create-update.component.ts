import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { AmenityService } from 'src/app/services/amenity.service';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-amenity-create-update',
  templateUrl: './amenity-create-update.component.html',
  styleUrls: ['./amenity-create-update.component.scss'],
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
    MatSlideToggleModule,
    MatIconModule
  ]
})
export class AmenityCreateUpdateComponent implements OnInit {
  form!: FormGroup;
  mode: 'create' | 'update' = 'create';
  isLoading = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public defaults: any,
    private dialogRef: MatDialogRef<AmenityCreateUpdateComponent>,
    private fb: FormBuilder,
    private amenityService: AmenityService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    if (this.defaults) {
      this.mode = 'update';
    } else {
      this.defaults = {};
    }

    this.form = this.fb.group({
      type: [this.defaults.type || 'hotel', Validators.required],
      name: [
        this.defaults.name || '',
        [Validators.required, Validators.maxLength(160)]
      ]
    });
  }

  save(): void {
    if (this.form.invalid) return;
    this.isLoading = true;
    const payload = this.form.value;

    if (this.mode === 'create') {
      this.amenityService.createAmenity(payload).subscribe({
        next: () => {
          this.snackBar.open('Amenity created successfully', 'Close', {
            duration: 3000
          });
          this.dialogRef.close(true);
        },
        error: () => {
          this.isLoading = false;
          this.snackBar.open('Failed to create amenity', 'Close', {
            duration: 3000
          });
        }
      });
    } else {
      this.amenityService.updateAmenity(this.defaults.id, payload).subscribe({
        next: () => {
          this.snackBar.open('Amenity updated successfully', 'Close', {
            duration: 3000
          });
          this.dialogRef.close(true);
        },
        error: () => {
          this.isLoading = false;
          this.snackBar.open('Failed to update amenity', 'Close', {
            duration: 3000
          });
        }
      });
    }
  }
}
