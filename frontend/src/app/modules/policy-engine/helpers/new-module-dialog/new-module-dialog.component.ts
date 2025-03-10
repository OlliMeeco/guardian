import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, Validators } from '@angular/forms';

/**
 * Dialog for creating module.
 */
@Component({
    selector: 'new-module-dialog',
    templateUrl: './new-module-dialog.component.html',
    styleUrls: ['./new-module-dialog.component.css']
})
export class NewModuleDialog {
    public type = 'module';
    public started = false;
    public dataForm = this.fb.group({
        name: ['', Validators.required],
        description: ['']
    });

    public title = 'New Module';
    public placeholder = 'Module name';

    constructor(
        public dialogRef: MatDialogRef<NewModuleDialog>,
        private fb: FormBuilder,
        @Inject(MAT_DIALOG_DATA) public data: any) {
        if (data) {
            switch (data.type) {
                case 'module':
                    this.type = 'module';
                    break;
                case 'tool':
                    this.type = 'tool';
                    break;
                default:
                    this.type = 'module';
                    break;
            }
            this.dataForm.setValue({
                name: data.name || '',
                description: data.description || '',
            });
        }
        if (this.type === 'module') {
            this.title = 'New Module';
            this.placeholder = 'Module name';
        } else if (this.type === 'tool') {
            this.title = 'New Tool';
            this.placeholder = 'Tool name';
        }
    }

    ngOnInit() {
        this.started = true;
    }

    onNoClick(): void {
        this.dialogRef.close(null);
    }

    onSubmit() {
        if (this.dataForm.valid) {
            const data = this.dataForm.value;
            this.dialogRef.close(data);
        }
    }
}
