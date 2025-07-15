import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, FileText, CheckCircle, AlertCircle, TrendingUp } from "lucide-react";

export const UploadSection = () => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');

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

  const handleFiles = (files: File[]) => {
    const csvFiles = files.filter(file => file.name.endsWith('.csv'));
    if (csvFiles.length > 0) {
      setUploadStatus('uploading');
      // Simulate upload process
      setTimeout(() => {
        setUploadStatus('success');
        setTimeout(() => setUploadStatus('idle'), 3000);
      }, 2000);
    }
  };

  return (
    <section className="container mx-auto px-6 py-16">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Upload Your BullFlow Data</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Drag and drop your daily BullFlow.io CSV exports to start building your historical options flow database.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Upload Area */}
          <Card className="p-8">
            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-all duration-300 ${
                dragActive 
                  ? 'border-primary bg-primary/5 scale-105' 
                  : uploadStatus === 'success'
                  ? 'border-accent bg-accent/5'
                  : uploadStatus === 'error'
                  ? 'border-destructive bg-destructive/5'
                  : 'border-border hover:border-primary/50 hover:bg-primary/5'
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
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
                ) : uploadStatus === 'success' ? (
                  <CheckCircle className="w-12 h-12 text-accent" />
                ) : uploadStatus === 'error' ? (
                  <AlertCircle className="w-12 h-12 text-destructive" />
                ) : (
                  <Upload className="w-12 h-12 text-muted-foreground" />
                )}
                
                <div>
                  {uploadStatus === 'uploading' && (
                    <p className="text-lg font-medium text-primary">Processing CSV files...</p>
                  )}
                  {uploadStatus === 'success' && (
                    <div>
                      <p className="text-lg font-medium text-accent">Upload successful!</p>
                      <p className="text-sm text-muted-foreground">Flow data added to database</p>
                    </div>
                  )}
                  {uploadStatus === 'error' && (
                    <p className="text-lg font-medium text-destructive">Upload failed</p>
                  )}
                  {uploadStatus === 'idle' && (
                    <div>
                      <p className="text-lg font-medium mb-2">Drop CSV files here</p>
                      <p className="text-sm text-muted-foreground mb-4">
                        or click to browse your computer
                      </p>
                      <label htmlFor="file-upload">
                        <Button variant="terminal" className="cursor-pointer">
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
          </div>
        </div>
      </div>
    </section>
  );
};