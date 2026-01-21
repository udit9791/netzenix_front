import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdhocGroupComponent } from './adhoc-group.component';

describe('AdhocGroupComponent', () => {
  let component: AdhocGroupComponent;
  let fixture: ComponentFixture<AdhocGroupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdhocGroupComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AdhocGroupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
