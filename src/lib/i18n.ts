import { SupportedLanguage } from '../types.ts';

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function formatReadingTime(pages: number, avgPagesPerHour = 32): string {
  const totalMinutes = Math.max(8, Math.round((pages / Math.max(15, avgPagesPerHour)) * 60));
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export const UI_LABELS: Record<
  SupportedLanguage,
  {
    home: string;
    discover: string;
    library: string;
    read: string;
    profile: string;
    heroLead: string;
    searchPlaceholder: string;
    continueReading: string;
    recommendedForYou: string;
    yourJourney: string;
    tonightsPick: string;
    tenMinPick: string;
    whyRecommended: string;
  }
> = {
  English: {
    home: 'Home',
    discover: 'Discover',
    library: 'Library',
    read: 'Read',
    profile: 'Profile',
    heroLead: 'Tell me what you want to read, and I will help you find it.',
    searchPlaceholder: 'Describe the book you want (e.g. short romantic story with easy English)...',
    continueReading: 'Continue Reading',
    recommendedForYou: 'Recommended For You',
    yourJourney: 'Your Reading Journey',
    tonightsPick: "Tonight's Pick",
    tenMinPick: "Today's 10-Minute Pick",
    whyRecommended: "Why we're recommending this",
  },
  Hindi: {
    home: 'होम',
    discover: 'खोजें',
    library: 'लाइब्रेरी',
    read: 'पढ़ें',
    profile: 'प्रोफ़ाइल',
    heroLead: 'बताएं आप क्या पढ़ना चाहते हैं, और हम सही किताब चुनने में आपकी मदद करेंगे।',
    searchPlaceholder: 'अपनी पसंद की कहानी लिखें (जैसे: आसान अंग्रेज़ी में छोटी रोमांटिक कहानी)...',
    continueReading: 'पढ़ना जारी रखें',
    recommendedForYou: 'आपके लिए सुझाव',
    yourJourney: 'आपकी पठन यात्रा',
    tonightsPick: 'आज रात की पसंद',
    tenMinPick: 'आज का 10-मिनट का पाठ',
    whyRecommended: 'हम यह किताब क्यों सुझा रहे हैं',
  },
  Telugu: {
    home: 'హోమ్',
    discover: 'అన్వేషించండి',
    library: 'లైబ్రరీ',
    read: 'చదవండి',
    profile: 'ప్రొఫైల్',
    heroLead: 'మీరు ఏమి చదవాలనుకుంటున్నారో చెప్పండి, సరైన పుస్తకాన్ని కనుగొనడంలో మేము సహాయం చేస్తాము.',
    searchPlaceholder: 'మీకు నచ్చిన కథను వివరించండి (ఉదా: సులభమైన ఇంగ్లీష్‌లో చిన్న ప్రేమ కథ)...',
    continueReading: 'చదవడం కొనసాగించండి',
    recommendedForYou: 'మీ కోసం సిఫార్సులు',
    yourJourney: 'మీ పఠన ప్రయాణం',
    tonightsPick: 'ఈ రాత్రికి ఎంపిక',
    tenMinPick: 'ఈ రోజు 10-నిమిషాల ఎంపిక',
    whyRecommended: 'మేము దీన్ని ఎందుకు సిఫార్సు చేస్తున్నాము',
  },
};
