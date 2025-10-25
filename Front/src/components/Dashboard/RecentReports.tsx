import { FileText, Download, Eye, Clock, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useEffect } from 'react';
import PDFPreview from '@/components/PDF/PDFPreview';
import { pdfApi, PDFReport, getPDFUrl } from '@/lib/api';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const ITEMS_PER_PAGE = 6;

export default function RecentReports({ searchTerm = '' }: { searchTerm?: string }) {
  const [selectedPDF, setSelectedPDF] = useState<PDFReport | null>(null);
  const [reports, setReports] = useState<PDFReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<PDFReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<PDFReport | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter states
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const data = await pdfApi.getAll();
      setReports(data);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    } finally {
      setLoading(false);
    }
  };

  // Apply filters and sorting
  useEffect(() => {
    let result = [...reports];

    // Apply search term filter
    if (searchTerm) {
      result = result.filter(report => 
        report.file_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = a.file_name;
          bValue = b.file_name;
          break;
        case 'size':
          aValue = a.file_size || 0;
          bValue = b.file_size || 0;
          break;
        case 'date':
        default:
          aValue = new Date(a.generated_at);
          bValue = new Date(b.generated_at);
          break;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredReports(result);
    setTotalPages(Math.ceil(result.length / ITEMS_PER_PAGE));
    setCurrentPage(1); // Reset to first page when filters change
  }, [reports, searchTerm, sortBy, sortOrder]);

  const paginatedReports = filteredReports.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleViewPDF = (report: PDFReport) => {
    setSelectedPDF(report);
  };

  const handleDownloadPDF = (report: PDFReport) => {
    window.open(getPDFUrl(report.file_name), '_blank');
  };

  const handleDeleteClick = (report: PDFReport) => {
    setReportToDelete(report);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!reportToDelete) return;

    setIsDeleting(true);
    try {
      await pdfApi.delete(reportToDelete.id);
      
      // Refresh the reports list
      await fetchReports();
      
      // Close the dialog
      setDeleteDialogOpen(false);
      setReportToDelete(null);
    } catch (error) {
      console.error('Failed to delete report:', error);
      // Error toast is already shown in pdfApi.delete
    } finally {
      setIsDeleting(false);
    }
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(totalPages, page)));
  };

  const clearFilters = () => {
    setSortBy('date');
    setSortOrder('desc');
  };

  const hasActiveFilters = sortBy !== 'date' || sortOrder !== 'desc';

  const renderPaginationButtons = () => {
    const buttons = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    if (startPage > 1) {
      buttons.push(
        <Button
          key={1}
          variant={currentPage === 1 ? "default" : "ghost"}
          onClick={() => goToPage(1)}
          className={`w-7 h-7 p-0 text-xs ${
            currentPage === 1 
              ? 'bg-blue-600 text-white' 
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          1
        </Button>
      );
      
      if (startPage > 2) {
        buttons.push(
          <span key="ellipsis1" className="text-gray-500 dark:text-gray-400 px-1 text-xs">
            ...
          </span>
        );
      }
    }

    for (let page = startPage; page <= endPage; page++) {
      buttons.push(
        <Button
          key={page}
          variant={currentPage === page ? "default" : "ghost"}
          onClick={() => goToPage(page)}
          className={`w-7 h-7 p-0 text-xs ${
            currentPage === page 
              ? 'bg-blue-600 text-white' 
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          {page}
        </Button>
      );
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        buttons.push(
          <span key="ellipsis2" className="text-gray-500 dark:text-gray-400 px-1 text-xs">
            ...
          </span>
        );
      }
      
      buttons.push(
        <Button
          key={totalPages}
          variant={currentPage === totalPages ? "default" : "ghost"}
          onClick={() => goToPage(totalPages)}
          className={`w-7 h-7 p-0 text-xs ${
            currentPage === totalPages 
              ? 'bg-blue-600 text-white' 
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          {totalPages}
        </Button>
      );
    }

    return buttons;
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
        <div className="flex items-center justify-center h-24">
          <div className="text-gray-500 dark:text-gray-400">Loading reports...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent PDF Reports</h2>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {filteredReports.length} report{filteredReports.length !== 1 ? 's' : ''}
          </span>
          
          {/* Sort dropdown positioned to the right */}
          <div className="flex items-center space-x-2">
            <Select 
              value={`${sortBy}-${sortOrder}`} 
              onValueChange={(value) => {
                const [sort, order] = value.split('-');
                setSortBy(sort);
                setSortOrder(order);
              }}
            >
              <SelectTrigger className="w-40 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white text-sm">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white">
                <SelectItem value="date-desc">Newest first</SelectItem>
                <SelectItem value="date-asc">Oldest first</SelectItem>
                <SelectItem value="name-asc">Name A-Z</SelectItem>
                <SelectItem value="name-desc">Name Z-A</SelectItem>
                <SelectItem value="size-asc">Size: Smallest first</SelectItem>
                <SelectItem value="size-desc">Size: Largest first</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button
                onClick={clearFilters}
                variant="outline"
                size="sm"
                className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm h-9"
              >
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3 mb-5">
        {paginatedReports.length === 0 ? (
          <div className="text-center py-6 text-gray-500 dark:text-gray-400">
            {reports.length === 0 ? 'No reports found' : 'No reports match your search'}
            {searchTerm && (
              <div className="mt-2 text-sm">
                Search term: "{searchTerm}"
              </div>
            )}
          </div>
        ) : (
          paginatedReports.map((report, index) => (
            <div
              key={report.id}
              className="flex items-center justify-between p-3 rounded-md border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 animate-fade-in bg-white dark:bg-gray-800"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-700 rounded-md flex items-center justify-center">
                  <FileText className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">{report.file_name}</h3>
                  <div className="flex items-center space-x-3 text-xs text-gray-500 dark:text-gray-400">
                    <span>{new Date(report.generated_at).toLocaleDateString()}</span>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{report.file_size ? Math.round(report.file_size / 1024) + 'KB' : 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => handleViewPDF(report)}
                  title="View PDF"
                >
                  <Eye className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => handleDownloadPDF(report)}
                  title="Download PDF"
                >
                  <Download className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20"
                  onClick={() => handleDeleteClick(report)}
                  title="Delete PDF"
                >
                  <Trash2 className="w-4 h-4 text-red-500 dark:text-red-400" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-4">
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              onClick={() => goToPage(1)}
              disabled={currentPage === 1}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
              title="First page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
              title="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex items-center space-x-1">
            {renderPaginationButtons()}
          </div>

          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
              title="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              onClick={() => goToPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
              title="Last page"
            >
              <ChevronsRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog - Beautiful Bubbly Design */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-white dark:bg-gray-800 border-0 shadow-2xl rounded-3xl overflow-hidden max-w-md">
          {/* Decorative Header Background */}
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-red-500 via-pink-500 to-orange-500 opacity-10"></div>
          
          <AlertDialogHeader className="relative pt-8 pb-4">
            {/* Animated Icon */}
            <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-red-500 to-pink-600 rounded-full flex items-center justify-center shadow-lg animate-bounce">
              <Trash2 className="w-8 h-8 text-white" />
            </div>
            
            <AlertDialogTitle className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-2">
              Delete Report?
            </AlertDialogTitle>
            
            <AlertDialogDescription className="text-center text-gray-600 dark:text-gray-400 px-4 leading-relaxed">
              You're about to delete
              <div className="mt-2 mb-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                <span className="font-semibold text-red-700 dark:text-red-400 break-all">
                  {reportToDelete?.file_name}
                </span>
              </div>
              This action cannot be undone and will permanently remove the PDF file from the system. 🗑️
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <AlertDialogFooter className="flex-col sm:flex-row gap-3 pt-4 pb-6 px-6">
            <AlertDialogCancel 
              className="w-full sm:w-auto bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border-0 text-gray-700 dark:text-gray-300 rounded-xl px-6 py-2.5 font-medium transition-all duration-200 shadow-sm hover:shadow"
              disabled={isDeleting}
            >
              Cancel
            </AlertDialogCancel>
            
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="w-full sm:w-auto bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white rounded-xl px-6 py-2.5 font-medium transition-all duration-200 shadow-lg hover:shadow-xl border-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Deleting...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <Trash2 className="w-4 h-4" />
                  <span>Yes, Delete</span>
                </div>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* PDF Preview Modal */}
      <PDFPreview
        isOpen={selectedPDF !== null}
        onClose={() => setSelectedPDF(null)}
        documentTitle={selectedPDF ? `Risk Analysis Report - ${selectedPDF.file_name}` : ''}
        pdfUrl={selectedPDF ? getPDFUrl(selectedPDF.file_name) : ''}
      />
    </div>
  );
}