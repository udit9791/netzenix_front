import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PaymentService } from '../../services/payment.service';
import { UserService } from '../../core/services/user.service';
import { NotificationService } from '../../services/notification.service';
import { FormControl } from '@angular/forms';
import { Observable } from 'rxjs';
import { map, startWith, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { CreditLimitModalComponent } from '../../shared/components/credit-limit-modal/credit-limit-modal.component';
import { RejectionModalComponent } from '../../shared/components/rejection-modal/rejection-modal.component';

@Component({
  selector: 'vex-transactions',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatAutocompleteModule,
    MatDialogModule,
    FormsModule,
    ReactiveFormsModule,
    CreditLimitModalComponent,
    RejectionModalComponent
  ],
  templateUrl: './transactions.component.html',
  styleUrl: './transactions.component.scss'
})
export class TransactionsComponent implements OnInit {
  displayedColumns: string[] = ['id', 'user', 'type', 'amount', 'payment_method', 'status', 'balance_after', 'attachment', 'created_at', 'actions'];
  data: any[] = [];
  total = 0;
  per_page = 10;
  current_page = 1;

  loading = false;
  statusFilter: string | number = '';
  statuses: Array<{ id: number; name: string; is_active: number }> = [];
  search: string = '';
  fromDate?: Date;
  toDate?: Date;

  // User filter properties
  userControl = new FormControl();
  filteredUsers: Observable<any[]>;
  selectedUserId: number | null = null;

  constructor(private paymentService: PaymentService, private userService: UserService, private dialog: MatDialog, private notificationService: NotificationService) {
    // Initialize user autocomplete
    this.filteredUsers = this.userControl.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(value => {
        const searchTerm = typeof value === 'string' ? value : '';
        return this.userService.getUsersForAutocomplete(searchTerm);
      })
    );
  }

  ngOnInit(): void {
    this.loadStatuses();
    this.fetchTransactions();
  }

  fetchTransactions(page: number = this.current_page): void {
    this.loading = true;
    const fromDateStr = this.fromDate ? this.formatDate(this.fromDate) : undefined;
    const toDateStr = this.toDate ? this.formatDate(this.toDate) : undefined;
    this.paymentService.listTransactions(
      page, 
      this.per_page, 
      this.statusFilter || undefined, 
      this.selectedUserId || undefined, 
      fromDateStr, 
      toDateStr, 
      this.search
    ).subscribe({
      next: (res: any) => {
        // Expecting Laravel paginator style response
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

  loadStatuses(): void {
    this.paymentService.getPaymentStatuses().subscribe({
      next: (list) => (this.statuses = list || []),
      error: () => (this.statuses = [])
    });
  }

  handlePage(e: PageEvent) {
    this.per_page = e.pageSize;
    const page = e.pageIndex + 1;
    this.fetchTransactions(page);
  }

  applyFilter() {
    this.fetchTransactions(1);
  }

  formatDate(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  getStatusId(row: any): number {
    if (!row) return 0;
    if (typeof row.payment_status === 'number') return row.payment_status;
    if (row.payment_status_id) return row.payment_status_id;
    const ps = row.payment_status;
    if (ps && typeof ps === 'object') {
      if (typeof ps.id === 'number') return ps.id;
    }
    if (typeof row.status_id === 'number') return row.status_id;
    if (typeof row.status === 'number') return row.status;
    return 0;
  }

  /** Show action buttons only when status is Pending */
  isPending(row: any): boolean {
    // Try resolve via id from known statuses mapping
    const id = this.getStatusId(row);
    if (id && Array.isArray(this.statuses) && this.statuses.length) {
      const found = this.statuses.find((s: any) => s.id === id);
      if (found) {
        // Payment statuses payload provides name; do not access non-existent code
        const txt = String((found as { name?: string }).name || '').toLowerCase();
        if (txt) return txt === 'pending';
      }
    }

    // Fallback: infer from row object shapes
    const ps = row?.paymentStatus || row?.payment_status;
    const txt = String(
      (ps && (ps.code || ps.name)) || row?.status || row?.payment_status
    ).toLowerCase();
    if (txt) {
      // Sometimes numeric comes through; ensure string compare only
      return txt === 'pending';
    }

    // Default: not pending
    return false;
  }

  approve(row: any) {
    // Check if this is a credit request transaction
    if (row.method?.toLowerCase() === 'credit request') {
      // Open the credit limit modal
      const dialogRef = this.dialog.open(CreditLimitModalComponent, {
        width: '500px',
        data: { transaction: row }
      });

      dialogRef.afterClosed().subscribe(result => {
        console.log('Modal closed with result:', result);
        if (result && result.success) {
          // Transaction was approved with credit limit
          this.notificationService.success('Transaction approved successfully');
          this.fetchTransactions();
        } else if (result && !result.success) {
          // Error occurred during approval
          this.notificationService.error('Failed to approve transaction');
        }
        // If result is null, user cancelled the modal - no action needed
      });
    } else {
      console.log('❌ Regular approval for non-credit transaction');
      // Regular approval for non-credit transactions
      this.paymentService.approveTransaction(row.id).subscribe({
        next: (response) => {
          this.notificationService.success('Transaction approved successfully');
          this.fetchTransactions();
        },
        error: (error) => {
          this.notificationService.error('Failed to approve transaction');
          console.error('Error approving transaction:', error);
        }
      });
    }
  }

  reject(row: any) {
    if (!row?.id) return;
    
    // Open the rejection modal
    const dialogRef = this.dialog.open(RejectionModalComponent, {
      width: '500px',
      data: { transaction: row }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.reason) {
        // User provided a reason, proceed with rejection
        this.loading = true;
        this.paymentService.rejectTransaction(row.id, result.reason).subscribe({
          next: () => {
            this.notificationService.success('Transaction rejected successfully');
            this.applyFilter();
          },
          error: (error) => {
            this.notificationService.error('Failed to reject transaction');
            console.error('Error rejecting transaction:', error);
            this.loading = false;
          }
        });
      }
      // If result is null or no reason, user cancelled the modal - no action needed
    });
  }

  /**
   * Open attachment in a new tab
   */
  openAttachment(attachmentPath: string, event: Event): void {
    event.stopPropagation(); // Prevent row click events
    
    if (!attachmentPath) {
      console.warn('No attachment path provided');
      return;
    }

    // Construct the full URL to the attachment
    const baseUrl = 'http://localhost:8000/storage/';
    const fullUrl = baseUrl + attachmentPath;
    
    // Open in new tab
    window.open(fullUrl, '_blank');
  }

  // User selection methods
  displayUser(user: any): string {
    return user ? user.name : '';
  }

  onUserSelected(user: any): void {
    this.selectedUserId = user ? user.id : null;
    this.applyFilter();
  }

  clearUserFilter(): void {
    this.userControl.setValue('');
    this.selectedUserId = null;
    this.applyFilter();
  }
}