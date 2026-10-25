
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const TASK_STATUSES = [
  "TO_DO",
  "IN_PROGRESS",
  "BLOCKED",
  "IN_REVIEW",
  "READY_FOR_QA",
  "REOPENED",
  "READY_FOR_PRODUCTION",
  "DONE",
] as const;

type TaskStatus = (typeof TASK_STATUSES)[number];

interface RouteContext {
  params: Promise<{
    id: string;
    taskId: string;
  }>;
}

export async function PATCH(
  request: Request,
  { params }: RouteContext,
) {
  try {
    const { id: projectId, taskId } = await params;

    if (!projectId || !taskId) {
      return NextResponse.json(
        { error: "Project ID and task ID are required." },
        { status: 400 },
      );
    }

    const body = await request.json().catch(() => null);

    if (
      !body ||
      typeof body.status !== "string" ||
      !TASK_STATUSES.includes(body.status as TaskStatus)
    ) {
      return NextResponse.json(
        { error: "A valid task status is required." },
        { status: 400 },
      );
    }

    const status = body.status as TaskStatus;
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_BASE_URL!,
      process.env.NEXT_PUBLIC_SECRET_KEYS!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, {
                ...options,
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
              });
            });
          },
        },
      },
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized access." },
        { status: 401 },
      );
    }

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.access_token) {
      return NextResponse.json(
        { error: "No active session." },
        { status: 401 },
      );
    }

    const query = new URLSearchParams({
      id: `eq.${taskId}`,
      project_id: `eq.${projectId}`,
      select: "id,project_id,status",
    });

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/rest/v1/tasks?${query.toString()}`,
      {
        method: "PATCH",
        headers: {
          apikey: process.env.NEXT_PUBLIC_SECRET_KEYS!,
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({ status }),
        cache: "no-store",
      },
    );

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      console.error("Supabase update task status error:", data);

      return NextResponse.json(
        {
          error:
            data?.message ||
            data?.details ||
            "Failed to update task status.",
        },
        { status: response.status },
      );
    }

    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json(
        { error: "Task not found or could not be updated." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: data[0],
    });
  } catch (error) {
    console.error("Task status PATCH proxy error:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred while updating the task." },
      { status: 500 },
    );
  }
}
