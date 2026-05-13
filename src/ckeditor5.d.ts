declare module 'ckeditor5' {
  export interface EditorConfig {
    [key: string]: any;
  }

  export interface Editor {}

  export class ContextWatchdog {}

  export class EditorWatchdog {}

  export interface WatchdogConfig {
    [key: string]: any;
  }

  export interface GetEventInfo<T = unknown> {}

  export interface ModelDocumentChangeEvent {}

  export interface ViewDocumentBlurEvent {}

  export interface ViewDocumentFocusEvent {}

  export type PluginConstructor<T = any> = new (...args: any[]) => T;
}
