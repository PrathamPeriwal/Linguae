export const LANGUAGES = [
  "English",
  "Spanish",
  "French",
  "German",
  "Mandarin",
  "Japanese",
  "Korean",
  "Hindi",
  "Russian",
  "Portuguese",
  "Arabic",
  "Italian",
  "Turkish",
  "Dutch",
];

export const LANGUAGE_GREETINGS = {
  English: { word: "Hello", meaning: "Hello", lang: "en", dir: "ltr" },
  Spanish: { word: "Hola", meaning: "Hello", lang: "es", dir: "ltr" },
  French: { word: "Bonjour", meaning: "Hello", lang: "fr", dir: "ltr" },
  German: { word: "Hallo", meaning: "Hello", lang: "de", dir: "ltr" },
  Mandarin: { word: "你好", meaning: "Hello", lang: "zh-Hans", dir: "ltr" },
  Japanese: { word: "こんにちは", meaning: "Hello", lang: "ja", dir: "ltr" },
  Korean: { word: "안녕하세요", meaning: "Hello", lang: "ko", dir: "ltr" },
  Hindi: { word: "नमस्ते", meaning: "Hello", lang: "hi", dir: "ltr" },
  Russian: { word: "Привет", meaning: "Hello", lang: "ru", dir: "ltr" },
  Portuguese: { word: "Olá", meaning: "Hello", lang: "pt", dir: "ltr" },
  Arabic: { word: "مرحبا", meaning: "Hello", lang: "ar", dir: "rtl" },
  Italian: { word: "Ciao", meaning: "Hello", lang: "it", dir: "ltr" },
  Turkish: { word: "Merhaba", meaning: "Hello", lang: "tr", dir: "ltr" },
  Dutch: { word: "Hallo", meaning: "Hello", lang: "nl", dir: "ltr" },
};

export function getGreeting(languageName) {
  return LANGUAGE_GREETINGS[languageName] ?? LANGUAGE_GREETINGS.English;
}

export const LANGUAGE_TO_FLAG = {
  english: "gb",
  spanish: "es",
  french: "fr",
  german: "de",
  mandarin: "cn",
  japanese: "jp",
  korean: "kr",
  hindi: "in",
  russian: "ru",
  portuguese: "pt",
  arabic: "sa",
  italian: "it",
  turkish: "tr",
  dutch: "nl",
};
