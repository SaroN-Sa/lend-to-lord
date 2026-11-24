import { Noto_Sans_Ethiopic, Plus_Jakarta_Sans } from 'next/font/google';

/**
 * Latin font for brand typography, English text, and digits across all locales.
 */
export const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-jakarta',
  display: 'swap',
});

/**
 * Ethiopic font for Amharic copy.
 * Preload is disabled so /en pages never preload or download Ethiopic webfont files.
 * Weights are limited to 400, 500, 600, 700 to keep payload minimal.
 */
export const notoEthiopic = Noto_Sans_Ethiopic({
  subsets: ['ethiopic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ethiopic',
  display: 'swap',
  preload: false,
});
