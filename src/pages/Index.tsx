
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, Upload, Search, BarChart3, Tags, Download, Copy, TestTube } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Camera Validation System
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Professional camera testing and validation platform for mixed reality applications
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Image Upload
              </CardTitle>
              <CardDescription>
                Upload test images with comprehensive metadata
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Store images with camera module info, test campaigns, scene types, and custom tags.
              </p>
              <div className="text-xs text-muted-foreground">
                POST /functions/v1/image-upload
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Quality Metrics
              </CardTitle>
              <CardDescription>
                Ingest detailed image quality measurements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Track sharpness, noise, flare, chromatic aberration, and 10+ other metrics.
              </p>
              <div className="text-xs text-muted-foreground">
                POST /functions/v1/metrics-ingest
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                Advanced Querying
              </CardTitle>
              <CardDescription>
                Search and filter images by multiple criteria
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Filter by camera type, scene, metrics thresholds, date ranges, and tags.
              </p>
              <div className="text-xs text-muted-foreground">
                GET /functions/v1/query-images
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tags className="w-5 h-5" />
                Metadata Updates
              </CardTitle>
              <CardDescription>
                Update tags and notes for existing images
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Add, remove, or replace tags and update notes with flexible operations.
              </p>
              <div className="text-xs text-muted-foreground">
                POST /functions/v1/update-tags
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                Dataset Export
              </CardTitle>
              <CardDescription>
                Export filtered datasets for analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Generate exports with signed URLs and comprehensive metadata in JSON/CSV formats.
              </p>
              <div className="text-xs text-muted-foreground">
                POST /functions/v1/export-dataset
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Copy className="w-5 h-5" />
                Duplicate Detection
              </CardTitle>
              <CardDescription>
                Identify and manage duplicate images
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Use perceptual hashing to find similar images with configurable thresholds.
              </p>
              <div className="text-xs text-muted-foreground">
                POST /functions/v1/deduplication-job
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-center gap-4">
          <Link to="/api-test">
            <Button size="lg" className="gap-2">
              <TestTube className="w-5 h-5" />
              Test API Endpoints
            </Button>
          </Link>
          <Button variant="outline" size="lg" className="gap-2">
            <Database className="w-5 h-5" />
            View Documentation
          </Button>
        </div>

        <div className="mt-12 bg-muted/50 rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Test Data Available</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium mb-2">Sample Images</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 19 test images across 9 camera types</li>
                <li>• RGB, IR, Depth, Eye Tracking, and more</li>
                <li>• Various scene types and lighting conditions</li>
                <li>• Realistic quality metrics included</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-2">API Endpoints</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Authentication with Supabase JWT</li>
                <li>• Image upload with metadata</li>
                <li>• Quality metrics ingestion</li>
                <li>• Advanced filtering and export</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
