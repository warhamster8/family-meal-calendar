import { NextResponse, type NextRequest } from "next/server";
import { verifySession } from "@/lib/session";

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Retrieve the secure session cookie
    const token = request.cookies.get("session")?.value;
    
    // Verify the JWT session
    const session = token ? await verifySession(token) : null;

    const isLoginPage = pathname.startsWith("/login");

    // Case 1: Unauthenticated user trying to access protected routes -> redirect to /login
    if (!session && !isLoginPage) {
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = "/login";
        return NextResponse.redirect(loginUrl);
    }

    // Case 2: Authenticated user trying to access /login -> redirect to /calendar
    if (session && isLoginPage) {
        const calendarUrl = request.nextUrl.clone();
        calendarUrl.pathname = "/calendar";
        return NextResponse.redirect(calendarUrl);
    }

    // Case 3: Allow request to proceed
    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - all assets from the public folder (svg, png, jpg, etc.)
         */
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};