import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RoleCreateDialogComponent } from './role-create-dialog.component';

describe('RoleCreateDialogComponent', () => {
  let component: RoleCreateDialogComponent;
  let fixture: ComponentFixture<RoleCreateDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoleCreateDialogComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(RoleCreateDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
