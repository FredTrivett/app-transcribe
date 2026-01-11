"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Video, Trash2, X } from "lucide-react";
import { VideoCard } from "@/components/video-card";

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
}

interface VideoListProps {
    refreshTrigger?: number;
}

export function VideoList({ refreshTrigger }: VideoListProps) {
    const [videos, setVideos] = useState<VideoData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isGlobalMuted, setIsGlobalMuted] = useState(true); // Default muted

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, videoId: string } | null>(null);

    const fetchVideos = async () => {
        try {
            const response = await fetch("/api/videos");
            const data = await response.json();
            if (data.videos) {
                setVideos(data.videos);
            }
        } catch (error) {
            console.error("Failed to fetch videos:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchVideos();
    }, [refreshTrigger]);

    // Close menu on global click/scroll
    useEffect(() => {
        const closeMenu = () => setContextMenu(null);
        window.addEventListener("click", closeMenu);
        window.addEventListener("scroll", closeMenu, true); // true for capture (scroll inside div)
        return () => {
            window.removeEventListener("click", closeMenu);
            window.removeEventListener("scroll", closeMenu, true);
        };
    }, []);

    const handleDelete = async (id: string) => {

        try {
            // Optimistic update
            setVideos((prev) => prev.filter((v) => v.id !== id));
            toast.success("Video deleted");

            const response = await fetch(`/api/videos?id=${id}`, {
                method: "DELETE",
            });

            if (!response.ok) throw new Error("Delete failed");

        } catch {
            toast.error("Failed to delete video");
            // Re-fetch to revert if failed (optional, but good for MVP)
            fetchVideos();
        }
    };

    const toggleMute = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsGlobalMuted(!isGlobalMuted);
    };

    const handleContextMenu = (e: React.MouseEvent, videoId: string) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            videoId
        });
    };

    const handleDownload = async (e: React.MouseEvent, video: VideoData) => {
        e.stopPropagation();
        if (!video.downloadUrl) return;

        try {
            toast.info("Starting download...");

            // Fetch the file as a blob to bypass cross-origin restrictions
            const response = await fetch(video.downloadUrl);
            const blob = await response.blob();

            // Create a blob URL and trigger download
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = blobUrl;
            link.download = video.fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Clean up the blob URL
            URL.revokeObjectURL(blobUrl);
            toast.success("Download started!");
        } catch (error) {
            console.error("Download failed:", error);
            toast.error("Download failed");
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20 text-slate-400">
                <Loader2 className="h-8 w-8 animate-spin mr-2" />
                <span>Loading library...</span>
            </div>
        );
    }

    if (videos.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Video className="h-16 w-16 mb-4 opacity-20" />
                <p>No videos downloaded yet</p>
                <p className="text-sm">Use the sidebar to upload links</p>
            </div>
        );
    }

    return (
        <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
                {videos.map((video) => (
                    <VideoCard
                        key={video.id}
                        video={video}
                        isGlobalMuted={isGlobalMuted}
                        onToggleMute={toggleMute}
                        onDelete={handleDelete}
                        onContextMenu={handleContextMenu}
                        onDownload={handleDownload}
                    />
                ))}
            </div>

            {/* Global Context Menu Overlay (Portal-like) */}
            {contextMenu && (
                <div
                    className="fixed z-50 bg-white/90 backdrop-blur-md border border-slate-200 rounded-lg p-1.5 min-w-[140px] animate-in fade-in zoom-in-95 duration-100 origin-top-left"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                    onClick={(e) => e.stopPropagation()} // Prevent closing when clicking menu itself
                >
                    <div className="text-xs font-medium text-slate-400 px-2 py-1 mb-1 border-b border-slate-100">
                        Options
                    </div>
                    <button
                        onClick={() => { handleDelete(contextMenu.videoId); setContextMenu(null); }}
                        className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-md text-left transition-colors font-medium"
                    >
                        <Trash2 className="h-4 w-4" />
                        Delete
                    </button>
                    <button
                        onClick={() => setContextMenu(null)}
                        className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-slate-500 hover:bg-slate-50 rounded-md text-left transition-colors mt-0.5"
                    >
                        <X className="h-4 w-4" />
                        Cancel
                    </button>
                </div>
            )}
        </>
    );
}
