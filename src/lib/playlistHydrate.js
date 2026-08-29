import User from "@/lib/models/User";


export async function hydratePlaylists(playlists) {
  const clerkIds = new Set();
  playlists.forEach((p) => {
    clerkIds.add(p.userId);
    (p.collaborators || []).forEach((c) => clerkIds.add(c));
  });
  const users = await User.find({ clerkId: { $in: [...clerkIds] } }).lean();
  const byId = new Map(users.map((u) => [u.clerkId, u]));

  return playlists.map((p) => {
    
    
    const doc = p.toObject ? p.toObject() : p;
    return {
      ...doc,
      owner: byId.get(doc.userId) || null,
      collaboratorInfo: (doc.collaborators || [])
        .map((c) => byId.get(c) || null)
        .filter(Boolean),
    };
  });
}
