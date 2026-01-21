import { TestBed } from '@angular/core/testing';

import { FlightInventoryService } from './flight-inventory.service';

describe('FlightInventoryService', () => {
  let service: FlightInventoryService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FlightInventoryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
