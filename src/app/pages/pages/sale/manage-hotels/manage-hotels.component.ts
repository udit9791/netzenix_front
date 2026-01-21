import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule, NgFor, NgIf, NgClass } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  FormsModule
} from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import {
  MatPaginator,
  MatPaginatorModule,
  PageEvent
} from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { RouterModule } from '@angular/router';
import { HotelService } from '../../../../services/hotel.service';
import { VexSecondaryToolbarComponent } from '@vex/components/vex-secondary-toolbar/vex-secondary-toolbar.component';
import { VexBreadcrumbsComponent } from '@vex/components/vex-breadcrumbs/vex-breadcrumbs.component';
import { VexPageLayoutComponent } from '@vex/components/vex-page-layout/vex-page-layout.component';
import { VexPageLayoutHeaderDirective } from '@vex/components/vex-page-layout/vex-page-layout-header.directive';
import { VexPageLayoutContentDirective } from '@vex/components/vex-page-layout/vex-page-layout-content.directive';

interface Hotel {
  id: number;
  name: string;
  rating: number;
  city: string;
  rooms: number;
  status: string;
  is_active: boolean;
  check_in_time?: string;
  check_out_time?: string;
}

@Component({
  selector: 'vex-manage-hotels',
  templateUrl: './manage-hotels.component.html',
  styleUrls: ['./manage-hotels.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    NgFor,
    NgIf,
    NgClass,
    VexSecondaryToolbarComponent,
    VexBreadcrumbsComponent,
    VexPageLayoutComponent,
    VexPageLayoutHeaderDirective,
    VexPageLayoutContentDirective,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    RouterModule
  ]
})
export class ManageHotelsComponent implements OnInit {
  filterForm!: FormGroup;
  columns = [
    { label: 'Hotel', property: 'name' },
    { label: 'Star Rating', property: 'rating' },
    { label: 'City', property: 'city' },
    { label: 'Rooms', property: 'rooms' },
    { label: 'Check In', property: 'check_in_time' },
    { label: 'Check Out', property: 'check_out_time' },
    { label: 'Status', property: 'status' },
    { label: 'Actions', property: 'actions' }
  ];

  hotels: Hotel[] = [];
  dataSource = new MatTableDataSource<Hotel>();
  pageSize = 25;
  pageIndex = 0;
  totalHotels = 0;
  pageSizeOptions = [10, 25, 50, 100];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private fb: FormBuilder,
    private hotelService: HotelService
  ) {}

  ngOnInit() {
    this.filterForm = this.fb.group({
      search: [''],
      city: [''],
      rating: [''],
      status: ['']
    });
    this.loadHotels();
  }

  get visibleColumns() {
    return this.columns.map((c) => c.property);
  }

  loadHotels() {
    const f = this.filterForm.value;
    const search = f.search || '';
    const rating = f.rating ? Number(f.rating) : undefined;
    const status = f.status || undefined;

    this.hotelService
      .getHotelsList(
        this.pageIndex,
        this.pageSize,
        'name',
        'asc',
        search,
        rating,
        status
      )
      .subscribe({
        next: (response: any) => {
          const rows: Hotel[] = (response?.data || []).map((h: any) => ({
            id: h.id,
            name: h.name,
            rating: h.star_rating,
            city: h.city || '',
            rooms: h.rooms || 0,
            status: h.status,
            is_active: !!h.is_active,
            check_in_time: h.policy_check_in || '',
            check_out_time: h.policy_check_out || ''
          }));
          this.hotels = rows;
          this.dataSource.data = rows;
          this.totalHotels = response?.total || rows.length;
          this.pageIndex = (response?.current_page ?? 1) - 1;
          this.pageSize = response?.per_page ?? this.pageSize;
          setTimeout(() => {
            if (this.sort) this.dataSource.sort = this.sort;
          });
        },
        error: (err: any) => {
          console.error('Failed to load hotels', err);
        }
      });
  }

  onPage(event: PageEvent) {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadHotels();
  }

  toggleStatus(row: Hotel) {
    if (!row || !row.id) return;
    this.hotelService.toggleHotelStatus(row.id).subscribe({
      next: (res) => {
        const active = !!(res?.data?.is_active ?? res?.is_active);
        row.is_active = active;
      },
      error: () => {}
    });
  }
}
