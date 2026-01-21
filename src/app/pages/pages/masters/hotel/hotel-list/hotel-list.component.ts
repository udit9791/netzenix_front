import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import {
  MatPaginatorModule,
  MatPaginator,
  PageEvent
} from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterModule } from '@angular/router';
import { HotelService } from '../../../../../services/hotel.service';
import { VexPageLayoutComponent } from '@vex/components/vex-page-layout/vex-page-layout.component';
import { VexPageLayoutHeaderDirective } from '@vex/components/vex-page-layout/vex-page-layout-header.directive';
import { VexPageLayoutContentDirective } from '@vex/components/vex-page-layout/vex-page-layout-content.directive';
import { VexBreadcrumbsComponent } from '@vex/components/vex-breadcrumbs/vex-breadcrumbs.component';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'vex-hotel-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    RouterModule,
    VexPageLayoutComponent,
    VexPageLayoutHeaderDirective,
    VexPageLayoutContentDirective,
    VexBreadcrumbsComponent
  ],
  templateUrl: './hotel-list.component.html',
  styleUrls: ['./hotel-list.component.scss']
})
export class HotelListComponent implements OnInit {
  environment = environment;
  displayedColumns: string[] = [
    'name',
    'city',
    'state',
    'country',
    'star_rating',
    'vendor',
    'is_active',
    'actions'
  ];
  dataSource: any[] = [];
  totalItems = 0;
  pageSize = 10;
  currentPage = 0;
  sortField = 'name';
  sortOrder: 'asc' | 'desc' = 'asc';
  searchCtrl = new FormControl('');
  isLoading = false;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private hotelService: HotelService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.searchCtrl.valueChanges.subscribe((q) => {
      this.currentPage = 0;
      const pv = this.paginator;
      if (pv) pv.firstPage();
      this.loadHotels(String(q || ''));
    });
    this.loadHotels('');
  }

  loadHotels(search: string) {
    this.isLoading = true;
    this.hotelService
      .getHotelsList(
        this.currentPage,
        this.pageSize,
        this.sortField,
        this.sortOrder,
        search
      )
      .subscribe({
        next: (res: any) => {
          const rows = Array.isArray(res?.data)
            ? res.data
            : Array.isArray(res)
              ? res
              : [];
          this.dataSource = rows.map((h: any) => ({
            id: Number(h.id ?? h.hotel_id ?? 0),
            name: String(h.name ?? h.hotel_name ?? ''),
            city: String(h.city_name ?? h.city ?? ''),
            state: String(h.state_name ?? h.state ?? ''),
            country: String(h.country_name ?? h.country ?? ''),
            star_rating: Number(h.star_rating ?? 0),
            vendor: String(h.vendor ?? h.vendor_name ?? ''),
            is_active: h.is_active === 1 || h.is_active === true
          }));
          this.totalItems = Number(res?.total ?? rows.length);
          this.isLoading = false;
        },
        error: () => {
          this.snackBar.open('Failed to load hotels', 'Close', {
            duration: 3000
          });
          this.isLoading = false;
        }
      });
  }

  onPageChange(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.currentPage = event.pageIndex;
    this.loadHotels(String(this.searchCtrl.value || ''));
  }

  onSortChange(): void {
    if (this.sort) {
      this.sortField = this.sort.active;
      this.sortOrder = (this.sort.direction || 'asc') as 'asc' | 'desc';
      this.loadHotels(String(this.searchCtrl.value || ''));
    }
  }
}
