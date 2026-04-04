import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { PlanService } from '../../../../../services/plan.service';
import { VexPageLayoutComponent } from '@vex/components/vex-page-layout/vex-page-layout.component';
import { VexPageLayoutHeaderDirective } from '@vex/components/vex-page-layout/vex-page-layout-header.directive';
import { VexPageLayoutContentDirective } from '@vex/components/vex-page-layout/vex-page-layout-content.directive';
import { VexBreadcrumbsComponent } from '@vex/components/vex-breadcrumbs/vex-breadcrumbs.component';

@Component({
  selector: 'app-price-enquiry-detail',
  standalone: true,
  templateUrl: './price-enquiry-detail.component.html',
  styleUrls: ['./price-enquiry-detail.component.scss'],
  imports: [
    CommonModule,
    RouterModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatTooltipModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    VexPageLayoutComponent,
    VexPageLayoutHeaderDirective,
    VexPageLayoutContentDirective,
    VexBreadcrumbsComponent
  ]
})
export class PriceEnquiryDetailComponent implements OnInit {
  isLoading = false;
  enquiry: any | null = null;
  plan: any | null = null;
  features: any[] = [];
  quotationPrice: number | null = null;
  isSendingQuotation = false;
  noteText: string = '';
  attachmentFile: File | null = null;
  enquiryStatusOptions: string[] = [
    'new',
    'contacted',
    'quoted',
    'follow_up',
    'negotiation',
    'converted',
    'lost',
    'closed'
  ];
  enquiryStatus: string = 'new';
  statusRemark: string = '';
  enquiryHistory: any[] = [];
  mailContentHtml: string = '';
  statusHistory: any[] = [];
  isUpdatingStatus = false;
  @ViewChild('mailContentDialog') mailContentDialog!: TemplateRef<any>;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private planService: PlanService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = idParam ? Number(idParam) : NaN;
    if (!id || Number.isNaN(id)) {
      this.snackBar.open('Invalid price enquiry id', 'Close', {
        duration: 3000
      });
      this.router.navigate(['/masters/price-enquiries']);
      return;
    }
    this.loadDetail(id);
  }

  loadDetail(id: number): void {
    this.isLoading = true;
    this.planService.getPricingEnquiry(id).subscribe({
      next: (res: any) => {
        this.enquiry = res?.pricing_enquiry || null;
        this.plan = res?.pricing_plan || null;
        this.features = Array.isArray(res?.pricing_plan_features)
          ? res.pricing_plan_features
          : [];
        this.enquiryHistory = Array.isArray(res?.enquiry_history)
          ? res.enquiry_history
          : [];
        const statusHistoryRaw =
          this.enquiry && this.enquiry.status_history
            ? this.enquiry.status_history
            : null;
        if (statusHistoryRaw) {
          try {
            const parsed = JSON.parse(statusHistoryRaw);
            this.statusHistory = Array.isArray(parsed) ? parsed : [];
          } catch {
            this.statusHistory = [];
          }
        } else {
          this.statusHistory = [];
        }
        let initialStatus = 'new';
        if (this.enquiry && this.enquiry.enquiry_status) {
          initialStatus = String(this.enquiry.enquiry_status);
        }
        if (this.statusHistory.length) {
          const lastEntry = this.statusHistory[this.statusHistory.length - 1];
          this.enquiryStatus =
            lastEntry && lastEntry.status
              ? String(lastEntry.status)
              : initialStatus;
        } else {
          this.enquiryStatus = initialStatus;
        }
        if (
          this.plan &&
          this.plan.price !== undefined &&
          this.plan.price !== null
        ) {
          const raw = this.plan.price;
          const num =
            typeof raw === 'number' ? raw : parseFloat(String(raw || '0'));
          this.quotationPrice = Number.isFinite(num) ? num : null;
        } else {
          this.quotationPrice = null;
        }
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.snackBar.open('Failed to load price enquiry detail', 'Close', {
          duration: 3000
        });
        this.router.navigate(['/masters/price-enquiries']);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/masters/price-enquiries']);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length ? input.files[0] : null;
    this.attachmentFile = file;
  }

  sendQuotation(): void {
    if (
      !this.enquiry ||
      this.enquiry.id === undefined ||
      this.enquiry.id === null
    ) {
      return;
    }
    const priceVal =
      this.quotationPrice !== null && this.quotationPrice !== undefined
        ? Number(this.quotationPrice)
        : NaN;
    if (!Number.isFinite(priceVal) || priceVal <= 0) {
      this.snackBar.open('Enter a valid quotation price', 'Close', {
        duration: 3000
      });
      return;
    }
    this.isSendingQuotation = true;
    this.planService
      .sendPricingEnquiryQuotation(this.enquiry.id, {
        price: priceVal,
        note: this.noteText,
        file: this.attachmentFile
      })
      .subscribe({
        next: () => {
          this.isSendingQuotation = false;
          this.snackBar.open('Quotation sent successfully', 'Close', {
            duration: 3000
          });
        },
        error: () => {
          this.isSendingQuotation = false;
          this.snackBar.open('Failed to send quotation', 'Close', {
            duration: 3000
          });
        }
      });
  }

  openMailContent(row: any): void {
    const html = row && row.mail_content ? String(row.mail_content) : '';
    this.mailContentHtml = html;
    this.dialog.open(this.mailContentDialog, {
      width: '720px'
    });
  }

  updateStatus(): void {
    if (
      !this.enquiry ||
      this.enquiry.id === undefined ||
      this.enquiry.id === null
    ) {
      return;
    }
    this.isUpdatingStatus = true;
    const payload: { status: string; remark?: string } = {
      status: this.enquiryStatus
    };
    const trimmedRemark = (this.statusRemark || '').trim();
    if (trimmedRemark) {
      payload.remark = trimmedRemark;
    }
    this.planService
      .updatePricingEnquiryStatus(this.enquiry.id, payload)
      .subscribe({
        next: (res: any) => {
          this.isUpdatingStatus = false;
          this.snackBar.open('Status updated successfully', 'Close', {
            duration: 3000
          });
          if (Array.isArray(res?.enquiry_history)) {
            this.enquiryHistory = res.enquiry_history;
          }
          const updatedEnquiry = res?.pricing_enquiry;
          if (updatedEnquiry && updatedEnquiry.status_history) {
            try {
              const parsed = JSON.parse(updatedEnquiry.status_history);
              this.statusHistory = Array.isArray(parsed) ? parsed : [];
              if (this.statusHistory.length) {
                const lastEntry =
                  this.statusHistory[this.statusHistory.length - 1];
                if (lastEntry && lastEntry.status) {
                  this.enquiryStatus = String(lastEntry.status);
                }
              }
            } catch {
              this.statusHistory = [];
            }
          }
        },
        error: () => {
          this.isUpdatingStatus = false;
          this.snackBar.open('Failed to update status', 'Close', {
            duration: 3000
          });
        }
      });
  }
}
