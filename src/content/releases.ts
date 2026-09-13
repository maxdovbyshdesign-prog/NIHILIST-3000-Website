export type Language = "ru" | "en";

export type Track = {
  id: string;
  number: string;
  title: string;
  lyrics: string;
};

export type ReleaseCopy = {
  title: string;
  heroTitle?: string;
  eyebrow: string;
  interactionHint: string;
  openText: string;
  closeText: string;
  previousRelease: string;
  nextRelease: string;
  nextReleaseTeaser: string;
  videoLabel: string;
  videoPending: string;
  servicesLabel: string;
  servicesPending: string;
  socialsLabel: string;
  tracks: Track[];
};

export type Release = {
  slug: string;
  artist: string;
  experience: "envelope";
  model: string;
  envelopeTexture: string;
  paperTextures: Record<Language, string[]>;
  interactionSounds: {
    open: string;
    pageSwitch: [string, string];
  };
  cover: string;
  videoId: string | null;
  services: Array<{
    name: string;
    url: string;
  }>;
  socials: Array<{
    name: string;
    url: string | null;
  }>;
  theme: {
    background: string;
    foreground: string;
    muted: string;
    accent: string;
  };
  copy: Record<Language, ReleaseCopy>;
};

const ruTracks: Track[] = [
  {
    id: "face-crack",
    number: "01",
    title: "Трещина лица",
    lyrics: `Это не гимн,
просто трещина лица.
Мне пробило грудь штырём
тормозного рычага.

Я лежу и жду тебя,
в глазах сплошная рябь.
Вместо титров — ерунда:
порно и еда.

Трое суток без сна
в ожидании тепла.

Мир горит за окном,
глотку сушит стеклом.
Но зато без бинокля всё видно,
и этот финал я не пропущу.

Это не гимн,
просто трещина лица.
Мне пробило грудь штырём
тормозного рычага.

Я лежу и жду тебя,
в глазах сплошная рябь.
Вместо титров — ерунда:
порно и еда.`,
  },
  {
    id: "kemet-time",
    number: "02",
    title: "Пора в Кемет",
    lyrics: `Запах заправок, мягкий бетон.
Что-то опять не то с головой.
Твоя мини-юбка мне слишком мала.
Добавь в масло немного огня.
Кубрик жив и снимает, как я
высаживаюсь на планету Земля
с января до января,
без выходных,
без тебя.

А в голове веснааааааа.

Урны наполнены слизью газет.
Их пытается поджечь
отставной мент
в попытке согреться.
Дымит сигаретой,
пока ещё клыкастый рот.
Пыткой бесконечной льются со стен
воспоминания,
звуки
и прочий бред.
Без состраданий
выпью их все.
Кажется, снова пора в Кемет.`,
  },
  {
    id: "joyful-casualty-count",
    number: "03",
    title: "Радостный подсчёт потерь",
    lyrics: `Стригу ногти возле вокзала,
на поезд последний почти успевая.
Вам всем желаю сдохнуть здесь поскорей:
мне достанется радостный подсчёт потерь.

В самом центре тьмы,
сразу после чумы,
наблюдаю чужие огни,
бессовестно скалясь от понимания:
этот поезд отправился в ад,
и в этом никто не виноват.
Краска стекает с лица,
как всегда.
Это ничего, это ерунда.

Из Кемета в Дешрет (×3),
жаль, что не на скорой.

Я стану архангелом
в предсмертном бреду, и я вам такого
там нашепчу.
Сожалеть будут все засранцы
о каждом упущенном шансе.
Каждой слезой, что я слышал,
умоется пьянь за окном.
Пусть штопают руки и плачут,
хватая зубами стоп-кран.
Хлор смешан со скипидаром,
в общем-то, как и всегда.

Из Кемета в Дешрет (×3),
жаль, что не на скорой.`,
  },
  {
    id: "lullaby-for-a-cat",
    number: "04",
    title: "Колыбель для кошки",
    lyrics: `Те, кто остались в последнем вагоне,
уже не доедут до нас.
Лучше бы было им ждать на перроне,
ведь с рельс он слетит через час.

Если дождёшься рассветных лучей,
то от скверны отчистит тебя
тихое утро
субботнего мерзкого липкого нового дня.

Если не знать, что остался один,
то тебе будет ведь всё равно.
Молча, как мантру, себе повторяй:
«Никому, никогда, ничего».
Но если ты всё же захочешь вернуться,
лезь через окно,
завесь зеркала
и разбей все часы,
ведь теперь это снова твой дом.`,
  },
];

const enTracks: Track[] = [
  {
    id: "face-crack",
    number: "01",
    title: "Face Crack",
    lyrics: `This is not an anthem.
Just a crack over my face.
A brake lever pin has pierced my chest.

Lying here, waiting for you.
My vision is a blur.
Boring junk instead of credits —
porn and food.

Three days with no sleep,
waiting for warmth.

Outside the window, the world’s burning.
My throat is dry from the glass.
At least there’s no need for binoculars.
No way I’ll miss the finale.

This is not an anthem.
Just a crack over my face.
A brake lever pin has pierced my chest.

Lying here, waiting for you.
My vision is a blur.
Boring junk instead of credits —
porn and food.`,
  },
  {
    id: "kemet-time",
    number: "02",
    title: "Kemet Time",
    lyrics: `Gas station odor, soft concrete.
Once again, my head is not right.
Your mini-skirt’s too small for me.
Add a bit of fire to the oil.
Kubrick’s alive, he’s blocking a scene
of me landing on Planet Earth
from January to January,
without days off,
without you.

Springtime in my head.

Trash cans are filled with newspaper slime.
A retired cop tries to set them on fire,
wanting to keep warm, puffing a cig.
A mouth that still has a fang or two left.
Endlessly torturing, dripping from walls:
memories, sounds, all that dumb stuff.
Without compassion —
drinking it all.
I guess it’s Kemet time again!`,
  },
  {
    id: "joyful-casualty-count",
    number: "03",
    title: "Joyful Casualty Count",
    lyrics: `At the train station, clipping my nails,
almost making it to the last express.
Wishing you all to die here fast:
I’ll get the joyful casualty count.

In the heart of darkness,
right after the plague,
I’m observing alien lights,
shamelessly grinning. I know for a fact —
this train is headed for hell.
Nobody at all to blame for this.
Paint dripping from my face, as always.
It’s whatever, it’s nothing.

From Kemet to Deshret (×3).
Pity it ain’t in an ambulance.

I’ll become an archangel,
rambling at death’s door.
Oh, the things I’d whisper to you!
Every asshole’s gonna be sorry
for every chance they missed.
Drunkards outside will shower
with every teardrop I’ve heard.
Let them mend their hands and cry,
biting down on the emergency brake.
Chlorine is mixed with turpentine,
just like they always do.

From Kemet to Deshret (×3).
Pity it ain’t in an ambulance.`,
  },
  {
    id: "lullaby-for-a-cat",
    number: "04",
    title: "Cat's Cradle",
    lyrics: `Those who stayed in the last car
won’t make it to us anymore.
Should have stayed at the platform:
it’s gonna go off the rails in an hour.

If you stick it out till dawn,
it will cleanse you from filth —
a quiet morning
of a grimy, sticky, new Saturday.

If you don’t know that you’re left all alone,
then you wouldn’t care at all.
Repeat this mantra to yourself in silence:
“No one, never, nothing.”
But if you actually want to return,
climb through the window,
cover the mirrors,
break all the clocks,
’cause this is your home again.`,
  },
];

export const releases: Release[] = [
  {
    slug: "tvar-zhret-tvar",
    artist: "NIHILIST3000",
    experience: "envelope",
    model: "/assets/releases/tvar-zhret-tvar/envelope.glb",
    envelopeTexture: "/assets/releases/tvar-zhret-tvar/envelope-texture.jpg",
    paperTextures: {
      ru: [
        "/assets/releases/tvar-zhret-tvar/papers/01-face-crack-ru.png",
        "/assets/releases/tvar-zhret-tvar/papers/02-kemet-time-ru.png",
        "/assets/releases/tvar-zhret-tvar/papers/03-joyful-casualty-count-ru.png",
        "/assets/releases/tvar-zhret-tvar/papers/04-cat-cradle-ru.png",
      ],
      en: [
        "/assets/releases/tvar-zhret-tvar/papers/01-face-crack-en.png",
        "/assets/releases/tvar-zhret-tvar/papers/02-kemet-time-en.png",
        "/assets/releases/tvar-zhret-tvar/papers/03-joyful-casualty-count-en.png",
        "/assets/releases/tvar-zhret-tvar/papers/04-cat-cradle-en.png",
      ],
    },
    interactionSounds: {
      open: "/assets/releases/tvar-zhret-tvar/audio/envelope-open.mp3",
      pageSwitch: [
        "/assets/releases/tvar-zhret-tvar/audio/page-switch-1.mp3",
        "/assets/releases/tvar-zhret-tvar/audio/page-switch-2.mp3",
      ],
    },
    cover: "/assets/releases/tvar-zhret-tvar/cover.jpg",
    videoId: "IhU_7qBFUfs",
    services: [
      {
        name: "Spotify",
        url: "https://open.spotify.com/album/0O6QeOs6EItvjbVsrr1dfi?si=iw7IyZfiQC-G_ReqCt9iIQ",
      },
      {
        name: "Apple Music",
        url: "https://music.apple.com/us/album/%D1%82%D0%B2%D0%B0%D1%80%D1%8C-%D0%B6%D1%80%D1%91%D1%82-%D1%82%D0%B2%D0%B0%D1%80%D1%8C-ep/6802348550",
      },
      {
        name: "YouTube Music",
        url: "https://music.youtube.com/playlist?list=OLAK5uy_l336mXHLdl1Zy4bT0NoejP4saTHma9mQ0&si=J7XXR4kORr_03w5D",
      },
      {
        name: "Bandcamp",
        url: "https://nihilist3000.bandcamp.com/album/-",
      },
    ],
    socials: [
      {
        name: "nihilist3000@icloud.com",
        url: null,
      },
      {
        name: "Telegram",
        url: "https://t.me/nihilist3000",
      },
      {
        name: "Instagram",
        url: "https://www.instagram.com/nihilist3000/",
      },
    ],
    theme: {
      background: "#050505",
      foreground: "#f0f0ea",
      muted: "#8d8d88",
      accent: "#d8d8d2",
    },
    copy: {
      ru: {
        title: "ТВАРЬ ЖРЁТ ТВАРЬ",
        eyebrow: "EP / 4 ТЕКСТА",
        interactionHint: "НАВЕДИ · ВЫБЕРИ ЛИСТ · ОТКРОЙ",
        openText: "ОТКРЫТЬ ТЕКСТ",
        closeText: "ЗАКРЫТЬ",
        previousRelease: "ПРЕДЫДУЩИЙ РЕЛИЗ",
        nextRelease: "СЛЕДУЮЩИЙ РЕЛИЗ",
        nextReleaseTeaser: "На край осени\nскоро",
        videoLabel: "ВИДЕО",
        videoPending: "ССЫЛКА НА ВИДЕО ПОЯВИТСЯ ЗДЕСЬ",
        servicesLabel: "СЛУШАТЬ",
        servicesPending: "ОТКРЫТЬ РЕЛИЗ",
        socialsLabel: "СОЦСЕТИ",
        tracks: ruTracks,
      },
      en: {
        title: "BEAST FEEDS ON BEAST",
        heroTitle: "BEAST\nFEEDS ON\nBEAST",
        eyebrow: "EP / 4 LYRICS",
        interactionHint: "HOVER · PICK A PAGE · OPEN",
        openText: "READ LYRICS",
        closeText: "CLOSE",
        previousRelease: "PREVIOUS RELEASE",
        nextRelease: "NEXT RELEASE",
        nextReleaseTeaser: "To the edge of autumn,\ncoming soon",
        videoLabel: "VIDEO",
        videoPending: "THE VIDEO LINK WILL APPEAR HERE",
        servicesLabel: "LISTEN",
        servicesPending: "OPEN RELEASE",
        socialsLabel: "SOCIALS",
        tracks: enTracks,
      },
    },
  },
];

export function getRelease(slug: string): Release | undefined {
  return releases.find((release) => release.slug === slug);
}

export function getReleaseNeighbors(slug: string) {
  const index = releases.findIndex((release) => release.slug === slug);
  return {
    previous: index > 0 ? releases[index - 1] : null,
    next: index >= 0 && index < releases.length - 1 ? releases[index + 1] : null,
  };
}
