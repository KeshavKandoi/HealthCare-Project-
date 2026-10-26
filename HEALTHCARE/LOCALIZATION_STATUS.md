# Heartline localization status

The language selector contains five locally bundled locales (English, Hindi, Kannada, French, and German). The selected locale is saved in local storage and applied to document language, text direction where relevant, and date formatting.

- The patient navigation's 12 shared labels have text for all five locally bundled locales (English, Hindi, Kannada, French, and German).
- The public home, dashboard, authentication pages, footer, and Holter plan page use the shared `tr()` interface text lookup. Hindi, Kannada, French, and German have bundled copy for these pages.
- Text without a reviewed entry falls back to English. In particular, clinical workflows, doctor information, alerts, messages, reports, and much of Settings are not fully localized. This fallback is intentional: it avoids silently machine-translating medical instructions and consent text.

Translations live in `HealthCare/src/i18n/LanguageContext.tsx` and `HealthCare/src/i18n/uiCopy.ts`. Add reviewed strings there before describing a locale as fully supported. Do not send patient records to a translation service without an approved privacy arrangement and explicit product design for it.
