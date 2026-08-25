/// <reference types="vite/client" />

declare module 'qrcode-generator' {
  type QrCode = {
    addData(data: string): void;
    make(): void;
    createDataURL(cellSize?: number, margin?: number): string;
  };

  function qrcode(typeNumber: number, errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H'): QrCode;
  export default qrcode;
}
