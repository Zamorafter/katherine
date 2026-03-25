export const APP_TIME_ZONE = "America/La_Paz";

export const TIME_SLOTS = [
  { value: "09:00", label: "9:00 AM" },
  { value: "11:00", label: "11:00 AM" },
  { value: "13:00", label: "1:00 PM" },
  { value: "15:00", label: "3:00 PM" },
] as const;

export const SOCIAL_LINKS = {
  whatsapp:
    process.env.NEXT_PUBLIC_WHATSAPP_URL ?? "https://wa.me/584129281774",
  instagram:
    process.env.NEXT_PUBLIC_INSTAGRAM_URL ??
    "https://www.instagram.com/studiosevenk?igsh=NnoyaHkzeGpxMDFr",
  tiktok:
    process.env.NEXT_PUBLIC_TIKTOK_URL ??
    "https://www.tiktok.com/@studioseven7k?_r=1&_t=ZS-94H64QJZp5w",
};

export const DEFAULT_SERVICES = [
  {
    id: "default-nails",
    slug: "unas",
    name: "Uñas",
    accentColor: "#f28cb4",
  },
  {
    id: "default-lashes",
    slug: "pestanas",
    name: "Pestañas",
    accentColor: "#f7b267",
  },
  {
    id: "default-brows",
    slug: "cejas",
    name: "Cejas",
    accentColor: "#9ac7b8",
  },
] as const;

export const APPOINTMENT_STATUSES = {
  booked: "booked",
  cancelled: "cancelled",
} as const;

export const BOOKING_CHANNEL = "appointments-live";

export const STATUS_LABELS = {
  booked: "Activo",
  cancelled: "Cancelado",
} as const;
