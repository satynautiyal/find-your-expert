import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-cream-100 flex items-center justify-center p-6 text-center">
      <div className="space-y-4 max-w-sm">
        <div className="font-mono text-xs text-ochre-700 font-bold uppercase tracking-wider">
          404 / PAGE NOT FOUND
        </div>
        <h2 className="text-2xl font-bold text-charcoal-900">
          Page Not Found
        </h2>
        <p className="text-xs text-charcoal-600">
          The requested page or contractor profile could not be found.
        </p>
        <Link
          href="/"
          className="inline-block px-4 py-2 bg-ochre-500 hover:bg-ochre-600 text-charcoal-900 font-semibold text-xs rounded-lg transition-colors"
        >
          Return to Directory &rarr;
        </Link>
      </div>
    </div>
  );
}
