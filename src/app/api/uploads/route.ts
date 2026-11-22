import { POST as uploadPost } from "@/app/api/upload/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = uploadPost;
