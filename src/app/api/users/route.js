export async function GET() {
  const users = await db.users.findMany({
    where: { isOnline: true },
    include: { currentSong: true }
  });
  
  return Response.json(users);
}