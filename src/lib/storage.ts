export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  billToName: string;
  billToAddress: string;
  campaignScope: string;
  lineItems: { description: string; amount: string }[];
  notes: string;
  status: "draft" | "pending" | "paid";
  createdAt: string;
}

export interface Artist {
  id: string;
  name: string;
  stageName: string;
  genre: string;
  email: string;
  phone: string;
  instagram: string;
  spotify: string;
  website: string;
  bio: string;
  monthlyListeners?: string;
  topTracks?: string[];
  imageUrl?: string;
  status: "active" | "prospect" | "onboarding";
  onboardingStep?: "contact" | "call_scheduled" | "proposal_sent" | "signed";
  createdAt: string;
}

const INVOICES_KEY = "nvc_invoices";
const ARTISTS_KEY = "nvc_artists";

function getItem<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function setItem<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function getInvoices(): Invoice[] {
  return getItem<Invoice[]>(INVOICES_KEY, defaultInvoices);
}

export function saveInvoice(invoice: Invoice) {
  const invoices = getInvoices();
  const idx = invoices.findIndex((i) => i.id === invoice.id);
  if (idx >= 0) {
    invoices[idx] = invoice;
  } else {
    invoices.unshift(invoice);
  }
  setItem(INVOICES_KEY, invoices);
  backupToSheet("invoices", invoices);
}

export function getArtists(): Artist[] {
  return getItem<Artist[]>(ARTISTS_KEY, defaultArtists);
}

export function saveArtist(artist: Artist) {
  const artists = getArtists();
  const idx = artists.findIndex((a) => a.id === artist.id);
  if (idx >= 0) {
    artists[idx] = artist;
  } else {
    artists.unshift(artist);
  }
  setItem(ARTISTS_KEY, artists);
  backupToSheet("artists", artists);
}

export async function backupToSheet(sheetName: string, data: unknown[]) {
  const webhookUrl = typeof window !== "undefined"
    ? localStorage.getItem("nvc_sheets_webhook")
    : null;
  if (!webhookUrl) return;
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sheet: sheetName, data }),
    });
  } catch {
    // silent fail for backup
  }
}

const defaultInvoices: Invoice[] = [
  {
    id: "inv-003",
    invoiceNumber: "2026-003",
    date: "2026-04-07",
    billToName: "Create Music Group",
    billToAddress: "1320 North Wilton Place, Los Angeles, CA, 90028",
    campaignScope: "Execution of the P!NK Marketing Campaign, including TikTok influencer campaign, Spotify promotional campaigns, and applicable reimbursements.",
    lineItems: [
      { description: "Rare Fruit Marketing — TikTok influencer campaign + Spotify Promo Campaign", amount: "3000" },
      { description: 'Spotify Marquee "P!NK" Reimbursement', amount: "500" },
    ],
    notes: "Please Double Check Invoice is Accurate! Payment is due upon receipt.",
    status: "pending",
    createdAt: "2026-04-07T00:00:00Z",
  },
  {
    id: "inv-002",
    invoiceNumber: "2026-002",
    date: "2026-03-28",
    billToName: "Atlantic Records",
    billToAddress: "1633 Broadway, New York, NY 10019",
    campaignScope: "Social Media Campaign Q1",
    lineItems: [{ description: "Social Media Campaign Q1 — Full service", amount: "4200" }],
    notes: "Payment is due upon receipt.",
    status: "paid",
    createdAt: "2026-03-28T00:00:00Z",
  },
  {
    id: "inv-001",
    invoiceNumber: "2026-001",
    date: "2026-03-15",
    billToName: "Sony Music",
    billToAddress: "25 Madison Ave, New York, NY 10010",
    campaignScope: "Spotify Playlist Promotion",
    lineItems: [{ description: "Spotify Playlist Promotion — 4 week campaign", amount: "2800" }],
    notes: "Payment is due upon receipt.",
    status: "paid",
    createdAt: "2026-03-15T00:00:00Z",
  },
];

const defaultArtists: Artist[] = [
  {
    id: "artist-saego",
    name: "Saego",
    stageName: "Saego",
    genre: "Hip-Hop / R&B",
    email: "",
    phone: "",
    instagram: "https://www.instagram.com/1saego/",
    spotify: "",
    website: "",
    bio: "Rising artist blending melodic hip-hop with R&B influences. Building a strong following through authentic storytelling and viral social media presence.",
    monthlyListeners: "—",
    imageUrl: "",
    status: "active",
    createdAt: "2026-01-15T00:00:00Z",
  },
  {
    id: "artist-shockface",
    name: "Shöckface",
    stageName: "Shöckface",
    genre: "Electronic / Bass",
    email: "",
    phone: "",
    instagram: "",
    spotify: "",
    website: "https://shockfacemusic.com",
    bio: "Electronic producer and DJ known for heavy bass music and genre-bending productions. Creator of the HYPERWAVE brand. Releases include Helium ft. Lauren Martinez, EXÖDIA, and the SPLITTING EP. Collaborated with artists like ero808, joss lockwood, and Bromar.",
    monthlyListeners: "—",
    topTracks: ["Helium ft. Lauren Martinez", "EXÖDIA ft. 8Ö8", "I Will Survive", "HEADSHÖT", "QÜICKSAND"],
    imageUrl: "",
    status: "active",
    createdAt: "2026-02-01T00:00:00Z",
  },
  {
    id: "artist-kidtrunks",
    name: "Kid Trunks",
    stageName: "Kid Trunks",
    genre: "Hip-Hop / Rap",
    email: "",
    phone: "",
    instagram: "https://www.instagram.com/kidtrunks/",
    spotify: "",
    website: "",
    bio: "South Florida rapper and member of Members Only collective. Known for his association with XXXTENTACION and Ski Mask the Slump God. Brings raw energy and versatility to every track.",
    monthlyListeners: "—",
    imageUrl: "",
    status: "active",
    createdAt: "2025-11-01T00:00:00Z",
  },
];
