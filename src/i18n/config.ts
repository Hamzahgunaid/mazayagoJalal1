import {cookies, headers} from 'next/headers';
import {getRequestConfig} from 'next-intl/server';
import {defaultLocale, locales, Locale} from './settings';

type Messages = Record<string, unknown>;

const messageLoaders: Record<Locale, () => Promise<{default: Messages}>> = {
  en: () => import('../../messages/en.json'),
  ar: () => import('../../messages/ar.json'),
};

export function getRequestLocale(): Locale {
  const cookieStore = cookies();
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;
  if (cookieLocale && locales.includes(cookieLocale as Locale)) {
    return cookieLocale as Locale;
  }

  const accept = headers().get('accept-language');
  if (accept) {
    const preferred = accept
      .split(',')
      .map((part) => part.trim().slice(0, 2).toLowerCase())
      .find((code) => locales.includes(code as Locale));
    if (preferred) {
      return preferred as Locale;
    }
  }

  return defaultLocale;
}

export async function getMessages(locale: Locale): Promise<Messages> {
  const loader = messageLoaders[locale] ?? messageLoaders[defaultLocale];
  try {
    const messages = await loader();
    return messages.default;
  } catch (error) {
    console.warn(`Missing messages for locale "${locale}", falling back to default.`, error);
    const fallback = await messageLoaders[defaultLocale]();
    return fallback.default;
  }
}

export default getRequestConfig(async () => {
  const resolvedLocale = getRequestLocale();
  return {
    locale: resolvedLocale,
    messages: await getMessages(resolvedLocale),
  };
});
