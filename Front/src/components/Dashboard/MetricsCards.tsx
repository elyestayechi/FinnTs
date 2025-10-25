import { useState, useEffect } from 'react';
import { TrendingUp, CheckCircle, AlertTriangle, BarChart } from 'lucide-react';
import { analysisApi, PDFAnalysis } from '@/lib/api';

interface Metric {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative';
  icon: any;
  color: string;
}

const colorMap: Record<string, string> = {
  blue: 'from-blue-600 to-blue-700',
  green: 'from-green-500 to-green-600',
  orange: 'from-orange-500 to-orange-600',
  purple: 'from-purple-600 to-purple-700'
};

export default function MetricsCards() {
  const [currentMetrics, setCurrentMetrics] = useState({
    totalAnalyses: 0,
    approvalRate: 0,
    avgRiskScore: 0,
    avgProcessingTime: 0
  });
  const [previousMetrics, setPreviousMetrics] = useState({
    totalAnalyses: 0,
    approvalRate: 0,
    avgRiskScore: 0,
    avgProcessingTime: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        // Get all analyses sorted by date (newest first)
        const allAnalyses = await analysisApi.getRecentAnalyses({ limit: 1000 });
        
        if (allAnalyses.length === 0) {
          setLoading(false);
          return;
        }

        // Sort by date to ensure we have the latest first
        const sortedAnalyses = [...allAnalyses].sort((a, b) => 
          new Date(b.generated_at || b.date).getTime() - new Date(a.generated_at || a.date).getTime()
        );

        // Current metrics = all analyses including the latest one
        const current = calculateMetrics(sortedAnalyses);
        
        // Previous metrics = all analyses EXCEPT the latest one
        const previous = sortedAnalyses.length > 1 
          ? calculateMetrics(sortedAnalyses.slice(1)) 
          : { totalAnalyses: 0, approvalRate: 0, avgRiskScore: 0, avgProcessingTime: 0 };
        
        setCurrentMetrics(current);
        setPreviousMetrics(previous);
      } catch (error) {
        console.error('Failed to fetch metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();

    // Refresh metrics every 30 seconds to catch new analyses
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const calculateMetrics = (analyses: PDFAnalysis[]) => {
    if (analyses.length === 0) {
      return {
        totalAnalyses: 0,
        approvalRate: 0,
        avgRiskScore: 0,
        avgProcessingTime: 0
      };
    }

    const approved = analyses.filter(a => a.decision === 'approve').length;
    
    // Filter out analyses with invalid processing times
    const validProcessingAnalyses = analyses.filter(a => {
      if (a.processing_time === 'N/A' || !a.processing_time) return false;
      
      const timeStr = a.processing_time;
      if (timeStr.includes('min')) {
        const minutes = parseFloat(timeStr.replace('min', ''));
        return !isNaN(minutes) && minutes > 0;
      }
      return false;
    });

    const totalProcessingTimes = validProcessingAnalyses.map(a => {
      const timeStr = a.processing_time;
      return parseFloat(timeStr.replace('min', ''));
    });
    
    const avgProcessingTime = totalProcessingTimes.length > 0 
      ? totalProcessingTimes.reduce((a, b) => a + b, 0) / totalProcessingTimes.length
      : 0;
    
    return {
      totalAnalyses: analyses.length,
      approvalRate: (approved / analyses.length) * 100,
      avgRiskScore: analyses.reduce((sum, a) => sum + a.risk_score, 0) / analyses.length,
      avgProcessingTime
    };
  };

  const calculateChange = (current: number, previous: number): { value: string, type: 'positive' | 'negative' } => {
    if (previous === 0) {
      return { value: 'NEW', type: 'positive' };
    }
    
    const change = ((current - previous) / previous) * 100;
    const absChange = Math.abs(change);
    
    // For very small changes, show them
    if (absChange < 0.1) {
      return { value: '0%', type: 'positive' };
    }
    
    return {
      value: `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`,
      type: change >= 0 ? 'positive' : 'negative'
    };
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-5 animate-pulse">
            <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded mb-4"></div>
            <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  // Calculate changes from previous state (before latest analysis) to current state (with latest analysis)
  const totalChange = calculateChange(currentMetrics.totalAnalyses, previousMetrics.totalAnalyses);
  const approvalChange = calculateChange(currentMetrics.approvalRate, previousMetrics.approvalRate);
  
  // For risk score, lower is better so we invert the type
  const riskChangeCalc = calculateChange(currentMetrics.avgRiskScore, previousMetrics.avgRiskScore);
  const riskChange = {
    value: riskChangeCalc.value,
    type: riskChangeCalc.value === 'NEW' ? 'positive' as const : 
          (parseFloat(riskChangeCalc.value) <= 0 ? 'positive' as const : 'negative' as const)
  };
  
  // For processing time, lower is better
  const processingChangeCalc = calculateChange(currentMetrics.avgProcessingTime, previousMetrics.avgProcessingTime);
  const processingChange = {
    value: processingChangeCalc.value,
    type: processingChangeCalc.value === 'NEW' ? 'positive' as const :
          (parseFloat(processingChangeCalc.value) <= 0 ? 'positive' as const : 'negative' as const)
  };

  const metricsData: Metric[] = [
    {
      title: 'Total Analyses',
      value: currentMetrics.totalAnalyses.toLocaleString(),
      change: totalChange.value,
      changeType: totalChange.type,
      icon: BarChart,
      color: 'blue'
    },
    {
      title: 'Approval Rate',
      value: `${currentMetrics.approvalRate.toFixed(1)}%`,
      change: approvalChange.value,
      changeType: approvalChange.type,
      icon: CheckCircle,
      color: 'green'
    },
    {
      title: 'Avg Risk Score',
      value: currentMetrics.avgRiskScore.toFixed(1),
      change: riskChange.value,
      changeType: riskChange.type,
      icon: AlertTriangle,
      color: 'orange'
    },
    {
      title: 'Avg Processing Time',
      value: currentMetrics.avgProcessingTime > 0 ? `${currentMetrics.avgProcessingTime.toFixed(1)}min` : 'N/A',
      change: processingChange.value,
      changeType: processingChange.type,
      icon: TrendingUp,
      color: 'purple'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {metricsData.map((metric, index) => {
        const Icon = metric.icon;
        
        return (
          <div
            key={metric.title}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5 hover:shadow-md transition-all duration-300 animate-fade-in"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 bg-gradient-to-br ${colorMap[metric.color]} rounded-lg flex items-center justify-center`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div className={`text-xs font-medium px-2 py-0.5 rounded ${
                metric.change === 'NEW' 
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : metric.changeType === 'positive' 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {metric.change}
              </div>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">{metric.value}</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">{metric.title}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}