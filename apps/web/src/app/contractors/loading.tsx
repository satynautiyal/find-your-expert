export default function ContractorsDirectoryLoading() {
  return (
    <div className="min-h-screen bg-[#F9FAFB] py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
        <div className="h-12 w-full rounded-2xl skeleton-shimmer" />
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4 shadow-2xs"
          >
            <div className="flex flex-col md:flex-row gap-5">
              <div className="w-full md:w-60 h-44 rounded-xl shrink-0 skeleton-shimmer" />
              <div className="flex-1 space-y-3">
                <div className="h-6 rounded w-1/3 skeleton-shimmer" />
                <div className="h-4 rounded w-1/2 skeleton-shimmer" />
                <div className="h-4 rounded w-2/3 skeleton-shimmer" />
                <div className="h-12 rounded-xl w-full mt-4 skeleton-shimmer" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
