export {};

declare global {
  interface Error {
    message: string; // already exists, optional if just for typing
    status?: number; // example: add custom properties here
  }
}
