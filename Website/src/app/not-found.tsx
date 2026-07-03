import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-16 text-center">
      <h1 className="text-3xl font-bold text-black">Page not found</h1>
      <p className="mt-3 text-secondary">
        The page you are looking for does not exist or has moved.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex rounded-lg bg-primary px-5 py-3 font-semibold text-white transition-colors hover:bg-secondary"
      >
        Go to home
      </Link>
    </div>
  );
}
