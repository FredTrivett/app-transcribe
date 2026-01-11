"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    ArrowLeft,
    Loader2,
    FileText,
    Video,
    Volume2,
    VolumeX,
    Copy,
    Check,
    RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface VideoData {
    id: string;
    title: string;
    description: string | null;
    fileName: string;
    fileKey: string;
    fileSize: number;
    mimeType: string;
    duration: number | null;
    status: string;
    createdAt: string;
    downloadUrl: string | null;
    platform: string | null;
    originalUrl: string | null;
    niche: string | null;
    transcription: string | null;
    transcriptionStatus: string;
}

export default function VideoDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = use(params);
    const router = useRouter();
    const [video, setVideo] = useState<VideoData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        fetchVideo();
    }, [id]);

    const fetchVideo = async () => {
        try {
            const response = await fetch(`/api/videos/${id}`);
            const data = await response.json();
            if (data.video) {
                setVideo(data.video);
            }
        } catch (error) {
            console.error("Failed to fetch video:", error);
            toast.error("Failed to load video");
        } finally {
            setIsLoading(false);
        }
    };

    const handleTranscribe = async () => {
        if (!video) return;
        setIsTranscribing(true);

        try {
            const response = await fetch("/api/transcribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ videoId: video.id }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Transcription failed");
            }

            setVideo(prev => prev ? {
                ...prev,
                transcription: data.transcription,
                transcriptionStatus: "COMPLETED"
            } : null);

            toast.success(data.cached ? "Transcription loaded from cache" : "Transcription complete!");
        } catch (error) {
            console.error("Transcription error:", error);
            toast.error(error instanceof Error ? error.message : "Transcription failed");
        } finally {
            setIsTranscribing(false);
        }
    };

    const copyTranscription = async () => {
        if (!video?.transcription) return;
        await navigator.clipboard.writeText(video.transcription);
        setCopied(true);
        toast.success("Transcription copied!");
        setTimeout(() => setCopied(false), 2000);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-white">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
        );
    }

    if (!video) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-white gap-4">
                <Video className="h-16 w-16 text-slate-300" />
                <p className="text-slate-500">Video not found</p>
                <Button variant="outline" onClick={() => router.push("/")}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Library
                </Button>
            </div>
        );
    }

    return (
        <main className="h-screen w-full bg-white font-sans overflow-hidden p-4 flex gap-4">
            {/* Back Button */}
            <button
                onClick={() => router.push("/")}
                className="absolute top-8 left-8 z-20 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-sm transition-colors cursor-pointer"
            >
                <ArrowLeft className="h-5 w-5" />
            </button>

            {/* Video Section - 16:9 aspect ratio */}
            <div className="h-full aspect-[9/16] flex-shrink-0 bg-[#F5F5F7] rounded-[22px] overflow-hidden">
                {video.downloadUrl ? (
                    <video
                        src={video.downloadUrl}
                        className="h-full w-full object-contain bg-black"
                        controls
                        loop
                        playsInline
                    />
                ) : (
                    <div className="flex items-center justify-center h-full w-full text-slate-400">
                        <Video className="h-16 w-16" />
                    </div>
                )}
            </div>

            {/* Tools Section - fills remaining width */}
            <div className="flex-1 h-full bg-[#F5F5F7] rounded-[22px] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-slate-200/50 flex-shrink-0">
                    <h1 className="font-heading font-black text-xl text-slate-900 line-clamp-2">
                        {video.title}
                    </h1>
                    <p className="text-sm text-slate-500 mt-1 capitalize font-sans">
                        {video.platform || "Video"} • {video.duration ? `${Math.round(video.duration)}s` : "Unknown duration"}
                    </p>
                </div>

                {/* Tools - Scrollable */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Transcription Tool */}
                    <div className="rounded-xl p-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-slate-600" />
                                <h2 className="font-heading font-bold text-lg text-slate-800">Transcription</h2>
                            </div>
                            {video.transcriptionStatus === "COMPLETED" && (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                                    Complete
                                </span>
                            )}
                        </div>

                        {/* Transcription Content or Button */}
                        {video.transcription ? (
                            <div className="space-y-3">
                                <div className="bg-slate-50 rounded-lg p-4 max-h-[400px] overflow-y-auto">
                                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed font-sans break-words">
                                        {video.transcription}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={copyTranscription}
                                        className="w-full bg-white"
                                    >
                                        {copied ? (
                                            <><Check className="h-4 w-4 mr-2" /> Copied!</>
                                        ) : (
                                            <><Copy className="h-4 w-4 mr-2" /> Copy Text</>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <p className="text-sm text-slate-500 font-sans">
                                    Extract text from this video using OpenAI Whisper. Audio is compressed for efficiency.
                                </p>
                                <Button
                                    onClick={handleTranscribe}
                                    disabled={isTranscribing}
                                    className="w-full bg-slate-900 hover:bg-black text-white"
                                >
                                    {isTranscribing ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Transcribing...
                                        </>
                                    ) : (
                                        <>
                                            <FileText className="h-4 w-4 mr-2" />
                                            Transcribe Video
                                        </>
                                    )}
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Placeholder for future tools */}
                    <div className="text-center py-8">
                        <p className="text-xs text-slate-400 font-sans">
                            More tools coming soon...
                        </p>
                    </div>
                </div>
            </div>
        </main>
    );
}
