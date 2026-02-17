export default function ConfigurationLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-[#096eb6] border-r-transparent" />
        <p className="mt-4 text-sm text-gray-500">Loading configuration...</p>
      </div>
    </div>
  );
}
