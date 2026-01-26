import {
  Component,
  OnInit,
  AfterViewInit,
  ViewChild,
  inject,
  DestroyRef
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  FormsModule
} from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import {
  MatPaginator,
  PageEvent,
  MatPaginatorModule
} from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { SelectionModel } from '@angular/cdk/collections';
import { fadeInUp400ms } from '@vex/animations/fade-in-up.animation';
import { stagger40ms } from '@vex/animations/stagger.animation';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// Angular
import { NgFor, NgIf, NgClass, CommonModule } from '@angular/common';

// VEX Layout
import { VexSecondaryToolbarComponent } from '@vex/components/vex-secondary-toolbar/vex-secondary-toolbar.component';
import { VexBreadcrumbsComponent } from '@vex/components/vex-breadcrumbs/vex-breadcrumbs.component';
import { VexPageLayoutComponent } from '@vex/components/vex-page-layout/vex-page-layout.component';
import { VexPageLayoutHeaderDirective } from '@vex/components/vex-page-layout/vex-page-layout-header.directive';
import { VexPageLayoutContentDirective } from '@vex/components/vex-page-layout/vex-page-layout-content.directive';

// Angular Material
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { RouterModule } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { FlightDetailsDialogComponent } from './flight-details-dialog/flight-details-dialog.component';
import { FlightUploadDialogComponent } from './flight-upload-dialog/flight-upload-dialog.component';

// ✅ Service
import { FlightInventoryService } from 'src/app/services/flight-inventory.service';
import { NotificationService } from 'src/app/services/notification.service';
import { UserService } from 'src/app/core/services/user.service';

export interface Flight {
  id: number;
  cutoffDate: string;
  flight_date: string;
  returnDate: string;
  sector: string;
  airline: string;
  pnr: string;
  seat_allocated: number;
  seat_booked: number;
  seat_blocked: number;
  seatsBlocked: number;
  markup: number;
  amount: number;
  sell_price: number;
  onwardTime?: string;
  returnTime?: string;
}

@Component({
  selector: 'vex-manage-flight-series',
  templateUrl: './manage-flight-series.component.html',
  styleUrls: ['./manage-flight-series.component.scss'],
  animations: [fadeInUp400ms, stagger40ms],
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
    MatCheckboxModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTableModule,
    MatSortModule,
    RouterModule
  ]
})
export class ManageFlightSeriesComponent implements OnInit, AfterViewInit {
  filterForm!: FormGroup;
  hasUnsavedChanges: boolean = false; // ✅ track changes

  sectors: string[] = [];
  columns = [
    { label: 'Cut-off Date', property: 'cutoffDate' },
    { label: 'Onward Date', property: 'flight_date' },
    { label: 'Return Date', property: 'returnDate' },
    { label: 'Sector', property: 'sector' },
    { label: 'Airline', property: 'airline' },
    { label: 'Seats Allocated', property: 'seat_allocated' },
    { label: 'Seats Booked', property: 'seat_booked' },
    { label: 'Seats Blocked', property: 'seatsBlocked' },
    { label: 'Markup', property: 'markup' },
    { label: 'Price', property: 'amount' },
    { label: 'Sell Price', property: 'sell_price' }
  ];

  flights: Flight[] = [];
  dataSource = new MatTableDataSource<Flight>();
  selection = new SelectionModel<Flight>(true, []);

  pageSize = 10;
  pageIndex = 0;
  totalFlights = 0;
  pageSizeOptions = [5, 10, 20, 50];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  private readonly destroyRef = inject(DestroyRef);
  isMaster: boolean = false;
  tenantOptions: Array<{ id: number; name: string }> = [];
  supplierOptions: Array<{ id: number; label: string }> = [];

  constructor(
    private fb: FormBuilder,
    private dialog: MatDialog,
    private flightService: FlightInventoryService,
    private notificationService: NotificationService,
    private userService: UserService
  ) {}

  /**
   * Download flight inventory data as Excel
   * Uses current filter values to generate the Excel file
   */
  downloadExcel() {
    // Get current filter values
    const filters = {
      sector: this.filterForm.get('sector')?.value || '',
      from_date: this.filterForm.get('fromDate')?.value
        ? this.formatDate(this.filterForm.get('fromDate')?.value)
        : '',
      to_date: this.filterForm.get('toDate')?.value
        ? this.formatDate(this.filterForm.get('toDate')?.value)
        : '',
      date_filter_type:
        this.filterForm.get('dateFilterType')?.value || 'travel',
      airline_code: this.filterForm.get('airlineCode')?.value || '',
      min_seats: this.filterForm.get('minSeats')?.value || '',
      pnr: this.filterForm.get('pnr')?.value || '',
      search: this.filterForm.get('search')?.value || '',
      tenant_id:
        this.isMaster && this.filterForm.get('tenantId')?.value
          ? String(this.filterForm.get('tenantId')?.value)
          : '',
      supplier_id:
        this.isMaster && this.filterForm.get('supplierId')?.value
          ? String(this.filterForm.get('supplierId')?.value)
          : ''
    };

    // Use POST method to get Excel file as base64
    this.flightService.downloadExcelPost(filters).subscribe(
      (response) => {
        if (response && response.success) {
          // Create a Blob from the base64 data
          const byteCharacters = atob(response.file_data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: response.mime_type });

          // Create download link and trigger download
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = response.filename;
          document.body.appendChild(a);
          a.click();

          // Clean up
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        } else {
          console.error('Failed to download Excel file');
        }
      },
      (error) => {
        console.error('Error downloading Excel file:', error);
      }
    );
  }

  openUploadDialog() {
    const dialogRef = this.dialog.open(FlightUploadDialogComponent, {
      width: '500px',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // Refresh the data if upload was successful
        this.loadFlights();
      }
    });
  }

  /**
   * Format date to YYYY-MM-DD for API
   */
  private formatDate(date: Date): string {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  ngOnInit() {
    const today = new Date();
    const next30Days = new Date();
    next30Days.setDate(today.getDate() + 30);

    this.filterForm = this.fb.group({
      sector: [''],
      fromDate: [today], // ✅ default today
      toDate: [next30Days], // ✅ default 30 days later
      dateFilterType: ['travel'], // 'created' or 'travel'
      airlineCode: [''],
      minSeats: [''],
      pnr: [''],
      tenantId: [null],
      supplierId: [null]
    });

    const isMasterRaw = localStorage.getItem('is_master');
    this.isMaster = isMasterRaw === '1' || isMasterRaw === 'true';

    this.flightService.getSectors().subscribe((res: any) => {
      this.sectors = res.sectors || [];
    });

    if (this.isMaster) {
      this.loadTenants();
    }

    this.filterForm.get('tenantId')?.valueChanges.subscribe((val) => {
      const tid =
        val !== null && val !== undefined && val !== '' ? Number(val) : null;
      this.filterForm.patchValue({ supplierId: null }, { emitEvent: false });
      if (this.isMaster && tid) {
        this.loadSuppliers(tid);
      }
      this.pageIndex = 0;
      this.loadFlights();
    });

    this.filterForm.get('supplierId')?.valueChanges.subscribe((val) => {
      let sid: number | null = null;
      if (val && typeof val === 'object') {
        const objId = Number((val as any).id);
        sid = isNaN(objId) ? null : objId;
      } else if (
        val !== null &&
        val !== undefined &&
        val !== '' &&
        !isNaN(Number(val))
      ) {
        sid = Number(val);
      }
      this.filterForm.patchValue({ supplierId: sid }, { emitEvent: false });
      this.pageIndex = 0;
      this.loadFlights();
    });

    this.loadFlights();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

    this.paginator.page
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event: PageEvent) => {
        this.pageIndex = event.pageIndex;
        this.loadFlights();
      });
  }

  get visibleColumns() {
    return this.columns.map((c) => c.property);
  }

  markAsChanged(row: any, field: string, value: any) {
    // Validate that seatsBlocked doesn't exceed seat_allocated
    if (field === 'seatsBlocked') {
      // Check if seatsBlocked exceeds seat_allocated
      if (value > row.seat_allocated) {
        // Reset to previous value or set to max allowed
        value = row.seat_allocated;
        // Show notification to user
        this.notificationService.error(
          'Seats Blocked cannot exceed Seats Allocated'
        );
      }

      // Check if seatsBlocked exceeds available seats (seat_allocated - seat_booked)
      const availableSeats = row.seat_allocated - row.seat_booked;
      if (value > availableSeats) {
        // Reset to previous value or set to max allowed
        value = availableSeats;
        // Show notification to user
        this.notificationService.error(
          `Seats Blocked cannot exceed available seats (Seats Allocated - Seats Booked = ${availableSeats})`
        );
      }

      // Update the row with the validated value
      row.seat_blocked = value;

      // Call the API to update seat_blocked
      // Log current time for debugging
      console.log('Updating seat_blocked at:', new Date().toLocaleString());
      this.flightService
        .updateSeatBlocked({ id: row.id, seat_blocked: value })
        .subscribe(
          (response) => {
            console.log(
              'Seat_blocked updated successfully at:',
              new Date().toLocaleString()
            );
            this.notificationService.success(
              'Seats Blocked updated successfully'
            );
          },
          (error) => {
            this.notificationService.error(
              'Failed to update Seats Blocked: ' +
                (error.error?.message || error.message || 'Unknown error')
            );
            // Revert to the previous value if API call fails
            this.loadFlights();
          }
        );
    }

    // Validate that seat_allocated is not less than seat_booked
    if (field === 'seat_allocated') {
      // First check if seat_allocated is less than seat_booked
      if (value < row.seat_booked) {
        // Reset to previous value or set to minimum required
        value = row.seat_booked;
        // Show notification to user
        this.notificationService.error(
          `Seats Allocated cannot be less than Seats Booked (${row.seat_booked})`
        );
      }

      // Then check if seat_allocated is less than seat_booked + seat_blocked
      const minimumRequired = row.seat_booked + row.seat_blocked;
      if (value < minimumRequired) {
        // Reset to previous value or set to minimum required
        value = minimumRequired;
        // Show notification to user
        this.notificationService.error(
          `Seats Allocated cannot be less than Seats Booked + Seats Blocked (${minimumRequired})`
        );
      }

      // Update the row with the validated value
      row.seat_allocated = value;

      // Call the API to update seat_allocated
      this.flightService
        .updateSeatAllocated({ id: row.id, seat_allocated: value })
        .subscribe(
          (response) => {
            this.notificationService.success(
              'Seats Allocated updated successfully'
            );
          },
          (error) => {
            this.notificationService.error(
              'Failed to update Seats Allocated: ' +
                (error.error?.message || error.message || 'Unknown error')
            );
            // Revert to the previous value if API call fails
            this.loadFlights();
          }
        );
    }

    // Handle other fields if needed
    if (field === 'markup') {
      row.markup = value;
      // Add API call for markup if needed
    }

    row[field] = value;
    this.hasUnsavedChanges = true;
  }

  saveChanges() {
    const payload = this.dataSource.data.map((row) => ({
      id: row.id,
      pnr: row.pnr,
      seat_allocated: row.seat_allocated,
      seatsBlocked: row.seatsBlocked,
      markup: row.markup
    }));

    // this.flightService.updateFlights(payload).subscribe({
    //   next: (res) => {
    //     console.log('✅ Flights updated', res);
    //     this.hasUnsavedChanges = false; // ✅ hide button again
    //   },
    //   error: (err) => {
    //     console.error('❌ Failed to save changes', err);
    //   }
    // });
  }

  loadFlights() {
    const formatDate = (date: Date | string) => {
      if (!date) return null;
      const d = new Date(date);
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const day = d.getDate().toString().padStart(2, '0');
      return `${d.getFullYear()}-${month}-${day}`;
    };

    const rawSupplier = this.filterForm.value.supplierId;
    let supplierId: number | '' = '';
    if (rawSupplier && typeof rawSupplier === 'object') {
      const objId = Number((rawSupplier as any).id);
      supplierId = isNaN(objId) ? '' : objId;
    } else if (
      rawSupplier !== null &&
      rawSupplier !== undefined &&
      rawSupplier !== '' &&
      !isNaN(Number(rawSupplier))
    ) {
      supplierId = Number(rawSupplier);
    } else {
      supplierId = '';
    }

    const filters = {
      sector: this.filterForm.value.sector || '',
      from_date: formatDate(this.filterForm.value.fromDate),
      to_date: formatDate(this.filterForm.value.toDate),
      date_filter_type: this.filterForm.value.dateFilterType || 'travel',
      min_seats: this.filterForm.value.minSeats || '',
      airline_code: this.filterForm.value.airlineCode || '', // ✅ backend expects airline_code
      pnr: this.filterForm.value.pnr || '',
      tenant_id:
        this.isMaster && this.filterForm.value.tenantId
          ? String(this.filterForm.value.tenantId)
          : '',
      supplier_id: this.isMaster ? String(supplierId) : '',
      per_page: this.pageSize,
      page: this.pageIndex + 1
    };

    this.flightService.getInventories(filters).subscribe((res: any) => {
      this.flights = res.data;

      // Set seatsBlocked from seat_blocked for each flight
      this.flights.forEach((flight) => {
        flight.seatsBlocked = flight.seat_blocked;
      });

      this.dataSource.data = this.flights;
      this.totalFlights = res.total;
    });
  }

  openFlightDetails(row: any) {
    // Log all details of the row to console
    console.log('Flight Details Row:', row);
    console.log('Full row details:', JSON.stringify(row, null, 2));

    const onwardFlights =
      row.details?.filter((d: any) => d.type === 'Onward') || [];
    const returnFlights =
      row.details?.filter((d: any) => d.type === 'Return') || [];

    // Log filtered flight details
    console.log('Onward Flights:', onwardFlights);
    console.log('Return Flights:', returnFlights);

    // Get first onward and return flight for main display
    const onward = onwardFlights.length > 0 ? onwardFlights[0] : null;
    const ret = returnFlights.length > 0 ? returnFlights[0] : null;

    // Create connecting flights array for onward journey
    const connectingFlights = [];
    if (onwardFlights.length > 1) {
      // Start from the second flight (index 1) as the first one is displayed in the main section
      for (let i = 1; i < onwardFlights.length; i++) {
        const flight = onwardFlights[i];

        if (flight) {
          connectingFlights.push({
            from: flight.from,
            to: flight.to,
            depTime: flight.dep_time,
            arrTime: flight.arr_time,
            flightNumber: flight.flight_number || flight.airline_code || 'N/A'
          });
        }
      }
    }

    // Create connecting flights array for return journey
    const returnConnectingFlights = [];
    if (returnFlights.length > 1) {
      // Start from the second flight (index 1) as the first one is displayed in the main section
      for (let i = 1; i < returnFlights.length; i++) {
        const flight = returnFlights[i];

        if (flight) {
          returnConnectingFlights.push({
            from: flight.from,
            to: flight.to,
            depTime: flight.dep_time,
            arrTime: flight.arr_time,
            flightNumber: flight.flight_number || flight.airline_code || 'N/A'
          });
        }
      }
    }

    this.dialog.open(FlightDetailsDialogComponent, {
      width: '500px',
      data: {
        id: row.id,
        flight_date: row.flight_date,
        airline: row.airline || 'N/A',
        flightNumbers:
          onward?.flight_number || onward?.airline_code || row.airline || 'N/A',
        price:
          typeof row.sell_price === 'number' && row.sell_price
            ? row.sell_price
            : row.amount || 0,

        // Onward details
        depTime: onward?.dep_time,
        fromCode: onward?.from,
        fromCity: 'Onward City',
        arrTime: onward?.arr_time,
        toCode: onward?.to,
        toCity: 'Destination City',
        connectingFlights: connectingFlights,

        // Return details
        returnDepTime: ret?.dep_time,
        returnFromCode: ret?.from,
        returnToCode: ret?.to,
        returnArrTime: ret?.arr_time,
        returnConnectingFlights: returnConnectingFlights,

        duration: 'N/A',
        stops:
          onwardFlights.length > 1
            ? `${onwardFlights.length - 1} Stop(s)`
            : 'Non-Stop'
      }
    });
  }

  toggleStatus(row: any) {
    const action = row.is_active === 1 ? 'disable' : 'enable';
    if (!confirm(`Are you sure you want to ${action} this flight?`)) {
      return; // User canceled the action
    }

    this.flightService.toggleStatus(row.id).subscribe({
      next: (res) => {
        row.is_active = res.is_active;
        console.log(
          `✅ Flight ${row.id} is now: ${res.is_active ? 'Active' : 'Inactive'}`
        );
      },
      error: (err) => {
        console.error('❌ Failed to update status', err);
      }
    });
  }

  showInventory() {
    this.pageIndex = 0;
    this.loadFlights();
  }

  isAllSelected() {
    return this.selection.selected.length === this.dataSource.data.length;
  }

  masterToggle() {
    this.isAllSelected()
      ? this.selection.clear()
      : this.dataSource.data.forEach((row) => this.selection.select(row));
  }

  getOnwardDetail(details: any[]) {
    return details?.find((d) => d.type === 'Onward') || null;
  }

  getReturnDetail(details: any[]) {
    return details?.find((d) => d.type === 'Return') || null;
  }

  getAllFlightNumbers(details: any[]) {
    return details?.map((d) => d.flight_number).join(', ');
  }

  loadTenants() {
    this.userService.getTenants(true).subscribe({
      next: (res: any) => {
        const data = Array.isArray(res?.data) ? res.data : [];
        this.tenantOptions = data.map((t: any) => ({
          id: Number(t.id),
          name: String(t.name || `Tenant #${t.id}`)
        }));
      },
      error: () => {
        this.tenantOptions = [];
      }
    });
  }

  loadSuppliers(tenantId?: number) {
    this.userService
      .getUsersForAutocomplete('', 'Supplier', tenantId)
      .subscribe({
        next: (res: any) => {
          const rows = Array.isArray(res?.data)
            ? res.data
            : Array.isArray(res)
              ? res
              : [];
          this.supplierOptions = rows.map((u: any) => ({
            id: Number(u.id),
            label:
              [u.name, u.email].filter((x) => !!x).join(' ') || `User #${u.id}`
          }));
        },
        error: () => {
          this.supplierOptions = [];
        }
      });
  }
}
