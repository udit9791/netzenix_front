import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent
} from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class TenantInterceptor implements HttpInterceptor {
  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    const tenantDomain =
      window?.location?.host || window?.location?.hostname || 'localhost';
    const cloned = req.clone({
      setHeaders: {
        'X-Tenant-Domain': tenantDomain
      }
    });
    return next.handle(cloned);
  }
}
