import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrivateToursComponent } from './private-tours.component';

describe('PrivateToursComponent', () => {
  let component: PrivateToursComponent;
  let fixture: ComponentFixture<PrivateToursComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrivateToursComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PrivateToursComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
