import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSignedDownloadUrl } from "@/lib/storage";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const video = await prisma.video.findUnique({
            where: { id },
        });

        if (!video) {
            return NextResponse.json(
                { error: "Video not found" },
                { status: 404 }
            );
        }

        // Generate signed URL for video playback
        const downloadUrl = await getSignedDownloadUrl(video.fileKey);

        return NextResponse.json({
            video: {
                ...video,
                downloadUrl,
            },
        });
    } catch (error) {
        console.error("Error fetching video:", error);
        return NextResponse.json(
            { error: "Failed to fetch video" },
            { status: 500 }
        );
    }
}
