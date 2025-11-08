// app/api/users/route.ts
export async function GET() {
  // Fetch from your database
  const users = await db.users.findMany({
    where: { isOnline: true },
    include: { currentSong: true }
  });
  
  return Response.json(users);
}