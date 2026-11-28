import path from "node:path";
import { ObjectId } from "mongodb";
import {
  ensureUserIndexes,
  createUser,
  getUserByUsername,
  updateUser,
  PROFESSIONAL_USER_PASSWORD,
} from "./users";
import {
  createProfessional,
  listProfessionals,
  setProfessionalLogo,
} from "./professionals";
import {
  saveProfessionalLogoFromPath,
  saveTimelineImageFromPath,
  saveLiveEventImageFromPath,
} from "./uploads";
import {
  createSubscriptionPackage,
  getSubscriptionPackageByName,
} from "./subscriptionPackages";
import {
  addEventItem,
  addGuestItem,
  addLiveEventItem,
  addTimelineItem,
  createCelebration,
  ensureCelebrationIndexes,
  getCelebrationById,
  listCelebrations,
  updateCelebrationInfo,
  updateCelebrationStory,
  type CelebrationType,
  type EventItem,
  type GuestItem,
  type LocalizedText,
} from "./celebrations";
import { logAction } from "./logActions";
import { routing, type AppLocale } from "@/i18n/routing";

const ROOT_SEED = {
  displayName: "Dimitris Toskas",
  username: "ditoskas@gmail.com",
  password: "2521020995",
  role: "Root" as const,
  defaultLocale: "el" as const,
};

const TEST_PROFESSIONAL_SEED = {
  companyName: "Test Company",
  contactPerson: "Test Person",
  phone: "0123456789",
  mobile: "9876543210",
  email: "test@o-gamos-mas.com",
  plan: "Free" as const,
};

const TEST_PROFESSIONAL_LOGO = path.join(
  process.cwd(),
  "assets",
  "seed",
  "test-company-logo.png"
);

const SEED_TIMELINE_IMAGES_DIR = path.join(process.cwd(), "assets", "seed", "timeline");

interface CelebrationSeed {
  title: string;
  type: CelebrationType;
  husband: { firstName: string; lastName: string; email?: string; mobile?: string };
  wife: { firstName: string; lastName: string; email?: string; mobile?: string };
  info?: {
    celebrationDate?: Date;
    headline?: LocalizedText;
    quote?: LocalizedText;
    countdownParagraph?: LocalizedText;
    activeLanguages?: AppLocale[];
    maxGuestsPerInvitation?: number;
  };
  story?: {
    storyTitle?: LocalizedText;
    storySubtitle?: LocalizedText;
    storyParagraph?: LocalizedText;
  };
  timeline?: {
    title: LocalizedText;
    description?: LocalizedText;
    date?: Date;
    imageSourcePath?: string;
  }[];
  events?: {
    title: LocalizedText;
    description?: LocalizedText;
    area?: string;
    date?: Date;
    city?: string;
    address?: string;
    postCode?: string;
    country?: string;
    mapLat?: number;
    mapLng?: number;
  }[];
  guests?: {
    name: string;
    phone?: string;
    email?: string;
    expectedAttendees?: number;
    confirmedAttendees?: number;
    confirmationDate?: Date;
    deniedDate?: Date;
  }[];
  // `eventIndex`/`guestIndex` are positions into the `events`/`guests`
  // arrays above — resolved to the actual generated EventItem/GuestItem
  // ids after those are inserted (see seedCelebration()), since a
  // LiveEventItem references them by id, not by array position.
  liveEvents?: {
    eventIndex: number;
    guestIndex: number;
    title: string;
    description?: string;
    uploadedAt: Date;
    imageSourcePath: string;
  }[];
}

const TEST_CELEBRATION_SEED: CelebrationSeed = {
  title: "Dimitris & Maria Marriage",
  type: "Marriage",
  husband: {
    firstName: "Dimitris",
    lastName: "Toskas",
    mobile: "6938699188",
    email: "dimitris-husband@o-gamos-mas.com",
  },
  wife: {
    firstName: "Maria",
    lastName: "Test",
    mobile: "99138271",
    email: "maria-wife@o-gamos-mas.com",
  },
  info: {
    celebrationDate: new Date(Date.UTC(2032, 8, 12)),
    headline: {
      el: "Το Αιώνιο Ταξίδι μας στην Τοσκάνη Ξεκινά Εδώ",
      en: "Our Everlasting Tuscan Journey Starts Here",
      ru: "Здесь начинается наше вечное тосканское путешествие",
    },
    quote: {
      el: "Δύο ψυχές συναντήθηκαν πάνω από έναν καφέ στην καρδιά της Ρώμης και κάτω από τις ελιές της Τοσκάνης έδωσαν όρκο για το αύριό τους.",
      en: "Two spirits met over coffee in Rome's heart, and under the Tuscan olives, they pledged their tomorrow.",
      ru: "Две души встретились за чашкой кофе в сердце Рима, и под тосканскими оливами они поклялись друг другу в своём завтрашнем дне.",
    },
    countdownParagraph: {
      el: "Ανυπομονούμε να γιορτάσουμε την αγάπη και τη δέσμευσή μας με την οικογένεια και τους φίλους μας. Ελάτε μαζί μας στην καρδιά της Τοσκάνης για ένα Σαββατοκύριακο γεμάτο γέλιο, χορό, εκλεκτό κρασί και όμορφες αναμνήσεις.",
      en: "We can't wait to celebrate our love and commitment with our dearest family and friends. Join us in the breathtaking heart of Tuscany for a weekend of laughter, dancing, fine wine, and beautiful memories.",
      ru: "Мы с нетерпением ждём, чтобы отпраздновать нашу любовь и преданность друг другу с самыми близкими родными и друзьями. Присоединяйтесь к нам в потрясающем сердце Тосканы на выходные, полные смеха, танцев, прекрасного вина и красивых воспоминаний.",
    },
    activeLanguages: [...routing.locales],
    maxGuestsPerInvitation: 5,
  },
  story: {
    storyTitle: {
      el: "Η Ιστορία της Αγάπης μας",
      en: "Our Love Story",
      ru: "Наша история любви",
    },
    storySubtitle: {
      el: "Από αγνώστους σε ταίρια ψυχής",
      en: "From strangers to soulmates",
      ru: "От незнакомцев до родственных душ",
    },
    storyParagraph: {
      el: "Όλα ξεκίνησαν σε μια καφετέρια στην Αθήνα.",
      en: "It all started at a coffee shop in Athens.",
      ru: "Всё началось в кафе в Афинах.",
    },
  },
  timeline: [
    {
      title: {
        el: "Η Πρώτη Σπίθα",
        en: "The First Spark",
        ru: "Первая искра",
      },
      description: {
        el: "Γνωριστήκαμε απροσδόκητα σε ένα ζεστό, μικρό βιβλιοπωλείο στην Piazza della Signoria, στη Φλωρεντία. Και οι δύο απλωθήκαμε για το τελευταίο αντίτυπο ενός παλιού οδοιπορικού της Τοσκάνης, γεγονός που ξεκίνησε μια τρίωρη κουβέντα πάνω από espresso.",
        en: "We met unexpectedly in a cozy little bookstore in Piazza della Signoria, Florence. Both of us were reaching for the very last copy of an old Tuscan travelogue, which initiated a three-hour conversation over espresso.",
        ru: "Мы неожиданно познакомились в уютном маленьком книжном магазине на площади Синьории во Флоренции. Мы оба потянулись за последним экземпляром старого тосканского травелога, что положило начало трёхчасовой беседе за эспрессо.",
      },
      date: new Date(Date.UTC(2019, 0, 1)),
      imageSourcePath: path.join(SEED_TIMELINE_IMAGES_DIR, "story-1.jpg"),
    },
    {
      title: {
        el: "Βρίσκοντας τον Ρυθμό μας",
        en: "Finding Our Rhythm",
        ru: "В поисках своего ритма",
      },
      description: {
        el: "Από πεζοπορίες στους χρυσούς λόφους της Val d'Orcia μέχρι το μαγείρεμα σπιτικών taglioni με φρέσκες καλοκαιρινές τρούφες στο μικρό μας διαμέρισμα, συνειδητοποιήσαμε ότι οι ζωές μας ταιριάζουν τέλεια, σαν ένα παλιό ερωτικό τραγούδι.",
        en: "From hiking through the golden gravel hills of Val d'Orcia to cooking homemade taglioni with fresh summer truffles in our tiny apartment, we realized our lives fit together perfectly like a vintage love song.",
        ru: "От походов по золотистым холмам Валь-д'Орча до приготовления домашней тальони со свежими летними трюфелями в нашей крошечной квартире — мы поняли, что наши жизни идеально сочетаются друг с другом, как старая песня о любви.",
      },
      date: new Date(Date.UTC(2021, 0, 1)),
      imageSourcePath: path.join(SEED_TIMELINE_IMAGES_DIR, "story-2.jpg"),
    },
    {
      title: {
        el: "Η Πρόταση Γάμου κάτω από τις Ελιές",
        en: "The Proposal under the Olives",
        ru: "Предложение под оливами",
      },
      description: {
        el: "Κατά τη διάρκεια ενός απογευματινού πικνίκ στο ηλιοβασίλεμα, σε έναν ελαιώνα κοντά στο Σαν Τζιμινιάνο, ο Ματέο έπαιξε μια μελωδία στην ακουστική του κιθάρα, γονάτισε στα λευκά τριφύλλια και ζήτησε από την Έλενα να περάσουν μια ζωή μαζί. Εκείνη έκλαψε και είπε Ναι!",
        en: "During a late afternoon picnic at sunset in an olive grove near San Gimignano, Matteo played a melody on his acoustic guitar, knelt in the white clover fields, and asked Elena to spend a lifetime together. She cried and said Yes!",
        ru: "Во время позднего пикника на закате в оливковой роще недалеко от Сан-Джиминьяно Маттео сыграл мелодию на акустической гитаре, встал на колено среди белого клевера и попросил Елену провести с ним всю жизнь. Она заплакала и сказала «Да!»",
      },
      date: new Date(Date.UTC(2024, 0, 1)),
      imageSourcePath: path.join(SEED_TIMELINE_IMAGES_DIR, "story-3.jpg"),
    },
  ],
  // Events + their venues, taken from the same wedding-planner template as
  // the timeline above (its EVENTS + LOCATIONS arrays) — each event here is
  // one EVENTS entry merged with the LOCATIONS entry its locationId points
  // to (address parsed into street/city/postCode/country, latLng carried
  // straight through as mapLat/mapLng).
  events: [
    {
      title: {
        el: "Βραδινή Συνάντηση πριν τον Γάμο στο Ηλιοβασίλεμα",
        en: "Pre-Wedding Sunset Soirée",
        ru: "Предсвадебный вечер на закате",
      },
      description: {
        el: "Καλώς ήρθατε στη Φλωρεντία! Ας σπάσουμε τον πάγο με μια οικεία δεξίωση κοκτέιλ στο ρετιρέ δίπλα στην πισίνα. Απολαύστε βιολογικά Aperol spritz, ελαφριά γκουρμέ ορεκτικά και δείτε τον ήλιο να δύει πάνω από τον τρούλο του Ντουόμο πριν τη μεγάλη μέρα.",
        en: "Welcome to Florence! Let's break the ice with an intimate cocktail reception on the rooftop pool deck. Sip organic Aperol spritzes, enjoy light gourmet appetizers, and watch the sun melt over the Duomo dome before the big day.",
        ru: "Добро пожаловать во Флоренцию! Давайте растопим лёд на непринуждённом коктейльном приёме на террасе у бассейна. Насладитесь органическими коктейлями Aperol Spritz, лёгкими гурманскими закусками и понаблюдайте, как солнце садится над куполом Дуомо накануне важного дня.",
      },
      area: "Pre-wedding",
      date: new Date(Date.UTC(2026, 8, 11)),
      address: "Piazza di Santa Maria Novella, 16",
      city: "Firenze",
      postCode: "50123",
      country: "Italy",
      mapLat: 43.7742,
      mapLng: 11.2498,
    },
    {
      title: {
        el: "Ιερή Τελετή Γάμου",
        en: "Holy Marriage Union Ceremony",
        ru: "Церемония священного бракосочетания",
      },
      description: {
        el: "Η στιγμή που δίνουμε τους όρκους μας για μια ζωή. Παρακαλούμε όλοι οι καλεσμένοι να έχουν φτάσει και να έχουν καθίσει άνετα μέσα στο ιστορικό ιερό του καθεδρικού ναού μέχρι τις 15:15. Μια παραδοσιακή τελετή γεμάτη χορωδιακά έγχορδα, ιστορικό άναμμα κεριών και χαρούμενη ανταλλαγή δαχτυλιδιών.",
        en: "The moment we say our lifelong vows. We ask all guests to arrive and be comfortably seated inside the historic cathedral sanctuary by 15:15. A traditional ceremony rich with choral strings, historical candle lighting, and joyful rings.",
        ru: "Момент, когда мы произнесём клятвы на всю жизнь. Просим всех гостей прибыть и удобно разместиться внутри исторического святилища собора к 15:15. Традиционная церемония с хоровыми струнными, историческим зажжением свечей и радостным обменом кольцами.",
      },
      area: "Ceremony",
      date: new Date(Date.UTC(2026, 8, 12)),
      address: "Piazza di Santa Maria Novella, 18",
      city: "Firenze",
      postCode: "50123",
      country: "Italy",
      mapLat: 43.7746,
      mapLng: 11.2492,
    },
    {
      title: {
        el: "Μεγάλη Δεξίωση Δείπνου & Χορός στην Αίθουσα",
        en: "Grand Banquet Reception & Ballroom Ball",
        ru: "Торжественный банкет и бал в бальном зале",
      },
      description: {
        el: "Λεωφορεία θα μεταφέρουν τους καλεσμένους από την εκκλησία στους πολυτελείς κήπους της Villa Corsini. Χαλαρώστε με σαμπάνια, ακολουθούμενη από ένα εξαιρετικό ιταλικό δείπνο πέντε πιάτων, ρομαντικούς λόγους, εκλεκτό τοσκανικό Chianti Classico, κόψιμο τούρτας και ζωντανή τζαζ μπάντα, με τη βραδιά να συνεχίζεται με μοντέρνο house DJ.",
        en: "Shuttle buses will transfer guests from the church to the opulent gardens of Villa Corsini. Relax with champagne followed by an exquisite five-course sit-down Italian dinner, romantic speeches, fine Tuscan Chianti Classico, cake cutting, and a live jazz band banquet followed by a modern house DJ.",
        ru: "Автобусы-шаттлы доставят гостей из церкви в роскошные сады виллы Корсини. Расслабьтесь с шампанским, за которым последует изысканный итальянский ужин из пяти блюд, романтические речи, прекрасное тосканское Кьянти Классико, разрезание торта и живой джаз-бэнд, а вечер продолжится современным хаус-диджеем.",
      },
      area: "Reception",
      date: new Date(Date.UTC(2026, 8, 12)),
      address: "Via di Mezzomonte, 41",
      city: "Impruneta",
      postCode: "50015",
      country: "Italy",
      mapLat: 43.7121,
      mapLng: 11.2618,
    },
    {
      title: {
        el: "Αποχαιρετιστήριο Brunch με Πίτσα & Μιμόζα",
        en: "Farewell Pizza & Mimosa Brunch",
        ru: "Прощальный бранч с пиццей и мимозами",
      },
      description: {
        el: "Για να ανακάμψετε από τον χορευτικό πονοκέφαλο, απολαύστε φρεσκοφτιαγμένες πίτσες από φούρνο με τούβλα, δροσιστικές μιμόζες με άγρια μούρα και αρωματικό εσπρέσο. Ένα χαλαρό απόγευμα δίπλα στην πισίνα, με ιστορίες και γλυκούς αποχαιρετισμούς.",
        en: "To nurse the dancing hangovers, nurse yourself with freshly tossed brick-oven pizzas, refreshing wild berry mimosas, and aromatic espresso. A relaxed afternoon of poolside lounging, story-sharing, and sweet farewells.",
        ru: "Чтобы прийти в себя после танцев, побалуйте себя свежеиспечённой пиццей из дровяной печи, освежающими мимозами с лесными ягодами и ароматным эспрессо. Расслабленный полдень у бассейна, обмен историями и тёплые прощания.",
      },
      area: "Brunch",
      date: new Date(Date.UTC(2026, 8, 13)),
      address: "Via di Mezzomonte, 41",
      city: "Impruneta",
      postCode: "50015",
      country: "Italy",
      mapLat: 43.7121,
      mapLng: 11.2618,
    },
  ],
  // 4 guests (from the same reference template's GUESTS list) — 2 already
  // confirmed (with a confirmationDate), 2 still pending (no date, no
  // confirmedAttendees yet) — so both RSVP states have a fixture to test.
  guests: [
    {
      name: "Marco Rossi",
      phone: "+393203334444",
      email: "marco.rossi@example.com",
      expectedAttendees: 2,
      confirmedAttendees: 2,
      confirmationDate: new Date(Date.UTC(2026, 5, 1)),
    },
    {
      name: "Sofia Moretti",
      phone: "+393204445555",
      expectedAttendees: 1,
      confirmedAttendees: 1,
      confirmationDate: new Date(Date.UTC(2026, 5, 3)),
    },
    {
      name: "Giovanni Rossi",
      email: "giovanni.rossi@example.com",
      expectedAttendees: 2,
    },
    {
      name: "Pietro Bianchi",
      phone: "+393206667777",
      expectedAttendees: 2,
    },
    {
      name: "Zia Francesca Gatti",
      phone: "+393207778888",
      email: "francesca.gatti@example.com",
      expectedAttendees: 1,
      deniedDate: new Date(Date.UTC(2026, 5, 5)),
    },
  ],
  // 2 guest-submitted photos for the Live Events tab, one per a different
  // seeded event (index into the `events` array above) uploaded by a
  // different seeded guest (index into `guests` above) — exercises both
  // the "different events" and "different uploader" cases with one
  // fixture each. Reuses the same story-*.jpg placeholders as the
  // Story timeline (see SEED_TIMELINE_IMAGES_DIR) since there are no
  // dedicated live-event seed images.
  liveEvents: [
    {
      eventIndex: 1, // Holy Marriage Union Ceremony
      guestIndex: 0, // Marco Rossi
      title: "The Vows",
      description: "Right after they exchanged rings — the whole church went quiet.",
      uploadedAt: new Date(Date.UTC(2026, 8, 12, 16, 45)),
      imageSourcePath: path.join(SEED_TIMELINE_IMAGES_DIR, "story-1.jpg"),
    },
    {
      eventIndex: 2, // Grand Banquet Reception & Ballroom Ball
      guestIndex: 1, // Sofia Moretti
      title: "First Dance",
      description: "Everyone rushed the dance floor the moment the band started playing.",
      uploadedAt: new Date(Date.UTC(2026, 8, 12, 21, 30)),
      imageSourcePath: path.join(SEED_TIMELINE_IMAGES_DIR, "story-2.jpg"),
    },
  ],
};

const SUBSCRIPTION_PACKAGE_SEEDS = [
  {
    name: "Free",
    description: "Free subscription",
    maxUsers: 1,
    maxBronzeCelebrations: 5,
    maxSilverCelebrations: 3,
    maxGoldCelebrations: 2,
  },
  {
    name: "Basic",
    description: "Basic Subscription",
    maxUsers: 2,
    maxBronzeCelebrations: 30,
    maxSilverCelebrations: 15,
    maxGoldCelebrations: 5,
  },
];

async function seedRootUser(): Promise<void> {
  const existing = await getUserByUsername(ROOT_SEED.username);
  if (existing) return;

  const user = await createUser(ROOT_SEED);
  await logAction({
    userId: user._id.toString(),
    type: "info",
    category: "Security",
    message: `Seeded root user "${user.username}"`,
    dataTo: { username: user.username, role: user.role },
  });
}

// Returns the seeded (or already-existing) Test Company professional's id,
// so seedCelebration() can link to it without a second lookup.
async function seedTestProfessional(): Promise<string> {
  const existing = await listProfessionals();
  const existingMatch = existing.find(
    (p) => p.companyName === TEST_PROFESSIONAL_SEED.companyName
  );
  if (existingMatch) {
    return existingMatch._id.toString();
  }

  const professional = await createProfessional(TEST_PROFESSIONAL_SEED);
  const filename = await saveProfessionalLogoFromPath(
    professional._id.toString(),
    TEST_PROFESSIONAL_LOGO
  );
  await setProfessionalLogo(professional._id.toString(), filename);

  await logAction({
    userId: "system",
    type: "info",
    category: "Professionals",
    message: `Seeded professional "${professional.companyName}"`,
    dataTo: { ...TEST_PROFESSIONAL_SEED, logoFilename: filename },
  });

  const existingUser = await getUserByUsername(TEST_PROFESSIONAL_SEED.email);
  if (!existingUser) {
    const user = await createUser({
      displayName: TEST_PROFESSIONAL_SEED.companyName,
      username: TEST_PROFESSIONAL_SEED.email,
      password: PROFESSIONAL_USER_PASSWORD,
      role: "Professional",
      professionalId: professional._id.toString(),
      defaultLocale: routing.defaultLocale,
    });
    await logAction({
      userId: "system",
      type: "info",
      category: "Security",
      message: `Seeded user account for professional "${professional.companyName}"`,
      dataTo: { username: user.username, role: user.role },
    });
  }

  return professional._id.toString();
}

async function seedSpouseUser(
  coupleId: string,
  spouse: { firstName: string; lastName: string; email?: string }
): Promise<void> {
  if (!spouse.email) return;

  const existing = await getUserByUsername(spouse.email);
  if (existing) {
    // Repair a dangling link (e.g. the celebration was deleted and re-seeded,
    // so the user still points at the old _id). A Couple user linked to a
    // celebration that still exists is left alone — never steal a valid link.
    if (existing.role !== "Couple" || existing.coupleId === coupleId) return;
    const linked =
      existing.coupleId && ObjectId.isValid(existing.coupleId)
        ? await getCelebrationById(existing.coupleId)
        : null;
    if (linked) return;

    await updateUser(existing._id.toString(), {
      displayName: existing.displayName,
      username: existing.username,
      role: "Couple",
      coupleId,
      defaultLocale: existing.defaultLocale ?? routing.defaultLocale,
    });
    await logAction({
      userId: "system",
      type: "warning",
      category: "Security",
      message: `Re-linked seeded user "${existing.username}" to its celebration (old link was dangling)`,
      dataFrom: { coupleId: existing.coupleId },
      dataTo: { coupleId },
    });
    return;
  }

  const user = await createUser({
    displayName: `${spouse.firstName} ${spouse.lastName}`,
    username: spouse.email,
    password: PROFESSIONAL_USER_PASSWORD,
    role: "Couple",
    coupleId,
    defaultLocale: routing.defaultLocale,
  });
  await logAction({
    userId: "system",
    type: "info",
    category: "Security",
    message: `Seeded user account for "${user.displayName}"`,
    dataTo: { username: user.username, role: user.role, coupleId },
  });
}

async function seedCelebration(professionalId: string, seed: CelebrationSeed): Promise<void> {
  const existing = await listCelebrations();
  const match = existing.find((c) => c.title === seed.title);
  if (match) {
    // Celebration already seeded — still make sure its spouse logins point at it.
    const matchId = match._id.toString();
    await seedSpouseUser(matchId, seed.husband);
    await seedSpouseUser(matchId, seed.wife);
    return;
  }

  const celebration = await createCelebration({
    title: seed.title,
    type: seed.type,
    professionalId,
    husband: seed.husband,
    wife: seed.wife,
  });
  await logAction({
    userId: "system",
    type: "info",
    category: "Celebrations",
    message: `Seeded celebration "${celebration.title}"`,
    dataTo: {
      title: seed.title,
      type: seed.type,
      professionalId,
      husband: seed.husband,
      wife: seed.wife,
    },
  });

  if (seed.info) {
    await updateCelebrationInfo(celebration._id.toString(), {
      title: celebration.title,
      celebrationDate: seed.info.celebrationDate,
      headline: seed.info.headline,
      quote: seed.info.quote,
      countdownParagraph: seed.info.countdownParagraph,
      activeLanguages: seed.info.activeLanguages ?? ["el"],
      maxGuestsPerInvitation: seed.info.maxGuestsPerInvitation,
      showMaxGuests: false,
      showSeating: true,
      showLive: true,
      showReservation: true,
      isSitePublic: false,
    });
    await logAction({
      userId: "system",
      type: "info",
      category: "Celebrations",
      message: `Seeded celebration info for "${celebration.title}"`,
      dataTo: seed.info,
    });
  }

  if (seed.story) {
    await updateCelebrationStory(celebration._id.toString(), seed.story);
    await logAction({
      userId: "system",
      type: "info",
      category: "Celebrations",
      message: `Seeded story info for "${celebration.title}"`,
      dataTo: seed.story,
    });
  }

  if (seed.timeline?.length) {
    for (const item of seed.timeline) {
      const imageFilename = item.imageSourcePath
        ? await saveTimelineImageFromPath(
            professionalId,
            celebration._id.toString(),
            item.imageSourcePath
          )
        : undefined;

      await addTimelineItem(celebration._id.toString(), {
        title: item.title,
        ...(item.description ? { description: item.description } : {}),
        ...(item.date ? { date: item.date } : {}),
        ...(imageFilename ? { imageFilename } : {}),
      });
    }

    await logAction({
      userId: "system",
      type: "info",
      category: "Celebrations",
      message: `Seeded ${seed.timeline.length} timeline item(s) for "${celebration.title}"`,
      dataTo: seed.timeline.map((item) => ({ title: item.title, date: item.date })),
    });
  }

  // Captured (not just inserted) so seed.liveEvents below can resolve its
  // eventIndex/guestIndex into the actual generated ids.
  const insertedEvents: EventItem[] = [];
  if (seed.events?.length) {
    for (const item of seed.events) {
      insertedEvents.push(await addEventItem(celebration._id.toString(), item));
    }

    await logAction({
      userId: "system",
      type: "info",
      category: "Celebrations",
      message: `Seeded ${seed.events.length} event(s) for "${celebration.title}"`,
      dataTo: seed.events.map((item) => ({ title: item.title, date: item.date })),
    });
  }

  const insertedGuests: GuestItem[] = [];
  if (seed.guests?.length) {
    for (const item of seed.guests) {
      insertedGuests.push(await addGuestItem(celebration._id.toString(), item));
    }

    await logAction({
      userId: "system",
      type: "info",
      category: "Celebrations",
      message: `Seeded ${seed.guests.length} guest(s) for "${celebration.title}"`,
      dataTo: seed.guests.map((item) => ({ name: item.name, confirmationDate: item.confirmationDate })),
    });
  }

  if (seed.liveEvents?.length) {
    for (const item of seed.liveEvents) {
      const event = insertedEvents[item.eventIndex];
      const guest = insertedGuests[item.guestIndex];
      if (!event || !guest) continue;

      const imageFilename = await saveLiveEventImageFromPath(
        professionalId,
        celebration._id.toString(),
        item.imageSourcePath
      );

      await addLiveEventItem(celebration._id.toString(), {
        eventId: event.id,
        uploadedByGuestId: guest.id,
        imageFilename,
        uploadedAt: item.uploadedAt,
        title: item.title,
        ...(item.description ? { description: item.description } : {}),
      });
    }

    await logAction({
      userId: "system",
      type: "info",
      category: "Celebrations",
      message: `Seeded ${seed.liveEvents.length} live event photo(s) for "${celebration.title}"`,
      dataTo: seed.liveEvents.map((item) => ({ title: item.title, uploadedAt: item.uploadedAt })),
    });
  }

  const coupleId = celebration._id.toString();
  await seedSpouseUser(coupleId, seed.husband);
  await seedSpouseUser(coupleId, seed.wife);
}

async function seedSubscriptionPackages(): Promise<void> {
  for (const seed of SUBSCRIPTION_PACKAGE_SEEDS) {
    const existing = await getSubscriptionPackageByName(seed.name);
    if (existing) continue;

    const pkg = await createSubscriptionPackage(seed);
    await logAction({
      userId: "system",
      type: "info",
      category: "Settings",
      message: `Seeded subscription package "${pkg.name}"`,
      dataTo: seed,
    });
  }
}

export async function runSeeders(): Promise<void> {
  await ensureUserIndexes();
  await ensureCelebrationIndexes();
  await seedRootUser();
  const testProfessionalId = await seedTestProfessional();
  await seedCelebration(testProfessionalId, TEST_CELEBRATION_SEED);
  await seedSubscriptionPackages();
}
