import { EButton } from '@/components/EComponents';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 text-xs text-gray-500 pt-10 pb-8 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand info */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center shadow-2xs">
                <svg className="w-3.5 h-3.5 fill-white" viewBox="0 0 24 24">
                  <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                </svg>
              </div>
              <span className="text-base font-black text-gray-950 tracking-tight">
                FindYour<span className="text-primary-dark">Experts</span>
              </span>
            </div>
            <p className="text-xs text-gray-500 max-w-sm leading-relaxed">
              FindYourExperts is an independent, proprietary comparison platform connecting homeowners with verified roofing contractors across the five boroughs of New York City.
            </p>
          </div>

          {/* NYC Boroughs */}
          <div>
            <h4 className="font-bold text-gray-900 uppercase text-[11px] mb-3 tracking-wider">
              NYC Boroughs
            </h4>
            <ul className="space-y-1.5 text-xs text-gray-600">
              <li><a href="#" className="hover:text-gray-950 transition-colors">Manhattan Roofers</a></li>
              <li><a href="#" className="hover:text-gray-950 transition-colors">Brooklyn Roofers</a></li>
              <li><a href="#" className="hover:text-gray-950 transition-colors">Queens Roofers</a></li>
              <li><a href="#" className="hover:text-gray-950 transition-colors">Bronx Roofers</a></li>
              <li><a href="#" className="hover:text-gray-950 transition-colors">Staten Island Roofers</a></li>
            </ul>
          </div>

          {/* Roofing Categories */}
          <div>
            <h4 className="font-bold text-gray-900 uppercase text-[11px] mb-3 tracking-wider">
              Roofing Categories
            </h4>
            <ul className="space-y-1.5 text-xs text-gray-600">
              <li><a href="#" className="hover:text-gray-950 transition-colors">Flat Roof Systems</a></li>
              <li><a href="#" className="hover:text-gray-950 transition-colors">Asphalt Shingle Repair</a></li>
              <li><a href="#" className="hover:text-gray-950 transition-colors">Storm Damage Restoration</a></li>
              <li><a href="#" className="hover:text-gray-950 transition-colors">Commercial Roofs</a></li>
              <li><a href="#" className="hover:text-gray-950 transition-colors">Emergency Leak Tarping</a></li>
            </ul>
          </div>

          {/* For Contractors */}
          <div>
            <h4 className="font-bold text-gray-900 uppercase text-[11px] mb-3 tracking-wider">
              For Contractors
            </h4>
            <p className="text-xs text-gray-500 leading-relaxed mb-3">
              Are you a licensed NYC roofer? Claim your company profile to receive verified homeowner inquiries.
            </p>
            <EButton variant="outline" size="sm">
              Claim Profile
            </EButton>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-gray-400">
          <p>&copy; 2026 FindYourExperts Inc. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <a href="#" className="hover:text-gray-600 transition-colors">Privacy Policy</a>
            <span>|</span>
            <a href="#" className="hover:text-gray-600 transition-colors">Terms of Use</a>
            <span>|</span>
            <a href="#" className="hover:text-gray-600 transition-colors">Ratings Methodology</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
