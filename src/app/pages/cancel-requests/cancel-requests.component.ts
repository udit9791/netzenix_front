import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';
import { CancelRequestDialogComponent } from './cancel-request-dialog.component';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'vex-cancel-requests',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    FormsModule,
    MatDialogModule
    ,RouterLink
  ],
  templateUrl: './cancel-requests.component.html',
  styleUrl: './cancel-requests.component.scss'
})
export class CancelRequestsComponent implements OnInit {
  displayedColumns: string[] = ['id', 'order_id', 'status', 'type_id', 'final_amount', 'created_at', 'actions'];
  data: any[] = [];
  total = 0;
  per_page = 10;
  current_page = 1;
  loading = false;
  orderId: number | null = null;
  fromDate?: Date;
  toDate?: Date;

  constructor(private http: HttpClient, private router: Router, private dialog: MatDialog) {}

  ngOnInit(): void {
    this.fetchCancelRequests();
  }

  fetchCancelRequests(page: number = this.current_page): void {
    this.loading = true;
    let params = new HttpParams()
      .set('page', String(page))
      .set('per_page', String(this.per_page));

    if (this.orderId) {
      params = params.set('order_id', String(this.orderId));
    }
    if (this.fromDate) {
      params = params.set('from_date', this.formatDate(this.fromDate));
    }
    if (this.toDate) {
      params = params.set('to_date', this.formatDate(this.toDate));
    }

    this.http.get(`${environment.apiUrl}/cancellation-requests`, { params }).subscribe({
      next: (res: any) => {
        this.data = res.data || [];
        this.total = res.total || this.data.length;
        this.per_page = res.per_page || this.per_page;
        this.current_page = res.current_page || page;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  handlePage(e: PageEvent) {
    this.per_page = e.pageSize;
    const page = e.pageIndex + 1;
    this.fetchCancelRequests(page);
  }

  applyFilter() {
    this.fetchCancelRequests(1);
  }

  formatDate(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  goToOrder(orderId: number) {
    this.router.navigate(['/payment-confirmation', orderId]);
  }

  proceed(row: any) {
    this.dialog.open(CancelRequestDialogComponent, {
      width: '800px',
      maxHeight: '80vh',
      data: { orderId: row.order_id, request: row }
    }).afterClosed().subscribe((res) => {
      if (res && res.success) {
        this.fetchCancelRequests(this.current_page);
      }
    });
  }
}