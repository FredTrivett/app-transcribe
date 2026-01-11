"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
    Loader2,
    Plus,
    Trash2,
    Upload,
    Link2
} from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface DownloadedVideo {
    id: string;
    title: string;
    fileName: string;
    fileKey: string;
    fileSize: number;
    mimeType: string;
    platform: string;
    originalUrl?: string;
    niche?: string;
}

interface QueueItem {
    id: string;
    url: string;
    status: "pending" | "downloading" | "completed" | "error";
    progress: number;
    error?: string;
}

interface VideoDownloaderProps {
    onDownloadComplete?: (video: DownloadedVideo) => void;
}

export function VideoDownloader({ onDownloadComplete }: VideoDownloaderProps) {
    const [urlInput, setUrlInput] = useState("");
    const [quality, setQuality] = useState<string>(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('video-quality') || '360';
        }
        return '360';
    });

    // Persist quality preference
    useEffect(() => {
        localStorage.setItem('video-quality', quality);
    }, [quality]);
    const [queue, setQueue] = useState<QueueItem[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            if (document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement) {
                return;
            }
            const pastedText = e.clipboardData?.getData("text");
            if (pastedText) {
                // Split by newlines and filter valid URLs
                const urls = pastedText
                    .split(/[\n\r]+/)
                    .map(line => line.trim())
                    .filter(line => line && isValidUrl(line));

                if (urls.length > 0) {
                    addMultipleToQueue(urls);
                    toast.success(`${urls.length} link${urls.length > 1 ? 's' : ''} added from clipboard`);
                }
            }
        };

        document.addEventListener("paste", handlePaste);
        return () => document.removeEventListener("paste", handlePaste);
    }, [queue]);

    const isValidUrl = (string: string) => {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    };

    const addToQueue = (urlToAdd: string) => {
        if (!urlToAdd.trim()) return;

        if (queue.some(item => item.url === urlToAdd)) {
            toast.error("Link already in queue");
            return;
        }

        const newItem: QueueItem = {
            id: Math.random().toString(36).substring(7),
            url: urlToAdd,
            status: "pending",
            progress: 0
        };

        setQueue(prev => [...prev, newItem]);
        setUrlInput("");
    };

    const addMultipleToQueue = (urls: string[]) => {
        const existingUrls = new Set(queue.map(item => item.url));
        const newItems: QueueItem[] = [];
        let skipped = 0;

        for (const url of urls) {
            if (existingUrls.has(url)) {
                skipped++;
                continue;
            }
            existingUrls.add(url); // Prevent duplicates within the batch
            newItems.push({
                id: Math.random().toString(36).substring(7),
                url,
                status: "pending",
                progress: 0
            });
        }

        if (newItems.length > 0) {
            setQueue(prev => [...prev, ...newItems]);
        }
        if (skipped > 0) {
            toast.warning(`${skipped} duplicate link${skipped > 1 ? 's' : ''} skipped`);
        }
        setUrlInput("");
    };

    const removeFromQueue = (id: string) => {
        setQueue(prev => prev.filter(item => item.id !== id));
    };

    const processQueue = async () => {
        if (isProcessing) return;
        setIsProcessing(true);

        const pendingItems = queue.filter(item => item.status === "pending");

        for (const item of pendingItems) {
            await downloadItem(item);
        }

        setIsProcessing(false);
    };

    const downloadItem = async (item: QueueItem) => {
        setQueue(prev => prev.map(i => i.id === item.id ? { ...i, status: "downloading", progress: 10 } : i));

        try {
            const progressInterval = setInterval(() => {
                setQueue(prev => prev.map(i =>
                    i.id === item.id && i.status === "downloading"
                        ? { ...i, progress: Math.min(i.progress + 5, 90) }
                        : i
                ));
            }, 500);

            const response = await fetch("/api/download", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    url: item.url,
                    videoQuality: quality,
                }),
            });

            clearInterval(progressInterval);
            const data = await response.json();

            if (!response.ok) throw new Error(data.error || "Failed");

            setQueue(prev => prev.map(i => i.id === item.id ? { ...i, status: "completed", progress: 100 } : i));

            if (onDownloadComplete && data.video) {
                onDownloadComplete(data.video);
            }
        } catch (error) {
            setQueue(prev => prev.map(i => i.id === item.id ? {
                ...i,
                status: "error",
                error: error instanceof Error ? error.message : "Failed"
            } : i));
        }
    };

    const pendingCount = queue.filter(i => i.status === "pending").length;

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header / Input Area */}
            <div className="px-6 pb-6 space-y-6">
                <div className="space-y-3">
                    <Label className="text-xs font-medium text-slate-500 uppercase tracking-widest">Add Video Link</Label>
                    <div className="flex gap-2">
                        <Input
                            placeholder="Paste URL (Cmd+V)"
                            value={urlInput}
                            onChange={(e) => setUrlInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && addToQueue(urlInput)}
                            className="bg-white border-slate-200 focus:ring-1 focus:ring-slate-200 text-slate-800 placeholder:text-slate-400 h-10"
                        />
                        <Button size="icon" variant="outline" onClick={() => addToQueue(urlInput)} className="bg-white border-slate-200 hover:bg-slate-50 text-slate-500 h-10 w-10">
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <div className="space-y-3">
                    <Label className="text-xs font-medium text-slate-500 uppercase tracking-widest">Quality</Label>
                    <Select value={quality} onValueChange={setQuality}>
                        <SelectTrigger className="w-full bg-white border-slate-200 text-slate-700 focus:ring-1 focus:ring-slate-200 h-10">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-none shadow-xl">
                            <SelectItem value="1080">1080p (HD)</SelectItem>
                            <SelectItem value="720">720p</SelectItem>
                            <SelectItem value="480">480p</SelectItem>
                            <SelectItem value="360">360p (Default)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="pt-2">
                    <Button
                        className="w-full bg-slate-900 hover:bg-black text-white font-medium transition-all h-10 rounded-lg"
                        onClick={processQueue}
                        disabled={isProcessing || pendingCount === 0}
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <Upload className="mr-2 h-4 w-4" />
                                Upload All ({pendingCount})
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Queue List */}
            <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-3">
                {queue.length === 0 && (
                    <div className="text-center py-10">
                        <div className="bg-slate-50 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center border border-slate-100">
                            <Link2 className="h-6 w-6 text-slate-300" />
                        </div>
                        <p className="text-sm text-slate-400 font-medium">Queue is empty</p>
                    </div>
                )}

                {queue.map((item) => (
                    <div
                        key={item.id}
                        className={`p-3 rounded-lg border text-sm transition-all bg-white group ${item.status === 'completed' ? 'border-l-4 border-l-green-400' :
                            item.status === 'error' ? 'border-l-4 border-l-red-400' :
                                item.status === 'downloading' ? 'border-l-4 border-l-blue-400' :
                                    'border-white border-l-4 border-l-slate-200'
                            }`}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div className="truncate pr-2 font-medium text-slate-700 w-full font-mono text-xs">
                                {item.url}
                            </div>
                            <button
                                onClick={() => removeFromQueue(item.id)}
                                className="text-slate-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>

                        {(item.status === 'downloading' || item.progress > 0) && (
                            <div className="space-y-1">
                                <div className="flex justify-between text-[10px] text-slate-400 uppercase font-medium">
                                    <span>{item.status}</span>
                                    <span>{item.progress}%</span>
                                </div>
                                <Progress
                                    value={item.progress}
                                    className="h-1 bg-slate-100"
                                />
                            </div>
                        )}

                        {item.status === 'completed' && <div className="text-[10px] text-green-600 font-medium uppercase tracking-wide">Complete</div>}
                        {item.status === 'pending' && <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Pending</div>}

                        {item.error && (
                            <p className="text-xs text-red-500 mt-2 bg-red-50 p-2 rounded">{item.error}</p>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
