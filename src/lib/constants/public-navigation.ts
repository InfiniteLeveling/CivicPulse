export const publicDestinations = {
  home: "/#home",
  report: "/report",
  map: "/map",
  signIn: "/login",
  register: "/register",
} as const;

export const publicLinks = [
  { label: "Home", href: publicDestinations.home },
  { label: "Features", href: "/#features" },
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Explore Map", href: publicDestinations.map },
  { label: "About", href: "/#about" },
] as const;
