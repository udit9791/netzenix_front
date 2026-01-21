import { TestBed } from '@angular/core/testing';

import { RoleConfigService } from './role-config.service';

describe('RoleConfigService', () => {
  let service: RoleConfigService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RoleConfigService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
