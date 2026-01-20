// Polyfill for Node environments (required by some pdf-parse dependencies)
if (typeof global !== 'undefined') {
    if (!(global as any).DOMMatrix) {
        (global as any).DOMMatrix = class DOMMatrix {
            constructor() { }
        };
    }
    // PDF.js sometimes checks for these in Node
    if (!(global as any).HTMLCanvasElement) {
        (global as any).HTMLCanvasElement = class HTMLCanvasElement { };
    }
    if (!(global as any).ImageData) {
        (global as any).ImageData = class ImageData { };
    }
}
