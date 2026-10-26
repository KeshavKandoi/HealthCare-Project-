import { translateUi } from './uiCopy';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

const keys = ['overview', 'monitor', 'health', 'appointments', 'devices', 'recordings', 'plans', 'family', 'support', 'settings', 'exitDemo', 'language'] as const;
export type LanguageKey = typeof keys[number];
type Language = { code: string; name: string; locale: string; words: string };
const languages: Language[] = [
  { code: 'en', name: 'English', locale: 'en-IN', words: 'Overview|Live monitoring|My Health|Appointments|My Devices|ECG recordings|Care plans|Caregivers|Support|Settings|Exit demo|Language' },
  { code: 'hi', name: 'हिन्दी', locale: 'hi-IN', words: 'अवलोकन|लाइव निगरानी|मेरा स्वास्थ्य|अपॉइंटमेंट|मेरे उपकरण|ईसीजी रिकॉर्डिंग|देखभाल योजनाएँ|देखभालकर्ता|सहायता|सेटिंग्स|डेमो छोड़ें|भाषा' },
  { code: 'kn', name: 'ಕನ್ನಡ', locale: 'kn-IN', words: 'ಅವಲೋಕನ|ನೇರ ಮೇಲ್ವಿಚಾರಣೆ|ನನ್ನ ಆರೋಗ್ಯ|ಭೇಟಿಗಳು|ನನ್ನ ಸಾಧನಗಳು|ಇಸಿಜಿ ದಾಖಲೆಗಳು|ಆರೈಕೆ ಯೋಜನೆಗಳು|ಆರೈಕೆದಾರರು|ಸಹಾಯ|ಸೆಟ್ಟಿಂಗ್‌ಗಳು|ಡೆಮೊದಿಂದ ಹೊರಗೆ|ಭಾಷೆ' },
  { code: 'fr', name: 'Français', locale: 'fr-FR', words: 'Aperçu|Surveillance en direct|Ma santé|Rendez-vous|Mes appareils|Enregistrements ECG|Plans de soins|Aidants|Assistance|Paramètres|Quitter la démo|Langue' },
  { code: 'de', name: 'Deutsch', locale: 'de-DE', words: 'Übersicht|Live-Überwachung|Meine Gesundheit|Termine|Meine Geräte|EKG-Aufzeichnungen|Versorgungspläne|Betreuende|Hilfe|Einstellungen|Demo verlassen|Sprache' },
];

type LanguageContextValue = { code: string; locale: string; languages: Language[]; setCode: (code: string) => void; t: (key: LanguageKey) => string; tr: (phrase: string) => string };
const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [code, setCode] = useState(() => {
    try { return localStorage.getItem('heartline.language') || 'en'; } catch { return 'en'; }
  });
  const selected = languages.find(language => language.code === code) || languages[0];
  useEffect(() => {
    document.documentElement.lang = selected.locale;
    document.documentElement.dir = 'ltr';
    try { localStorage.setItem('heartline.language', selected.code); } catch { /* preference remains in memory */ }
  }, [selected.code, selected.locale]);
  const value = useMemo<LanguageContextValue>(() => ({ code: selected.code, locale: selected.locale, languages, setCode, tr: phrase => translateUi(selected.code, phrase), t: key => selected.words.split('|')[keys.indexOf(key)] || languages[0].words.split('|')[keys.indexOf(key)] }), [selected]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('LanguageProvider is missing');
  return context;
}
