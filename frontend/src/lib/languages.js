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

function phraseSet(language, rows) {
  const { lang, dir } = LANGUAGE_GREETINGS[language];
  return rows.map(([phrase, meaning]) => ({ phrase, meaning, lang, dir }));
}

export const LANGUAGE_PHRASES = {
  English: phraseSet("English", [
    ["Hello", "Hello"],
    ["How are you?", "How are you?"],
    ["Nice to meet you.", "Nice to meet you."],
  ]),
  Spanish: phraseSet("Spanish", [
    ["Hola", "Hello"],
    ["¿Cómo estás?", "How are you?"],
    ["Mucho gusto.", "Nice to meet you."],
  ]),
  French: phraseSet("French", [
    ["Bonjour", "Hello"],
    ["Comment ça va ?", "How are you?"],
    ["Enchanté.", "Nice to meet you."],
  ]),
  German: phraseSet("German", [
    ["Hallo", "Hello"],
    ["Wie geht es dir?", "How are you?"],
    ["Freut mich.", "Nice to meet you."],
  ]),
  Mandarin: phraseSet("Mandarin", [
    ["你好", "Hello"],
    ["你好吗？", "How are you?"],
    ["很高兴认识你。", "Nice to meet you."],
  ]),
  Japanese: phraseSet("Japanese", [
    ["こんにちは", "Hello"],
    ["お元気ですか。", "How are you?"],
    ["はじめまして。", "Nice to meet you."],
  ]),
  Korean: phraseSet("Korean", [
    ["안녕하세요", "Hello"],
    ["잘 지내세요?", "How are you?"],
    ["만나서 반갑습니다.", "Nice to meet you."],
  ]),
  Hindi: phraseSet("Hindi", [
    ["नमस्ते", "Hello"],
    ["आप कैसे हैं?", "How are you?"],
    ["आपसे मिलकर खुशी हुई।", "Nice to meet you."],
  ]),
  Russian: phraseSet("Russian", [
    ["Привет", "Hello"],
    ["Как дела?", "How are you?"],
    ["Приятно познакомиться.", "Nice to meet you."],
  ]),
  Portuguese: phraseSet("Portuguese", [
    ["Olá", "Hello"],
    ["Como está?", "How are you?"],
    ["Muito prazer.", "Nice to meet you."],
  ]),
  Arabic: phraseSet("Arabic", [
    ["مرحبا", "Hello"],
    ["كيف حالك؟", "How are you?"],
    ["تشرفنا", "Nice to meet you."],
  ]),
  Italian: phraseSet("Italian", [
    ["Ciao", "Hello"],
    ["Come stai?", "How are you?"],
    ["Piacere di conoscerti.", "Nice to meet you."],
  ]),
  Turkish: phraseSet("Turkish", [
    ["Merhaba", "Hello"],
    ["Nasılsın?", "How are you?"],
    ["Memnun oldum.", "Nice to meet you."],
  ]),
  Dutch: phraseSet("Dutch", [
    ["Hallo", "Hello"],
    ["Hoe gaat het?", "How are you?"],
    ["Leuk je te ontmoeten.", "Nice to meet you."],
  ]),
};

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
