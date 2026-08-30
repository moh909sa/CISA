# CISA Study Flashcards

A free, lightweight GitHub Pages study app for CISA terms and English vocabulary.

## Features

- Flashcards with Flip, Previous, Next, and Shuffle.
- Mark Known progress saved in `localStorage`.
- Search across words, Arabic meanings, examples, categories, and sources.
- Filter by Source.
- Filter by Status.
- Quiz mode with multiple-choice questions.
- List view for all words.
- Export filtered words as CSV.
- No backend, no database, no paid services, and no frameworks.

## Project Structure

```text
.
├── index.html
├── styles.css
├── app.js
├── data/
│   └── words.json
├── README.md
└── .nojekyll
```

## Add More Words

Edit `data/words.json` and add a new object using this format:

```json
{
  "id": "enormous",
  "word": "enormous",
  "arabic": "ضخم جدًا",
  "simple": "very big",
  "example": "It was an enormous building.",
  "source": "The Catcher in the Rye",
  "category": "English",
  "status": "new"
}
```

Keep every `id` unique.

## Enable GitHub Pages

1. Open the repository settings.
2. Go to **Pages**.
3. Under **Source**, choose **Deploy from a branch**.
4. Choose branch **main**.
5. Choose folder **/root**.
6. Click **Save**.

Expected site URL:

```text
https://moh909sa.github.io/CISA/
```
