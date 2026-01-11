// Polyfill DOMMatrix for Node environments (required by some pdf-parse dependencies)
if (typeof global !== 'undefined' && !(global as any).DOMMatrix) {
    (global as any).DOMMatrix = class DOMMatrix {
        constructor() { }
    };
}
