import { useState, useEffect } from 'react';
import Sidebar from '@/components/Layout/Sidebar';
import TopNavigation from '@/components/Layout/TopNavigation';
import MetricsCards from '@/components/Dashboard/MetricsCards';
import RecentReports from '@/components/Dashboard/RecentReports';
import ProcessingPanel from '@/components/Dashboard/ProcessingPanel';
import RiskScoreDashboard from '@/components/Analysis/RiskScoreDashboard';
import AnalysisModal from '@/components/Analysis/AnalysisModal';
import FeedbackSystem from '@/components/Feedback/FeedbackSystem';
import AnalysisHistory from '@/components/Analysis/AnalysisHistory';
import SettingsPanel from '@/components/Settings/SettingsPanel';
import RulesManager from '@/components/Rules/RulesManager';
import { pdfApi, PDFReport, analysisApi, PDFAnalysis } from '@/lib/api';

export default function Index() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [recentAnalyses, setRecentAnalyses] = useState<PDFAnalysis[]>([]);
  const [recentReports, setRecentReports] = useState<PDFReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [reports, analyses] = await Promise.all([
        pdfApi.getAll(),
        analysisApi.getRecentAnalyses({ limit: 10, sort_by: 'date', sort_order: 'desc' })
      ]);
      setRecentReports(reports);
      setRecentAnalyses(analyses.filter(item => item.risk_score > 0));
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleNewAnalysis = () => {
    setIsAnalysisModalOpen(true);
  };

  const handleAnalysisStarted = (analysisId: string) => {
    console.log('🔄 Analysis started with ID:', analysisId);
    setCurrentAnalysisId(analysisId);
    setIsAnalysisModalOpen(false);
  };

  const handleAnalysisCompletion = (result: any) => {
    console.log('✅ Analysis completed with result:', result);
    setCurrentAnalysisId(null);
    
    // ✅ Auto-refresh the reports without page reload
    fetchData();
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <MetricsCards />
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2">
                <RecentReports searchTerm={searchTerm} />
              </div>
              <div className="space-y-6">
                <RiskScoreDashboard />
                <ProcessingPanel 
                  analysisId={currentAnalysisId} 
                  onCompletion={handleAnalysisCompletion} 
                />
              </div>
            </div>
          </div>
        );
      case 'analyses':
        return <AnalysisHistory />;
      case 'feedback':
        return <FeedbackSystem />;
      case 'settings':
        return <SettingsPanel />;
      case 'rules':
        return <RulesManager />;
      default:
        return (
          <div className="flex items-center justify-center h-48">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Coming Soon</h2>
              <p className="text-gray-500 dark:text-gray-400">This section is under development</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
      <div className="flex-1 flex flex-col">
        <TopNavigation 
          onNewAnalysis={handleNewAnalysis}
          onSearchChange={setSearchTerm}
          searchTerm={searchTerm}
        />
        
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <div className="text-gray-500 dark:text-gray-400">Loading data...</div>
              </div>
            ) : (
              renderContent()
            )}
          </div>
        </main>
      </div>

      <AnalysisModal
        isOpen={isAnalysisModalOpen}
        onClose={() => setIsAnalysisModalOpen(false)}
        onAnalysisStarted={handleAnalysisStarted}
      />
    </div>
  );
}