import { Routes } from '@angular/router';

export const mastersRoutes: Routes = [
  {
    path: 'airline',
    loadChildren: () => import('./airline/airline.module').then(m => m.AirlineModule)
  },
  {
    path: 'airport',
    loadComponent: () => import('./airport/airport-list/airport-list.component').then(m => m.AirportListComponent)
  }
  ,
  {
    path: 'amenity',
    loadComponent: () => import('./amenity/amenity-list/amenity-list.component').then(m => m.AmenityListComponent)
  }
  ,
  {
    path: 'hotel-option',
    loadComponent: () => import('./hotel-option/hotel-option-list/hotel-option-list.component').then(m => m.HotelOptionListComponent)
  }
];
