"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranslationService = void 0;
class TranslationService {
    static async translate(text, targetLang, sourceLang = 'en') {
        try {
            if (!text || targetLang === sourceLang)
                return text;
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
            const response = await fetch(url);
            if (!response.ok)
                throw new Error('Translation API failed');
            const data = await response.json();
            return data[0].map((x) => x[0]).join('');
        }
        catch (error) {
            console.error(`Translation error [${targetLang}]:`, error.message);
            return text;
        }
    }
    static async autoTranslateBundle(sourceBundle, targetLang) {
        const translatedBundle = {};
        const keys = Object.keys(sourceBundle);
        for (const key of keys) {
            translatedBundle[key] = await this.translate(sourceBundle[key], targetLang);
        }
        return translatedBundle;
    }
}
exports.TranslationService = TranslationService;
//# sourceMappingURL=translationService.js.map