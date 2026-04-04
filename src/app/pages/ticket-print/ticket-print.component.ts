import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import {
  MatDialogModule,
  MatDialog,
  MAT_DIALOG_DATA,
  MatDialogRef
} from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from '../../../environments/environment';

// Print Dialog Component
@Component({
  selector: 'print-dialog',
  templateUrl: './print-dialog.component.html',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatCheckboxModule,
    FormsModule
  ]
})
export class PrintDialogComponent {
  withAgencyDetails: boolean = true;
  withPrice: boolean = true;

  constructor(
    public dialogRef: MatDialogRef<PrintDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  onPrint(): void {
    this.dialogRef.close({
      withAgencyDetails: this.withAgencyDetails,
      withPrice: this.withPrice
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}

// Main Ticket Print Component
@Component({
  selector: 'vex-ticket-print',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    HttpClientModule,
    MatDialogModule,
    MatCheckboxModule,
    FormsModule
  ],
  templateUrl: './ticket-print.component.html',
  styleUrl: './ticket-print.component.scss'
})
export class TicketPrintComponent implements OnInit {
  orderId: string = '';
  orderDetails: any = null;
  flightDetails: any = null;
  externalBookingDetails: any = null;
  loading: boolean = true;
  error: string = '';
  imgBaseUrl: string = environment.imgUrl;
  userInfo: any = null;
  userDetail: any = null;

  get departureDateTime(): Date | null {
    const d = this.flightDetails?.details?.[0] || null;
    if (!d) return null;
    const dateStr =
      d.dep_date || this.flightDetails?.inventory?.flight_date || null;
    const timeStr = d.dep_time || null;
    if (!dateStr || !timeStr) return null;
    const iso = `${dateStr}T${timeStr}`;
    const dt = new Date(iso);
    return isNaN(dt.getTime()) ? null : dt;
  }

  get arrivalDateTime(): Date | null {
    const d = this.flightDetails?.details?.[0] || null;
    if (!d) return null;
    const dateStr =
      d.arr_date || this.flightDetails?.inventory?.flight_date || null;
    const timeStr = d.arr_time || null;
    if (!dateStr || !timeStr) return null;
    const iso = `${dateStr}T${timeStr}`;
    const dt = new Date(iso);
    return isNaN(dt.getTime()) ? null : dt;
  }

  get checkinWeight(): string {
    const w =
      this.flightDetails?.details?.[0]?.baggage_weight ??
      this.flightDetails?.inventory?.baggage_weight ??
      null;
    if (!w) return '15 KG';
    const s = String(w).toUpperCase();
    return s.includes('KG') ? s : `${s} KG`;
  }

  get cabinWeight(): string {
    const w =
      this.flightDetails?.details?.[0]?.cabin_baggage ??
      this.flightDetails?.inventory?.cabin_baggage ??
      null;
    if (!w) return '7 KG';
    const s = String(w).toUpperCase();
    return s.includes('KG') ? s : `${s} KG`;
  }

  fullImgUrl(path: string | null | undefined): string {
    const fallback = '/storage/hotel/default.jpg';
    const base = this.imgBaseUrl || '';
    if (!path) {
      const b = base.endsWith('/') ? base.slice(0, -1) : base;
      const p = fallback.startsWith('/') ? fallback.slice(1) : fallback;
      return `${b}/${p}`;
    }
    if (/^https?:\/\//i.test(path)) return path;
    const b = base.endsWith('/') ? base.slice(0, -1) : base;
    const p = path.startsWith('/') ? path.slice(1) : path;
    return `${b}/${p}`;
  }

  get airlineLogoUrl(): string {
    const d = this.flightDetails?.details?.[0] || null;
    const logoPath =
      d?.airline_logo || this.flightDetails?.inventory?.airline_logo || null;
    if (logoPath) {
      return this.fullImgUrl(logoPath);
    }
    const code = d?.airline_code || 'G8';
    return `assets/img/airlines/${code}.png`;
  }

  get firstSegment(): any | null {
    const arr = this.flightDetails?.details;
    if (!Array.isArray(arr) || arr.length === 0) return null;
    return arr[0];
  }

  get lastSegment(): any | null {
    const arr = this.flightDetails?.details;
    if (!Array.isArray(arr) || arr.length === 0) return null;
    return arr[arr.length - 1];
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.route.params.subscribe((params) => {
      if (params['id']) {
        this.orderId = params['id'];
        this.fetchOrderDetails(this.orderId);
      } else {
        this.error = 'Order ID not found';
        this.loading = false;
      }
    });
  }

  fetchOrderDetails(orderId: string) {
    this.loading = true;
    this.http.get(`${environment.apiUrl}/orders/${orderId}`).subscribe({
      next: (response: any) => {
        this.orderDetails = response.data;
        if (this.orderDetails?.user_id) {
          this.fetchUserDetail(this.orderDetails.user_id);
        }
        if (this.orderDetails.type === 'flight' && this.orderDetails.type_id) {
          this.fetchFlightDetails(this.orderDetails.type_id);
        } else if (
          this.orderDetails.type === 'external_flight' &&
          this.orderDetails.external_id
        ) {
          this.fetchExternalFlightDetails(this.orderDetails.external_id);
        } else {
          this.loading = false;
        }
      },
      error: (error) => {
        this.error = 'Failed to load order details';
        this.loading = false;
      }
    });
  }

  fetchUserDetail(userId: number) {
    this.http.get(`${environment.apiUrl}/users/${userId}/detail`).subscribe({
      next: (res: any) => {
        this.userInfo = res?.user || null;
        this.userDetail = res?.detail || null;
      },
      error: (error) => {
        console.error('Error fetching user detail:', error);
      }
    });
  }

  fetchExternalFlightDetails(bkid: string) {
    this.http
      .get(`${environment.apiUrl}/orders/external-booking/${bkid}`)
      .subscribe({
        next: (res: any) => {
          const inv = res?.data || res;
          this.externalBookingDetails = inv;
          this.flightDetails = {
            inventory: inv,
            details: Array.isArray(inv?.details) ? inv.details : []
          };
          this.loading = false;
        },
        error: (error) => {
          console.error('Error fetching external flight details:', error);
          this.error = 'Failed to load flight details';
          this.loading = false;
        }
      });
  }

  fetchFlightDetails(typeId: number) {
    this.http.get(`${environment.apiUrl}/flight-details/${typeId}`).subscribe({
      next: (response: any) => {
        if (response && response.data) {
          this.flightDetails = response.data;
        } else {
          this.flightDetails = response;
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error fetching flight details:', error);
        this.error = 'Failed to load flight details';
        this.loading = false;
      }
    });
  }

  openPrintDialog() {
    const dialogRef = this.dialog.open(PrintDialogComponent, {
      width: '400px',
      data: {}
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.printTicket(result);
      }
    });
  }

  printTicket(options: any = {}) {
    const printSection = document
      .getElementById('printSection')
      ?.cloneNode(true) as HTMLElement;

    if (printSection) {
      if (!options.withAgencyDetails) {
        const companyInfo = printSection.querySelector('.company-info');
        if (companyInfo) companyInfo.classList.add('hidden');
      }

      if (!options.withPrice) {
        const paymentDetails = printSection.querySelector('.payment-details');
        if (paymentDetails) paymentDetails.classList.add('hidden');
      }
    }

    const printContents = printSection?.innerHTML || '';
    const headHtml = document.head.innerHTML;
    const printWindow = window.open(
      '',
      '_blank',
      'top=0,left=0,width=1024,height=900'
    );

    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(`<!DOCTYPE html>
<html>
  <head>
    ${headHtml}
    <style>
      @media print {
        body { -webkit-print-color-adjust: exact; }
      }
    </style>
  </head>
  <body class="mat-typography bg-gray-100">
    <div id="printSection" class="bg-white border rounded-lg shadow-none print:shadow-none print:border-0">
      ${printContents}
    </div>
    <script>
      window.onload = function() {
        window.print();
      };
    </script>
  </body>
</html>`);
      printWindow.document.close();
      printWindow.focus();
    } else {
      const originalContents = document.body.innerHTML;
      document.body.innerHTML = `
<!DOCTYPE html>
<html>
  <head>
    ${headHtml}
    <style>
      @media print {
        body { -webkit-print-color-adjust: exact; }
      }
    </style>
  </head>
  <body class="mat-typography bg-gray-100">
    <div id="printSection" class="bg-white border rounded-lg shadow-none print:shadow-none print:border-0">
      ${printContents}
    </div>
  </body>
</html>
      `;
      window.print();
      document.body.innerHTML = originalContents;
    }
  }

  goBack() {
    this.router.navigate(['/payment-confirmation'], {
      queryParams: { order_id: this.orderId }
    });
  }
}
