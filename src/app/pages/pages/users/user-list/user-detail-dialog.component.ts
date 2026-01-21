import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { UserService } from 'src/app/core/services/user.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-user-detail-dialog',
  templateUrl: './user-detail-dialog.component.html',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    FormsModule
  ]
})
export class UserDetailDialogComponent {
  loading = true;
  user: any = null;
  detail: any = null;
  roles: Array<{ id: number; name: string }> = [];
  selectedRole: string = '';
  imgUrl = environment.imgUrl;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { id: number },
    private dialogRef: MatDialogRef<UserDetailDialogComponent>,
    private userService: UserService
  ) {
    this.load();
  }

  load() {
    this.loading = true;
    this.userService.getUserDetail(this.data.id).subscribe({
      next: (res) => {
        this.user = res.user;
        this.detail = res.detail;
        this.selectedRole = (Array.isArray(this.user?.role_names) && this.user.role_names.length) ? this.user.role_names[0] : '';
        this.userService.getRoles().subscribe((roles) => {
          this.roles = roles.map((r: any) => ({ id: r.id, name: r.name }));
        });
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  approve() {
    if (!this.selectedRole) return;
    this.userService.approveUser(this.data.id, this.selectedRole).subscribe({
      next: () => {
        this.dialogRef.close(true);
      }
    });
  }

  reject() {
    this.userService.rejectUser(this.data.id).subscribe({
      next: () => {
        this.dialogRef.close(true);
      }
    });
  }

  close() {
    this.dialogRef.close(false);
  }

  buildFileUrl(path?: string): string {
    if (!path) return '';
    const trimmed = path.startsWith('/') ? path.substring(1) : path;
    return `${this.imgUrl}/${trimmed}`;
  }
}