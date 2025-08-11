# Internationalization (i18n) Setup Guide - Consolidated Structure

This project uses a consolidated internationalization approach with a single `translations.json` file containing all languages.

## Quick Start

1. **Import the translation hook** in your components:
```jsx
import { useTranslation } from '@/hooks/useTranslation';
```

2. **Use translations** in your JSX:
```jsx
function MyComponent() {
  const { t } = useTranslation();
  
  return <h1>{t('welcome.title')}</h1>;
}
```

## Project Structure

- `src/i18n/index.js` - i18n configuration with consolidated transformation
- `src/i18n/translations.json` - **Single consolidated translation file**
- `src/hooks/useTranslation.js` - Custom translation hook
- `src/components/LanguageSwitcher.jsx` - Language selection component

## Consolidated Translation Structure

The `translations.json` file uses this structure:

```json
{
  "button.analyze": {
    "en": "Analyze Repository",
    "es": "Analizar Repositorio",
    "fr": "Analyser le Référentiel"
  },
  "form.placeholder.github_url": {
    "en": "Enter GitHub repository URL",
    "es": "Ingrese la URL del repositorio de GitHub",
    "fr": "Entrez l'URL du référentiel GitHub"
  }
}
```

## Benefits of Consolidated Structure

- **Single source of truth** for all translations
- **Easy gap identification** - immediately see missing translations
- **Better version control** - track all language changes in one file
- **Efficient batch processing** - translate all languages together
- **Reduced file management** - no need to manage multiple locale files

## Available Languages

- Spanish (es)
- French (fr)
- German (de)
- Arabic (ar)

## Adding New Languages

1. Add new language translations directly to `src/i18n/translations.json`:
   ```json
   {
     "your.key": {
       "en": "English text",
       "es": "Spanish text",
       "new_lang": "New language text"
     }
   }
   ```

2. The language will automatically be detected and available in the language switcher

## Translation Best Practices

- Use descriptive, hierarchical keys: `user.profile.name`
- Keep translations in sync across all languages within each key object
- Test your app in different languages regularly
- Use the LanguageSwitcher component for easy testing
- Check for missing translations by looking for incomplete key objects

## Commands

- Extract strings: `npm run i18n:extract`
- Build with i18n: `npm run build:i18n`

## Troubleshooting

### Missing Translations
Check the console for languages with missing translations. The `transformConsolidatedTranslations` function will log available languages and any issues.

### Adding New Strings
When adding new translatable strings to your code:
1. Use a descriptive key: `t('component.action.description')`
2. Add the key to `translations.json` with all language variants
3. Test with the language switcher

### Large Translation Files
The consolidated approach uses GPT-4o with 128k token context window, allowing for very large translation files without chunking.
