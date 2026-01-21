import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
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
  loading: boolean = true;
  error: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
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
        if (this.orderDetails.type === 'flight' && this.orderDetails.type_id) {
          this.fetchFlightDetails(this.orderDetails.type_id);
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

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.printTicket(result);
      }
    });
  }

  printTicket(options: any = {}) {
    // Clone the print section
    const printSection = document.getElementById('printSection')?.cloneNode(true) as HTMLElement;
    
    // Apply options
    if (printSection) {
      // Hide agency details if not selected
      if (!options.withAgencyDetails) {
        const companyInfo = printSection.querySelector('.company-info');
        if (companyInfo) companyInfo.classList.add('hidden');
      }
      
      // Hide price information if not selected
      if (!options.withPrice) {
        const paymentDetails = printSection.querySelector('.payment-details');
        if (paymentDetails) paymentDetails.classList.add('hidden');
      }
    }
    
    const printContents = printSection?.innerHTML || '';
    const originalContents = document.body.innerHTML;
    
    document.body.innerHTML = `
      <html>
        <head>
          <title>Print E-Ticket</title>
          <style>
            body { font-family: Arial, sans-serif; }
            .print-container { max-width: 800px; margin: 0 auto; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
            .barcode { text-align: center; }
            .barcode img { height: 80px; }
            .hidden { display: none; }
            @media print {
              body { -webkit-print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="print-container">
            ${printContents}
          </div>
        </body>
      </html>
    `;
    
    window.print();
    document.body.innerHTML = originalContents;
  }

  goBack() {
    this.router.navigate(['/payment-confirmation'], { queryParams: { order_id: this.orderId } });
  }
}