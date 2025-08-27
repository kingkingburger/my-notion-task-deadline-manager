// Bun의 import.meta 확장 타입 정의
declare global {
  interface ImportMeta {
    main: boolean;
    path: string;
    dir: string;
    file: string;
    url: string;
  }
}

export {};
