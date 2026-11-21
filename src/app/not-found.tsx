import Link from "next/link";
import { ROUTES } from "@/lib/constants";

export default function NotFound() {
  return (
    <main className="page-shell">
      <h1>Page not found</h1>
      <Link href={ROUTES.home} className="mt-4 inline-flex min-h-11 items-center text-primary underline">
        Return home
      </Link>
    </main>
  );
}
