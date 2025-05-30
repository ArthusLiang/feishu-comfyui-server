export interface ISettings {
    server: string;
    workflow: string;
    promptNode: string;
    outputNode: string;
    field_to_save: string;
    current_fieldId?:any;
    current_recordId?:any;
    [key: string]: any;
};