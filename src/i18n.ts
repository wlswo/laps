// Every string on the site, in English and Korean. Same words as the app and the App Store listing
// (laps/docs/store/listing.md). No middle dots: commas or spaces instead.

export type Lang = 'en' | 'ko';
export type Page = '' | 'privacy' | 'support';

const base = import.meta.env.BASE_URL.replace(/\/$/, '');

/** '/laps', '/laps/support', '/laps/ko', '/laps/ko/privacy'. */
export function href(lang: Lang, page: Page): string {
  const parts = [base, lang === 'ko' ? 'ko' : '', page].filter(Boolean);
  return '/' + parts.join('/').replace(/^\//, '');
}

export function otherLang(lang: Lang): Lang {
  return lang === 'en' ? 'ko' : 'en';
}

export const t = {
  en: {
    nav: { faq: 'FAQ', support: 'Support', privacy: 'Privacy', other: '한국어' },
    title: 'Laps: Exam Reading Plan',
    description:
      'Enter the pages, a finish date and how many reads. Laps works out today\'s pages, and re-plans the rest when you fall behind or get ahead.',
    hero: {
      tagline: 'You just read. Laps does the math.',
      storeSmall: 'Coming soon to the',
      storeBig: 'App Store',
      free: 'One book free forever',
    },
    tiles: {
      home: { title: "Today's pages", text: "One tap when you're done" },
      pace: { kicker: 'Pace', title: 'Behind? A few pages more a day', text: 'Laps spreads the rest to your finish date' },
      brand: 'iPhone, 12 languages',
      widget: { kicker: 'Widgets', title: 'On your Home Screen', text: 'Check off without opening the app' },
      calc: { kicker: 'The math', title: 'Counts how every read gets faster', text: 'Lands right on your finish date' },
      history: { title: 'Watch reads get faster', text: 'How many days each read took' },
    },
    pricing: {
      title: 'One book, free forever',
      free: { name: 'Free', price: '$0', unit: '', text: 'One book, everything else included' },
      pass: { name: 'Lifetime Pass', price: '$4.99', unit: 'once', text: 'As many books as you like, plus widgets' },
    },
    faq: {
      title: ['Questions'],
      items: [
        ['What happens when I fall behind?', 'Nothing for you to do. Each morning Laps divides what is left by the study days left until your finish date. The Pace box shows how many pages a day that added.'],
        ['What does "reads get faster" mean?', 'The second time through a book goes faster than the first. Laps counts that: a page takes 1.7× less time with every read by default, never more than 4× faster. You can set it between 1.1× and 2.0× for each book.'],
        ['Can I take days off?', 'Pick rest days of the week and Laps leaves them out when it divides the pages. If you read on a rest day anyway, it still counts.'],
        ['Do I have to enter an exam?', 'No. Each book is planned up to its own finish date. An exam adds the countdown on top and a heads-up on exam day.'],
        ['Can I read only some chapters?', 'Yes. Choose "By chapter", tick the chapters you need, and each day ends at a chapter break when it is close.'],
        ['When does a day start?', 'At 4:00 in the morning. Reading late at night still counts for the evening before.'],
        ['What is free, and is it a subscription?', 'One book is free forever, with every other feature included. The Lifetime Pass is a one-time purchase that adds as many books as you like and the widgets. It is not a subscription.'],
        ['Where is my data?', 'Only on your iPhone. There is no account, no server and no analytics. Deleting the app deletes it.'],
        ['Are there widgets?', 'Small and medium Home Screen widgets and a Lock Screen widget, with the Lifetime Pass. You can check off a book right from the medium widget.'],
        ['Which languages?', '12 languages. You can pick the app language in Settings, apart from your iPhone language.'],
      ],
      more: 'Anything else? Write to {mail}.',
    },
  },
  ko: {
    nav: { faq: 'FAQ', support: '지원', privacy: '개인정보', other: 'English' },
    title: 'Laps - 시험 회독 플래너',
    description:
      '책 범위, 끝낼 날, 회독 수만 넣으세요. 매일 읽을 쪽을 알려주고, 밀리거나 앞서면 끝낼 날까지 남은 분량을 다시 고르게 나눠 드려요.',
    hero: {
      tagline: '읽기만 하세요. 계산은 Laps가 할게요.',
      storeSmall: '곧 출시',
      storeBig: 'App Store',
      free: '책 1권 평생 무료',
    },
    tiles: {
      home: { title: '오늘 읽을 쪽', text: '다 읽으면 체크 한 번' },
      pace: { kicker: '페이스', title: '밀려도 하루 몇 쪽만 더', text: '끝낼 날까지 알아서 다시 나눠요' },
      brand: 'iPhone, 12개 언어',
      widget: { kicker: '위젯', title: '앱을 열지 않아도', text: '홈 화면에서 바로 체크' },
      calc: { kicker: '계산', title: '회독할수록 빨라지는 것까지', text: '끝낼 날에 딱 맞게 나눠요' },
      history: { title: '빨라지는 게 보여요', text: '회독마다 며칠 걸렸는지' },
    },
    pricing: {
      title: '1권은 평생 무료',
      free: { name: '무료', price: '0원', unit: '', text: '책 1권, 나머지 기능은 모두' },
      pass: { name: '평생 이용권', price: '7,700원', unit: '한 번', text: '책 개수 제한 없이, 위젯까지' },
    },
    faq: {
      title: ['자주 묻는 질문'],
      items: [
        ['계획보다 밀리면 어떻게 되나요?', '따로 할 일은 없어요. 매일 아침 남은 분량을 끝낼 날까지 남은 공부일로 다시 나눠요. 페이스에서 하루 몇 쪽이 늘었는지 보여줘요.'],
        ['회독할수록 빨라진다는 건 무슨 뜻인가요?', '두 번째 읽을 땐 처음보다 빨리 읽히죠. Laps는 회독마다 한 쪽에 드는 시간이 줄어드는 걸 계산에 넣어요. 기본은 1.7배씩, 최대 4배까지예요. 책마다 1.1배에서 2.0배 사이로 바꿀 수 있어요.'],
        ['쉬는 날을 정할 수 있나요?', '쉬는 요일을 고르면 그날은 빼고 나눠요. 쉬는 날에 읽어도 기록은 그대로 남아요.'],
        ['시험 날짜를 꼭 넣어야 하나요?', '아니요. 일정은 책마다 정한 끝낼 날까지 계산해요. 시험을 넣으면 맨 위에 D-day가 보이고, 시험날 알려줘요.'],
        ['필요한 챕터만 읽을 수 있나요?', '네. "챕터별로"를 고르고 읽을 장만 체크하면 돼요. 하루 분량은 장 끝이 가까우면 장 끝에서 끊어요.'],
        ['하루는 언제 바뀌나요?', '새벽 4시예요. 밤늦게 읽어도 그날 기록으로 들어가요.'],
        ['무료로 어디까지 쓸 수 있나요? 구독인가요?', '책 1권은 평생 무료이고, 나머지 기능은 모두 쓸 수 있어요. 평생 이용권(7,700원)은 한 번 결제로 책 개수 제한을 풀고 위젯을 열어요. 구독이 아니에요.'],
        ['데이터는 어디에 저장되나요?', '아이폰 안에만 있어요. 계정도, 서버도, 분석 도구도 없어요. 앱을 지우면 함께 지워져요.'],
        ['위젯이 있나요?', '홈 화면 소형과 중형, 잠금화면 위젯이 있어요(평생 이용권). 중형 위젯에서 바로 체크할 수 있어요.'],
        ['어떤 언어를 지원하나요?', '12개 언어예요. 아이폰 언어와 상관없이 설정에서 앱 언어를 따로 고를 수 있어요.'],
      ],
      more: '더 궁금한 건 {mail}로 보내 주세요.',
    },
  },
} as const;
