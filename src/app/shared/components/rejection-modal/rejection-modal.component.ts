import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-rejection-modal',
  templateUrl: './rejection-modal.component.html',
  styleUrls: ['./rejection-modal.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule
  ]
})
export class RejectionModalComponent {
  rejectionForm: FormGroup;
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<RejectionModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { transaction: any }
  ) {
    this.rejectionForm = this.fb.group({
      reason: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(1000)]]
    });
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }

  onReject(): void {
    if (this.rejectionForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      const reason = this.rejectionForm.get('reason')?.value;
      this.dialogRef.close({ reason });
    }
  }

  get reasonControl() {
    return this.rejectionForm.get('reason');
  }
}