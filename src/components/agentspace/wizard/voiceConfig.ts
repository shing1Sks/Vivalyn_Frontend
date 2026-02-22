export const FLAG_MAP: Record<string, string> = {
  en: '🇺🇸', es: '🇪🇸', fr: '🇫🇷', de: '🇩🇪', pt: '🇧🇷', it: '🇮🇹',
  zh: '🇨🇳', ja: '🇯🇵', ko: '🇰🇷', hi: '🇮🇳', ta: '🇮🇳', kn: '🇮🇳',
  mr: '🇮🇳', id: '🇮🇩', vi: '🇻🇳', ar: '🇸🇦', ru: '🇷🇺', nl: '🇳🇱',
  pl: '🇵🇱', ro: '🇷🇴', cs: '🇨🇿', sk: '🇸🇰', el: '🇬🇷', hu: '🇭🇺',
  sv: '🇸🇪', no: '🇳🇴', da: '🇩🇰', fi: '🇫🇮', tr: '🇹🇷', uk: '🇺🇦',
  ms: '🇲🇾', fil: '🇵🇭', ur: '🇵🇰', he: '🇮🇱',
}

export const VOICE_NAMES: Record<string, Record<string, string>> = {
  en:  { female1: 'Emma',      female2: 'Sophie',    male1: 'James',    male2: 'Ryan'     },
  hi:  { female1: 'Priya',     female2: 'Ananya',    male1: 'Arjun',    male2: 'Rohan'    },
  es:  { female1: 'Isabella',  female2: 'Valentina', male1: 'Diego',    male2: 'Carlos'   },
  fr:  { female1: 'Camille',   female2: 'Juliette',  male1: 'Louis',    male2: 'Pierre'   },
  de:  { female1: 'Lena',      female2: 'Hannah',    male1: 'Felix',    male2: 'Jonas'    },
  pt:  { female1: 'Ana',       female2: 'Beatriz',   male1: 'Lucas',    male2: 'Miguel'   },
  it:  { female1: 'Sofia',     female2: 'Giulia',    male1: 'Marco',    male2: 'Luca'     },
  zh:  { female1: 'Wei',       female2: 'Xia',       male1: 'Ming',     male2: 'Hao'      },
  ja:  { female1: 'Yuki',      female2: 'Hana',      male1: 'Kenji',    male2: 'Hiroshi'  },
  ko:  { female1: 'Ji-Yeon',   female2: 'Soo-Yeon',  male1: 'Min-jun',  male2: 'Jae-won'  },
  ta:  { female1: 'Kavya',     female2: 'Meera',     male1: 'Karthik',  male2: 'Arun'     },
  kn:  { female1: 'Shreya',    female2: 'Nandini',   male1: 'Vikram',   male2: 'Suresh'   },
  mr:  { female1: 'Prachi',    female2: 'Pooja',     male1: 'Amit',     male2: 'Ganesh'   },
  id:  { female1: 'Sari',      female2: 'Dewi',      male1: 'Budi',     male2: 'Andi'     },
  vi:  { female1: 'Linh',      female2: 'Mai',       male1: 'Minh',     male2: 'Nam'      },
  ar:  { female1: 'Fatima',    female2: 'Layla',     male1: 'Omar',     male2: 'Hassan'   },
  ru:  { female1: 'Natasha',   female2: 'Elena',     male1: 'Dmitri',   male2: 'Alexei'   },
  nl:  { female1: 'Fien',      female2: 'Lotte',     male1: 'Lars',     male2: 'Daan'     },
  pl:  { female1: 'Zofia',     female2: 'Maja',      male1: 'Marek',    male2: 'Piotr'    },
  ro:  { female1: 'Ioana',     female2: 'Maria',     male1: 'Andrei',   male2: 'Mihai'    },
  cs:  { female1: 'Tereza',    female2: 'Lucie',     male1: 'Jakub',    male2: 'Tomáš'    },
  sk:  { female1: 'Zuzana',    female2: 'Katarína',  male1: 'Martin',   male2: 'Peter'    },
  el:  { female1: 'Eleni',     female2: 'Maria',     male1: 'Nikos',    male2: 'Giorgos'  },
  hu:  { female1: 'Anna',      female2: 'Eszter',    male1: 'Gábor',    male2: 'Péter'    },
  sv:  { female1: 'Astrid',    female2: 'Maja',      male1: 'Erik',     male2: 'Oskar'    },
  no:  { female1: 'Ingrid',    female2: 'Sigrid',    male1: 'Erik',     male2: 'Olav'     },
  da:  { female1: 'Freya',     female2: 'Astrid',    male1: 'Magnus',   male2: 'Lars'     },
  fi:  { female1: 'Aino',      female2: 'Siiri',     male1: 'Mikael',   male2: 'Juhani'   },
  tr:  { female1: 'Ayşe',      female2: 'Fatma',     male1: 'Mehmet',   male2: 'Ahmet'    },
  uk:  { female1: 'Olha',      female2: 'Natalia',   male1: 'Oleksiy',  male2: 'Andriy'   },
  ms:  { female1: 'Siti',      female2: 'Aisyah',    male1: 'Ahmad',    male2: 'Hafiz'    },
  fil: { female1: 'Maria',     female2: 'Ana',       male1: 'Jose',     male2: 'Juan'     },
  ur:  { female1: 'Aisha',     female2: 'Zara',      male1: 'Ali',      male2: 'Omar'     },
  he:  { female1: 'Miriam',    female2: 'Rachel',    male1: 'David',    male2: 'Yosef'    },
}

export const PREF_LABELS: Record<string, string> = {
  female1: 'Female 1',
  female2: 'Female 2',
  male1: 'Male 1',
  male2: 'Male 2',
}

export function getVoiceName(lang: string | null, pref: string): string {
  if (lang && VOICE_NAMES[lang]?.[pref]) return VOICE_NAMES[lang][pref]
  return PREF_LABELS[pref] ?? pref
}
