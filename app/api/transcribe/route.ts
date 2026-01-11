import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { transcribeVideo } from "@/lib/whisper";

export async function POST(request: NextRequest) {
    try {
        const { videoId } = await request.json();

        if (!videoId) {
            return NextResponse.json(
                { error: "Video ID is required" },
                { status: 400 }
            );
        }

        // Check if OpenAI API key is configured
        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json(
                { error: "OpenAI API key not configured" },
                { status: 500 }
            );
        }

        // Get video from database
        const video = await prisma.video.findUnique({
            where: { id: videoId },
        });

        if (!video) {
            return NextResponse.json(
                { error: "Video not found" },
                { status: 404 }
            );
        }

        // Check if already transcribed
        if (video.transcriptionStatus === "COMPLETED" && video.transcription) {
            return NextResponse.json({
                success: true,
                transcription: video.transcription,
                status: "COMPLETED",
                cached: true,
            });
        }

        // Update status to processing
        await prisma.video.update({
            where: { id: videoId },
            data: { transcriptionStatus: "PROCESSING" },
        });

        try {
            // Get the video URL - use internal endpoint for Docker container access
            const s3Endpoint = process.env.S3_ENDPOINT || "http://minio:9002";
            const bucket = process.env.S3_BUCKET || "videos";
            const videoUrl = `${s3Endpoint}/${bucket}/${video.fileKey}`;

            // Run transcription
            const result = await transcribeVideo(videoUrl);

            // Save transcription to database
            const updatedVideo = await prisma.video.update({
                where: { id: videoId },
                data: {
                    transcription: result.text,
                    transcriptionStatus: "COMPLETED",
                    duration: result.duration ? Math.round(result.duration) : video.duration,
                },
            });

            return NextResponse.json({
                success: true,
                transcription: updatedVideo.transcription,
                status: "COMPLETED",
                duration: updatedVideo.duration,
            });
        } catch (error) {
            // Update status to failed
            await prisma.video.update({
                where: { id: videoId },
                data: { transcriptionStatus: "FAILED" },
            });

            console.error("Transcription error:", error);
            return NextResponse.json(
                { error: error instanceof Error ? error.message : "Transcription failed" },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error("API error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
