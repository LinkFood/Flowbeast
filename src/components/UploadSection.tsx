import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, FileText, CheckCircle, AlertCircle, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { parseCSV, OptionsFlowRecord } from "@/lib/csvParser";
import { useToast } from "@/hooks/use-toast";

export const UploadSection = () => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadStats, setUploadStats] = useState<{ processed: number; errors: number } | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFiles(files);
    }
  };

  const handleFiles = async (files: File[]) => {
    console.log('handleFiles called with:', files);
    
    const csvFiles = files.filter(file => file.name.endsWith('.csv'));
    
    if (csvFiles.length === 0) {
      console.log('No CSV files found');
      toast({
        title: "No CSV files found",
        description: "Please select valid CSV files to upload.",
        variant: "destructive",
      });
      return;
    }

    console.log('CSV files to process:', csvFiles.map(f => f.name));

    if (!user) {
      console.log('User not authenticated');
      toast({
        title: "Authentication required",
        description: "Please log in to upload CSV files.",
        variant: "destructive",
      });
      return;
    }

    console.log('Starting upload process...');
    setUploadStatus('uploading');
    setUploadStats(null);

    try {
      let totalProcessed = 0;
      let totalErrors = 0;

      for (const file of csvFiles) {
        console.log(`Processing file: ${file.name}`);
        const parseResult = await parseCSV(file);
        console.log(`Parse result for ${file.name}:`, parseResult);
        
        if (!parseResult.success) {
          totalErrors += parseResult.totalRecords;
          toast({
            title: `Failed to parse ${file.name}`,
            description: parseResult.errors.slice(0, 3).join(', '),
            variant: "destructive",
          });
          continue;
        }

        // Insert data in batches
        const batchSize = 1000;
        const batches = [];
        for (let i = 0; i < parseResult.data.length; i += batchSize) {
          batches.push(parseResult.data.slice(i, i + batchSize));
        }

        for (const batch of batches) {
          const dbRecords = batch.map((record: OptionsFlowRecord) => ({
            user_id: user.id,
            upload_date: new Date().toISOString().split('T')[0], // Set upload date
            ...record,
          }));

          const { error } = await supabase
            .from('options_flow')
            .insert(dbRecords);

          if (error) {
            console.error('Database insert error:', error);
            totalErrors += batch.length;
          } else {
            totalProcessed += batch.length;
          }
        }

        if (parseResult.errors.length > 0) {
          totalErrors += parseResult.errors.length;
        }
      }

      setUploadStats({ processed: totalProcessed, errors: totalErrors });
      
      if (totalProcessed > 0) {
        setUploadStatus('success');
        toast({
          title: "Upload successful!",
          description: `Processed ${totalProcessed} records${totalErrors > 0 ? ` with ${totalErrors} errors` : ''}`,
        });
      } else {
        setUploadStatus('error');
        toast({
          title: "Upload failed",
          description: "No records were successfully processed.",
          variant: "destructive",
        });
      }

      setTimeout(() => {
        setUploadStatus('idle');
        setUploadStats(null);
      }, 5000);

    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('error');
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
        variant: "destructive",
      });
      
      setTimeout(() => {
        setUploadStatus('idle');
        setUploadStats(null);
      }, 3000);
    }
  };

  return (
    <div className="mb-6">
      <div className="grid lg:grid-cols-3 gap-6">
          {/* Upload Area */}
          <Card className="p-6 bg-slate-900 border-slate-800 lg:col-span-2">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 ${
                dragActive 
                  ? 'border-blue-500 bg-blue-500/10 scale-105' 
                  : uploadStatus === 'success'
                  ? 'border-green-500 bg-green-500/10'
                  : uploadStatus === 'error'
                  ? 'border-red-500 bg-red-500/10'
                  : 'border-slate-600 hover:border-blue-500/50 hover:bg-blue-500/5'
              }`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept=".csv"
                multiple
                onChange={handleFileInput}
                className="hidden"
                id="file-upload"
              />
              
              <div className="flex flex-col items-center space-y-4">
                {uploadStatus === 'uploading' ? (
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
                ) : uploadStatus === 'success' ? (
                  <CheckCircle className="w-10 h-10 text-green-500" />
                ) : uploadStatus === 'error' ? (
                  <AlertCircle className="w-10 h-10 text-red-500" />
                ) : (
                  <Upload className="w-10 h-10 text-slate-400" />
                )}
                
                <div>
                  {uploadStatus === 'uploading' && (
                    <p className="text-lg font-medium text-blue-400">Processing CSV files...</p>
                  )}
                  {uploadStatus === 'success' && (
                    <div>
                      <p className="text-lg font-medium text-green-400">Upload successful!</p>
                      <p className="text-sm text-slate-400">
                        {uploadStats ? `${uploadStats.processed} records processed${uploadStats.errors > 0 ? `, ${uploadStats.errors} errors` : ''}` : 'Flow data added to database'}
                      </p>
                    </div>
                  )}
                  {uploadStatus === 'error' && (
                    <p className="text-lg font-medium text-red-400">Upload failed</p>
                  )}
                  {uploadStatus === 'idle' && (
                    <div>
                      <p className="text-lg font-medium mb-2 text-white">Drop CSV files here</p>
                      <p className="text-sm text-slate-400 mb-4">
                        or click to browse your computer
                      </p>
                      <label htmlFor="file-upload">
                        <Button className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white">
                          Select Files
                        </Button>
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Upload Requirements */}
          <div className="space-y-6">
            <Card className="p-6 bg-gradient-card border-border shadow-terminal">
              <h3 className="font-semibold mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-primary" />
                File Requirements
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-primary rounded-full mr-3" />
                  CSV format from BullFlow.io exports
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-primary rounded-full mr-3" />
                  Contains required columns (ticker, premium, type, etc.)
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-primary rounded-full mr-3" />
                  Maximum file size: 50MB per file
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-primary rounded-full mr-3" />
                  Multiple files can be uploaded at once
                </li>
              </ul>
            </Card>

            <Card className="p-6 bg-gradient-card border-border shadow-terminal">
              <h3 className="font-semibold mb-4 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-accent" />
                Expected Data Structure
              </h3>
              <div className="text-sm text-muted-foreground space-y-1">
                <div className="grid grid-cols-2 gap-2">
                  <span>• time_of_trade</span>
                  <span>• tickerSymbol</span>
                  <span>• premium</span>
                  <span>• optionType</span>
                  <span>• tradeType</span>
                  <span>• score</span>
                  <span>• spotPrice</span>
                  <span>• strikePrice</span>
                  <span>• impliedVolatility</span>
                  <span>• openInterest</span>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-gradient-success border-accent/20 text-white">
              <h3 className="font-semibold mb-2">Recent Upload</h3>
              <p className="text-sm opacity-90">
                Last upload: Today at 9:30 AM
              </p>
              <p className="text-sm opacity-90">
                28,547 new flow records processed
              </p>
          </Card>

          {/* Upload Info */}
          <div className="space-y-4">
            <Card className="p-4 bg-slate-900 border-slate-800">
              <h3 className="font-semibold mb-3 flex items-center text-white">
                <FileText className="w-4 h-4 mr-2 text-blue-400" />
                Upload Requirements
              </h3>
              <ul className="space-y-2 text-sm text-slate-400">
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mr-3" />
                  BullFlow.io CSV exports
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mr-3" />
                  End-of-day data only
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mr-3" />
                  Max 50MB per file
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mr-3" />
                  Multiple files supported
                </li>
              </ul>
            </Card>

            <Card className="p-4 bg-slate-900 border-slate-800">
              <h3 className="font-semibold mb-3 flex items-center text-white">
                <TrendingUp className="w-4 h-4 mr-2 text-green-400" />
                Research Features
              </h3>
              <ul className="space-y-2 text-sm text-slate-400">
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-3" />
                  Pattern detection
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-3" />
                  Unusualness scoring
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-3" />
                  Historical comparison
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-3" />
                  Missed opportunities
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};