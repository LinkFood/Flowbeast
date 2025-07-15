import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { UploadSection } from "@/components/UploadSection";
import { DashboardSection } from "@/components/DashboardSection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Hero />
      <UploadSection />
      <DashboardSection />
    </div>
  );
};

export default Index;
