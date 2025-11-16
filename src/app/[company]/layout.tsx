import Navbar from '@/app/components/Navbar';
import CompanySidebar from '@/app/components/CompanySidebar';

export default function CompanyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-full h-screen flex flex-col bg-gray-100 text-[#075a96]">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <CompanySidebar />
        {children}
      </div>
    </div>
  );
}
