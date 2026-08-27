import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "BLOB_READ_WRITE_TOKEN n'est pas configuré sur ce déploiement. Connecte un store Vercel Blob au projet." },
      { status: 500 }
    );
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith("tmp-upload/")) {
          throw new Error("Only uploads under tmp-upload/ are permitted.");
        }
        // Browsers/OS often mislabel or omit the MIME type for .m4a/.wav recordings
        // (empty string, "application/octet-stream", etc.), so content type is not
        // restricted here — the file is validated downstream when Whisper transcribes it.
        return {
          addRandomSuffix: false,
          maximumSizeInBytes: 500 * 1024 * 1024,
        };
      },
      // No onUploadCompleted webhook: the client confirms the upload itself by calling
      // /api/analyze/start right after upload() resolves, so no server-to-server callback
      // is needed — and skipping it avoids Vercel Blob's callback-URL resolution entirely.
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("blob-upload token generation failed:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Upload token error." }, { status: 400 });
  }
}
