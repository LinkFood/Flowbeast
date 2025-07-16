import { useState } from "react";
import { Header } from "@/components/Header";
import { ResearchHeader } from "@/components/ResearchHeader";
import { ResearchSidebar } from "@/components/ResearchSidebar";
import { DashboardSection } from "@/components/DashboardSection";
import { UploadSection } from "@/components/UploadSection";

const Index = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [researchFilters, setResearchFilters] = useState<any>({});

  return (
    <div className="min-h-screen bg-slate-950">
      <Header />
      <ResearchHeader />
      <div className="flex">
        <ResearchSidebar 
          onFiltersChange={setResearchFilters}
          selectedDate={selectedDate}
        />
        <div className="flex-1 overflow-hidden">
          <div className="p-6">
            <UploadSection />
            <DashboardSection 
              researchFilters={researchFilters}
              selectedDate={selectedDate}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
