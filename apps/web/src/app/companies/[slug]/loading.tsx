export default function CompanyProfileLoading() {
  return (
    <div className="min-h-screen bg-[#F5F7FA] py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="h-4 w-56 rounded-md skeleton-shimmer" />
        <div className="bg-white border border-gray-200/90 rounded-2xl p-4 sm:p-6 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="w-full lg:w-[440px] xl:w-[520px] h-[280px] sm:h-[360px] rounded-2xl skeleton-shimmer shrink-0" />
            <div className="flex-1 space-y-4">
              <div className="h-8 w-2/3 rounded-lg skeleton-shimmer" />
              <div className="h-10 w-full rounded-xl skeleton-shimmer" />
              <div className="h-36 w-full rounded-2xl skeleton-shimmer" />
              <div className="grid grid-cols-2 gap-3">
                <div className="h-12 rounded-xl skeleton-shimmer" />
                <div className="h-12 rounded-xl skeleton-shimmer" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
