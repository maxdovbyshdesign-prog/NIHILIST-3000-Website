export type Language = "ru" | "en";

export type Track = {
  id: string;
  number: string;
  title: string;
  lyrics: string;
};

export type ReleaseCopy = {
  title: string;
  eyebrow: string;
  interactionHint: string;
  openText: string;
  closeText: string;
  previousRelease: string;
  nextRelease: string;
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
  cover: string;
  videoId: string | null;
  services: Array<{
    name: string;
    url: string;
  }>;
  socials: string[];
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
    lyrics: `Это не гимн
Просто трещина лица
мне пробило грудь штырём
тормозного рычага

Я лежу и жду тебя
в глазах сплошная рябь
Вместо титров ерудна
Порно и еда

Трое суток без сна
В ожидании тепла

Мир горит за окном
Глотку сушит стеклом
Но зато без бинокля вс видно
и этот финал я не пропущу

Это не гимн
Просто трещина лица
мне пробило грудь штырём
тормозного рычага

Я лежу и жду тебя
в глазах сплошная рябь
Вместо титров ерудно
Порно и еда`,
  },
  {
    id: "kemet-time",
    number: "02",
    title: "Пора в Кемет",
    lyrics: `Запах заправок мягкий бетон
что то опять не то с головой
Твоя миниюбка мне слишком мала
добавь в масло немного огня
Кубрик жив и снимает как я
высаживаюсь на планету земля
с января до января
без выходных
без тебя

а в голове веснааааааа

урны наполнены слизью газет
их пытается поджечь
отставной мент
в попытке согрется
дымит сигаретой
пока ещё клыкастый рот
пыткой бесконечной льются со стен
воспоминания
звуки
и прочий бред
без состраданий
выпью их все
Кажется снова пора в Кемет`,
  },
  {
    id: "joyful-casualty-count",
    number: "03",
    title: "Радостный подсчёт потерь",
    lyrics: `Стригу ногти возле вокзала
на поезд последний почти успевая
вам все желаю сдохнуть здесь поскорей
мне достанется радостный подсчёт потерь

в самом центре тьмы
сразу после чумы
наблюдаю чужие огни
бессовесто скалясь от понимания
этот поезд отправился в ад
и в этом никто не виноват
Краска стекает с лица
как всегда
это ничего это ерунда

Из Кемета в Дешрет (×3)
жаль что не на скорой

Я стану архагелом
в предсмертном бреду и я вам такого
там нашепчу
сожалеть будут все засранцы
о каждом упущенном шансе
каждой слезой что я слышал
умоется пьянь за окном
пусть штопают руки и плачут
хватая зубами стоп кран
хлор смешан со скипидаром
вообщем то как и всегд

Из Кемета в Дешрет (×3)
жаль что не на скорой`,
  },
  {
    id: "lullaby-for-a-cat",
    number: "04",
    title: "Колыбель для кошки",
    lyrics: `Те кто остались в последнем вагоне
уже не доедут до нас
лучше бы было им ждать на перроне
ведь с рельс он слетит через час

Если дождёждшься рассветных лучей
то от скверны отчистит тебя
тихое утро
суботтнегго мерзкого липкого нового дня

если не знать что остался один
то тебе будет ведь всё равно
молча как мантру себе повторяй
никому никогда ничего
но если ты всё же захочешь вернуться
лезь через окно
завесь зеркала
и разбей все часы
ведь теперь это снова твой дом`,
  },
];

const enTracks: Track[] = [
  {
    id: "face-crack",
    number: "01",
    title: "Facecrack",
    lyrics: `This is not an anthem.
Just a crack over my face
A brake lever pin has pierced my chest.

Lying here waiting for you.
My vision is a blur.
Boring junk instead of credits —
Porn and food.

Three days with no sleep
Waiting for warmth.

Outside the window, world’s burning
My throat is dry from the glass.
At least, no need for binoculars.
No way I’ll miss the finale.

This is not an anthem.
Just a crack over my face
A brake lever pin has pierced my chest.

Lying here waiting for you.
My vision is a blur.
Boring junk instead of credits —
Porn and food.`,
  },
  {
    id: "kemet-time",
    number: "02",
    title: "Kemet Time",
    lyrics: `Gas station odor, soft concrete
Once again, my head is not right
Your mini skirt’s too small for me
Add a bit of fire to the oil
Kubrick’s alive, he’s blocking a scene
Of me landing on Planet Earth
From January to January
Without days off
Without you.

Springtime in my head

Trashcans are filled with newspaper slime
A retired cop tries to set them on fire
Wanting to keep warm, puffing a cig
A mouth that still has a fang or two left
Endlessly torturing, dripping from walls
Memories, sounds, all that dumb stuff
Without compassion —
Drinking it all
I guess, it’s Kemet time again!`,
  },
  {
    id: "joyful-casualty-count",
    number: "03",
    title: "Joyful Casualty Count",
    lyrics: `At the train station, clipping my nails
Almost making it to the last express
Wishing you all to die here fast
I’ll get the joyful casualty count

In the heart of darkness,
Right after the plague
I’m observing alien lights
Shamelessly grinning, I know for a fact —
This train is headed for hell
Nobody at all to blame for this
Paint dripping from my face, as always
It’s whatever, it’s nothing.

From Kemet to Deshret (×3)
Pity it ain’t in an ambulance

I’ll become an archangel
Rambling at death’s door
Oh, the things I’d whisper to you!
Every asshole’s gonna be sorry
For every chance they missed
Drunkards outside will shower
With every teardrop I’ve heard
Let them mend their hands and cry,
Biting down on the emergency brake.
Chlorine is mixed with turpentine
Just like they always do

From Kemet to Deshret (×3)
Pity it ain’t in an ambulance`,
  },
  {
    id: "lullaby-for-a-cat",
    number: "04",
    title: "Train Car / Carriage",
    lyrics: `Those who stayed in the last car
Won’t make it to us anymore
Should have stayed at the platform
It’s gonna go off the rails in an hour

If you stick it out till sundawn
It will cleanse you from filth
A quiet morning
Of a grimy, sticky, new Saturday

If you don’t know that you’re left all alone
Then you wouldn’t care at all
Repeat this mantra to yourself in silence
“No one, never, nothing”
But if you actually want to return
Climb through the window
Cover the mirrors
Break all the clocks,
Cause this is your home again.`,
  },
];

export const releases: Release[] = [
  {
    slug: "tvar-zhret-tvar",
    artist: "NIHILIST3000",
    experience: "envelope",
    model: "/assets/releases/tvar-zhret-tvar/envelope.glb",
    envelopeTexture: "/assets/releases/tvar-zhret-tvar/envelope-texture.jpg",
    cover: "/assets/releases/tvar-zhret-tvar/cover.jpg",
    videoId: null,
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
    socials: ["Telegram", "YouTube", "Instagram"],
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
        videoLabel: "ВИДЕО",
        videoPending: "ССЫЛКА НА ВИДЕО ПОЯВИТСЯ ЗДЕСЬ",
        servicesLabel: "СЛУШАТЬ",
        servicesPending: "ОТКРЫТЬ РЕЛИЗ",
        socialsLabel: "СОЦСЕТИ",
        tracks: ruTracks,
      },
      en: {
        title: "ТВАРЬ ЖРЁТ ТВАРЬ",
        eyebrow: "EP / 4 LYRICS",
        interactionHint: "HOVER · PICK A PAGE · OPEN",
        openText: "READ LYRICS",
        closeText: "CLOSE",
        previousRelease: "PREVIOUS RELEASE",
        nextRelease: "NEXT RELEASE",
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
