import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTable } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AirlineService } from '../../../../../services/airline.service';
import { AirlineFormComponent } from '../airline-form/airline-form.component';
import { ConfirmDialogComponent, ConfirmDialogModule } from '../../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { fadeInUp400ms } from '@vex/animations/fade-in-up.animation';
import { stagger40ms } from '@vex/animations/stagger.animation';
import { VexPageLayoutComponent } from '@vex/components/vex-page-layout/vex-page-layout.component';
import { VexPageLayoutHeaderDirective } from '@vex/components/vex-page-layout/vex-page-layout-header.directive';
import { VexPageLayoutContentDirective } from '@vex/components/vex-page-layout/vex-page-layout-content.directive';
import { VexBreadcrumbsComponent } from '@vex/components/vex-breadcrumbs/vex-breadcrumbs.component';
import { MatTooltipModule } from '@angular/material/tooltip';
import { environment } from '../../../../../../environments/environment';

@Component({
  selector: 'app-airline-list',
  templateUrl: './airline-list.component.html',
  styleUrls: ['./airline-list.component.scss'],
  animations: [
    fadeInUp400ms,
    stagger40ms
  ],
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatDialogModule,
    MatSnackBarModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    AirlineFormComponent,
    VexPageLayoutComponent,
    VexPageLayoutHeaderDirective,
    VexPageLayoutContentDirective,
    VexBreadcrumbsComponent
  ]
})
export class AirlineListComponent implements OnInit {
  environment = environment;
  displayedColumns: string[] = ['logo', 'code', 'name', 'is_active', 'actions'];
  dataSource: any[] = [];
  totalItems = 0;
  pageSize = 10;
  currentPage = 0;
  sortField = 'name';
  sortOrder = 'asc';
  searchQuery = '';
  isLoading = false;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private airlineService: AirlineService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadAirlines();
  }

  loadAirlines(): void {
    this.isLoading = true;
    this.airlineService.getAirlines(
      this.currentPage + 1,
      this.pageSize,
      this.sortField,
      this.sortOrder,
      this.searchQuery
    ).subscribe({
      next: (response) => {
        this.dataSource = response.data;
        this.totalItems = response.total;
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error loading airlines:', error);
        this.snackBar.open('Failed to load airlines', 'Close', { duration: 3000 });
        this.isLoading = false;
      }
    });
  }

  onPageChange(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.currentPage = event.pageIndex;
    this.loadAirlines();
  }

  onSortChange(): void {
    this.sortField = this.sort.active;
    this.sortOrder = this.sort.direction || 'asc';
    this.loadAirlines();
  }
  
  applyFilter(): void {
    this.currentPage = 0;
    if (this.paginator) {
      this.paginator.firstPage();
    }
    this.loadAirlines();
  }

  openAddDialog(): void {
    const dialogRef = this.dialog.open(AirlineFormComponent, {
      width: '500px',
      data: { mode: 'add' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadAirlines();
      }
    });
  }

  openEditDialog(airline: any): void {
    const dialogRef = this.dialog.open(AirlineFormComponent, {
      width: '500px',
      data: { mode: 'edit', airline }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadAirlines();
      }
    });
  }

  toggleStatus(airline: any): void {
    this.airlineService.toggleAirlineStatus(airline.id).subscribe({
      next: () => {
        airline.is_active = !airline.is_active;
        this.snackBar.open('Airline status updated successfully', 'Close', { duration: 3000 });
      },
      error: (error: any) => {
        console.error('Error toggling airline status:', error);
        this.snackBar.open('Failed to update airline status', 'Close', { duration: 3000 });
      }
    });
  }

  deleteAirline(id: number): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '350px',
      data: { title: 'Confirm Delete', message: 'Are you sure you want to delete this airline?' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.airlineService.deleteAirline(id).subscribe({
          next: () => {
            this.snackBar.open('Airline deleted successfully', 'Close', { duration: 3000 });
            this.loadAirlines();
          },
          error: (error: any) => {
            console.error('Error deleting airline:', error);
            this.snackBar.open('Failed to delete airline', 'Close', { duration: 3000 });
          }
        });
      }
    });
  }
}