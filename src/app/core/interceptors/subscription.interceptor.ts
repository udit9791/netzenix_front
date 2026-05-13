import { Injectable } from '@angular/core';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

@Injectable()
export class SubscriptionInterceptor implements HttpInterceptor {
  private maintenanceShown = false;

  constructor(
    private router: Router,
    private toastr: ToastrService
  ) {}

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error && error.status === 402) {
          this.router.navigate(['/subscription-pending']);
        }

        if (error && error.status === 503 && !this.maintenanceShown) {
          this.maintenanceShown = true;
          this.router.navigate(['/maintenance']);
        }

        return throwError(() => error);
      })
    );
  }
}
