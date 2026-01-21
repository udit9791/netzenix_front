import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import {
  FormsModule,
  ReactiveFormsModule,
  FormGroup,
  FormControl
} from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatPaginatorModule } from '@angular/material/paginator';
import {
  WalletService,
  Transaction,
  TransactionPagination,
  PaymentStatus
} from '../../services/wallet.service';

// Transaction detail interface
interface TransactionDetail {
  referenceNumber: string;
  paymentType: string;
  invoiceNumber: string;
  convenienceFee: string;
  convenienceFeeGST: string;
  tds: string;
  grossCommission?: string;
  import?: string;
  travelDate?: string;
}

// Transaction summary interface
interface TransactionSummary {
  totalSales: number;
  totalCommission: number;
  totalMarkup: number;
  totalTDS: number;
  totalRefund: number;
  totalReconciliation: number;
  creditOutstanding: number;
}

// Transaction counts interface
interface TransactionCounts {
  topup: number;
  air: number;
  hotel: number;
  commission: number;
  couponDiscount: number;
}

@Component({
  selector: 'vex-wallet',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    FormsModule,
    ReactiveFormsModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatPaginatorModule
  ],
  templateUrl: './wallet.component.html',
  styleUrl: './wallet.component.scss'
})
export class WalletComponent implements OnInit {
  paymentModes = [
    { value: 'all', viewValue: 'All' },
    { value: 'pay_online', viewValue: 'Pay online' },
    { value: 'wire_transfer', viewValue: 'Wire transfer' },
    { value: 'cheque', viewValue: 'Cheque' },
    { value: 'cash', viewValue: 'Cash' }
  ];

  paymentStatuses: Array<{ value: string; viewValue: string }> = [
    { value: 'all', viewValue: 'All' }
  ];

  selectedPaymentMode = 'all';
  selectedPaymentStatus = 'all';
  dateRange = new FormGroup({
    start: new FormControl<Date | null>(null),
    end: new FormControl<Date | null>(null)
  });
  walletAmount = 0.0;
  creditBalance = 0.0;
  showMore = false;
  referenceNumber = '';

  // Pagination properties
  pageSize = 5;
  pageSizeOptions = [5, 10, 25, 50];
  currentPage = 0;
  totalTransactions = 0;
  totalPages = 0;
  goToPage = 1;
  pagination: TransactionPagination | null = null;

  // Transaction counts
  transactions: TransactionCounts = {
    topup: 2,
    air: 8,
    hotel: 2,
    commission: 5,
    couponDiscount: 3
  };

  // Transaction summary
  summary: TransactionSummary = {
    totalSales: 179504.0,
    totalCommission: 3180.29,
    totalMarkup: 0.0,
    totalTDS: 64.9,
    totalRefund: 0.0,
    totalReconciliation: 0.0,
    creditOutstanding: 0.0
  };

  // Sample transaction data
  transactionList: Transaction[] = [];

  constructor(private walletService: WalletService) {}

  ngOnInit() {
    this.loadWalletBalance();
    this.loadPaymentStatuses();
    this.loadTransactionHistory();
  }

  loadWalletBalance() {
    this.walletService.getWalletBalance().subscribe({
      next: (response) => {
        this.walletAmount = response.data.balance;
        this.creditBalance = response.data.credit_balance;
      },
      error: (error) => {
        console.error('Error loading wallet balance:', error);
      }
    });
  }

  loadPaymentStatuses() {
    this.walletService.getPaymentStatuses().subscribe({
      next: (statuses) => {
        // Keep the 'All' option and add the fetched statuses
        this.paymentStatuses = [
          { value: 'all', viewValue: 'All' },
          ...statuses
            .filter((status) => status.is_active === 1)
            .map((status) => ({
              value: status.id.toString(),
              viewValue: status.name
            }))
        ];
      },
      error: (error) => {
        console.error('Error loading payment statuses:', error);
      }
    });
  }

  loadTransactionHistory() {
    const page = this.currentPage + 1; // API uses 1-based pagination

    // Get filter values
    const paymentMode = this.selectedPaymentMode;
    const paymentStatus = this.selectedPaymentStatus;
    const startDate = this.dateRange.get('start')?.value
      ? this.formatDate(this.dateRange.get('start')?.value!)
      : undefined;
    const endDate = this.dateRange.get('end')?.value
      ? this.formatDate(this.dateRange.get('end')?.value!)
      : undefined;
    const referenceNumber = this.referenceNumber;

    this.walletService
      .getTransactionHistory(
        page,
        this.pageSize,
        paymentMode,
        paymentStatus,
        startDate,
        endDate,
        referenceNumber
      )
      .subscribe({
        next: (response) => {
          this.transactionList = response.data.map((transaction) => ({
            ...transaction,
            date: new Date(transaction.created_at).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            }),
            type: transaction.transaction_type,
            pnr: transaction.description || 'N/A',
            referenceId: transaction.id.toString(),
            payment_status: transaction.payment_status,
            expanded: false
          }));
          this.pagination = response.pagination;
          this.totalTransactions = response.pagination.total;
          this.totalPages = response.pagination.last_page;
        },
        error: (error) => {
          console.error('Error loading transaction history:', error);
        }
      });
  }

  // Format date for API
  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Apply filters
  applyFilters() {
    this.currentPage = 0; // Reset to first page when applying filters
    this.loadTransactionHistory();
  }

  // Reset filters
  resetFilters() {
    this.selectedPaymentMode = 'all';
    this.selectedPaymentStatus = 'all';
    this.dateRange.reset();
    this.referenceNumber = '';
    this.currentPage = 0;
    this.loadTransactionHistory();
  }

  toggleShowMore() {
    this.showMore = !this.showMore;
  }

  // Toggle transaction details
  toggleTransactionDetails(transaction: Transaction) {
    transaction.expanded = !transaction.expanded;
  }

  // Handle page change
  onPageChange(event: any) {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadTransactionHistory(); // Reload data with new pagination
  }

  // Pagination navigation methods
  goToPreviousPage() {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadTransactionHistory();
    }
  }

  goToNextPage() {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.loadTransactionHistory();
    }
  }

  goToPageNumber(pageIndex: number) {
    if (pageIndex >= 0 && pageIndex < this.totalPages) {
      this.currentPage = pageIndex;
      this.loadTransactionHistory();
    }
  }

  goToSpecificPage() {
    if (this.goToPage >= 1 && this.goToPage <= this.totalPages) {
      this.currentPage = this.goToPage - 1; // Convert to 0-based index
      this.loadTransactionHistory();
    }
  }

  // Get visible page numbers for pagination
  getVisiblePages(): (number | string)[] {
    const pages: (number | string)[] = [];
    const totalPages = this.totalPages;
    const currentPage = this.currentPage + 1; // Convert to 1-based for display

    if (totalPages <= 7) {
      // Show all pages if total is 7 or less
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 4) {
        pages.push('...');
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        if (i !== 1 && i !== totalPages) {
          pages.push(i);
        }
      }

      if (currentPage < totalPages - 3) {
        pages.push('...');
      }

      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }

    return pages;
  }

  // Export data functions
  exportToXLS() {
    // Implement export to XLS functionality
    console.log('Exporting to XLS...');
  }

  exportToCSV() {
    // Implement export to CSV functionality
    console.log('Exporting to CSV...');
  }
}
