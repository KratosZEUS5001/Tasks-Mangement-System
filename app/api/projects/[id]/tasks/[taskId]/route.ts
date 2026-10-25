import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

interface RouteContext {
  params: Promise<{
    id: string;
    taskId: string;
  }>;
}



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

export async function PATCH(
  request: Request,
  { params }: {
    params: Promise<{ id: string; taskId: string }>;
  }
) {
  try {
    const { id: projectId, taskId } = await params;

    let body: { status?: unknown };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body" },
        { status: 400 }
      );
    }

    if (
      typeof body.status !== "string" ||
      !TASK_STATUSES.includes(
        body.status as (typeof TASK_STATUSES)[number]
      )
    ) {
      return NextResponse.json(
        { error: "Invalid task status" },
        { status: 400 }
      );
    }

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
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, {
                  ...options,
                  httpOnly: true,
                  secure: process.env.NODE_ENV === "production",
                  sameSite: "lax",
                });
              });
            } catch {
              // Cookie writes may not be available in every context.
            }
          },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 401 }
      );
    }

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.access_token) {
      return NextResponse.json(
        { error: "No active session" },
        { status: 401 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    const apiKey = process.env.NEXT_PUBLIC_SECRET_KEYS;

    if (!baseUrl || !apiKey) {
      return NextResponse.json(
        { error: "Server configuration is missing" },
        { status: 500 }
      );
    }

    const url = new URL(`${baseUrl}/rest/v1/tasks`);
    url.searchParams.set("id", `eq.${taskId}`);
    url.searchParams.set("project_id", `eq.${projectId}`);

    const response = await fetch(url.toString(), {
      method: "PATCH",
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({ status: body.status }),
      cache: "no-store",
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error(
        "Failed to update task status:",
        response.status,
        responseText
      );

      return NextResponse.json(
        {
          error: "Failed to update task status",
          details: responseText || response.statusText,
        },
        { status: response.status }
      );
    }

    let updatedTasks: unknown;

    try {
      updatedTasks = JSON.parse(responseText);
    } catch {
      return NextResponse.json(
        { error: "Invalid response from tasks API" },
        { status: 502 }
      );
    }

    if (!Array.isArray(updatedTasks) || updatedTasks.length === 0) {
      return NextResponse.json(
        { error: "Task not found in this project" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedTasks[0],
    });
  } catch (error) {
    console.error("PATCH task status error:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred while updating the task" },
      { status: 500 }
    );
  }
}

export async function GET(
  _request: Request,
  { params }: RouteContext
) {
  try {
    const { id: projectId, taskId } = await params;

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
            try {
              cookiesToSet.forEach(
                ({ name, value, options }) => {
                  cookieStore.set(name, value, {
                    ...options,
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production",
                    sameSite: "lax",
                  });
                }
              );
            } catch {
              // Cookies cannot be modified in every Server Component context.
            }
          },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 401 }
      );
    }

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.access_token) {
      return NextResponse.json(
        { error: "No active session" },
        { status: 401 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    const apiKey = process.env.NEXT_PUBLIC_SECRET_KEYS;

    if (!baseUrl || !apiKey) {
      return NextResponse.json(
        { error: "Server configuration is missing" },
        { status: 500 }
      );
    }

    const url = new URL(`${baseUrl}/rest/v1/project_tasks`);

    url.searchParams.set("select", "*");
    url.searchParams.set("id", `eq.${taskId}`);
    url.searchParams.set("project_id", `eq.${projectId}`);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    const responseText = await response.text();

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "Failed to fetch task details",
          details: responseText || response.statusText,
        },
        { status: response.status }
      );
    }

    let data: unknown;

    try {
      data = JSON.parse(responseText);
    } catch {
      return NextResponse.json(
        { error: "The tasks API returned invalid JSON" },
        { status: 502 }
      );
    }

    if (!Array.isArray(data)) {
      return NextResponse.json(
        { error: "Unexpected task response format" },
        { status: 502 }
      );
    }

    if (data.length === 0) {
      return NextResponse.json(
        { error: "Task not found in this project" },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("GET task details error:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred while fetching task details" },
      { status: 500 }
    );
  }
}
