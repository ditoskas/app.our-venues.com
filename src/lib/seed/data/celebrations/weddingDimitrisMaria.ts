import { routing } from "@/i18n/routing";
import { SEED_ASSETS } from "../../assets";
import type { CelebrationSeed } from "../../types";

// The showcase celebration: every tab fully populated (info, story +
// timeline, events with map points, guests in every RSVP state, live-event
// photos, hero + invitation images) and the only one whose spouses get
// Couple logins. Content comes from the wedding-planner template the user
// supplied (its STORY / EVENTS + LOCATIONS data), translated to el/en/ru.
export const WEDDING_DIMITRIS_MARIA: CelebrationSeed = {
  title: "Dimitris & Maria Marriage",
  type: "Marriage",
  createCoupleLogins: true,
  subdomainLabel: "dimitris-and-maria-with-love",
  heroBackgroundSourcePath: SEED_ASSETS.story3,
  invitationSourcePath: SEED_ASSETS.story1,
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
    showMaxGuests: false,
    showSeating: true,
    showLive: true,
    showReservation: true,
    isSitePublic: false,
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
      imageSourcePath: SEED_ASSETS.story1,
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
      imageSourcePath: SEED_ASSETS.story2,
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
      imageSourcePath: SEED_ASSETS.story3,
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
  // Story timeline (see SEED_ASSETS) since there are no
  // dedicated live-event seed images.
  liveEvents: [
    {
      eventIndex: 1, // Holy Marriage Union Ceremony
      guestIndex: 0, // Marco Rossi
      title: "The Vows",
      description: "Right after they exchanged rings — the whole church went quiet.",
      uploadedAt: new Date(Date.UTC(2026, 8, 12, 16, 45)),
      imageSourcePath: SEED_ASSETS.story1,
    },
    {
      eventIndex: 2, // Grand Banquet Reception & Ballroom Ball
      guestIndex: 1, // Sofia Moretti
      title: "First Dance",
      description: "Everyone rushed the dance floor the moment the band started playing.",
      uploadedAt: new Date(Date.UTC(2026, 8, 12, 21, 30)),
      imageSourcePath: SEED_ASSETS.story2,
    },
  ],
};
