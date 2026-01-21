import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatTableDataSource } from '@angular/material/table';
import {
  MatPaginator,
  MatPaginatorModule,
  PageEvent
} from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { AmenityService } from 'src/app/services/amenity.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AmenityCreateUpdateComponent } from '../amenity-create-update/amenity-create-update.component';

@Component({
  selector: 'app-amenity-list',
  templateUrl: './amenity-list.component.html',
  styleUrls: ['./amenity-list.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatSelectModule,
    MatSnackBarModule
  ]
})
export class AmenityListComponent implements OnInit {
  displayedColumns: string[] = ['type', 'name', 'actions'];
  dataSource = new MatTableDataSource<any>([]);
  searchQuery = '';
  typeFilter: 'hotel' | 'room' | null = null;
  pageSize = 10;
  currentPage = 0;
  totalItems = 0;
  sortField = 'name';
  sortOrder: 'asc' | 'desc' = 'asc';

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private dialog: MatDialog,
    private amenityService: AmenityService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadAmenities();
  }

  loadAmenities(): void {
    this.amenityService
      .getAmenitiesList(
        this.currentPage,
        this.pageSize,
        this.sortField,
        this.sortOrder,
        this.searchQuery,
        undefined,
        this.typeFilter || undefined
      )
      .subscribe({
        next: (res: any) => {
          const data = res?.data || res?.items || [];
          this.dataSource.data = data;
          this.totalItems = res?.total || data.length;
          if (this.paginator) this.dataSource.paginator = this.paginator;
          if (this.sort) this.dataSource.sort = this.sort;
        },
        error: (err) => {
          console.error(err);
          this.snackBar.open('Failed to load amenities', 'Close', {
            duration: 3000
          });
        }
      });
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.searchQuery = filterValue.trim().toLowerCase();
    this.currentPage = 0;
    this.loadAmenities();
  }

  onTypeChange(value: 'hotel' | 'room' | null): void {
    this.typeFilter = value;
    this.currentPage = 0;
    this.loadAmenities();
  }

  onSortChange(): void {
    if (this.sort) {
      this.sortField = this.sort.active;
      this.sortOrder = this.sort.direction || 'asc';
      this.loadAmenities();
    }
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadAmenities();
  }

  openAddDialog(): void {
    const dialogRef = this.dialog.open(AmenityCreateUpdateComponent, {
      width: '500px',
      data: null
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) this.loadAmenities();
    });
  }

  openEditDialog(row: any): void {
    const dialogRef = this.dialog.open(AmenityCreateUpdateComponent, {
      width: '500px',
      data: row
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) this.loadAmenities();
    });
  }
}
