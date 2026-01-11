"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    Trash2,
    Download,
    Youtube,
    Instagram,
    Linkedin,
    Video,
    Volume2,
    VolumeX,
    ExternalLink,
    Play,
    Pause,
    FileText
} from "lucide-react";
import { toast } from "sonner";

// Platform icons mapping
const PlatformIcon = ({ platform, className }: { platform?: string | null, className?: string }) => {
    const p = (platform || "").toLowerCase();
    if (p.includes("youtube") || p.includes("youtu")) return <Youtube className={className} />;
    if (p.includes("instagram")) return <Instagram className={className} />;
    if (p.includes("linkedin")) return <Linkedin className={className} />;
    if (p.includes("tiktok")) return <TikTokIcon className={className} />;
    return <Video className={className} />;
};

function TikTokIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
        </svg>
    );
}

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
    transcriptionStatus?: string | null;
}

interface VideoCardProps {
    video: VideoData;
    isGlobalMuted: boolean;
    onToggleMute: (e: React.MouseEvent) => void;
    onDelete: (id: string) => void;
    onContextMenu: (e: React.MouseEvent, id: string) => void;
    onDownload: (e: React.MouseEvent, video: VideoData) => void;
}

export function VideoCard({ video, isGlobalMuted, onToggleMute, onDelete, onContextMenu, onDownload }: VideoCardProps) {
    const router = useRouter();
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isHovering, setIsHovering] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [manuallyPaused, setManuallyPaused] = useState(false);
    const [duration, setDuration] = useState(0);

    // Initial state: Dark (via overlay opacity)
    // Hover state: Light (remove overlay)

    const handleMouseEnter = () => {
        setIsHovering(true);
        if (videoRef.current && !manuallyPaused) {
            videoRef.current.play().catch(() => { });
            setIsPlaying(true);
        }
    };

    const handleMouseLeave = () => {
        setIsHovering(false);
        if (videoRef.current) {
            videoRef.current.pause();
            setIsPlaying(false);
            if (!manuallyPaused) {
                videoRef.current.currentTime = 0; // Reset if not manually paused
            }
        }
    };

    const togglePlayPause = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
                setIsPlaying(false);
                setManuallyPaused(true); // User explicitly paused
            } else {
                videoRef.current.play().catch(() => { });
                setIsPlaying(true);
                setManuallyPaused(false); // User explicitly played
            }
        }
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            const current = videoRef.current.currentTime;
            const total = videoRef.current.duration || 1;
            setProgress((current / total) * 100);
            setDuration(total);
        }
    };

    const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        if (videoRef.current) {
            const time = (val / 100) * (videoRef.current.duration || 1);
            videoRef.current.currentTime = time;
            setProgress(val);
        }
    };

    return (
        <div
            className="group flex flex-col gap-0 bg-white rounded-xl overflow-hidden transition-all duration-300 relative select-none"
            onContextMenu={(e) => onContextMenu(e, video.id)}
        >
            {/* Media Area (9:16 aspect mostly) */}
            <div
                className="relative aspect-[9/16] bg-black cursor-pointer group/video"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onClick={togglePlayPause}
            >
                {video.downloadUrl ? (
                    <video
                        src={video.downloadUrl}
                        className="w-full h-full object-cover"
                        loop
                        muted={isGlobalMuted}
                        playsInline
                        ref={videoRef}
                        onTimeUpdate={handleTimeUpdate}
                    />
                ) : (
                    <div className="flex items-center justify-center h-full text-slate-500">
                        <Video className="h-8 w-8" />
                    </div>
                )}

                {/* Dark Overlay (Default: Visible, Hover: Hidden) */}
                <div className={`absolute inset-0 bg-black/40 transition-opacity duration-300 pointer-events-none ${isHovering || isPlaying ? 'opacity-0' : 'opacity-100'}`} />

                {/* Controls Overlay - Only visible on hover */}
                <div className={`absolute inset-0 flex flex-col justify-between p-4 transition-opacity duration-300 ${isHovering ? 'opacity-100' : 'opacity-0'}`}>

                    {/* Top Left: Download */}
                    <div className="flex justify-between items-start pointer-events-none">
                        {video.downloadUrl && (
                            <button
                                className="bg-white/20 hover:bg-white/40 text-white p-2 rounded-full backdrop-blur-md transition-colors pointer-events-auto cursor-pointer"
                                onClick={(e) => onDownload(e, video)}
                            >
                                <Download className="h-4 w-4" />
                            </button>
                        )}
                        {/* Pause Indicator if manually paused */}
                        {manuallyPaused && (
                            <div className="bg-black/50 p-2 rounded-full backdrop-blur-sm">
                                <Pause className="h-4 w-4 text-white" />
                            </div>
                        )}
                    </div>

                    {/* Bottom Right: Mute */}
                    <div className="flex justify-end pointer-events-none">
                        <button
                            onClick={onToggleMute}
                            className="bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-sm transition-colors pointer-events-auto cursor-pointer"
                        >
                            {isGlobalMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                        </button>
                    </div>
                </div>

                {/* Progress Scrub Bar (Bottom) */}
                <div className={`absolute bottom-0 left-0 right-0 h-1.5 bg-white/20 hover:h-2.5 transition-all group-hover/video:opacity-100 opacity-0`} onClick={(e) => e.stopPropagation()}>
                    <div
                        className="h-full bg-slate-900/80 absolute top-0 left-0"
                        style={{ width: `${progress}%` }}
                    />
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={progress}
                        onChange={handleScrub}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                </div>
            </div>

            {/* Metadata Block - Clickable to open detail page */}
            <div
                className="p-4 space-y-3 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => router.push(`/video/${video.id}`)}
            >
                {/* Title & Platform */}
                <div className="space-y-1">
                    <h3 className="font-heading font-black text-slate-900 text-base leading-tight line-clamp-2" title={video.title}>
                        {video.title}
                    </h3>
                    <div className="flex items-center gap-1.5 text-slate-500 text-xs font-normal">
                        <PlatformIcon platform={video.platform} className="h-3.5 w-3.5" />
                        <span className="capitalize font-sans">{video.platform || "Video"}</span>
                        {video.transcriptionStatus === "COMPLETED" && (
                            <span className="ml-auto flex items-center gap-1 text-green-600 bg-green-50 px-1.5 py-0.5 rounded-md text-[10px] font-medium">
                                <FileText className="h-3 w-3" />
                                Transcribed
                            </span>
                        )}
                    </div>
                </div>

                {/* Optional Details (Only if present) */}
                {(video.niche || video.originalUrl) && (
                    <div className="pt-2 border-t border-slate-50 flex flex-wrap gap-2 text-xs">
                        {video.niche && (
                            <span className="bg-slate-50 text-slate-600 px-2 py-1 rounded-md font-sans">
                                {video.niche}
                            </span>
                        )}
                        {video.originalUrl && (
                            <a
                                href={video.originalUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-blue-50 text-blue-600 px-2 py-1 rounded-md hover:bg-blue-100 transition-colors flex items-center gap-1 font-sans"
                                onClick={(e) => e.stopPropagation()}
                            >
                                Src <ExternalLink className="h-3 w-3" />
                            </a>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
