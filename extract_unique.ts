import fs from 'fs';

const content = fs.readFileSync('src/data/vocab.ts', 'utf-8');

// Simple regex-based extraction of the objects
// This is a bit fragile but for this specific file format it should work
const entryRegex = /\{\s*id:\s*'[^']+',\s*word:\s*'([^']+)',\s*partOfSpeech:\s*'([^']+)',\s*definition:\s*'([^']+)',\s*example:\s*'([^']+)',\s*synonyms:\s*\[([^\]]*)\]\s*,\s*antonyms:\s*\[([^\]]*)\]\s*,\s*difficulty:\s*'([^']+)'\s*\}/g;

const wordsMap = new Map();
let match;

while ((match = entryRegex.exec(content)) !== null) {
  const [_, word, partOfSpeech, definition, example, synonymsStr, antonymsStr, difficulty] = match;
  const wordLower = word.toLowerCase();
  
  if (!wordsMap.has(wordLower)) {
    wordsMap.set(wordLower, {
      word,
      partOfSpeech,
      definition,
      example,
      synonyms: synonymsStr.split(',').map(s => s.trim().replace(/'/g, '')).filter(Boolean),
      antonyms: antonymsStr.split(',').map(s => s.trim().replace(/'/g, '')).filter(Boolean),
      difficulty
    });
  }
}

const uniqueWords = Array.from(wordsMap.values());
console.log(`Unique words count: ${uniqueWords.length}`);

// Output the unique words as JSON so I can use them in the next step
fs.writeFileSync('unique_words.json', JSON.stringify(uniqueWords, null, 2));
