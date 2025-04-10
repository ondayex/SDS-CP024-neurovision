"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Brain, Upload, Zap } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.neurovision.andy-chen.dev';

export default function BrainTumorDetection() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState<string>("yolo")
  const [isDetecting, setIsDetecting] = useState(false)
  const [detectionResult, setDetectionResult] = useState<any>(null)
  const [scanProgress, setScanProgress] = useState(0)

  // Animation interval for scanning effect
  useEffect(() => {
    let interval: NodeJS.Timeout

    if (isDetecting) {
      interval = setInterval(() => {
        setScanProgress((prev) => {
          if (prev >= 100) return 0
          return prev + 2
        })
      }, 50)
    } else {
      setScanProgress(0)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isDetecting])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setUploadedImage(event.target?.result as string)
        setDetectionResult(null)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDetection = async () => {
    if (!uploadedImage) return;
    
    setIsDetecting(true);
    
    try {
      // Convert base64 to blob
      const base64Data = uploadedImage.split(',')[1];
      const byteCharacters = atob(base64Data);
      const byteArrays = [];
      
      for (let i = 0; i < byteCharacters.length; i++) {
        byteArrays.push(byteCharacters.charCodeAt(i));
      }
      
      const byteArray = new Uint8Array(byteArrays);
      const blob = new Blob([byteArray], { type: 'image/png' });
      
      // Create form data
      const formData = new FormData();
      formData.append('file', blob, 'image.png');
      formData.append('model_name', selectedModel === 'yolo' ? 'YOLOv12' : 'VGG16');
      
      // Make API call
      const response = await fetch(`${API_URL}/predict`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to get prediction');
      }
      
      const result = await response.json();
      
      if (selectedModel === 'yolo') {
        setDetectionResult({
          type: 'yolo',
          confidence: result.confidence,
          boundingBoxes: result.bounding_boxes || [],
        });
      } else {
        setDetectionResult({
          type: 'vgg16',
          confidence: result.confidence,
          originalImage: `data:image/png;base64,${result.original_image}`,
          heatmapImage: `data:image/png;base64,${result.overlay_image}`,
        });
      }
    } catch (error) {
      console.error('Error during detection:', error);
      // You might want to show an error message to the user here
    } finally {
      setIsDetecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      <div className="container mx-auto py-10 px-4">
        <div className="flex flex-col items-center text-center mb-10">
          <div className="bg-gradient-to-r from-teal-500 to-cyan-500 p-4 rounded-2xl mb-5 shadow-lg">
            <Brain className="h-12 w-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
            Brain Tumor Detection System
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-3 max-w-2xl">
            An advanced medical imaging tool that uses deep learning models to detect and analyze potential brain tumors
            from MRI scans.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 border-0 shadow-lg bg-white dark:bg-gray-800 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-750 border-b">
              <CardTitle className="text-2xl">MRI Image Analysis</CardTitle>
              <CardDescription>Upload an MRI scan image and select a detection model to analyze</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {!uploadedImage ? (
                <div
                  className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-12 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-all duration-300"
                  onClick={() => document.getElementById("file-upload")?.click()}
                >
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-full p-3 inline-flex mb-4">
                    <Upload className="h-8 w-8 text-teal-500" />
                  </div>
                  <p className="text-gray-600 dark:text-gray-300">Click to upload or drag and drop</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">MRI image files only (PNG, JPG)</p>
                  <input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="relative aspect-square max-w-md mx-auto rounded-xl overflow-hidden shadow-lg">
                    <Image
                      src={uploadedImage || "/placeholder.svg"}
                      alt="Uploaded MRI scan"
                      fill
                      className="object-cover"
                    />

                    {detectionResult?.type === "yolo" && (
                      <div
                        className="absolute animate-pulse"
                        style={{
                          left: `${detectionResult.boundingBoxes[0].x * 100}%`,
                          top: `${detectionResult.boundingBoxes[0].y * 100}%`,
                          width: `${detectionResult.boundingBoxes[0].width * 100}%`,
                          height: `${detectionResult.boundingBoxes[0].height * 100}%`,
                          border: "3px solid #ef4444",
                          borderRadius: "8px",
                          boxShadow: "0 0 15px rgba(239, 68, 68, 0.5)",
                        }}
                      ></div>
                    )}

                    {isDetecting && (
                      <>
                        {/* Horizontal scanning line */}
                        <div
                          className="absolute left-0 w-full h-1 bg-gradient-to-r from-transparent via-teal-500 to-transparent"
                          style={{
                            top: `${scanProgress}%`,
                            boxShadow: "0 0 15px rgba(20, 184, 166, 0.7)",
                            transition: "top 0.05s linear",
                          }}
                        />

                        {/* Vertical scanning line */}
                        <div
                          className="absolute top-0 h-full w-1 bg-gradient-to-b from-transparent via-teal-500 to-transparent"
                          style={{
                            left: `${scanProgress}%`,
                            boxShadow: "0 0 15px rgba(20, 184, 166, 0.7)",
                            transition: "left 0.05s linear",
                          }}
                        />

                        {/* Scanning overlay */}
                        <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 to-transparent pointer-events-none">
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="px-5 py-3 rounded-full bg-black/60 backdrop-blur-sm text-white text-sm font-medium flex items-center space-x-3 shadow-xl">
                              <svg
                                className="animate-spin h-4 w-4 text-white"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                ></circle>
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                              </svg>
                              <span>{selectedModel === "yolo" ? "YOLO Analysis" : "VGG16 Analysis"}</span>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {!isDetecting && !detectionResult && (
                    <div className="flex items-center justify-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="mr-2"
                            >
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="17 8 12 3 7 8" />
                              <line x1="12" x2="12" y1="3" y2="15" />
                            </svg>
                            Manage Image
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => document.getElementById("file-upload")?.click()}>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="mr-2"
                            >
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="17 8 12 3 7 8" />
                              <line x1="12" x2="12" y1="3" y2="15" />
                            </svg>
                            Upload New Image
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setUploadedImage(null)
                              setDetectionResult(null)
                            }}
                            className="text-red-500 focus:text-red-500"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="mr-2"
                            >
                              <path d="M3 6h18" />
                              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                            </svg>
                            Remove Image
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>
              )}
            </CardContent>

            {uploadedImage && !detectionResult && (
              <CardFooter className="flex flex-col space-y-4 p-6 bg-gray-50 dark:bg-gray-850 border-t">
                <div className="w-full">
                  <Button
                    className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white flex items-center justify-center gap-2 py-6 text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!uploadedImage || isDetecting || selectedModel === "yolo"}
                    onClick={handleDetection}
                  >
                    {isDetecting ? (
                      <>
                        <svg
                          className="animate-spin h-5 w-5 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        <span>Analyzing...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="h-5 w-5" />
                        <span>
                          {selectedModel === "yolo" 
                            ? "YOLOv12 Coming Soon" 
                            : `Detect Tumor with ${selectedModel === "yolo" ? "YOLOv12" : "VGG16"}`}
                        </span>
                      </>
                    )}
                  </Button>
                </div>
              </CardFooter>
            )}

            {detectionResult && (
              <CardFooter className="flex flex-col p-6 bg-gray-50 dark:bg-gray-850 border-t">
                <div className="w-full p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-xl">Detection Results</h3>
                    <Badge
                      variant="outline"
                      className="bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800"
                    >
                      {detectionResult.type === "yolo" ? "YOLOv12" : "VGG16"}
                    </Badge>
                  </div>

                  {detectionResult.type === "yolo" ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                          <p className="text-sm text-gray-500 dark:text-gray-400">Confidence Score</p>
                          <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">
                            {(detectionResult.confidence * 100).toFixed(1)}%
                          </p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                          <p className="text-sm text-gray-500 dark:text-gray-400">Finding</p>
                          <p className="text-xl font-semibold text-red-500 dark:text-red-400">Tumor Detected</p>
                        </div>
                      </div>

                      <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                        <p className="text-sm text-yellow-800 dark:text-yellow-400">
                          <strong>Note:</strong> This is an automated detection result. Please consult with a medical
                          professional for diagnosis.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                          <p className="text-sm text-gray-500 dark:text-gray-400">Confidence Score</p>
                          <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">
                            {(detectionResult.confidence * 100).toFixed(1)}%
                          </p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                          <p className="text-sm text-gray-500 dark:text-gray-400">Finding</p>
                          <p className="text-xl font-semibold text-red-500 dark:text-red-400">Tumor Detected</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-6 mt-6">
                        <div>
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Original Image</p>
                          <div className="relative aspect-square rounded-lg overflow-hidden shadow-md">
                            <Image
                              src={detectionResult.originalImage || uploadedImage || "/placeholder.svg"}
                              alt="Original MRI scan"
                              fill
                              className="object-cover"
                            />
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Grad-CAM Visualization</p>
                          <div className="relative aspect-square rounded-lg overflow-hidden shadow-md">
                            <Image
                              src={detectionResult.heatmapImage || "/placeholder.svg"}
                              alt="Grad-CAM Visualization"
                              fill
                              className="object-cover"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                        <p className="text-sm text-yellow-800 dark:text-yellow-400">
                          <strong>Note:</strong> This is an automated detection result. Please consult with a medical
                          professional for diagnosis.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="mt-6">
                    <Button
                      variant="outline"
                      onClick={() => setDetectionResult(null)}
                      className="border-gray-200 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                    >
                      Back to Detection
                    </Button>
                  </div>
                </div>
              </CardFooter>
            )}
          </Card>

          <Card className="border-0 shadow-lg bg-white dark:bg-gray-800">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-750 border-b">
              <CardTitle>Detection Models</CardTitle>
              <CardDescription>Choose the AI model for tumor detection</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <Tabs defaultValue="yolo" value={selectedModel} onValueChange={setSelectedModel} className="w-full">
                <TabsList className="w-full grid grid-cols-2 mb-6">
                  <TabsTrigger
                    value="yolo"
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white"
                  >
                    YOLOv12
                  </TabsTrigger>
                  <TabsTrigger
                    value="vgg16"
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white"
                  >
                    VGG16
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="yolo" className="pt-2 space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-teal-100 dark:bg-teal-900/30 p-3 rounded-lg">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-teal-600 dark:text-teal-400"
                      >
                        <rect width="18" height="18" x="3" y="3" rx="2" />
                        <circle cx="9" cy="9" r="2" />
                        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                      </svg>
                    </div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-lg">YOLOv12 Model</h4>
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800">
                        Available Soon
                      </Badge>
                    </div>
                  </div>

                  <p className="text-gray-600 dark:text-gray-300">
                    YOLOv12 is an object detection model that can identify and localize tumors in MRI images with high
                    precision. It uses a single neural network to predict bounding boxes and class probabilities
                    directly from full images in one evaluation.
                  </p>

                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">Speed</h5>
                      <div className="flex mt-1">
                        <div className="h-2 bg-teal-500 rounded-full w-4/5"></div>
                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full w-1/5"></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Very Fast</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">Precision</h5>
                      <div className="flex mt-1">
                        <div className="h-2 bg-teal-500 rounded-full w-3/4"></div>
                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full w-1/4"></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">High</p>
                    </div>
                  </div>

                  <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <p className="text-sm text-yellow-800 dark:text-yellow-400">
                      <strong>Coming Soon:</strong> The YOLOv12 model is currently under development and will be available in a future update.
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="vgg16" className="pt-2 space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-cyan-100 dark:bg-cyan-900/30 p-3 rounded-lg">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-cyan-600 dark:text-cyan-400"
                      >
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                        <polyline points="3.29 7 12 12 20.71 7" />
                        <line x1="12" x2="12" y1="22" y2="12" />
                      </svg>
                    </div>
                    <h4 className="font-semibold text-lg">VGG16 Model</h4>
                  </div>

                  <p className="text-gray-600 dark:text-gray-300">
                    VGG16 is a convolutional neural network model that excels at image classification tasks. For tumor
                    detection, it has been fine-tuned to identify patterns associated with tumorous tissue in MRI scans
                    and generate detailed heatmaps.
                  </p>

                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">Speed</h5>
                      <div className="flex mt-1">
                        <div className="h-2 bg-cyan-500 rounded-full w-3/5"></div>
                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full w-2/5"></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Moderate</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">Precision</h5>
                      <div className="flex mt-1">
                        <div className="h-2 bg-cyan-500 rounded-full w-5/6"></div>
                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full w-1/6"></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Very High</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t">
                    <h5 className="text-sm font-medium mb-2">Key Features</h5>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-cyan-500"
                        >
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                        Generates detailed CAD-gram heatmaps
                      </li>
                      <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-cyan-500"
                        >
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                        Excellent at tissue classification
                      </li>
                      <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-cyan-500"
                        >
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                        High sensitivity for subtle abnormalities
                      </li>
                    </ul>
                  </div>

                  <div className="mt-8 pt-8 border-t">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-gray-600 dark:text-gray-300"
                        >
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                      </div>
                      <h4 className="font-semibold text-lg">Training Dataset</h4>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">Ultralytics YOLO</h5>
                        <Badge
                          variant="outline"
                          className="bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700"
                        >
                          AGPL-3.0 license
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Official brain tumor detection dataset from Ultralytics, optimized for YOLO models.
                      </p>
                      <div className="mt-2 text-xs text-teal-600 dark:text-teal-400">
                        <a
                          href="https://docs.ultralytics.com/datasets/detect/brain-tumor/"
                          className="flex items-center gap-1 hover:underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                          </svg>
                          Documentation
                        </a>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-teal-50 dark:bg-teal-900/20 p-4 rounded-lg">
                        <h5 className="text-sm font-medium text-teal-700 dark:text-teal-400 mb-1">Training Images</h5>
                        <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">893</p>
                      </div>
                      <div className="bg-cyan-50 dark:bg-cyan-900/20 p-4 rounded-lg">
                        <h5 className="text-sm font-medium text-cyan-700 dark:text-cyan-400 mb-1">Validation Images</h5>
                        <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">223</p>
                      </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg mb-4">
                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Classes</h5>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                          <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                          <span className="text-sm text-gray-600 dark:text-gray-300">0: negative</span>
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                          <span className="text-sm text-gray-600 dark:text-gray-300">1: positive</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Dataset Structure</h5>
                      <div className="bg-black/80 text-green-400 p-3 rounded font-mono text-xs overflow-x-auto">
                        <pre className="whitespace-pre-wrap">
                          {`# parent
├── ultralytics
└── datasets
    └── brain-tumor  ← downloads here (4.05 MB)

# Train/val/test sets
path: ../datasets/brain-tumor # dataset root dir
train: train/images # 893 images
val: valid/images # 223 images`}
                        </pre>
                      </div>
                      <div className="mt-3 flex justify-end">
                        <a
                          href="https://github.com/ultralytics/assets/releases/download/v0.0.0/brain-tumor.zip"
                          className="text-xs flex items-center gap-1 text-teal-600 dark:text-teal-400 hover:underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                          </svg>
                          Download Dataset
                        </a>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

