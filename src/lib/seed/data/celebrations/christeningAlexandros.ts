import { routing } from "@/i18n/routing";
import { SEED_ASSETS } from "../../assets";
import type { CelebrationSeed } from "../../types";

// Third customer: a christening (the other CelebrationType), fully populated,
// no Couple logins. husband/wife are the child's parents — the model has no
// godparent/child fields yet (see CLAUDE.md "Celebrations"). Only Greek and
// English are active here, so the RU tab is hidden for this one.
export const CHRISTENING_ALEXANDROS: CelebrationSeed = {
  title: "Christening of Alexandros",
  type: "Christening",
  createCoupleLogins: false,
  heroBackgroundSourcePath: SEED_ASSETS.story1,
  invitationSourcePath: SEED_ASSETS.story2,
  husband: {
    firstName: "Giorgos",
    lastName: "Ioannou",
    mobile: "6977888999",
    email: "giorgos.ioannou@example.com",
  },
  wife: {
    firstName: "Katerina",
    lastName: "Ioannou",
    mobile: "6977000111",
    email: "katerina.ioannou@example.com",
  },
  info: {
    celebrationDate: new Date(Date.UTC(2027, 3, 25)),
    headline: {
      el: "Η Βάπτιση του Αλέξανδρου",
      en: "The Christening of Alexandros",
      ru: "Крещение Александроса",
    },
    quote: {
      el: "Ένα μικρό θαύμα που έκανε τη ζωή μας μεγαλύτερη.",
      en: "A little miracle who made our world so much bigger.",
      ru: "Маленькое чудо, которое сделало наш мир намного больше.",
    },
    countdownParagraph: {
      el: "Σας περιμένουμε να μοιραστούμε μαζί τη χαρά της βάπτισης του γιου μας.",
      en: "Join us to share the joy of our son's christening.",
      ru: "Присоединяйтесь к нам, чтобы разделить радость крещения нашего сына.",
    },
    activeLanguages: routing.locales.filter((l) => l !== "ru"),
    maxGuestsPerInvitation: 6,
    showMaxGuests: false,
    showSeating: false,
    showLive: false,
    showReservation: true,
    isSitePublic: false,
  },
  story: {
    storyTitle: { el: "Καλώς ήρθες, Αλέξανδρε", en: "Welcome, Alexandros" },
    storySubtitle: { el: "Ο πρώτος μας χρόνος", en: "Our first year" },
    storyParagraph: {
      el: "Από την πρώτη μέρα στο μαιευτήριο ως τα πρώτα του βήματα.",
      en: "From the very first day at the hospital to his very first steps.",
    },
  },
  timeline: [
    {
      title: { el: "Η Γέννηση", en: "Born" },
      description: { el: "3,4 κιλά χαμόγελο.", en: "3.4 kilos of smiles." },
      date: new Date(Date.UTC(2026, 4, 2)),
      imageSourcePath: SEED_ASSETS.story1,
    },
    {
      title: { el: "Τα Πρώτα Βήματα", en: "First Steps" },
      description: {
        el: "Κατευθείαν προς τη γάτα, φυσικά.",
        en: "Straight towards the cat, of course.",
      },
      date: new Date(Date.UTC(2027, 1, 14)),
      imageSourcePath: SEED_ASSETS.story2,
    },
  ],
  events: [
    {
      title: { el: "Μυστήριο της Βάπτισης", en: "Christening Ceremony" },
      description: {
        el: "Στον Ιερό Ναό Αγίου Δημητρίου, στις 12:00.",
        en: "At the Church of Agios Dimitrios, at 12:00.",
      },
      area: "Ceremony",
      date: new Date(Date.UTC(2027, 3, 25)),
      address: "Agiou Dimitriou 83",
      city: "Thessaloniki",
      postCode: "54633",
      country: "Greece",
      mapLat: 40.6401,
      mapLng: 22.9479,
    },
    {
      title: { el: "Γιορτή μετά τη Βάπτιση", en: "Christening Party" },
      description: {
        el: "Φαγητό, παιχνίδια για τα παιδιά και μπομπονιέρες.",
        en: "Lunch, games for the kids and favours for everyone.",
      },
      area: "Reception",
      date: new Date(Date.UTC(2027, 3, 25)),
      address: "Leoforos Nikis 25",
      city: "Thessaloniki",
      postCode: "54622",
      country: "Greece",
      mapLat: 40.6327,
      mapLng: 22.9411,
    },
  ],
  guests: [
    {
      name: "Nonos Petros Alexiou",
      phone: "+306972220001",
      email: "petros.alexiou@example.com",
      expectedAttendees: 2,
      confirmedAttendees: 2,
      confirmationDate: new Date(Date.UTC(2027, 3, 1)),
    },
    {
      name: "Theia Maria Ioannou",
      phone: "+306972220002",
      expectedAttendees: 4,
    },
    {
      name: "Family Karras",
      email: "karras.family@example.com",
      expectedAttendees: 5,
      confirmedAttendees: 4,
      confirmationDate: new Date(Date.UTC(2027, 3, 5)),
    },
  ],
};
