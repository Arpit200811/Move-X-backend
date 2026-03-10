export class TranslationService {
    static async translate(text: string, targetLang: string, sourceLang: string = 'en'): Promise<string> {
        try {
            if (!text || targetLang === sourceLang) return text;

            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
            
            const response = await fetch(url);
            if (!response.ok) throw new Error('Translation API failed');
            
            const data: any = await response.json();
            return data[0].map((x: any) => x[0]).join('');
        } catch (error: any) {
            console.error(`Translation error [${targetLang}]:`, error.message);
            return text;
        }
    }

    static async autoTranslateBundle(sourceBundle: Record<string, string>, targetLang: string): Promise<Record<string, string>> {
        const translatedBundle: Record<string, string> = {};
        const keys = Object.keys(sourceBundle);
        
        for (const key of keys) {
            translatedBundle[key] = await this.translate(sourceBundle[key], targetLang);
        }
        
        return translatedBundle;
    }
}
