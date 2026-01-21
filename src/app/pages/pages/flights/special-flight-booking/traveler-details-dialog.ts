import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';

export interface TravelerDetailsRecord {
  type: 'Adult' | 'Child' | 'Infant' | string;
  title: string;
  firstName: string;
  lastName: string;
}

export interface TravelerDetailsDialogData {
  travelers: TravelerDetailsRecord[];
  required: { adult: number; child: number; infant: number };
  type: 'internal' | 'external';
}

@Component({
  selector: 'app-traveler-details-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatTableModule,
    MatIconModule
  ],
  template: `
    <div class="traveler-details-dialog">
      <h2 mat-dialog-title>Traveler Details Found</h2>
      <div class="requirements" *ngIf="required">
        <span>Adults needed: {{ required.adult }}</span>
        <span>Children needed: {{ required.child }}</span>
        <span>Infants needed: {{ required.infant }}</span>
      </div>
      <mat-dialog-content>
        <div class="group" *ngIf="adultData.length">
          <div class="group-title">Adults</div>
          <table mat-table [dataSource]="adultData" class="mat-elevation-z1 full-width">
            <!-- Title Column -->
            <ng-container matColumnDef="title">
              <th mat-header-cell *matHeaderCellDef> Title </th>
              <td mat-cell *matCellDef="let row"> {{ row.title }} </td>
            </ng-container>

            <!-- First Name Column -->
            <ng-container matColumnDef="firstName">
              <th mat-header-cell *matHeaderCellDef> First Name </th>
              <td mat-cell *matCellDef="let row"> {{ row.firstName }} </td>
            </ng-container>

            <!-- Last Name Column -->
            <ng-container matColumnDef="lastName">
              <th mat-header-cell *matHeaderCellDef> Last Name </th>
              <td mat-cell *matCellDef="let row"> {{ row.lastName }} </td>
            </ng-container>

            <!-- Action Column -->
            <ng-container matColumnDef="action">
              <th mat-header-cell *matHeaderCellDef> Action </th>
              <td mat-cell *matCellDef="let row">
                <button mat-button color="primary" *ngIf="!isSelectedRow(row)" [disabled]="!canAdd(row)" (click)="addRow(row)">
                  <mat-icon>add</mat-icon>
                  Add
                </button>
                <button mat-button color="warn" *ngIf="isSelectedRow(row)" (click)="removeRow(row)">
                  <mat-icon>remove_circle</mat-icon>
                  Remove
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="groupDisplayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: groupDisplayedColumns;"></tr>
          </table>
        </div>

        <div class="group" *ngIf="childData.length">
          <div class="group-title">Children</div>
          <table mat-table [dataSource]="childData" class="mat-elevation-z1 full-width">
            <ng-container matColumnDef="title">
              <th mat-header-cell *matHeaderCellDef> Title </th>
              <td mat-cell *matCellDef="let row"> {{ row.title }} </td>
            </ng-container>
            <ng-container matColumnDef="firstName">
              <th mat-header-cell *matHeaderCellDef> First Name </th>
              <td mat-cell *matCellDef="let row"> {{ row.firstName }} </td>
            </ng-container>
            <ng-container matColumnDef="lastName">
              <th mat-header-cell *matHeaderCellDef> Last Name </th>
              <td mat-cell *matCellDef="let row"> {{ row.lastName }} </td>
            </ng-container>
            <ng-container matColumnDef="action">
              <th mat-header-cell *matHeaderCellDef> Action </th>
              <td mat-cell *matCellDef="let row">
                <button mat-button color="primary" *ngIf="!isSelectedRow(row)" [disabled]="!canAdd(row)" (click)="addRow(row)">
                  <mat-icon>add</mat-icon>
                  Add
                </button>
                <button mat-button color="warn" *ngIf="isSelectedRow(row)" (click)="removeRow(row)">
                  <mat-icon>remove_circle</mat-icon>
                  Remove
                </button>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="groupDisplayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: groupDisplayedColumns;"></tr>
          </table>
        </div>

        <div class="group" *ngIf="infantData.length">
          <div class="group-title">Infants</div>
          <table mat-table [dataSource]="infantData" class="mat-elevation-z1 full-width">
            <ng-container matColumnDef="title">
              <th mat-header-cell *matHeaderCellDef> Title </th>
              <td mat-cell *matCellDef="let row"> {{ row.title }} </td>
            </ng-container>
            <ng-container matColumnDef="firstName">
              <th mat-header-cell *matHeaderCellDef> First Name </th>
              <td mat-cell *matCellDef="let row"> {{ row.firstName }} </td>
            </ng-container>
            <ng-container matColumnDef="lastName">
              <th mat-header-cell *matHeaderCellDef> Last Name </th>
              <td mat-cell *matCellDef="let row"> {{ row.lastName }} </td>
            </ng-container>
            <ng-container matColumnDef="action">
              <th mat-header-cell *matHeaderCellDef> Action </th>
              <td mat-cell *matCellDef="let row">
                <button mat-button color="primary" *ngIf="!isSelectedRow(row)" [disabled]="!canAdd(row)" (click)="addRow(row)">
                  <mat-icon>add</mat-icon>
                  Add
                </button>
                <button mat-button color="warn" *ngIf="isSelectedRow(row)" (click)="removeRow(row)">
                  <mat-icon>remove_circle</mat-icon>
                  Remove
                </button>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="groupDisplayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: groupDisplayedColumns;"></tr>
          </table>
        </div>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button (click)="closeWithSelection()" color="primary">Apply</button>
        <button mat-button mat-dialog-close>Close</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .traveler-details-dialog {
      min-width: 300px;
    }
    .full-width { width: 100%; }
    table { margin-top: 8px; }
    th { text-transform: none; }
    .requirements { display: flex; gap: 12px; padding: 0 24px; font-size: 12px; color: rgba(0,0,0,0.6); }
    .group { margin-top: 12px; }
    .group-title { margin: 12px 0 4px; font-weight: 600; opacity: 0.8; }
  `]
})
export class TravelerDetailsDialog {
  displayedColumns = ['type', 'title', 'firstName', 'lastName', 'action'];
  groupDisplayedColumns = ['title', 'firstName', 'lastName', 'action'];
  dataSource: TravelerDetailsRecord[] = [];
  required: { adult: number; child: number; infant: number } = { adult: 0, child: 0, infant: 0 };
  selectedIndices = new Set<number>();
  selectedCount = { adult: 0, child: 0, infant: 0 };
  adultData: TravelerDetailsRecord[] = [];
  childData: TravelerDetailsRecord[] = [];
  infantData: TravelerDetailsRecord[] = [];

  constructor(
    public dialogRef: MatDialogRef<TravelerDetailsDialog>,
    @Inject(MAT_DIALOG_DATA) public data: TravelerDetailsDialogData
  ) {
    this.required = data?.required || { adult: 0, child: 0, infant: 0 };
    const travelers = Array.isArray(data?.travelers) ? data.travelers : [];
    // Fallback to single row if legacy shape was passed
    if (!travelers.length && (data as any)?.title) {
      this.dataSource = [{
        type: 'Adult',
        title: (data as any).title,
        firstName: (data as any).firstName,
        lastName: (data as any).lastName
      }];
    } else {
      this.dataSource = travelers.map(t => ({
        type: t.type || 'Adult',
        title: t.title,
        firstName: t.firstName,
        lastName: t.lastName
      }));
    }

    // Build grouped data
    this.adultData = this.dataSource.filter(r => this.typeKey(r.type) === 'adult');
    this.childData = this.dataSource.filter(r => this.typeKey(r.type) === 'child');
    this.infantData = this.dataSource.filter(r => this.typeKey(r.type) === 'infant');
  }

  private typeKey(type: string): 'adult' | 'child' | 'infant' {
    const t = (type || '').toLowerCase();
    if (t.startsWith('inf')) return 'infant';
    if (t.startsWith('chi')) return 'child';
    return 'adult';
  }

  canAdd(row: TravelerDetailsRecord): boolean {
    const key = this.typeKey(row.type);
    const required = this.required[key];
    const selected = this.selectedCount[key];
    return selected < (required || 0);
  }

  isSelected(index: number): boolean {
    return this.selectedIndices.has(index);
  }

  private indexOfRow(row: TravelerDetailsRecord): number {
    const key = (v: any) => (v ?? '').toString().trim().toLowerCase();
    const type = this.typeKey(row.type);
    return this.dataSource.findIndex(r => this.typeKey(r.type) === type && key(r.title) === key(row.title) && key(r.firstName) === key(row.firstName) && key(r.lastName) === key(row.lastName));
  }

  isSelectedRow(row: TravelerDetailsRecord): boolean {
    const idx = this.indexOfRow(row);
    return idx !== -1 && this.isSelected(idx);
  }

  addRow(row: TravelerDetailsRecord): void {
    const idx = this.indexOfRow(row);
    if (idx === -1) return;
    this.add(idx);
  }

  removeRow(row: TravelerDetailsRecord): void {
    const idx = this.indexOfRow(row);
    if (idx === -1) return;
    this.remove(idx);
  }

  add(index: number): void {
    const row = this.dataSource[index];
    if (!row || !this.canAdd(row)) return;
    if (this.selectedIndices.has(index)) return;
    this.selectedIndices.add(index);
    const key = this.typeKey(row.type);
    this.selectedCount[key] = (this.selectedCount[key] || 0) + 1;
  }

  remove(index: number): void {
    if (!this.selectedIndices.has(index)) return;
    const row = this.dataSource[index];
    const key = this.typeKey(row.type);
    this.selectedIndices.delete(index);
    this.selectedCount[key] = Math.max(0, (this.selectedCount[key] || 0) - 1);
  }

  closeWithSelection(): void {
    const selected = Array.from(this.selectedIndices).map(i => this.dataSource[i]);
    this.dialogRef.close(selected);
  }
}