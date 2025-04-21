export class SseJsonProcessor {
    constructor() {
        this.cache = '';
        this.arrayStarted = false;
    }

    *processChunk(buffer) {
        // Add new buffer to cache
        this.cache += buffer.toString();
        
        // Check if we're at the start of an array
        if (!this.arrayStarted && this.cache.trim().startsWith('[')) {
            this.arrayStarted = true;
        }
        
        // Process objects in the array
        while (true) {
            // Find the next complete JSON object
            const result = this.findNextCompleteObject();
            if (!result) break;
            
            const { objectStr, endIndex } = result;
            
            try {
                // Parse and yield the object
                const parsedObject = JSON.parse(objectStr);
                yield parsedObject;
                
                // Remove the processed object and any preceding characters from cache
                this.cache = this.cache.substring(endIndex);
            } catch (e) {
                console.error('[SSE Parser] Failed to parse JSON:', e);
                // Skip past this problematic object
                if (endIndex > 0) {
                    this.cache = this.cache.substring(endIndex);
                } else {
                    // If we can't find a valid end, move forward by one character to avoid infinite loops
                    this.cache = this.cache.substring(1);
                }
            }
        }
    }
    
    findNextCompleteObject() {
        // Find the start of an object
        const startIndex = this.cache.indexOf('{');
        if (startIndex === -1) return null;
        
        // Track brace nesting level and string context
        let braceLevel = 0;
        let inString = false;
        let escapeNext = false;
        
        for (let i = startIndex; i < this.cache.length; i++) {
            const char = this.cache[i];
            
            // Handle escape sequences in strings
            if (escapeNext) {
                escapeNext = false;
                continue;
            }
            
            if (char === '\\') {
                escapeNext = true;
                continue;
            }
            
            // Toggle string context
            if (char === '"' && !escapeNext) {
                inString = !inString;
                continue;
            }
            
            // Only count braces outside of strings
            if (!inString) {
                if (char === '{') {
                    braceLevel++;
                } else if (char === '}') {
                    braceLevel--;
                    
                    // If we've found a complete top-level object
                    if (braceLevel === 0) {
                        const objectStr = this.cache.substring(startIndex, i + 1);
                        return { objectStr, endIndex: i + 1 };
                    }
                }
            }
        }
        
        // No complete object found
        return null;
    }
    
    flush() {
        if (this.cache.trim() && this.cache.trim() !== ']') {
            console.warn('[SSE Parser] Stream ended with unprocessed data:', this.cache);
        }
        this.cache = '';
        this.arrayStarted = false;
    }
}