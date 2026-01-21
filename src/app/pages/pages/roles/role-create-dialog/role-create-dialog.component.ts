import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule
} from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { RoleService } from 'src/app/core/services/role.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'vex-role-create-dialog',
  standalone: true,
  templateUrl: './role-create-dialog.component.html',
  styleUrls: ['./role-create-dialog.component.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ]
})
export class RoleCreateDialogComponent {
  roleForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private roleService: RoleService,
    private snackbar: MatSnackBar,
    private dialogRef: MatDialogRef<RoleCreateDialogComponent>
  ) {
    this.roleForm = this.fb.group({
      name: ['', Validators.required],
      description: ['']
    });
  }

  save() {
    if (this.roleForm.valid) {
      this.roleService.createRole(this.roleForm.value).subscribe({
        next: (res) => {
          this.snackbar.open('Role created successfully!', 'OK', {
            duration: 3000
          });
          this.dialogRef.close(res.role); // return created role object
        },
        error: (err) => {
          this.snackbar.open(
            err.error?.message || 'Failed to create role',
            'OK',
            { duration: 3000 }
          );
        }
      });
    }
  }

  close() {
    this.dialogRef.close();
  }
}
