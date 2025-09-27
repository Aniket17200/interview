// Fallback parser for when PDF.js fails
export class FallbackParser {
  static async parseAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const text = event.target?.result as string;
          if (text && text.length > 0) {
            resolve(text);
          } else {
            reject(new Error('No text content found'));
          }
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      // Try to read as text first
      reader.readAsText(file);
    });
  }

  static extractBasicInfo(text: string): { name?: string; email?: string; phone?: string } {
    const result: { name?: string; email?: string; phone?: string } = {};
    
    // Extract email
    const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
    if (emailMatch) {
      result.email = emailMatch[0];
    }
    
    // Extract phone
    const phoneMatch = text.match(/(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/);
    if (phoneMatch) {
      result.phone = phoneMatch[0];
    }
    
    // Try to extract name from first few lines
    const lines = text.split('\n').slice(0, 5);
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 2 && trimmed.length < 50 && !trimmed.includes('@') && !trimmed.match(/^\d/)) {
        const words = trimmed.split(/\s+/);
        if (words.length >= 2 && words.length <= 4) {
          result.name = trimmed;
          break;
        }
      }
    }
    
    return result;
  }
}