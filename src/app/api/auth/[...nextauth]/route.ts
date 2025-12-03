import { handlers } from "@/auth";

// Expose NextAuth route handlers with explicit GET/POST exports for Next.js typing.
export const { GET, POST } = handlers;
