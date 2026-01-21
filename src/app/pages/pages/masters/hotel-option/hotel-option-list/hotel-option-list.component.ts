import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HotelOptionService } from 'src/app/services/hotel-option.service';
import { HotelOptionCreateUpdateComponent } from '../hotel-option-create-update/hotel-option-create-update.component';

type OptionType = 'meal_option' | 'bed_type' | 'room_type' | 'room_view';

@Component({
  selector: 'app-hotel-option-list',
  templateUrl: './hotel-option-list.component.html',
  styleUrls: [],
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
export class HotelOptionListComponent implements OnInit {
  displayedColumns: string[] = ['type', 'name', 'actions'];
  dataSource = new MatTableDataSource<any>([]);
  searchQuery = '';
  typeFilter: OptionType | null = null;
  pageSize = 10;
  currentPage = 0;
  totalItems = 0;
  sortField = 'name';
  sortOrder: 'asc' | 'desc' = 'asc';

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private dialog: MatDialog,
    private optionService: HotelOptionService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadOptions();
  }

  loadOptions(): void {
    this.optionService
      .getOptionsList(
        this.currentPage,
        this.pageSize,
        this.sortField,
        this.sortOrder,
        this.searchQuery,
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
          this.snackBar.open('Failed to load hotel options', 'Close', {
            duration: 3000
          });
        }
      });
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.searchQuery = filterValue.trim().toLowerCase();
    this.currentPage = 0;
    this.loadOptions();
  }

  onTypeChange(value: OptionType | null): void {
    this.typeFilter = value;
    this.currentPage = 0;
    this.loadOptions();
  }

  onSortChange(): void {
    if (this.sort) {
      this.sortField = this.sort.active;
      this.sortOrder = (this.sort.direction as 'asc' | 'desc') || 'asc';
      this.loadOptions();
    }
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadOptions();
  }

  openAddDialog(): void {
    const dialogRef = this.dialog.open(HotelOptionCreateUpdateComponent, {
      width: '500px',
      data: null
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) this.loadOptions();
    });
  }

  openEditDialog(row: any): void {
    const dialogRef = this.dialog.open(HotelOptionCreateUpdateComponent, {
      width: '500px',
      data: row
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) this.loadOptions();
    });
  }

  formatType(t: string): string {
    switch (t) {
      case 'meal_option':
        return 'Meal Option';
      case 'bed_type':
        return 'Bed Type';
      case 'room_type':
        return 'Room Type';
      case 'room_view':
        return 'Room View';
      default:
        return t;
    }
  }
}

