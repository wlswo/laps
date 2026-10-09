// Every string on the site, in English and Korean. Same words as the app and the App Store listing
// (laps/docs/store/listing.md). No middle dots: commas instead.

export type Lang = 'en' | 'ko';

const base = import.meta.env.BASE_URL.replace(/\/$/, '');

/** '/laps', '/laps/support', '/laps/ko', '/laps/ko/privacy'. */
export function href(lang: Lang, page: '' | 'privacy' | 'support'): string {
  const parts = [base, lang === 'ko' ? 'ko' : '', page].filter(Boolean);
  return '/' + parts.join('/').replace(/^\//, '');
}

export function otherLang(lang: Lang): Lang {
  return lang === 'en' ? 'ko' : 'en';
}

export const t = {
  en: {
    nav: { support: 'Support', privacy: 'Privacy', other: '한국어' },
    title: 'Laps: Exam Reading Plan',
    description:
      'Put in a book, a finish date and how many times to read it. Laps tells you the pages for today, and spreads the rest again when you fall behind or get ahead.',
    hero: {
      kicker: 'For exam season',
      headline: "Today's pages,\nworked out for you",
      lead: 'Put in a book, a finish date and how many times to read it. Laps tells you the pages for today, and spreads the rest again when you fall behind or get ahead.',
      free: '1 book free forever, one-time purchase, no subscription',
      soon: 'Coming soon to the App Store',
      iphone: 'For iPhone, iOS 17 or later',
    },
    shots: [
      "Today's pages, worked out for you",
      'See every read before you start',
      'Fell behind? It spreads out again',
      'Watch each read get faster',
      'Today on your Home and Lock Screen',
    ],
    featuresKicker: 'What it does',
    features: [
      ['Today\'s pages', 'One line per book. Check it off with one tap when you\'re done.'],
      ['Reads get faster', 'Later passes take fewer days, and the plan knows it, up to four times faster.'],
      ['Behind or ahead', 'What\'s left is spread evenly until your finish date. Your pace reads "+3 pages a day", never "4 days late".'],
      ['See the plan first', 'Before you start, a calendar of every read, or a timeline.'],
      ['Read by chapter', 'Pick only the chapters you need, and days end at chapter breaks.'],
      ['Exams', 'Add the date and time, and the countdown sits on top.'],
      ['History', 'How long each read took, and how much faster the next one went.'],
      ['Widgets and reminders', 'Home Screen and Lock Screen widgets, and a daily reminder with today\'s exact pages.'],
    ],
    pricingKicker: 'Price',
    free: {
      title: 'Free',
      price: 'Forever',
      lines: ['One book on home', 'Everything else included', 'Finished and archived books stay to look back on'],
    },
    pass: {
      title: 'Lifetime Pass',
      price: 'One payment',
      lines: ['As many books as you like', 'Home Screen and Lock Screen widgets', 'No subscription, no trial that locks your plan'],
    },
    privacyNote: 'Laps collects no data. Your books and reading stay on your iPhone.',
    languages: '12 languages',
  },
  ko: {
    nav: { support: '지원', privacy: '개인정보', other: 'English' },
    title: 'Laps - 시험 회독 플래너',
    description:
      '책 범위, 끝낼 날, 회독 수만 넣으세요. 매일 읽을 쪽을 알려주고, 밀리거나 앞서면 끝낼 날까지 남은 분량을 다시 고르게 나눠 드려요.',
    hero: {
      kicker: '시험 회독 플래너',
      headline: '오늘 읽을 쪽,\n매일 계산해 드려요',
      lead: '책 범위, 끝낼 날, 회독 수만 넣으세요. 매일 읽을 쪽을 알려주고, 밀리거나 앞서면 끝낼 날까지 남은 분량을 다시 고르게 나눠 드려요.',
      free: '책 1권 평생 무료, 7,700원 한 번, 구독 아님',
      soon: 'App Store 출시 준비 중',
      iphone: '아이폰, iOS 17 이상',
    },
    shots: [
      '오늘 읽을 쪽, 매일 계산해 드려요',
      '시작 전에 회독 계획을 한눈에',
      '밀려도 끝낼 날까지 다시 나눠요',
      '회독할수록 빨라지는 게 보여요',
      '홈 화면과 잠금화면에서 바로 확인',
    ],
    featuresKicker: '하는 일',
    features: [
      ['오늘 읽을 쪽', '책마다 한 줄. 다 읽으면 한 번 눌러 체크해요.'],
      ['회독할수록 빨라져요', '뒤 회독일수록 걸리는 날이 줄어드는 걸 계획에 반영해요. 최대 4배까지.'],
      ['밀려도, 앞서도', '남은 분량을 끝낼 날까지 고르게 다시 나눠요. 페이스는 "4일 늦음"이 아니라 "하루 +3쪽"으로.'],
      ['계획 미리보기', '시작하기 전에 회독마다 캘린더로, 또는 타임라인으로.'],
      ['챕터별로 읽기', '필요한 장만 골라 회독하고, 하루 분량은 장 끝에서 끊어요.'],
      ['시험', '날짜와 시각을 넣으면 맨 위에 D-day.'],
      ['기록', '회독마다 며칠 걸렸는지, 다음 회독은 며칠 빨라졌는지.'],
      ['위젯과 알림', '홈 화면과 잠금화면 위젯, 오늘 읽을 쪽을 그대로 알려주는 매일 알림.'],
    ],
    pricingKicker: '가격',
    free: {
      title: '무료',
      price: '평생',
      lines: ['홈에 책 1권', '나머지 기능은 모두', '끝내거나 보관한 책은 언제든 다시 보기'],
    },
    pass: {
      title: '평생 이용권',
      price: '7,700원 한 번',
      lines: ['책 개수 제한 없이', '홈 화면과 잠금화면 위젯', '구독 없음, 계획이 잠기는 체험판 없음'],
    },
    privacyNote: 'Laps는 어떤 데이터도 수집하지 않아요. 책과 읽은 기록은 아이폰에만 저장돼요.',
    languages: '12개 언어',
  },
} as const;
