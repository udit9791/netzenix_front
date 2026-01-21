import { Component, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSort, Sort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { environment } from 'src/environments/environment';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AirportService } from '../../../../../services/airport.service';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { VexPageLayoutComponent } from '@vex/components/vex-page-layout/vex-page-layout.component';
import { VexPageLayoutHeaderDirective } from '@vex/components/vex-page-layout/vex-page-layout-header.directive';
import { VexPageLayoutContentDirective } from '@vex/components/vex-page-layout/vex-page-layout-content.directive';
import { VexBreadcrumbsComponent } from '@vex/components/vex-breadcrumbs/vex-breadcrumbs.component';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { AirportCreateUpdateComponent } from '../airport-create-update/airport-create-update.component';

@Component({
  selector: 'vex-airport-list',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatSlideToggleModule,
    MatInputModule,
    MatSnackBarModule,
    FormsModule,
    ReactiveFormsModule,
    VexPageLayoutComponent,
    VexPageLayoutHeaderDirective,
    VexPageLayoutContentDirective,
    VexBreadcrumbsComponent,
    MatProgressSpinnerModule
  ],
  templateUrl: './airport-list.component.html',
  styleUrl: './airport-list.component.scss'
})
export class AirportListComponent implements OnInit {
  environment = environment;
  dataSource = new MatTableDataSource<any>([]);
  displayedColumns: string[] = ['code', 'city', 'country', 'is_active', 'actions'];
  searchCtrl = new FormControl('');
  
  totalItems = 0;
  pageSize = 10;
  currentPage = 0;
  sortField = 'code';
  sortOrder = 'asc';
  searchQuery = '';
  isLoading = false;
  
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private http: HttpClient,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private airportService: AirportService
  ) {}

  ngOnInit() {
    this.setupSearch();
    this.loadAirports();
  }

  setupSearch() {
    this.searchCtrl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(query => {
        this.searchQuery = query || '';
        this.currentPage = 0;
        this.loadAirports();
      });
  }

  loadAirports() {
    this.isLoading = true;
    this.airportService.getAirportsList(
      this.currentPage + 1,
      this.pageSize,
      this.sortField,
      this.sortOrder,
      this.searchQuery
    ).subscribe({
      next: (response) => {
        this.dataSource.data = response.data;
        this.totalItems = response.total;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading airports', error);
        this.snackBar.open('Failed to load airports', 'Close', { duration: 3000 });
        this.isLoading = false;
      }
    });
  }
  
  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.searchQuery = filterValue.trim().toLowerCase();
    this.currentPage = 0;
    this.loadAirports();
  }
  
  onSortChange() {
    if (this.sort) {
      this.sortField = this.sort.active;
      this.sortOrder = this.sort.direction || 'asc';
      this.loadAirports();
    }
  }
  
  onPageChange(event: PageEvent) {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadAirports();
  }
  
  toggleStatus(airport: any) {
    this.airportService.toggleAirportStatus(airport.id).subscribe({
      next: () => {
        airport.is_active = airport.is_active === 1 || airport.is_active === true ? 0 : 1;
        this.snackBar.open('Airport status updated successfully', 'Close', { duration: 3000 });
      },
      error: (error) => {
        console.error('Error updating airport status', error);
        this.snackBar.open('Failed to update airport status', 'Close', { duration: 3000 });
      }
    });
  }
  
  // Delete functionality commented out as requested
  deleteAirport(airport: any) {
    // Temporarily disabled
    this.snackBar.open('Delete functionality is currently disabled', 'Close', { duration: 3000 });
    
    /* Original implementation
    if (confirm(`Are you sure you want to delete ${airport.code} - ${airport.city}?`)) {
      this.airportService.deleteAirport(airport.id).subscribe({
        next: () => {
          this.snackBar.open('Airport deleted successfully', 'Close', { duration: 3000 });
          this.loadAirports();
        },
        error: (error) => {
          console.error('Error deleting airport', error);
          this.snackBar.open('Failed to delete airport', 'Close', { duration: 3000 });
        }
      });
    }
    */
  }
  
  openAirportForm(airport?: any) {
    // For edit mode, ensure country is properly set
    if (airport) {
      // Get the airport details from the API to ensure we have the correct data
      this.airportService.getAirport(airport.id).subscribe((response: any) => {
        console.log('API response for airport:', response);
        
        const airportData = {
          ...response,
          country: response.country // Ensure country is set correctly
        };
        
        console.log('Opening dialog with airport:', airportData);
        
        // Open dialog with the updated data
        const dialogRef = this.dialog.open(AirportCreateUpdateComponent, {
          width: '600px',
          data: airportData
        });
        
        dialogRef.afterClosed().subscribe(result => {
          if (result) {
            this.loadAirports();
          }
        });
      });
    } else {
      // For create mode, open dialog directly
      const dialogRef = this.dialog.open(AirportCreateUpdateComponent, {
        width: '600px',
        data: null
      });
      
      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          this.loadAirports();
        }
      });
    }
  }
}
