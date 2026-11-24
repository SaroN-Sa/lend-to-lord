export type AppLocale = 'am' | 'en';

export interface BankAccount {
  id: string;
  name: string;
  accountNumber: string;
  accountHolder: string;
  badgeColor: string;
}

export const CAMPAIGN_GOAL_BIRR = 5_000_000;

export const BANK_ACCOUNTS: BankAccount[] = [
  {
    id: 'CBE',
    name: 'Commercial Bank of Ethiopia (CBE)',
    accountNumber: '1000458923145',
    accountHolder: 'Lend To Lord Charity Fund',
    badgeColor: 'bg-purple-100 text-purple-800',
  },
  {
    id: 'Telebirr',
    name: 'Telebirr SuperApp',
    accountNumber: '0911223344',
    accountHolder: 'Lend To Lord Charity',
    badgeColor: 'bg-sky-100 text-sky-800',
  },
  {
    id: 'Awash',
    name: 'Awash Bank',
    accountNumber: '0132045678900',
    accountHolder: 'Lend To Lord Charity Fund',
    badgeColor: 'bg-blue-100 text-blue-800',
  },
  {
    id: 'Dashen',
    name: 'Dashen Bank',
    accountNumber: '5012345678901',
    accountHolder: 'Lend To Lord Charity Fund',
    badgeColor: 'bg-indigo-100 text-indigo-800',
  },
];

export const QUICK_AMOUNTS = [500, 1000, 2500, 5000, 10000];

export const STATUS_STYLES = {
  approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  rejected: 'bg-rose-100 text-rose-800 border-rose-200',
} as const;

export const UI_COPY: Record<
  AppLocale,
  {
    brand: string;
    tagline: string;
    nav: { home: string; contribute: string; partner: string; admin: string };
    hero: {
      badge: string;
      title: string;
      subtitle: string;
      ctaPrimary: string;
      ctaSecondary: string;
    };
    progress: { raised: string; goal: string; donors: string; verified: string };
    stepsTitle: string;
    steps: { title: string; desc: string }[];
    form: {
      title: string;
      subtitle: string;
      donorName: string;
      anonymous: string;
      phone: string;
      bank: string;
      amount: string;
      reference: string;
      receipt: string;
      receiptHint: string;
      note: string;
      submit: string;
      submitting: string;
      successTitle: string;
      another: string;
    };
  }
> = {
  en: {
    brand: 'Lend To Lord',
    tagline: 'Transparent community giving across Ethiopia',
    nav: { home: 'Home', contribute: 'Contribute', partner: 'Partner', admin: 'Admin' },
    hero: {
      badge: 'Verified Community Relief Campaign',
      title: 'Every Contribution Reaches a Family With Full Transparency',
      subtitle:
        'Support food aid, student scholarships, and medical care. Transfer via local Ethiopian banks, upload your receipt, and track verified campaign impact in real time.',
      ctaPrimary: 'Contribute Now',
      ctaSecondary: 'Become a Monthly Partner',
    },
    progress: {
      raised: 'Verified Raised',
      goal: 'Campaign Goal',
      donors: 'Verified Donors',
      verified: '100% Receipt-Verified',
    },
    stepsTitle: 'How Your Donation Works',
    steps: [
      { title: '1. Choose a Bank', desc: 'Copy an official CBE, Telebirr, Awash, or Dashen account number.' },
      { title: '2. Submit Receipt', desc: 'Enter your transfer reference and attach your receipt screenshot.' },
      { title: '3. Admin Verification', desc: 'Our team verifies the transaction and updates the live progress bar.' },
    ],
    form: {
      title: 'Record Your Contribution',
      subtitle: 'Complete your bank transfer first, then submit the reference below for verification.',
      donorName: 'Full Name',
      anonymous: 'List my donation as Anonymous on public feeds',
      phone: 'Phone Number (optional)',
      bank: 'Bank / Payment Channel',
      amount: 'Amount (ETB)',
      reference: 'Transaction Reference Number',
      receipt: 'Receipt Screenshot (PNG/JPG/WebP, max 5MB)',
      receiptHint: 'Click to upload or drag & drop your transfer screenshot',
      note: 'Dedication or Note (optional)',
      submit: 'Submit Contribution',
      submitting: 'Submitting...',
      successTitle: 'Contribution Submitted for Verification',
      another: 'Submit Another Contribution',
    },
  },
  am: {
    brand: 'ለእግዚአብሔር አበድር',
    tagline: 'ግልጽ እና ታማኝ የማህበረሰብ ድጋፍ',
    nav: { home: 'መነሻ', contribute: 'ድጋፍ ያድርጉ', partner: 'አጋር ይሁኑ', admin: 'አስተዳዳሪ' },
    hero: {
      badge: 'በደረሰኝ የተረጋገጠ የበጎ አድራጎት ዘመቻ',
      title: 'እያንዳንዱ ድጋፍ በሙሉ ግልጽነት ለተቸገሩ ቤተሰቦች ይደርሳል',
      subtitle:
        'የምግብ ድጋፍ፣ የተማሪዎች ዕርዳታ እና የሕክምና ወጪዎችን ይደግፉ። በኢትዮጵያ ባንኮች ገቢ ካደረጉ በኋላ ደረሰኝዎን በመላክ ድጋፍዎን ይከታተሉ።',
      ctaPrimary: 'አሁን ድጋፍ ያድርጉ',
      ctaSecondary: 'ወርሃዊ አጋር ይሁኑ',
    },
    progress: {
      raised: 'የተረጋገጠ የተሰበሰበ',
      goal: 'የዘመቻው ግብ',
      donors: 'ለጋሾች',
      verified: '100% በደረሰኝ የተረጋገጠ',
    },
    stepsTitle: 'ድጋፍዎ እንዴት ይደርሳል?',
    steps: [
      { title: '1. ባንክ ይምረጡ', desc: 'የንግድ ባንክ፣ ቴሌብር፣ አዋሽ ወይም ዳሸን ሂሳብ ቁጥር ይቅዱ።' },
      { title: '2. ደረሰኝ ይላኩ', desc: 'የግብይት መለያ ቁጥር እና የደረሰኝ ፎቶ ያስገቡ።' },
      { title: '3. ማረጋገጫ', desc: 'ቡድናችን ገቢውን አረጋግጦ በቀጥታ በድረ-ገጹ ላይ ያዘምናል።' },
    ],
    form: {
      title: 'ድጋፍዎን ያስመዝግቡ',
      subtitle: 'በባንክ ገቢ ካደረጉ በኋላ የግብይት መረጃውን ከታች ያስገቡ።',
      donorName: 'ሙሉ ስም',
      anonymous: 'ስሜ በይፋ እንዳይታይ (በስውር ለጋሽ)',
      phone: 'ስልክ ቁጥር (አማራጭ)',
      bank: 'ባንክ / የክፍያ መንገድ',
      amount: 'የገንዘብ መጠን (በብር)',
      reference: 'የግብይት መለያ ቁጥር (Reference)',
      receipt: 'የደረሰኝ ፎቶ (PNG/JPG/WebP እስከ 5MB)',
      receiptHint: 'የደረሰኝ ፎቶ ለመጫን እዚህ ይጫኑ',
      note: 'ተጨማሪ ማስታወሻ (አማራጭ)',
      submit: 'ድጋፍ ላክ',
      submitting: 'በመላክ ላይ...',
      successTitle: 'ድጋፍዎ ለማረጋገጫ ተልኳል',
      another: 'ሌላ ድጋፍ ያስመዝግቡ',
    },
  },
};