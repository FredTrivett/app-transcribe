import OpenAI from "openai";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";

const execAsync = promisify(exec);

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

interface TranscriptionResult {
    text: string;
    duration?: number;
}

/**
 * Extract and compress audio from a video file
 * Optimized for Whisper: mono, 16kHz, low bitrate
 */
export async function extractAndCompressAudio(
    videoPath: string
): Promise<string> {
    const tempDir = os.tmpdir();
    const audioPath = path.join(tempDir, `audio_${Date.now()}.mp3`);

    // FFmpeg command to extract and compress audio
    // -vn: no video
    // -ac 1: mono channel
    // -ar 16000: 16kHz sample rate (Whisper's native rate)
    // -b:a 32k: 32kbps bitrate (good quality for speech)
    const command = `ffmpeg -i "${videoPath}" -vn -ac 1 -ar 16000 -b:a 32k -y "${audioPath}"`;

    try {
        await execAsync(command);
        return audioPath;
    } catch (error) {
        console.error("Audio extraction failed:", error);
        throw new Error("Failed to extract audio from video");
    }
}

/**
 * Transcribe audio file using OpenAI Whisper
 */
export async function transcribeAudio(
    audioPath: string
): Promise<TranscriptionResult> {
    try {
        const audioFile = await fs.readFile(audioPath);
        const file = new File([audioFile], path.basename(audioPath), {
            type: "audio/mpeg",
        });

        const transcription = await openai.audio.transcriptions.create({
            file: file,
            model: "whisper-1",
            response_format: "verbose_json",
        });

        return {
            text: transcription.text,
            duration: transcription.duration,
        };
    } catch (error) {
        console.error("Transcription failed:", error);
        throw new Error("Failed to transcribe audio");
    }
}

/**
 * Download file from URL to temp directory
 */
export async function downloadToTemp(url: string): Promise<string> {
    const tempDir = os.tmpdir();
    const tempPath = path.join(tempDir, `video_${Date.now()}.mp4`);

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to download: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    await fs.writeFile(tempPath, Buffer.from(buffer));

    return tempPath;
}

/**
 * Clean up temporary files
 */
export async function cleanupTempFiles(...paths: string[]): Promise<void> {
    for (const filePath of paths) {
        try {
            await fs.unlink(filePath);
        } catch {
            // Ignore cleanup errors
        }
    }
}

/**
 * Full transcription pipeline: download video → extract audio → transcribe
 */
export async function transcribeVideo(
    videoUrl: string
): Promise<TranscriptionResult> {
    let videoPath: string | null = null;
    let audioPath: string | null = null;

    try {
        // Download video to temp
        videoPath = await downloadToTemp(videoUrl);

        // Extract and compress audio
        audioPath = await extractAndCompressAudio(videoPath);

        // Transcribe
        const result = await transcribeAudio(audioPath);

        return result;
    } finally {
        // Cleanup temp files
        if (videoPath || audioPath) {
            await cleanupTempFiles(
                ...[videoPath, audioPath].filter(Boolean) as string[]
            );
        }
    }
}
