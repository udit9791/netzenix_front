import { Injectable } from '@angular/core';
import {
  CanActivate,
  ActivatedRouteSnapshot,
  Router,
  UrlTree
} from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class PermissionGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean | UrlTree {
    const requiredPermission = route.data['permission'] as string | string[] | undefined;

    // Load permissions from localStorage
    const permissions: string[] = JSON.parse(
      localStorage.getItem('permissions') || '[]'
    );

    if (!requiredPermission) return true;

    if (Array.isArray(requiredPermission)) {
      const hasAny = requiredPermission.some((perm) =>
        permissions.includes(perm)
      );
      if (hasAny) return true;
    } else {
      if (permissions.includes(requiredPermission)) {
        return true;
      }
    }

    // 🚫 If no permission → redirect to dashboard or error page
    return this.router.parseUrl('/');
  }
}
